/**
 * @fileoverview Credit Model
 * 
 * Tracks buy-now-pay-later credit purchases
 */

import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'overdue'],
        default: 'pending'
    },
    notes: {
        type: String
    },
    paidAt: {
        type: Date
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
// 1. Overdue credits (most important query)
creditSchema.index({ storeId: 1, status: 1, dueDate: 1 });

// 2. Customer credit history
creditSchema.index({ storeId: 1, customerId: 1, createdAt: -1 });

// 3. Sale reference lookup
creditSchema.index({ storeId: 1, saleId: 1 });

// 4. Pending credits by amount
creditSchema.index({ storeId: 1, status: 1, amount: -1 });

// 5. Recently paid credits
creditSchema.index({ storeId: 1, paidAt: -1 });

// 6. Sync version for conflict detection
creditSchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

// Calculate remaining balance
creditSchema.methods.getRemainingBalance = function () {
    return this.amount - this.amountPaid;
};

// Check if overdue
creditSchema.methods.isOverdue = function () {
    return new Date() > this.dueDate && this.status !== 'paid';
};

const Credit = mongoose.model('Credit', creditSchema);

export default Credit;
