/**
 * @fileoverview Notification Model
 *
 * Stores system and business notifications for users
 */

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        index: true
    },
    type: {
        type: String,
        enum: ['sales', 'inventory', 'system', 'customer', 'employee', 'report'],
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // For linking to specific entities
    relatedEntity: {
        type: {
            type: String,
            enum: ['product', 'sale', 'customer', 'employee', 'order', 'other']
        },
        id: mongoose.Schema.Types.ObjectId
    },
    // Action button (optional)
    action: {
        label: String,
        url: String
    },
    expiresAt: {
        type: Date,
        index: true
    },
    readAt: Date
}, {
    timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ storeId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ storeId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt.getTime();
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
    this.read = true;
    this.readAt = new Date();
    return await this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = async function() {
    this.read = false;
    this.readAt = null;
    return await this.save();
};

// Static method to mark multiple as read
notificationSchema.statics.markManyAsRead = async function(notificationIds) {
    return await this.updateMany(
        { _id: { $in: notificationIds } },
        {
            $set: {
                read: true,
                readAt: new Date()
            }
        }
    );
};

// Static method to mark all as read for a store/user
notificationSchema.statics.markAllAsRead = async function(storeId, userId = null) {
    const query = { storeId, read: false };
    if (userId) query.userId = userId;

    return await this.updateMany(
        query,
        {
            $set: {
                read: true,
                readAt: new Date()
            }
        }
    );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(storeId, userId = null) {
    const query = { storeId, read: false };
    if (userId) query.userId = userId;

    return await this.countDocuments(query);
};

// Clean up expired notifications (called periodically)
notificationSchema.statics.cleanupExpired = async function() {
    return await this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
