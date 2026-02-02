/**
 * @fileoverview Notification Routes
 *
 * API endpoints for notification management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationService from '../services/notificationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', asyncHandler(async (req, res) => {
    const { storeId, userId } = req;
    const { page = 1, limit = 20, type, read, priority, sort = '-createdAt' } = req.query;

    const result = await notificationService.getNotifications(storeId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        read: read !== undefined ? read === 'true' : null,
        priority,
        userId,
        sort
    });

    res.json(result);
}));

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', asyncHandler(async (req, res) => {
    const { storeId, userId } = req;

    const count = await notificationService.getUnreadCount(storeId, userId);

    res.json({ count });
}));

/**
 * GET /api/notifications/:id
 * Get single notification
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { storeId } = req;

    const notification = await notificationService.Notification.findOne({
        _id: id,
        storeId
    });

    if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
}));

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { storeId } = req;

    const notification = await notificationService.markAsRead(id);

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
        notificationService.broadcastNotificationUpdate(io, storeId, id, { read: true });
    }

    res.json({ message: 'Notification marked as read', notification });
}));

/**
 * PATCH /api/notifications/:id/unread
 * Mark notification as unread
 */
router.patch('/:id/unread', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { storeId } = req;

    const notification = await notificationService.markAsUnread(id);

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
        notificationService.broadcastNotificationUpdate(io, storeId, id, { read: false });
    }

    res.json({ message: 'Notification marked as unread', notification });
}));

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', asyncHandler(async (req, res) => {
    const { storeId, userId } = req;

    const result = await notificationService.markAllAsRead(storeId, userId);

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
        io.to(`store:${storeId}`).emit('notification:all-read');
    }

    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
}));

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { storeId } = req;

    await notificationService.deleteNotification(id);

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
        io.to(`store:${storeId}`).emit('notification:deleted', { id });
    }

    res.json({ message: 'Notification deleted successfully' });
}));

/**
 * DELETE /api/notifications/bulk
 * Delete multiple notifications
 */
router.delete('/bulk', asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const { storeId } = req;

    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await notificationService.Notification.deleteMany({
        _id: { $in: ids },
        storeId
    });

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
        io.to(`store:${storeId}`).emit('notification:bulk-deleted', { ids });
    }

    res.json({ message: 'Notifications deleted', deletedCount: result.deletedCount });
}));

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', asyncHandler(async (req, res) => {
    const { userId, storeId } = req;

    // TODO: Fetch user preferences from database when we add UserPreferences model
    // For now, return default preferences
    const defaultPreferences = {
        new_order: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        payment_received: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        order_completed: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        refund_processed: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        low_stock: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        out_of_stock: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        stock_updated: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        new_product: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        daily_report: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        weekly_report: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        system_update: { enabled: true, channels: { app: true, email: false, sms: false, push: false } },
        backup_status: { enabled: true, channels: { app: true, email: false, sms: false, push: false } }
    };

    res.json({ preferences: defaultPreferences });
}));

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', asyncHandler(async (req, res) => {
    const { userId, storeId } = req;
    const { preferences } = req.body;

    // TODO: Save preferences to database when we add UserPreferences model
    res.json({ message: 'Preferences saved successfully', preferences });
}));

/**
 * POST /api/notifications/test
 * Send a test notification
 */
router.post('/test', asyncHandler(async (req, res) => {
    const { storeId } = req;

    const notification = await notificationService.createSystemNotification(
        storeId,
        '🧪 Test Notification',
        'This is a test notification to verify your settings are working correctly.',
        'normal'
    );

    // Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
        notificationService.broadcastNotification(io, storeId, notification);
    }

    res.json({
        message: 'Test notification sent',
        notification
    });
}));

/**
 * DELETE /api/notifications/cleanup
 * Delete old notifications (older than 30 days)
 */
router.delete('/cleanup', asyncHandler(async (req, res) => {
    const { storeId } = req;
    const { daysOld = 30 } = req.query;

    const result = await notificationService.deleteOldNotifications(storeId, parseInt(daysOld));

    res.json({
        message: `Deleted notifications older than ${daysOld} days`,
        deletedCount: result.deletedCount
    });
}));

export default router;
