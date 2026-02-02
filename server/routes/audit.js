/**
 * @fileoverview Audit Log Routes
 *
 * API endpoints for querying and exporting audit logs.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import auditService from '../services/auditService.js';

const router = express.Router();

/**
 * GET /api/audit - Get audit logs with filters
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const {
            userId,
            entityType,
            entityId,
            action,
            level,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        const result = await auditService.getAuditLogs({
            storeId: req.storeId,
            userId,
            entityType,
            entityId,
            action,
            level,
            startDate,
            endDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

/**
 * GET /api/audit/recent - Get recent activity
 */
router.get('/recent', authenticate, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await auditService.getRecentActivity(req.storeId, parseInt(limit));
        res.json(logs);
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

/**
 * GET /api/audit/entity/:entityType/:entityId - Get entity history
 */
router.get('/entity/:entityType/:entityId', authenticate, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const logs = await auditService.getEntityHistory(entityType, entityId);

        // Filter by store (ensure user can only see their store's logs)
        const filtered = logs.filter(log => log.storeId && log.storeId.toString() === req.storeId.toString());

        res.json(filtered);
    } catch (error) {
        console.error('Get entity history error:', error);
        res.status(500).json({ error: 'Failed to fetch entity history' });
    }
});

/**
 * GET /api/audit/user/:userId - Get user activity
 */
router.get('/user/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        const logs = await auditService.getUserActivity(userId, startDate, endDate);

        // Filter by store
        const filtered = logs.filter(log => log.storeId && log.storeId.toString() === req.storeId.toString());

        res.json(filtered);
    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({ error: 'Failed to fetch user activity' });
    }
});

/**
 * GET /api/audit/critical - Get critical events
 */
router.get('/critical', authenticate, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const logs = await auditService.getCriticalEvents(req.storeId, parseInt(hours));
        res.json(logs);
    } catch (error) {
        console.error('Get critical events error:', error);
        res.status(500).json({ error: 'Failed to fetch critical events' });
    }
});

/**
 * GET /api/audit/stats - Get audit statistics
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = await auditService.getAuditStats(req.storeId, startDate, endDate);
        res.json(stats);
    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
});

/**
 * GET /api/audit/export - Export audit logs
 */
router.get('/export', authenticate, async (req, res) => {
    try {
        const {
            userId,
            entityType,
            entityId,
            action,
            level,
            startDate,
            endDate
        } = req.query;

        const logs = await auditService.exportAuditLogs({
            storeId: req.storeId,
            userId,
            entityType,
            entityId,
            action,
            level,
            startDate,
            endDate
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
        res.json(logs);
    } catch (error) {
        console.error('Export audit logs error:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

export default router;
