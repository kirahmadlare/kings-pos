/**
 * @fileoverview Real-Time Sync Hook
 *
 * Custom hook for subscribing to real-time entity updates
 */

import { useEffect, useCallback } from 'react';
import socketManager from '../services/socket';

/**
 * Hook for subscribing to real-time entity updates
 *
 * @param {string} entityType - Entity type to subscribe to (product, sale, customer, etc.)
 * @param {Function} onEvent - Callback function for handling events
 * @param {Array} deps - Dependencies array for useEffect
 */
export function useRealtimeSync(entityType, onEvent, deps = []) {
    useEffect(() => {
        if (!entityType || !onEvent) return;

        // Subscribe to all events for this entity type
        const events = [
            `${entityType}:created`,
            `${entityType}:updated`,
            `${entityType}:deleted`,
            `${entityType}:stock-updated`,
            `${entityType}:voided`,
            `${entityType}:clock-event`,
            `${entityType}:payment-recorded`
        ];

        const handler = (event) => {
            console.log(`Real-time event: ${event.action} ${entityType}`, event);
            onEvent(event);
        };

        // Register handlers
        events.forEach(eventName => {
            socketManager.on(eventName, handler);
        });

        // Cleanup on unmount
        return () => {
            events.forEach(eventName => {
                socketManager.off(eventName, handler);
            });
        };
    }, [entityType, ...deps]);
}

/**
 * Hook for product real-time updates
 *
 * @param {Function} onProductCreate - Callback for product create
 * @param {Function} onProductUpdate - Callback for product update
 * @param {Function} onProductDelete - Callback for product delete
 * @param {Function} onStockUpdate - Callback for stock update
 */
export function useProductRealtimeSync({
    onProductCreate,
    onProductUpdate,
    onProductDelete,
    onStockUpdate
}) {
    useRealtimeSync('product', (event) => {
        switch (event.action) {
            case 'create':
                onProductCreate?.(event.data);
                break;
            case 'update':
                onProductUpdate?.(event.data);
                break;
            case 'delete':
                onProductDelete?.(event.id);
                break;
            case 'stock-update':
                onStockUpdate?.(event.id, event.quantity);
                break;
        }
    }, [onProductCreate, onProductUpdate, onProductDelete, onStockUpdate]);
}

/**
 * Hook for sale real-time updates
 *
 * @param {Function} onSaleCreate - Callback for sale create
 * @param {Function} onSaleVoid - Callback for sale void
 */
export function useSaleRealtimeSync({ onSaleCreate, onSaleVoid }) {
    useRealtimeSync('sale', (event) => {
        switch (event.action) {
            case 'create':
                onSaleCreate?.(event.data);
                break;
            case 'void':
                onSaleVoid?.(event.id);
                break;
        }
    }, [onSaleCreate, onSaleVoid]);
}

/**
 * Hook for customer real-time updates
 *
 * @param {Function} onCustomerCreate - Callback for customer create
 * @param {Function} onCustomerUpdate - Callback for customer update
 * @param {Function} onCustomerDelete - Callback for customer delete
 */
export function useCustomerRealtimeSync({
    onCustomerCreate,
    onCustomerUpdate,
    onCustomerDelete
}) {
    useRealtimeSync('customer', (event) => {
        switch (event.action) {
            case 'create':
                onCustomerCreate?.(event.data);
                break;
            case 'update':
                onCustomerUpdate?.(event.data);
                break;
            case 'delete':
                onCustomerDelete?.(event.id);
                break;
        }
    }, [onCustomerCreate, onCustomerUpdate, onCustomerDelete]);
}

/**
 * Hook for employee real-time updates
 *
 * @param {Function} onEmployeeCreate - Callback for employee create
 * @param {Function} onEmployeeUpdate - Callback for employee update
 * @param {Function} onEmployeeDelete - Callback for employee delete
 * @param {Function} onClockEvent - Callback for clock in/out
 */
export function useEmployeeRealtimeSync({
    onEmployeeCreate,
    onEmployeeUpdate,
    onEmployeeDelete,
    onClockEvent
}) {
    useRealtimeSync('employee', (event) => {
        switch (event.action) {
            case 'create':
                onEmployeeCreate?.(event.data);
                break;
            case 'update':
                onEmployeeUpdate?.(event.data);
                break;
            case 'delete':
                onEmployeeDelete?.(event.id);
                break;
            case 'clock-in':
            case 'clock-out':
                onClockEvent?.(event.id, event.action);
                break;
        }
    }, [onEmployeeCreate, onEmployeeUpdate, onEmployeeDelete, onClockEvent]);
}

/**
 * Hook for monitoring connection status
 *
 * @param {Function} onConnect - Callback when connected
 * @param {Function} onDisconnect - Callback when disconnected
 */
export function useConnectionStatus(onConnect, onDisconnect) {
    useEffect(() => {
        if (onConnect) {
            socketManager.onConnect(onConnect);
        }

        if (onDisconnect) {
            socketManager.onDisconnect(onDisconnect);
        }

        // No cleanup needed as callbacks are stored in arrays
    }, [onConnect, onDisconnect]);
}
