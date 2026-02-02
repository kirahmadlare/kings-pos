/**
 * @fileoverview Category Model
 */

import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
    color: {
        type: String,
        default: '#6b7280'
    },
    icon: {
        type: String
    },
    sortOrder: {
        type: Number,
        default: 0
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
// 1. Sort order (for display)
categorySchema.index({ storeId: 1, sortOrder: 1 });

// 2. Name lookup
categorySchema.index({ storeId: 1, name: 1 });

// 3. Sync version for conflict detection
categorySchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
