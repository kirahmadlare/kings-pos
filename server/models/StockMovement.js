/**
 * @fileoverview Stock Movement Model
 *
 * Tracks all inventory movements (adjustments, transfers, returns, etc.)
 */

import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
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
        enum: [
            'purchase',          // New stock from supplier
            'sale',              // Stock sold to customer
            'adjustment',        // Manual adjustment (count, damage, etc.)
            'transfer_out',      // Transferred to another store
            'transfer_in',       // Received from another store
            'return_from_customer', // Customer return
            'return_to_supplier',   // Return to supplier
            'shrinkage',         // Loss/theft
            'promotion'          // Promotional giveaway
        ],
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousQuantity: {
        type: Number,
        required: true
    },
    newQuantity: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    referenceType: {
        type: String,
        enum: ['Sale', 'PurchaseOrder', 'Transfer', 'Adjustment', 'Return']
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    fromLocation: {
        type: String
    },
    toLocation: {
        type: String
    },
    costImpact: {
        type: Number,
        default: 0
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
stockMovementSchema.index({ storeId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ storeId: 1, type: 1, createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

// Static method to create movement and update product quantity
stockMovementSchema.statics.createMovement = async function(data) {
    const Product = mongoose.model('Product');

    const product = await Product.findById(data.productId);
    if (!product) {
        throw new Error('Product not found');
    }

    const previousQuantity = product.quantity;
    const newQuantity = previousQuantity + data.quantity;

    if (newQuantity < 0) {
        throw new Error('Insufficient stock for this movement');
    }

    // Calculate cost impact
    const costImpact = data.quantity * (product.costPrice || 0);

    // Create movement record
    const movement = await this.create({
        ...data,
        previousQuantity,
        newQuantity,
        costImpact
    });

    // Update product quantity
    product.quantity = newQuantity;
    await product.save();

    return movement;
};

// Virtual for direction
stockMovementSchema.virtual('direction').get(function() {
    return this.quantity >= 0 ? 'in' : 'out';
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;
