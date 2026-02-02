/**
 * @fileoverview User Model
 * 
 * Represents store owners and system administrators
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'owner'],
        default: 'owner'
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },
    // Multi-store access (for managers)
    stores: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    }],
    // Current active store (for switching between stores)
    currentStoreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Two-Factor Authentication
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false  // Don't include in queries by default
    },
    twoFactorBackupCodes: {
        type: [String],
        select: false
    },
    // Granular Permissions
    permissions: {
        inventory: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: true },
            delete: { type: Boolean, default: false }
        },
        sales: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            void: { type: Boolean, default: false },
            refund: { type: Boolean, default: false }
        },
        customers: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: true },
            delete: { type: Boolean, default: false }
        },
        employees: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        reports: {
            view: { type: Boolean, default: true },
            export: { type: Boolean, default: false },
            financial: { type: Boolean, default: false }
        },
        settings: {
            view: { type: Boolean, default: true },
            update: { type: Boolean, default: false }
        },
        admin: {
            users: { type: Boolean, default: false },
            stores: { type: Boolean, default: false },
            system: { type: Boolean, default: false }
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has specific permission
userSchema.methods.hasPermission = function (resource, action) {
    // Admins have all permissions
    if (this.role === 'admin') {
        return true;
    }

    // Check granular permission
    if (this.permissions && this.permissions[resource]) {
        return this.permissions[resource][action] === true;
    }

    return false;
};

// Get all permissions for user
userSchema.methods.getAllPermissions = function () {
    if (this.role === 'admin') {
        return {
            inventory: { create: true, read: true, update: true, delete: true },
            sales: { create: true, read: true, void: true, refund: true },
            customers: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            reports: { view: true, export: true, financial: true },
            settings: { view: true, update: true },
            admin: { users: true, stores: true, system: true }
        };
    }

    return this.permissions || {};
};

// Remove password and sensitive 2FA data from JSON output
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.twoFactorSecret;
    delete user.twoFactorBackupCodes;
    return user;
};

const User = mongoose.model('User', userSchema);

export default User;
