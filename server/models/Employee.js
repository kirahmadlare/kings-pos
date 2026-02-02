/**
 * @fileoverview Employee Model
 * 
 * Represents store employees (cashiers, managers, etc.)
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
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
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['owner', 'manager', 'cashier', 'staff'],
        default: 'cashier'
    },
    pin: {
        type: String,
        minlength: 4,
        maxlength: 4
    },
    hourlyRate: {
        type: Number,
        default: 0,
        min: 0
    },
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
// 1. Active employees lookup
employeeSchema.index({ storeId: 1, isActive: 1, name: 1 });

// 2. Email lookup (unique per store)
employeeSchema.index({ storeId: 1, email: 1 }, { unique: true, sparse: true });

// 3. PIN lookup for authentication
employeeSchema.index({ storeId: 1, pin: 1 });

// 4. Role-based queries
employeeSchema.index({ storeId: 1, role: 1 });

// 5. Sync version for conflict detection
employeeSchema.index({ storeId: 1, syncVersion: 1, lastSyncedAt: -1 });

// Hash PIN before saving (optional, depending on security needs)
employeeSchema.pre('save', async function (next) {
    if (!this.isModified('pin') || !this.pin) return next();
    // PIN is stored as plain text for quick entry at POS
    // In production, you may want to hash it
    next();
});

// Get employee display info
employeeSchema.methods.getSafeInfo = function () {
    return {
        id: this._id,
        name: this.name,
        role: this.role,
        isActive: this.isActive
    };
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
