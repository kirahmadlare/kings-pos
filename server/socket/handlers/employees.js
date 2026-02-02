/**
 * @fileoverview Employee Socket Event Handlers
 *
 * Handles real-time employee events
 */

/**
 * Broadcast employee created event
 */
export const broadcastEmployeeCreated = (io, storeId, employee) => {
    io.to(`store:${storeId}`).emit('employee:created', {
        id: employee._id,
        action: 'create',
        data: employee,
        timestamp: new Date()
    });
};

/**
 * Broadcast employee updated event
 */
export const broadcastEmployeeUpdated = (io, storeId, employee) => {
    io.to(`store:${storeId}`).emit('employee:updated', {
        id: employee._id,
        action: 'update',
        data: employee,
        timestamp: new Date()
    });
};

/**
 * Broadcast employee deleted event
 */
export const broadcastEmployeeDeleted = (io, storeId, employeeId) => {
    io.to(`store:${storeId}`).emit('employee:deleted', {
        id: employeeId,
        action: 'delete',
        timestamp: new Date()
    });
};

/**
 * Broadcast employee clock in/out event
 */
export const broadcastEmployeeClockEvent = (io, storeId, employeeId, event) => {
    io.to(`store:${storeId}`).emit('employee:clock-event', {
        id: employeeId,
        action: event, // 'clock-in' or 'clock-out'
        timestamp: new Date()
    });
};
