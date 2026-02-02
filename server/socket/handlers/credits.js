/**
 * @fileoverview Credit Socket Event Handlers
 *
 * Handles real-time credit events
 */

/**
 * Broadcast credit payment recorded event
 */
export const broadcastCreditPaymentRecorded = (io, storeId, creditId, payment) => {
    io.to(`store:${storeId}`).emit('credit:payment-recorded', {
        id: creditId,
        action: 'payment',
        payment,
        timestamp: new Date()
    });
};

/**
 * Broadcast credit updated event
 */
export const broadcastCreditUpdated = (io, storeId, credit) => {
    io.to(`store:${storeId}`).emit('credit:updated', {
        id: credit._id,
        action: 'update',
        data: credit,
        timestamp: new Date()
    });
};
