/**
 * @fileoverview Organization Model
 *
 * Top-level entity for multi-store management
 * Supports enterprise organizations with multiple stores
 */

import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Contact information
    email: {
        type: String,
        trim: true,
        lowercase: true
    },

    phone: {
        type: String,
        trim: true
    },

    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' }
    },

    // Organization settings
    settings: {
        currency: { type: String, default: 'USD' },
        timezone: { type: String, default: 'America/New_York' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },

        // Business hours (applied to all stores by default)
        businessHours: {
            monday: { open: String, close: String, closed: Boolean },
            tuesday: { open: String, close: String, closed: Boolean },
            wednesday: { open: String, close: String, closed: Boolean },
            thursday: { open: String, close: String, closed: Boolean },
            friday: { open: String, close: String, closed: Boolean },
            saturday: { open: String, close: String, closed: Boolean },
            sunday: { open: String, close: String, closed: Boolean }
        },

        // Tax settings
        taxSettings: {
            defaultTaxRate: { type: Number, default: 0 },
            taxIncludedInPrice: { type: Boolean, default: false }
        },

        // Features enabled for organization
        features: {
            multiStore: { type: Boolean, default: true },
            inventoryTransfer: { type: Boolean, default: true },
            centralReporting: { type: Boolean, default: true },
            customerPortal: { type: Boolean, default: false },
            loyaltyProgram: { type: Boolean, default: false }
        }
    },

    // Subscription/billing information
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'professional', 'enterprise'],
            default: 'basic'
        },
        status: {
            type: String,
            enum: ['active', 'trial', 'suspended', 'cancelled'],
            default: 'active'
        },
        startDate: Date,
        expiresAt: Date,
        maxStores: { type: Number, default: 5 },
        maxUsers: { type: Number, default: 10 }
    },

    // Owner/admin user
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Branding
    logo: String,

    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ 'subscription.status': 1 });

// Virtual for store count
organizationSchema.virtual('storeCount', {
    ref: 'Store',
    localField: '_id',
    foreignField: 'organizationId',
    count: true
});

// Methods
organizationSchema.methods.canAddStore = function() {
    // Check if organization can add more stores based on subscription
    return this.storeCount < this.subscription.maxStores;
};

organizationSchema.methods.isFeatureEnabled = function(featureName) {
    return this.settings?.features?.[featureName] === true;
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
