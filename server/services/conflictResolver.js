/**
 * @fileoverview Conflict Resolution Service
 *
 * Detects and helps resolve data conflicts from concurrent edits
 */

/**
 * Check if there's a conflict between client and server versions
 *
 * @param {Object} serverDoc - Current document from database
 * @param {Number} clientSyncVersion - Client's syncVersion
 * @returns {boolean} True if conflict detected
 */
export function hasConflict(serverDoc, clientSyncVersion) {
    if (!serverDoc) return false;
    if (!clientSyncVersion) return false;

    // Conflict exists if client's version doesn't match server's version
    return serverDoc.syncVersion !== clientSyncVersion;
}

/**
 * Get conflict details for response
 *
 * @param {Object} serverDoc - Current server version
 * @param {Object} clientData - Client's proposed changes
 * @returns {Object} Conflict response object
 */
export function getConflictResponse(serverDoc, clientData) {
    return {
        conflict: true,
        message: 'Conflict detected: This record was modified by another user',
        serverVersion: {
            ...serverDoc.toObject(),
            syncVersion: serverDoc.syncVersion,
            lastSyncedAt: serverDoc.lastSyncedAt,
            updatedAt: serverDoc.updatedAt
        },
        clientVersion: {
            ...clientData,
            syncVersion: clientData.syncVersion
        },
        resolution: {
            acceptServer: 'Use the server version and discard your changes',
            acceptClient: 'Override with your changes',
            merge: 'Review and manually merge the changes'
        }
    };
}

/**
 * Increment sync version for update
 *
 * @param {Object} updateData - Data to update
 * @returns {Object} Update data with incremented syncVersion
 */
export function incrementSyncVersion(updateData) {
    return {
        ...updateData,
        $inc: { syncVersion: 1 },
        lastSyncedAt: new Date()
    };
}

/**
 * Apply conflict resolution strategy
 *
 * @param {string} strategy - Resolution strategy ('server', 'client', 'merge')
 * @param {Object} serverDoc - Server version
 * @param {Object} clientData - Client version
 * @returns {Object} Resolved data
 */
export function resolveConflict(strategy, serverDoc, clientData) {
    switch (strategy) {
        case 'server':
            // Keep server version
            return serverDoc.toObject();

        case 'client':
            // Override with client version (force update)
            return {
                ...clientData,
                syncVersion: serverDoc.syncVersion + 1,
                lastSyncedAt: new Date()
            };

        case 'merge':
            // Simple merge: Take client data but preserve server metadata
            return {
                ...clientData,
                syncVersion: serverDoc.syncVersion + 1,
                lastSyncedAt: new Date(),
                updatedAt: new Date()
            };

        default:
            throw new Error('Invalid resolution strategy');
    }
}

/**
 * Check if data has been modified since last sync
 *
 * @param {Object} doc - Document to check
 * @param {Date} lastSyncTime - Last sync timestamp
 * @returns {boolean} True if modified since last sync
 */
export function isModifiedSince(doc, lastSyncTime) {
    if (!doc || !lastSyncTime) return false;
    return new Date(doc.updatedAt) > new Date(lastSyncTime);
}

export default {
    hasConflict,
    getConflictResponse,
    incrementSyncVersion,
    resolveConflict,
    isModifiedSince
};
