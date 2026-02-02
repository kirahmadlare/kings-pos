/**
 * @fileoverview Socket.io Client Connection Manager
 *
 * Manages WebSocket connection to backend for real-time sync
 */

import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketManager {
    constructor() {
        this.socket = null;
        this.connectionCallbacks = [];
        this.disconnectionCallbacks = [];
        this.eventHandlers = new Map();
        this.reconnecting = false;
    }

    /**
     * Initialize and connect to Socket.io server
     *
     * @param {string} token - JWT authentication token
     */
    connect(token) {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        console.log('Connecting to Socket.io server...');

        this.socket = io(API_BASE_URL, {
            auth: {
                token
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // Connection event
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
            this.reconnecting = false;

            // Notify all connection callbacks
            this.connectionCallbacks.forEach(callback => callback());
        });

        // Disconnection event
        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);

            // Notify all disconnection callbacks
            this.disconnectionCallbacks.forEach(callback => callback(reason));
        });

        // Reconnection attempt
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Socket reconnection attempt ${attemptNumber}...`);
            this.reconnecting = true;
        });

        // Reconnect failed
        this.socket.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
            this.reconnecting = false;
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        // Register all existing event handlers
        this.eventHandlers.forEach((handlers, event) => {
            handlers.forEach(handler => {
                this.socket.on(event, handler);
            });
        });
    }

    /**
     * Disconnect from Socket.io server
     */
    disconnect() {
        if (this.socket) {
            console.log('Disconnecting socket...');
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Check if socket is connected
     *
     * @returns {boolean}
     */
    isConnected() {
        return this.socket?.connected || false;
    }

    /**
     * Subscribe to an event
     *
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        // Store handler for reconnection
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);

        // Register with socket if connected
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }

    /**
     * Unsubscribe from an event
     *
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    off(event, handler) {
        // Remove from stored handlers
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }

        // Unregister from socket if connected
        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    /**
     * Emit an event to server
     *
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Cannot emit event - socket not connected');
        }
    }

    /**
     * Register connection callback
     *
     * @param {Function} callback - Callback function
     */
    onConnect(callback) {
        this.connectionCallbacks.push(callback);
    }

    /**
     * Register disconnection callback
     *
     * @param {Function} callback - Callback function
     */
    onDisconnect(callback) {
        this.disconnectionCallbacks.push(callback);
    }

    /**
     * Send ping to server
     */
    ping() {
        this.emit('ping');
    }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;
