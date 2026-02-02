/**
 * @fileoverview Push Notification Service
 *
 * Handles web push notifications using Web Push API
 */

import webpush from 'web-push';

// Configure web push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@pos-system.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Store for push subscriptions (in production, use database)
const subscriptions = new Map();

/**
 * Save push subscription
 */
export function saveSubscription(userId, subscription) {
    if (!subscriptions.has(userId)) {
        subscriptions.set(userId, []);
    }

    const userSubs = subscriptions.get(userId);

    // Check if subscription already exists
    const exists = userSubs.some(sub =>
        sub.endpoint === subscription.endpoint
    );

    if (!exists) {
        userSubs.push(subscription);
    }

    return { success: true };
}

/**
 * Remove push subscription
 */
export function removeSubscription(userId, endpoint) {
    if (!subscriptions.has(userId)) {
        return { success: false, error: 'No subscriptions found for user' };
    }

    const userSubs = subscriptions.get(userId);
    const filtered = userSubs.filter(sub => sub.endpoint !== endpoint);

    subscriptions.set(userId, filtered);

    return { success: true };
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(userId, payload) {
    try {
        if (!process.env.VAPID_PUBLIC_KEY) {
            console.warn('Push notifications not configured');
            return { success: false, error: 'Push notifications not configured' };
        }

        const userSubs = subscriptions.get(userId);

        if (!userSubs || userSubs.length === 0) {
            return { success: false, error: 'No push subscriptions found for user' };
        }

        const notificationPayload = JSON.stringify({
            title: payload.title || 'Notification',
            body: payload.body || '',
            icon: payload.icon || '/icon-192x192.png',
            badge: payload.badge || '/badge-72x72.png',
            data: payload.data || {},
            tag: payload.tag,
            requireInteraction: payload.requireInteraction || false
        });

        const results = [];

        for (const subscription of userSubs) {
            try {
                await webpush.sendNotification(subscription, notificationPayload);
                results.push({ endpoint: subscription.endpoint, success: true });
            } catch (error) {
                // Remove invalid subscriptions
                if (error.statusCode === 410) {
                    removeSubscription(userId, subscription.endpoint);
                }
                results.push({
                    endpoint: subscription.endpoint,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: results.some(r => r.success),
            results
        };
    } catch (error) {
        console.error('Push notification error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkPushNotification(userIds, payload) {
    const results = [];

    for (const userId of userIds) {
        const result = await sendPushNotification(userId, payload);
        results.push({ userId, ...result });
    }

    return {
        total: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}

/**
 * Pre-defined notification types
 */
export async function sendLowStockAlert(userId, productData) {
    return sendPushNotification(userId, {
        title: 'Low Stock Alert',
        body: `${productData.name} is running low (${productData.quantity} left)`,
        icon: '/icons/warning.png',
        tag: 'low-stock',
        data: { type: 'low-stock', productId: productData.id }
    });
}

export async function sendSalesNotification(userId, saleData) {
    return sendPushNotification(userId, {
        title: 'New Sale',
        body: `Sale #${saleData.orderId} - $${saleData.total.toFixed(2)}`,
        icon: '/icons/sale.png',
        tag: 'sale',
        data: { type: 'sale', saleId: saleData.id }
    });
}

export async function sendShiftReminder(userId, shiftData) {
    return sendPushNotification(userId, {
        title: 'Shift Reminder',
        body: `Your shift starts in ${shiftData.minutesUntil} minutes`,
        icon: '/icons/clock.png',
        tag: 'shift-reminder',
        requireInteraction: true,
        data: { type: 'shift', shiftId: shiftData.id }
    });
}

export async function sendSystemAlert(userId, alertData) {
    return sendPushNotification(userId, {
        title: 'System Alert',
        body: alertData.message,
        icon: '/icons/alert.png',
        tag: 'system-alert',
        requireInteraction: true,
        data: { type: 'system-alert', ...alertData }
    });
}

/**
 * Get VAPID public key for client
 */
export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
}
