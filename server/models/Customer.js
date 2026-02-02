/**
 * @fileoverview Customer Model
 */

import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
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
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    notes: {
        type: String
    },
    // Aggregated stats
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    lastOrderDate: {
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
// 1. Text search on name, phone, email
customerSchema.index({ storeId: 1, name: 'text', phone: 'text', email: 'text' });

// 2. Phone lookup (exact match for quick lookup)
customerSchema.index({ storeId: 1, phone: 1 });

// 3. Email lookup
customerSchema.index({ storeId: 1, email: 1 });

// 4. Top customers by spending
customerSchema.index({ storeId: 1, totalSpent: -1 });

// 5. Top customers by order count
customerSchema.index({ storeId: 1, totalOrders: -1 });

// 6. Recent customers
customerSchema.index({ storeId: 1, lastOrderDate: -1 });

// 7. Sync version for conflict detection
customerSchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
