/**
 * @fileoverview Plugin API
 *
 * Provides a safe, sandboxed API for plugins to interact with the system
 */

import { Sale, Product, Customer, Employee, Store } from '../models/index.js';
import Plugin from '../models/Plugin.js';

/**
 * Plugin API - Provides controlled access to system resources
 */
class PluginAPI {
    constructor(plugin, context) {
        this.plugin = plugin;
        this.context = context; // { storeId, organizationId, userId, io }
        this.models = this._createModelProxies();
    }

    /**
     * Create safe model proxies with access control
     */
    _createModelProxies() {
        const { storeId, organizationId } = this.context;

        return {
            Sale: this._createModelProxy(Sale, storeId, organizationId),
            Product: this._createModelProxy(Product, storeId, organizationId),
            Customer: this._createModelProxy(Customer, storeId, organizationId),
            Employee: this._createModelProxy(Employee, storeId, organizationId),
            Store: this._createModelProxy(Store, storeId, organizationId)
        };
    }

    /**
     * Create a proxy for a model with automatic scope filtering
     */
    _createModelProxy(Model, storeId, organizationId) {
        const self = this;

        return {
            async find(query = {}) {
                self._checkPermission('read');
                const scopedQuery = { ...query, storeId };
                return await Model.find(scopedQuery);
            },

            async findOne(query = {}) {
                self._checkPermission('read');
                const scopedQuery = { ...query, storeId };
                return await Model.findOne(scopedQuery);
            },

            async findById(id) {
                self._checkPermission('read');
                const doc = await Model.findById(id);
                if (doc && doc.storeId?.toString() !== storeId.toString()) {
                    throw new Error('Access denied: Document belongs to different store');
                }
                return doc;
            },

            async create(data) {
                self._checkPermission('create');
                return await Model.create({ ...data, storeId });
            },

            async update(id, updates) {
                self._checkPermission('update');
                const doc = await Model.findById(id);
                if (!doc || doc.storeId?.toString() !== storeId.toString()) {
                    throw new Error('Access denied: Document not found or belongs to different store');
                }
                Object.assign(doc, updates);
                return await doc.save();
            },

            async delete(id) {
                self._checkPermission('delete');
                const doc = await Model.findById(id);
                if (!doc || doc.storeId?.toString() !== storeId.toString()) {
                    throw new Error('Access denied: Document not found or belongs to different store');
                }
                return await doc.remove();
            },

            async aggregate(pipeline) {
                self._checkPermission('read');
                // Inject storeId filter at the beginning of pipeline
                const scopedPipeline = [
                    { $match: { storeId } },
                    ...pipeline
                ];
                return await Model.aggregate(scopedPipeline);
            }
        };
    }

    /**
     * Check if plugin has required permission
     */
    _checkPermission(action) {
        const requiredPermission = `plugin:${action}`;
        if (!this.plugin.capabilities?.permissions?.includes(requiredPermission) &&
            !this.plugin.capabilities?.permissions?.includes('plugin:*')) {
            throw new Error(`Plugin does not have ${requiredPermission} permission`);
        }
    }

    /**
     * Emit a real-time event via Socket.io
     */
    emit(event, data) {
        if (!this.context.io) {
            console.warn('Socket.io not available in plugin context');
            return;
        }

        const room = `store:${this.context.storeId}`;
        this.context.io.to(room).emit(`plugin:${this.plugin.pluginId}:${event}`, data);
    }

    /**
     * Get plugin configuration
     */
    getConfig(key) {
        if (key) {
            return this.plugin.config.get(key);
        }
        return Object.fromEntries(this.plugin.config);
    }

    /**
     * Set plugin configuration (persisted)
     */
    async setConfig(key, value) {
        this.plugin.config.set(key, value);
        await this.plugin.save();
    }

    /**
     * Log plugin activity
     */
    log(level, message, meta = {}) {
        console.log(`[Plugin:${this.plugin.pluginId}] [${level.toUpperCase()}] ${message}`, meta);
    }

    /**
     * Schedule a task (simple in-memory scheduling)
     */
    schedule(cronExpression, handler) {
        // TODO: Integrate with node-schedule or agenda
        this.log('info', `Scheduled task with cron: ${cronExpression}`);
        // For now, just log. Actual scheduling requires additional dependencies
    }

    /**
     * Make HTTP request (with rate limiting)
     */
    async fetch(url, options = {}) {
        this._checkPermission('http');

        // Simple rate limiting
        await this.plugin.incrementApiCalls();
        if (this.plugin.stats.apiCalls > 10000) {
            throw new Error('Plugin API call limit exceeded');
        }

        const fetch = (await import('node-fetch')).default;
        return await fetch(url, {
            ...options,
            timeout: 10000 // 10 second timeout
        });
    }

    /**
     * Store plugin-specific data
     */
    async setData(key, value) {
        const storageKey = `plugin_${this.plugin.pluginId}_${key}`;
        this.plugin.config.set(storageKey, value);
        await this.plugin.save();
    }

    /**
     * Retrieve plugin-specific data
     */
    getData(key) {
        const storageKey = `plugin_${this.plugin.pluginId}_${key}`;
        return this.plugin.config.get(storageKey);
    }

    /**
     * Register a webhook endpoint
     */
    registerWebhook(event, url) {
        this.log('info', `Registered webhook for ${event}: ${url}`);
        // Store webhook configuration
        const webhooks = this.plugin.config.get('webhooks') || [];
        webhooks.push({ event, url, createdAt: new Date() });
        this.plugin.config.set('webhooks', webhooks);
        return this.plugin.save();
    }

    /**
     * Send notification to users
     */
    async notify(userId, notification) {
        this._checkPermission('notify');

        // Emit notification via Socket.io
        if (this.context.io) {
            this.context.io.to(`user:${userId}`).emit('notification', {
                ...notification,
                source: `plugin:${this.plugin.pluginId}`,
                timestamp: new Date()
            });
        }

        this.log('info', `Sent notification to user ${userId}`);
    }

    /**
     * Get current store information
     */
    async getStore() {
        const Store = (await import('../models/index.js')).Store;
        return await Store.findById(this.context.storeId);
    }

    /**
     * Get current organization information
     */
    async getOrganization() {
        const Organization = (await import('../models/Organization.js')).default;
        return await Organization.findById(this.context.organizationId);
    }

    /**
     * Create a custom table/collection for plugin
     */
    async createTable(tableName, schema) {
        this._checkPermission('create');

        const mongoose = (await import('mongoose')).default;
        const fullTableName = `plugin_${this.plugin.pluginId}_${tableName}`;

        // Check if model already exists
        if (mongoose.models[fullTableName]) {
            return mongoose.models[fullTableName];
        }

        const tableSchema = new mongoose.Schema({
            ...schema,
            storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
            pluginId: { type: String, default: this.plugin.pluginId }
        }, { timestamps: true });

        const model = mongoose.model(fullTableName, tableSchema);
        this.log('info', `Created table: ${fullTableName}`);

        return model;
    }

    /**
     * Execute a database transaction
     */
    async transaction(callback) {
        const mongoose = (await import('mongoose')).default;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await callback(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Validate data against a schema
     */
    validate(data, schema) {
        // Simple validation - can be enhanced with joi or yup
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${key} is required`);
            }

            if (rules.type && value !== undefined) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    errors.push(`${key} must be of type ${rules.type}`);
                }
            }

            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${key} must be at least ${rules.min}`);
            }

            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${key} must be at most ${rules.max}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default PluginAPI;
