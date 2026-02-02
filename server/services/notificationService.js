/**
 * @fileoverview Notification Service
 *
 * Handles creation and management of notifications
 */

import Notification from '../models/Notification.js';

/**
 * Create a new notification
 */
export async function createNotification({
    storeId,
    userId = null,
    organizationId = null,
    type,
    title,
    message,
    priority = 'normal',
    metadata = {},
    relatedEntity = null,
    action = null,
    expiresAt = null
}) {
    try {
        const notification = await Notification.create({
            storeId,
            userId,
            organizationId,
            type,
            title,
            message,
            priority,
            metadata,
            relatedEntity,
            action,
            expiresAt
        });

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Create low stock notification
 */
export async function createLowStockNotification(storeId, product) {
    return await createNotification({
        storeId,
        type: 'inventory',
        title: '⚠️ Low Stock Alert',
        message: `${product.name} is running low. Only ${product.quantity} units remaining (reorder level: ${product.reorderLevel})`,
        priority: 'high',
        metadata: {
            productId: product._id,
            productName: product.name,
            currentQuantity: product.quantity,
            reorderLevel: product.reorderLevel
        },
        relatedEntity: {
            type: 'product',
            id: product._id
        },
        action: {
            label: 'View Product',
            url: `/inventory`
        }
    });
}

/**
 * Create out of stock notification
 */
export async function createOutOfStockNotification(storeId, product) {
    return await createNotification({
        storeId,
        type: 'inventory',
        title: '🚨 Out of Stock',
        message: `${product.name} is out of stock! Reorder immediately.`,
        priority: 'urgent',
        metadata: {
            productId: product._id,
            productName: product.name
        },
        relatedEntity: {
            type: 'product',
            id: product._id
        },
        action: {
            label: 'Reorder Now',
            url: `/inventory`
        }
    });
}

/**
 * Create new sale notification
 */
export async function createNewSaleNotification(storeId, sale) {
    return await createNotification({
        storeId,
        type: 'sales',
        title: '💰 New Sale',
        message: `Sale completed for ${sale.total.toFixed(2)} with ${sale.items.length} items`,
        priority: 'normal',
        metadata: {
            saleId: sale._id,
            total: sale.total,
            itemCount: sale.items.length,
            paymentMethod: sale.paymentMethod
        },
        relatedEntity: {
            type: 'sale',
            id: sale._id
        },
        action: {
            label: 'View Sale',
            url: `/orders`
        }
    });
}

/**
 * Create credit payment notification
 */
export async function createCreditPaymentNotification(storeId, credit, customer) {
    return await createNotification({
        storeId,
        type: 'sales',
        title: '📋 Credit Payment Due',
        message: `Credit payment of ${credit.amount.toFixed(2)} from ${customer.name} is due on ${new Date(credit.dueDate).toLocaleDateString()}`,
        priority: 'normal',
        metadata: {
            creditId: credit._id,
            customerId: customer._id,
            customerName: customer.name,
            amount: credit.amount,
            dueDate: credit.dueDate
        },
        relatedEntity: {
            type: 'customer',
            id: customer._id
        },
        action: {
            label: 'View Customer',
            url: `/customers`
        },
        expiresAt: new Date(credit.dueDate)
    });
}

/**
 * Create large sale notification (VIP)
 */
export async function createLargeSaleNotification(storeId, sale, threshold) {
    return await createNotification({
        storeId,
        type: 'sales',
        title: '🌟 Large Sale',
        message: `High-value sale of ${sale.total.toFixed(2)} completed! (Threshold: ${threshold})`,
        priority: 'high',
        metadata: {
            saleId: sale._id,
            total: sale.total,
            threshold,
            itemCount: sale.items.length
        },
        relatedEntity: {
            type: 'sale',
            id: sale._id
        }
    });
}

/**
 * Create system notification
 */
export async function createSystemNotification(storeId, title, message, priority = 'normal') {
    return await createNotification({
        storeId,
        type: 'system',
        title,
        message,
        priority,
        metadata: {
            timestamp: new Date()
        }
    });
}

/**
 * Create daily report notification
 */
export async function createDailyReportNotification(storeId, stats) {
    return await createNotification({
        storeId,
        type: 'report',
        title: '📊 Daily Sales Report',
        message: `Today's sales: ${stats.totalSales.toFixed(2)} | Orders: ${stats.orderCount} | Avg: ${stats.averageOrderValue.toFixed(2)}`,
        priority: 'low',
        metadata: stats,
        action: {
            label: 'View Reports',
            url: `/reports`
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
    });
}

/**
 * Get notifications for a store
 */
export async function getNotifications(storeId, options = {}) {
    const {
        page = 1,
        limit = 20,
        type = null,
        read = null,
        priority = null,
        userId = null,
        sort = '-createdAt'
    } = options;

    const query = { storeId };

    if (type) query.type = type;
    if (read !== null) query.read = read;
    if (priority) query.priority = priority;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;

    const [notifications, totalCount] = await Promise.all([
        Notification.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments(query)
    ]);

    return {
        notifications,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
    };
}

/**
 * Get unread count
 */
export async function getUnreadCount(storeId, userId = null) {
    return await Notification.getUnreadCount(storeId, userId);
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new Error('Notification not found');
    }
    return await notification.markAsRead();
}

/**
 * Mark notification as unread
 */
export async function markAsUnread(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new Error('Notification not found');
    }
    return await notification.markAsUnread();
}

/**
 * Mark all notifications as read for a store
 */
export async function markAllAsRead(storeId, userId = null) {
    return await Notification.markAllAsRead(storeId, userId);
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId) {
    return await Notification.findByIdAndDelete(notificationId);
}

/**
 * Delete old notifications (older than specified days)
 */
export async function deleteOldNotifications(storeId, daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await Notification.deleteMany({
        storeId,
        createdAt: { $lt: cutoffDate }
    });
}

/**
 * Broadcast notification via Socket.io
 */
export function broadcastNotification(io, storeId, notification) {
    if (!io) return;

    // Broadcast to all clients in the store room
    io.to(`store:${storeId}`).emit('notification:new', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        read: notification.read,
        metadata: notification.metadata,
        action: notification.action,
        createdAt: notification.createdAt
    });
}

/**
 * Broadcast notification update via Socket.io
 */
export function broadcastNotificationUpdate(io, storeId, notificationId, updates) {
    if (!io) return;

    io.to(`store:${storeId}`).emit('notification:updated', {
        id: notificationId,
        ...updates
    });
}
