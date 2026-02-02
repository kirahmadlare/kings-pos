/**
 * @fileoverview Customer Socket Event Handlers
 *
 * Handles real-time customer events
 */

/**
 * Broadcast customer created event
 */
export const broadcastCustomerCreated = (io, storeId, customer) => {
    io.to(`store:${storeId}`).emit('customer:created', {
        id: customer._id,
        action: 'create',
        data: customer,
        timestamp: new Date()
    });
};

/**
 * Broadcast customer updated event
 */
export const broadcastCustomerUpdated = (io, storeId, customer) => {
    io.to(`store:${storeId}`).emit('customer:updated', {
        id: customer._id,
        action: 'update',
        data: customer,
        timestamp: new Date()
    });
};

/**
 * Broadcast customer deleted event
 */
export const broadcastCustomerDeleted = (io, storeId, customerId) => {
    io.to(`store:${storeId}`).emit('customer:deleted', {
        id: customerId,
        action: 'delete',
        timestamp: new Date()
    });
};
