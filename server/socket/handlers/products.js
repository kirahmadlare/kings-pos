/**
 * @fileoverview Product Socket Event Handlers
 *
 * Handles real-time product events
 */

/**
 * Broadcast product created event
 */
export const broadcastProductCreated = (io, storeId, product) => {
    io.to(`store:${storeId}`).emit('product:created', {
        id: product._id,
        action: 'create',
        data: product,
        timestamp: new Date()
    });
};

/**
 * Broadcast product updated event
 */
export const broadcastProductUpdated = (io, storeId, product) => {
    io.to(`store:${storeId}`).emit('product:updated', {
        id: product._id,
        action: 'update',
        data: product,
        timestamp: new Date()
    });
};

/**
 * Broadcast product deleted event
 */
export const broadcastProductDeleted = (io, storeId, productId) => {
    io.to(`store:${storeId}`).emit('product:deleted', {
        id: productId,
        action: 'delete',
        timestamp: new Date()
    });
};

/**
 * Broadcast product stock updated event
 */
export const broadcastProductStockUpdated = (io, storeId, productId, quantity) => {
    io.to(`store:${storeId}`).emit('product:stock-updated', {
        id: productId,
        action: 'stock-update',
        quantity,
        timestamp: new Date()
    });
};
