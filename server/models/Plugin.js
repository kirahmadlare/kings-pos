/**
 * @fileoverview Plugin Model
 *
 * Represents installed plugins in the system
 */

import mongoose from 'mongoose';

const pluginSchema = new mongoose.Schema({
    // Plugin identification
    pluginId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    version: {
        type: String,
        required: true
    },
    author: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },

    // Installation scope
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },

    // Plugin configuration
    config: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
    },

    // Plugin capabilities
    capabilities: {
        routes: [{
            method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
            path: String,
            handler: String // Handler function name
        }],
        hooks: [{
            event: String, // e.g., 'sale.created', 'product.updated'
            handler: String // Handler function name
        }],
        uiComponents: [{
            injectionPoint: String, // e.g., 'POS.AfterCheckout'
            component: String // Component name
        }],
        permissions: [String] // Required permissions
    },

    // Plugin metadata
    category: {
        type: String,
        enum: ['payment', 'shipping', 'loyalty', 'analytics', 'integration', 'utility', 'custom'],
        default: 'custom'
    },
    tags: [String],
    icon: String, // URL or data URI
    homepage: String,
    repository: String,
    license: String,

    // Installation status
    status: {
        type: String,
        enum: ['active', 'inactive', 'error', 'uninstalling'],
        default: 'inactive'
    },
    installedAt: {
        type: Date,
        default: Date.now
    },
    installedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastActivatedAt: Date,
    lastDeactivatedAt: Date,

    // Error tracking
    errors: [{
        message: String,
        stack: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Usage statistics
    stats: {
        activations: { type: Number, default: 0 },
        apiCalls: { type: Number, default: 0 },
        lastUsed: Date
    },

    // Dependencies
    dependencies: [{
        pluginId: String,
        version: String,
        required: { type: Boolean, default: true }
    }],

    // Settings schema for UI generation
    settingsSchema: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
pluginSchema.index({ pluginId: 1 });
pluginSchema.index({ organizationId: 1, status: 1 });
pluginSchema.index({ storeId: 1, status: 1 });
pluginSchema.index({ category: 1, status: 1 });
pluginSchema.index({ status: 1 });

// Methods
pluginSchema.methods.activate = function() {
    this.status = 'active';
    this.lastActivatedAt = new Date();
    this.stats.activations += 1;
    return this.save();
};

pluginSchema.methods.deactivate = function() {
    this.status = 'inactive';
    this.lastDeactivatedAt = new Date();
    return this.save();
};

pluginSchema.methods.recordError = function(error) {
    this.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
    });

    // Keep only last 50 errors
    if (this.errors.length > 50) {
        this.errors = this.errors.slice(-50);
    }

    this.status = 'error';
    return this.save();
};

pluginSchema.methods.incrementApiCalls = function() {
    this.stats.apiCalls += 1;
    this.stats.lastUsed = new Date();
    return this.save();
};

pluginSchema.methods.updateConfig = function(newConfig) {
    Object.entries(newConfig).forEach(([key, value]) => {
        this.config.set(key, value);
    });
    return this.save();
};

pluginSchema.methods.checkDependencies = async function() {
    if (!this.dependencies || this.dependencies.length === 0) {
        return { satisfied: true, missing: [] };
    }

    const missingDeps = [];

    for (const dep of this.dependencies) {
        if (!dep.required) continue;

        const installedPlugin = await this.constructor.findOne({
            pluginId: dep.pluginId,
            status: 'active',
            $or: [
                { organizationId: this.organizationId },
                { storeId: this.storeId }
            ]
        });

        if (!installedPlugin) {
            missingDeps.push(dep);
        }
    }

    return {
        satisfied: missingDeps.length === 0,
        missing: missingDeps
    };
};

// Statics
pluginSchema.statics.getActivePlugins = function(organizationId, storeId) {
    return this.find({
        status: 'active',
        $or: [
            { organizationId },
            { storeId }
        ]
    });
};

pluginSchema.statics.getByCategory = function(category, organizationId, storeId) {
    return this.find({
        category,
        status: 'active',
        $or: [
            { organizationId },
            { storeId }
        ]
    });
};

const Plugin = mongoose.model('Plugin', pluginSchema);

export default Plugin;
