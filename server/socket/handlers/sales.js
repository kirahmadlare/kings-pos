/**
 * @fileoverview Sales Socket Event Handlers
 *
 * Handles real-time sales events
 */

/**
 * Broadcast sale created event
 */
export const broadcastSaleCreated = (io, storeId, sale) => {
    io.to(`store:${storeId}`).emit('sale:created', {
        id: sale._id,
        action: 'create',
        data: sale,
        timestamp: new Date()
    });
};

/**
 * Broadcast sale voided event
 */
export const broadcastSaleVoided = (io, storeId, saleId) => {
    io.to(`store:${storeId}`).emit('sale:voided', {
        id: saleId,
        action: 'void',
        timestamp: new Date()
    });
};
