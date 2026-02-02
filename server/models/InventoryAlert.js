/**
 * @fileoverview Inventory Alert Model
 *
 * Tracks inventory alerts for low stock, expiring products, etc.
 */

import mongoose from 'mongoose';

const inventoryAlertSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'overstock', 'slow_moving'],
        required: true,
        index: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'warning'
    },
    threshold: {
        type: Number,
        required: false
    },
    currentValue: {
        type: Number,
        required: false
    },
    message: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    triggeredAt: {
        type: Date,
        default: Date.now
    },
    notifiedAt: {
        type: Date
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
inventoryAlertSchema.index({ storeId: 1, isActive: 1, type: 1 });
inventoryAlertSchema.index({ storeId: 1, productId: 1, isActive: 1 });

// Methods
inventoryAlertSchema.methods.resolve = function(userId) {
    this.isActive = false;
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    return this.save();
};

inventoryAlertSchema.methods.notify = function() {
    this.notifiedAt = new Date();
    return this.save();
};

const InventoryAlert = mongoose.model('InventoryAlert', inventoryAlertSchema);

export default InventoryAlert;
