/**
 * @fileoverview Online Status Hook
 *
 * Monitors network connectivity and syncs when connection is restored
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '../stores/toastStore';

/**
 * Hook to monitor online/offline status
 *
 * @returns {Object} Connection status and handlers
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastOnlineTime, setLastOnlineTime] = useState(Date.now());
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    /**
     * Handle online event
     */
    const handleOnline = useCallback(async () => {
        setIsOnline(true);
        const downtime = Date.now() - lastOnlineTime;

        // Show reconnection toast
        toast.success('Connection restored', 'Back Online');

        // Auto-sync if we have been offline for more than 10 seconds
        if (downtime > 10000) {
            // TODO: Implement full sync service
            // For now, just notify the user
            toast.info('Ready to sync when you refresh', 'Connection Restored');
        }

        setReconnectAttempts(0);
    }, [lastOnlineTime]);

    /**
     * Handle offline event
     */
    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setLastOnlineTime(Date.now());
        toast.warning('Connection lost. Working offline.', 'Offline Mode');
    }, []);

    /**
     * Check connection with server heartbeat
     */
    const checkConnection = useCallback(async () => {
        if (!navigator.onLine) {
            return false;
        }

        try {
            // Try to fetch from server with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/health', {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }, []);

    /**
     * Manual reconnect attempt
     */
    const reconnect = useCallback(async () => {
        setReconnectAttempts(prev => prev + 1);
        const connected = await checkConnection();

        if (connected) {
            handleOnline();
        } else {
            toast.error('Unable to connect to server', 'Connection Failed');
        }

        return connected;
    }, [checkConnection, handleOnline]);

    // Set up event listeners
    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic connection check (every 30 seconds)
        const heartbeatInterval = setInterval(async () => {
            const connected = await checkConnection();

            // Update status if changed
            if (connected !== isOnline) {
                if (connected) {
                    handleOnline();
                } else {
                    handleOffline();
                }
            }
        }, 30000); // 30 seconds

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(heartbeatInterval);
        };
    }, [isOnline, handleOnline, handleOffline, checkConnection]);

    return {
        isOnline,
        lastOnlineTime,
        reconnectAttempts,
        reconnect,
        checkConnection
    };
}

/**
 * Hook to track specific API endpoint availability
 *
 * @param {string} endpoint - API endpoint to monitor
 * @param {number} interval - Check interval in ms
 * @returns {Object} Endpoint status
 */
export function useEndpointStatus(endpoint, interval = 60000) {
    const [isAvailable, setIsAvailable] = useState(true);
    const [lastCheck, setLastCheck] = useState(Date.now());

    useEffect(() => {
        const checkEndpoint = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(endpoint, {
                    method: 'HEAD',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                setIsAvailable(response.ok);
                setLastCheck(Date.now());
            } catch (error) {
                setIsAvailable(false);
                setLastCheck(Date.now());
            }
        };

        // Initial check
        checkEndpoint();

        // Periodic check
        const checkInterval = setInterval(checkEndpoint, interval);

        return () => clearInterval(checkInterval);
    }, [endpoint, interval]);

    return {
        isAvailable,
        lastCheck
    };
}

export default useOnlineStatus;
