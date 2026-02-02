/**
 * @fileoverview Sale Model
 */

import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: String,
    price: Number,
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

const saleSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClockEvent'
    },
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'credit'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'partial', 'refunded'],
        default: 'paid'
    },
    status: {
        type: String,
        enum: ['completed', 'voided', 'refunded'],
        default: 'completed'
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
// 1. Store sales by date (most common - daily reports)
saleSchema.index({ storeId: 1, createdAt: -1 });

// 2. Employee performance tracking
saleSchema.index({ storeId: 1, employeeId: 1, createdAt: -1 });

// 3. Customer purchase history
saleSchema.index({ storeId: 1, customerId: 1, createdAt: -1 });

// 4. Payment method analytics
saleSchema.index({ storeId: 1, paymentMethod: 1, createdAt: -1 });

// 5. Payment status tracking
saleSchema.index({ storeId: 1, paymentStatus: 1, createdAt: -1 });

// 6. Sales status (completed/voided/refunded)
saleSchema.index({ storeId: 1, status: 1, createdAt: -1 });

// 7. Shift sales tracking
saleSchema.index({ storeId: 1, shiftId: 1, createdAt: -1 });

// 8. Total amount range queries
saleSchema.index({ storeId: 1, total: -1, createdAt: -1 });

// 9. Sync version for conflict detection
saleSchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
