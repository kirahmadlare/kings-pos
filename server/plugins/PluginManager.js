/**
 * @fileoverview Plugin Manager
 *
 * Manages plugin lifecycle: install, activate, deactivate, uninstall
 */

import Plugin from '../models/Plugin.js';
import PluginAPI from './PluginAPI.js';
import path from 'path';
import fs from 'fs/promises';

class PluginManager {
    constructor() {
        this.loadedPlugins = new Map(); // pluginId -> plugin instance
        this.hooks = new Map(); // event -> [handlers]
        this.routes = new Map(); // path -> handler
        this.uiComponents = new Map(); // injectionPoint -> [components]
    }

    /**
     * Install a plugin
     */
    async install(pluginData, context) {
        const { pluginId, storeId, organizationId, userId } = pluginData;

        try {
            // Check if plugin already installed
            const existing = await Plugin.findOne({ pluginId, storeId });
            if (existing) {
                throw new Error(`Plugin ${pluginId} is already installed`);
            }

            // Create plugin record
            const plugin = await Plugin.create({
                ...pluginData,
                installedBy: userId,
                installedAt: new Date(),
                status: 'inactive'
            });

            // Load plugin code (if local)
            await this.loadPlugin(plugin, context);

            // Execute onInstall hook
            await this.executeHook(plugin, 'onInstall', context);

            console.log(`✓ Plugin ${pluginId} installed successfully`);
            return plugin;
        } catch (error) {
            console.error(`✗ Failed to install plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Load plugin code into memory
     */
    async loadPlugin(plugin, context) {
        const pluginPath = path.join(process.cwd(), 'plugins', plugin.pluginId, 'index.js');

        try {
            // Check if plugin file exists
            await fs.access(pluginPath);

            // Dynamic import
            const pluginModule = await import(`file://${pluginPath}`);
            const pluginInstance = pluginModule.default || pluginModule;

            // Store plugin instance
            this.loadedPlugins.set(plugin.pluginId, pluginInstance);

            // Register hooks
            if (pluginInstance.hooks) {
                for (const [event, handler] of Object.entries(pluginInstance.hooks)) {
                    this.registerHook(event, handler, plugin);
                }
            }

            // Register routes
            if (pluginInstance.routes) {
                for (const route of pluginInstance.routes) {
                    this.registerRoute(route, plugin);
                }
            }

            // Register UI components
            if (pluginInstance.components) {
                for (const [injectionPoint, component] of Object.entries(pluginInstance.components)) {
                    this.registerUIComponent(injectionPoint, component, plugin);
                }
            }

            console.log(`✓ Plugin ${plugin.pluginId} loaded into memory`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`⚠ Plugin ${plugin.pluginId} has no local code file`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Activate a plugin
     */
    async activate(pluginId, context) {
        const plugin = await Plugin.findOne({ pluginId, storeId: context.storeId });

        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (plugin.status === 'active') {
            throw new Error(`Plugin ${pluginId} is already active`);
        }

        // Check dependencies
        const depCheck = await plugin.checkDependencies();
        if (!depCheck.satisfied) {
            throw new Error(`Missing dependencies: ${depCheck.missing.map(d => d.pluginId).join(', ')}`);
        }

        // Activate
        await plugin.activate();

        // Load if not already loaded
        if (!this.loadedPlugins.has(pluginId)) {
            await this.loadPlugin(plugin, context);
        }

        // Execute onActivate hook
        await this.executeHook(plugin, 'onActivate', context);

        console.log(`✓ Plugin ${pluginId} activated`);
        return plugin;
    }

    /**
     * Deactivate a plugin
     */
    async deactivate(pluginId, context) {
        const plugin = await Plugin.findOne({ pluginId, storeId: context.storeId });

        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (plugin.status === 'inactive') {
            throw new Error(`Plugin ${pluginId} is already inactive`);
        }

        // Execute onDeactivate hook
        await this.executeHook(plugin, 'onDeactivate', context);

        // Deactivate
        await plugin.deactivate();

        // Unregister hooks
        this.unregisterPluginHooks(pluginId);

        console.log(`✓ Plugin ${pluginId} deactivated`);
        return plugin;
    }

    /**
     * Uninstall a plugin
     */
    async uninstall(pluginId, context) {
        const plugin = await Plugin.findOne({ pluginId, storeId: context.storeId });

        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        // Deactivate first if active
        if (plugin.status === 'active') {
            await this.deactivate(pluginId, context);
        }

        // Execute onUninstall hook
        await this.executeHook(plugin, 'onUninstall', context);

        // Remove from memory
        this.loadedPlugins.delete(pluginId);

        // Delete from database
        await plugin.deleteOne();

        console.log(`✓ Plugin ${pluginId} uninstalled`);
        return { success: true };
    }

    /**
     * Execute a plugin hook
     */
    async executeHook(plugin, hookName, context) {
        const pluginInstance = this.loadedPlugins.get(plugin.pluginId);
        if (!pluginInstance || !pluginInstance[hookName]) {
            return; // Hook not defined
        }

        try {
            const api = new PluginAPI(plugin, context);
            await pluginInstance[hookName](api);
        } catch (error) {
            console.error(`Error executing ${hookName} for plugin ${plugin.pluginId}:`, error);
            await plugin.recordError(error);
            throw error;
        }
    }

    /**
     * Trigger an event and execute all registered hooks
     */
    async triggerEvent(event, data, context) {
        const handlers = this.hooks.get(event) || [];

        for (const { handler, plugin } of handlers) {
            if (plugin.status !== 'active') continue;

            try {
                const api = new PluginAPI(plugin, context);
                await handler(api, data);
            } catch (error) {
                console.error(`Error in plugin ${plugin.pluginId} for event ${event}:`, error);
                await plugin.recordError(error);
            }
        }
    }

    /**
     * Register a hook
     */
    registerHook(event, handler, plugin) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }

        this.hooks.get(event).push({ handler, plugin });
        console.log(`✓ Registered hook for event: ${event} (plugin: ${plugin.pluginId})`);
    }

    /**
     * Unregister all hooks for a plugin
     */
    unregisterPluginHooks(pluginId) {
        for (const [event, handlers] of this.hooks.entries()) {
            const filtered = handlers.filter(h => h.plugin.pluginId !== pluginId);
            this.hooks.set(event, filtered);
        }
    }

    /**
     * Register a route
     */
    registerRoute(route, plugin) {
        const fullPath = `/api/plugins/${plugin.pluginId}${route.path}`;
        this.routes.set(fullPath, { ...route, plugin });
        console.log(`✓ Registered route: ${route.method} ${fullPath}`);
    }

    /**
     * Register a UI component
     */
    registerUIComponent(injectionPoint, component, plugin) {
        if (!this.uiComponents.has(injectionPoint)) {
            this.uiComponents.set(injectionPoint, []);
        }

        this.uiComponents.get(injectionPoint).push({
            component,
            plugin,
            pluginId: plugin.pluginId
        });

        console.log(`✓ Registered UI component at: ${injectionPoint} (plugin: ${plugin.pluginId})`);
    }

    /**
     * Get UI components for an injection point
     */
    getUIComponents(injectionPoint, context) {
        const components = this.uiComponents.get(injectionPoint) || [];

        // Filter by active plugins and context
        return components.filter(c => {
            return c.plugin.status === 'active' &&
                   c.plugin.storeId?.toString() === context.storeId?.toString();
        });
    }

    /**
     * Execute a plugin route handler
     */
    async executeRoute(req, res, routePath) {
        const routeConfig = this.routes.get(routePath);

        if (!routeConfig) {
            return res.status(404).json({ error: 'Plugin route not found' });
        }

        const { handler, plugin } = routeConfig;

        if (plugin.status !== 'active') {
            return res.status(503).json({ error: 'Plugin is not active' });
        }

        try {
            const context = {
                storeId: req.storeId,
                organizationId: req.organizationId,
                userId: req.userId,
                io: req.app.get('io')
            };

            const api = new PluginAPI(plugin, context);
            const pluginInstance = this.loadedPlugins.get(plugin.pluginId);

            if (!pluginInstance || !pluginInstance[handler]) {
                return res.status(500).json({ error: 'Plugin handler not found' });
            }

            const result = await pluginInstance[handler](api, req, res);

            // If handler didn't send response, send result
            if (!res.headersSent) {
                res.json(result);
            }

            await plugin.incrementApiCalls();
        } catch (error) {
            console.error(`Error executing plugin route:`, error);
            await plugin.recordError(error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get all active plugins for a store
     */
    async getActivePlugins(storeId, organizationId) {
        return await Plugin.getActivePlugins(organizationId, storeId);
    }

    /**
     * Get plugin statistics
     */
    async getPluginStats(pluginId, storeId) {
        const plugin = await Plugin.findOne({ pluginId, storeId });
        if (!plugin) {
            throw new Error('Plugin not found');
        }

        return {
            activations: plugin.stats.activations,
            apiCalls: plugin.stats.apiCalls,
            lastUsed: plugin.stats.lastUsed,
            errors: plugin.errors.length,
            lastError: plugin.errors[plugin.errors.length - 1],
            status: plugin.status
        };
    }

    /**
     * Update plugin configuration
     */
    async updateConfig(pluginId, storeId, config) {
        const plugin = await Plugin.findOne({ pluginId, storeId });
        if (!plugin) {
            throw new Error('Plugin not found');
        }

        await plugin.updateConfig(config);
        return plugin;
    }

    /**
     * Load all active plugins on server start
     */
    async loadAllPlugins(context) {
        const plugins = await Plugin.find({ status: 'active' });

        console.log(`Loading ${plugins.length} active plugins...`);

        for (const plugin of plugins) {
            try {
                await this.loadPlugin(plugin, context);
            } catch (error) {
                console.error(`Failed to load plugin ${plugin.pluginId}:`, error);
                await plugin.recordError(error);
            }
        }

        console.log('✓ All plugins loaded');
    }
}

// Singleton instance
const pluginManager = new PluginManager();

export default pluginManager;
