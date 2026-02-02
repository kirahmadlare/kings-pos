/**
 * @fileoverview Audit Service
 *
 * Provides business logic for creating and querying audit logs.
 */

import AuditLog from '../models/AuditLog.js';

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @returns {Promise<Object>} Created audit log
 */
export async function createAuditLog(data) {
    try {
        const auditLog = await AuditLog.create(data);
        return auditLog;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should never break the main operation
        return null;
    }
}

/**
 * Log a CRUD operation
 * @param {Object} params - Log parameters
 */
export async function logOperation({
    storeId,
    userId,
    action,
    entityType,
    entityId,
    before = null,
    after = null,
    metadata = {},
    level = 'info'
}) {
    const changes = {};
    if (before) changes.before = sanitizeData(before);
    if (after) changes.after = sanitizeData(after);

    return createAuditLog({
        storeId,
        userId,
        action,
        entityType,
        entityId,
        changes,
        metadata,
        level
    });
}

/**
 * Log an authentication event
 * @param {Object} params - Auth log parameters
 */
export async function logAuthEvent({
    action,
    userId = null,
    email,
    success,
    ipAddress,
    userAgent,
    errorMessage = null
}) {
    return createAuditLog({
        storeId: null, // Auth events aren't store-specific
        userId,
        action,
        entityType: 'user',
        entityId: userId,
        changes: {
            after: { email, success }
        },
        metadata: {
            ipAddress,
            userAgent,
            success,
            errorMessage
        },
        level: success ? 'info' : 'warning'
    });
}

/**
 * Get audit logs with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Audit logs
 */
export async function getAuditLogs({
    storeId,
    userId = null,
    entityType = null,
    entityId = null,
    action = null,
    level = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
}) {
    const query = {};

    if (storeId) query.storeId = storeId;
    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;
    if (level) query.level = level;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .lean(),
        AuditLog.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get recent activity for a store
 * @param {String} storeId - Store ID
 * @param {Number} limit - Number of records
 * @returns {Promise<Array>} Recent audit logs
 */
export async function getRecentActivity(storeId, limit = 50) {
    return AuditLog.getRecentActivity(storeId, limit);
}

/**
 * Get complete history for an entity
 * @param {String} entityType - Entity type
 * @param {String} entityId - Entity ID
 * @returns {Promise<Array>} Entity audit history
 */
export async function getEntityHistory(entityType, entityId) {
    return AuditLog.getEntityHistory(entityType, entityId);
}

/**
 * Get user activity within date range
 * @param {String} userId - User ID
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Promise<Array>} User audit logs
 */
export async function getUserActivity(userId, startDate, endDate) {
    return AuditLog.getUserActivity(userId, startDate, endDate);
}

/**
 * Get critical events
 * @param {String} storeId - Store ID
 * @param {Number} hours - Hours to look back
 * @returns {Promise<Array>} Critical audit logs
 */
export async function getCriticalEvents(storeId, hours = 24) {
    return AuditLog.getCriticalEvents(storeId, hours);
}

/**
 * Export audit logs to JSON
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Audit logs for export
 */
export async function exportAuditLogs(filters) {
    const { logs } = await getAuditLogs({ ...filters, limit: 10000 });
    return logs;
}

/**
 * Get audit statistics
 * @param {String} storeId - Store ID
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Promise<Object>} Audit statistics
 */
export async function getAuditStats(storeId, startDate, endDate) {
    const match = { storeId };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [actionStats, entityStats, userStats, levelStats] = await Promise.all([
        // Actions breakdown
        AuditLog.aggregate([
            { $match: match },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        // Entity types breakdown
        AuditLog.aggregate([
            { $match: match },
            { $group: { _id: '$entityType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        // Top users
        AuditLog.aggregate([
            { $match: match },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        // Level breakdown
        AuditLog.aggregate([
            { $match: match },
            { $group: { _id: '$level', count: { $sum: 1 } } }
        ])
    ]);

    return {
        actions: actionStats.map(s => ({ action: s._id, count: s.count })),
        entities: entityStats.map(s => ({ entityType: s._id, count: s.count })),
        topUsers: userStats.map(s => ({ userId: s._id, count: s.count })),
        levels: levelStats.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {})
    };
}

/**
 * Sanitize data before logging (remove sensitive fields)
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitive = ['password', 'pin', 'token', 'secret', 'apiKey'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    }

    return sanitized;
}

export default {
    createAuditLog,
    logOperation,
    logAuthEvent,
    getAuditLogs,
    getRecentActivity,
    getEntityHistory,
    getUserActivity,
    getCriticalEvents,
    exportAuditLogs,
    getAuditStats
};
