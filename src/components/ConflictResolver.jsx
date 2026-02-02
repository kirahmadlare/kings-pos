/**
 * @fileoverview Conflict Resolver Component
 *
 * UI for resolving data conflicts when concurrent edits are detected
 */

import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import './ConflictResolver.css';

/**
 * Format timestamp to readable string
 */
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * ConflictResolver Component
 *
 * @param {Object} props
 * @param {Object} props.conflict - Conflict data from 409 response
 * @param {Function} props.onResolve - Called when conflict is resolved (strategy, resolvedData)
 * @param {Function} props.onCancel - Called when user cancels
 */
function ConflictResolver({ conflict, onResolve, onCancel }) {
    const [selectedStrategy, setSelectedStrategy] = useState(null);

    if (!conflict) return null;

    const { serverVersion, clientVersion } = conflict;

    const handleResolve = () => {
        if (!selectedStrategy) {
            alert('Please select a resolution strategy');
            return;
        }

        let resolvedData;
        switch (selectedStrategy) {
            case 'server':
                resolvedData = serverVersion;
                break;
            case 'client':
                resolvedData = clientVersion;
                break;
            case 'merge':
                // For now, use client version
                // In future, could implement field-by-field selection
                resolvedData = clientVersion;
                break;
            default:
                return;
        }

        onResolve(selectedStrategy, resolvedData);
    };

    // Get field differences
    const getFieldDifferences = () => {
        const differences = [];
        const allKeys = new Set([
            ...Object.keys(serverVersion || {}),
            ...Object.keys(clientVersion || {})
        ]);

        allKeys.forEach(key => {
            // Skip metadata fields
            if (['_id', '__v', 'createdAt', 'updatedAt', 'syncVersion', 'lastSyncedAt'].includes(key)) {
                return;
            }

            const serverValue = serverVersion?.[key];
            const clientValue = clientVersion?.[key];

            // Convert to string for comparison
            const serverStr = JSON.stringify(serverValue);
            const clientStr = JSON.stringify(clientValue);

            if (serverStr !== clientStr) {
                differences.push({
                    field: key,
                    serverValue,
                    clientValue
                });
            }
        });

        return differences;
    };

    const differences = getFieldDifferences();

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content conflict-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-warning" size={24} />
                        <h3>Conflict Detected</h3>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="conflict-message">
                        This record was modified by another user while you were editing it.
                        Please choose how to resolve this conflict:
                    </p>

                    {/* Resolution Strategy Selection */}
                    <div className="resolution-strategies">
                        <button
                            className={`strategy-card ${selectedStrategy === 'server' ? 'selected' : ''}`}
                            onClick={() => setSelectedStrategy('server')}
                        >
                            <div className="strategy-header">
                                <input
                                    type="radio"
                                    checked={selectedStrategy === 'server'}
                                    onChange={() => setSelectedStrategy('server')}
                                />
                                <span className="strategy-title">Keep Server Version</span>
                            </div>
                            <p className="strategy-description">
                                Discard your changes and use the version from the server.
                            </p>
                            <span className="strategy-time">
                                Last updated: {formatTimestamp(serverVersion?.updatedAt)}
                            </span>
                        </button>

                        <button
                            className={`strategy-card ${selectedStrategy === 'client' ? 'selected' : ''}`}
                            onClick={() => setSelectedStrategy('client')}
                        >
                            <div className="strategy-header">
                                <input
                                    type="radio"
                                    checked={selectedStrategy === 'client'}
                                    onChange={() => setSelectedStrategy('client')}
                                />
                                <span className="strategy-title">Keep My Changes</span>
                            </div>
                            <p className="strategy-description">
                                Override with your changes and discard the server version.
                            </p>
                            <span className="strategy-time">
                                Your version (unsaved)
                            </span>
                        </button>
                    </div>

                    {/* Field Differences */}
                    {differences.length > 0 && (
                        <div className="field-differences">
                            <h4>Changed Fields ({differences.length})</h4>
                            <div className="diff-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Server Version</th>
                                            <th>Your Version</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {differences.map(({ field, serverValue, clientValue }) => (
                                            <tr key={field}>
                                                <td className="field-name">{field}</td>
                                                <td className="server-value">
                                                    {JSON.stringify(serverValue) || '(empty)'}
                                                </td>
                                                <td className="client-value">
                                                    {JSON.stringify(clientValue) || '(empty)'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleResolve}
                        disabled={!selectedStrategy}
                    >
                        <Check size={18} />
                        Resolve Conflict
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConflictResolver;
