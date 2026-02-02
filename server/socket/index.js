/**
 * @fileoverview Socket.io Server Setup
 *
 * Initializes Socket.io server with authentication and room management
 */

import { Server } from 'socket.io';
import { socketAuth } from './middleware/auth.js';

// Import all event handlers
import * as productHandlers from './handlers/products.js';
import * as saleHandlers from './handlers/sales.js';
import * as customerHandlers from './handlers/customers.js';
import * as employeeHandlers from './handlers/employees.js';
import * as creditHandlers from './handlers/credits.js';

/**
 * Initialize Socket.io server
 *
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    // Apply authentication middleware
    io.use(socketAuth);

    // Handle socket connections
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id} (User: ${socket.userId}, Store: ${socket.storeId})`);

        // Join store-specific room
        const storeRoom = `store:${socket.storeId}`;
        socket.join(storeRoom);
        console.log(`Socket ${socket.id} joined room: ${storeRoom}`);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

        // Ping/pong for connection health monitoring
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date() });
        });
    });

    console.log('Socket.io server initialized');

    return io;
};

/**
 * Export all event handlers for use in routes
 */
export const socketHandlers = {
    products: productHandlers,
    sales: saleHandlers,
    customers: customerHandlers,
    employees: employeeHandlers,
    credits: creditHandlers
};
