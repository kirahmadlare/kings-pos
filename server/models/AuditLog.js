/**
 * @fileoverview Audit Log Model
 *
 * Tracks all data changes across the system for compliance and debugging.
 * Uses capped collection for automatic cleanup of old logs.
 */

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some actions might be system-generated
    },
    action: {
        type: String,
        required: true,
        enum: [
            'create', 'update', 'delete', 'void',
            'login', 'logout', 'failed_login',
            'export', 'import', 'bulk_update', 'bulk_delete',
            'clock_in', 'clock_out', 'payment'
        ]
    },
    entityType: {
        type: String,
        required: true,
        index: true,
        enum: [
            'product', 'category', 'sale', 'customer', 'credit',
            'employee', 'shift', 'clockEvent', 'user', 'store',
            'supplier', 'purchaseOrder', 'payment', 'variant',
            'customField', 'organization', 'workflow'
        ]
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    changes: {
        before: {
            type: mongoose.Schema.Types.Mixed // Previous state
        },
        after: {
            type: mongoose.Schema.Types.Mixed // New state
        }
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        deviceId: String,
        sessionId: String,
        duration: Number, // For operations that track time
        success: Boolean, // For operations that can fail
        errorMessage: String
    },
    level: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    }
}, {
    timestamps: true,
    capped: {
        size: 104857600, // 100MB
        max: 100000 // Maximum 100K documents
    }
});

// Compound indexes for efficient querying
auditLogSchema.index({ storeId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ level: 1, createdAt: -1 });

// Static methods for common queries
auditLogSchema.statics.getRecentActivity = function(storeId, limit = 50) {
    return this.find({ storeId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();
};

auditLogSchema.statics.getEntityHistory = function(entityType, entityId) {
    return this.find({ entityType, entityId })
        .sort({ createdAt: -1 })
        .populate('userId', 'name email')
        .lean();
};

auditLogSchema.statics.getUserActivity = function(userId, startDate, endDate) {
    const query = { userId };
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .lean();
};

auditLogSchema.statics.getCriticalEvents = function(storeId, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        storeId,
        level: 'critical',
        createdAt: { $gte: since }
    })
        .sort({ createdAt: -1 })
        .populate('userId', 'name email')
        .lean();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
