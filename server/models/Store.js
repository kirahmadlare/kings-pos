/**
 * @fileoverview Store Model
 * 
 * Represents a retail store/business
 */

import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Multi-store hierarchy (Phase 3.1)
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreGroup'
    },
    parentStoreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },
    storeType: {
        type: String,
        enum: ['standalone', 'headquarters', 'branch', 'franchise'],
        default: 'standalone'
    },

    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    receiptHeader: {
        type: String,
        default: ''
    },
    receiptFooter: {
        type: String,
        default: 'Thank you for shopping with us!'
    },
    accessCode: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 8,
        default: function () {
            // Generate random 6-digit code
            return Math.floor(100000 + Math.random() * 900000).toString();
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Additional store details
    logo: {
        type: String
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    openingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    // Store settings
    settings: {
        allowNegativeInventory: { type: Boolean, default: false },
        requireCustomerForSale: { type: Boolean, default: false },
        autoGenerateReceipts: { type: Boolean, default: true },
        enableLoyaltyProgram: { type: Boolean, default: false },
        lowStockThreshold: { type: Number, default: 10 }
    },
    // Security settings
    ipWhitelist: {
        type: [String],
        default: []
        // Array of IP addresses, CIDR ranges, or wildcards
        // Examples: ['192.168.1.100', '10.0.0.0/24', '172.16.*']
    },
    // Managers who can access this store
    managers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Store status
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    // Conflict resolution fields
    syncVersion: {
        type: Number,
        default: 1
    },
    lastSyncedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for optimized queries
storeSchema.index({ ownerId: 1, isActive: 1 });
storeSchema.index({ accessCode: 1 }, { unique: true });
storeSchema.index({ managers: 1 });
storeSchema.index({ status: 1, isActive: 1 });
// Multi-store indexes
storeSchema.index({ organizationId: 1, isActive: 1 });
storeSchema.index({ groupId: 1 });
storeSchema.index({ parentStoreId: 1 });

// Virtual for full address
storeSchema.virtual('fullAddress').get(function() {
    return `${this.address || ''} ${this.phone || ''}`.trim();
});

// Method to check if user has access to store
storeSchema.methods.canAccess = function(userId) {
    const userIdStr = userId.toString();
    const ownerIdStr = this.ownerId.toString();

    // Owner always has access
    if (userIdStr === ownerIdStr) return true;

    // Check if user is a manager
    return this.managers.some(managerId => managerId.toString() === userIdStr);
};

// Method to add manager
storeSchema.methods.addManager = function(userId) {
    if (!this.managers.includes(userId)) {
        this.managers.push(userId);
    }
};

// Method to remove manager
storeSchema.methods.removeManager = function(userId) {
    this.managers = this.managers.filter(
        managerId => managerId.toString() !== userId.toString()
    );
};

const Store = mongoose.model('Store', storeSchema);

export default Store;
