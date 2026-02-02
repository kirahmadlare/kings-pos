/**
 * @fileoverview Conflict Detection Hook
 *
 * Custom hook for handling API conflicts (409 responses)
 */

import { useState, useCallback } from 'react';

/**
 * Hook for detecting and managing conflicts
 *
 * @returns {Object} Conflict state and handlers
 */
export function useConflictDetection() {
    const [conflict, setConflict] = useState(null);
    const [pendingOperation, setPendingOperation] = useState(null);

    /**
     * Wrap an API call with conflict detection
     *
     * @param {Function} apiCall - The API function to call
     * @param {Object} data - Data to send to API
     * @returns {Promise} Result or conflict
     */
    const callWithConflictDetection = useCallback(async (apiCall, data) => {
        try {
            // Include syncVersion in the request if available
            const dataWithSync = {
                ...data,
                syncVersion: data.syncVersion || 1
            };

            const result = await apiCall(dataWithSync);
            return { success: true, data: result };
        } catch (error) {
            // Check if it's a conflict error (409)
            if (error.message && error.message.includes('Conflict detected')) {
                // Extract conflict data from error
                // Assuming the error contains the conflict response
                setConflict(error.conflictData || {
                    message: error.message,
                    serverVersion: null,
                    clientVersion: data
                });

                setPendingOperation({ apiCall, data });
                return { success: false, conflict: true };
            }

            // Re-throw non-conflict errors
            throw error;
        }
    }, []);

    /**
     * Resolve the conflict with chosen strategy
     *
     * @param {string} strategy - Resolution strategy ('server', 'client', 'merge')
     * @param {Object} resolvedData - The resolved data
     */
    const resolveConflict = useCallback(async (strategy, resolvedData) => {
        if (!pendingOperation) {
            throw new Error('No pending operation to resolve');
        }

        try {
            // Call the API with resolved data
            const { apiCall } = pendingOperation;

            // Add flag to force update
            const dataToSend = {
                ...resolvedData,
                forceUpdate: true,
                resolution: strategy
            };

            const result = await apiCall(dataToSend);

            // Clear conflict state
            setConflict(null);
            setPendingOperation(null);

            return { success: true, data: result };
        } catch (error) {
            console.error('Error resolving conflict:', error);
            throw error;
        }
    }, [pendingOperation]);

    /**
     * Cancel conflict resolution
     */
    const cancelConflict = useCallback(() => {
        setConflict(null);
        setPendingOperation(null);
    }, []);

    /**
     * Check if there's an active conflict
     */
    const hasConflict = Boolean(conflict);

    return {
        conflict,
        hasConflict,
        callWithConflictDetection,
        resolveConflict,
        cancelConflict
    };
}

/**
 * Extract conflict data from API error response
 *
 * @param {Error} error - Error from API call
 * @returns {Object|null} Conflict data or null
 */
export function extractConflictData(error) {
    // Check if error response contains conflict data
    if (error.response && error.response.status === 409) {
        return error.response.data;
    }

    // Check if error message indicates conflict
    if (error.message && error.message.includes('Conflict detected')) {
        return {
            message: error.message,
            conflict: true
        };
    }

    return null;
}

/**
 * Merge two objects with conflict resolution
 *
 * @param {Object} serverData - Server version
 * @param {Object} clientData - Client version
 * @param {Array} clientWins - Fields where client version should win
 * @returns {Object} Merged data
 */
export function mergeWithConflict(serverData, clientData, clientWins = []) {
    const merged = { ...serverData };

    Object.keys(clientData).forEach(key => {
        // Skip metadata fields
        if (['_id', '__v', 'createdAt', 'updatedAt', 'syncVersion', 'lastSyncedAt'].includes(key)) {
            return;
        }

        // If this field is in clientWins, use client value
        if (clientWins.includes(key)) {
            merged[key] = clientData[key];
        } else {
            // Otherwise, keep server value
            // (already in merged from ...serverData)
        }
    });

    // Always update sync metadata
    merged.syncVersion = serverData.syncVersion + 1;
    merged.lastSyncedAt = new Date();

    return merged;
}

export default useConflictDetection;
