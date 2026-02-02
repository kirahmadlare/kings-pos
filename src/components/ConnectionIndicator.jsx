/**
 * @fileoverview Connection Indicator Component
 *
 * Shows real-time connection status in the UI
 */

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './ConnectionIndicator.css';

/**
 * ConnectionIndicator Component
 * Displays connection status and provides manual reconnect
 */
function ConnectionIndicator() {
    const { isOnline, reconnectAttempts, reconnect } = useOnlineStatus();

    // Don't show anything if online
    if (isOnline) {
        return null;
    }

    return (
        <div className="connection-indicator offline">
            <div className="connection-content">
                <WifiOff size={18} />
                <span className="connection-text">
                    {reconnectAttempts > 0
                        ? `Reconnecting... (Attempt ${reconnectAttempts})`
                        : 'Offline - Changes will sync when online'
                    }
                </span>
                <button
                    className="btn btn-small btn-ghost"
                    onClick={reconnect}
                    title="Try to reconnect"
                >
                    <RefreshCw size={16} />
                    Retry
                </button>
            </div>
        </div>
    );
}

/**
 * ConnectionStatus Badge
 * Compact status indicator for header/navbar
 */
export function ConnectionBadge() {
    const { isOnline } = useOnlineStatus();

    return (
        <div className={`connection-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? (
                <Wifi size={16} className="icon-online" />
            ) : (
                <WifiOff size={16} className="icon-offline" />
            )}
            <span className="badge-text">
                {isOnline ? 'Online' : 'Offline'}
            </span>
        </div>
    );
}

export default ConnectionIndicator;
