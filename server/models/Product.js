/**
 * @fileoverview Product Model
 */

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    barcode: {
        type: String,
        trim: true
    },
    sku: {
        type: String,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    costPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    quantity: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
        min: 0
    },
    imageUrl: {
        type: String
    },
    discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    discountStart: Date,
    discountEnd: Date,
    isActive: {
        type: Boolean,
        default: true
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
// 1. Barcode lookup (exact match)
productSchema.index({ storeId: 1, barcode: 1 });

// 2. Category filtering
productSchema.index({ storeId: 1, categoryId: 1 });

// 3. Active products (most common query)
productSchema.index({ storeId: 1, isActive: 1, name: 1 });

// 4. Low stock alerts
productSchema.index({ storeId: 1, isActive: 1, quantity: 1 });

// 5. Price range queries
productSchema.index({ storeId: 1, price: 1 });

// 6. Text search on name and SKU
productSchema.index({ storeId: 1, name: 'text', sku: 'text' });

// 7. Sync version for conflict detection
productSchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
