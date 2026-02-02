import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import NotificationBell from './NotificationBell';
import { Menu, Sun, Moon, User, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { syncPendingChanges } from '../services/sync';
import './Header.css';

const pageTitle = {
    '/dashboard': 'Dashboard',
    '/inventory': 'Inventory',
    '/pos': 'Point of Sale',
    '/orders': 'Orders',
    '/reports': 'Reports',
    '/settings': 'Settings',
    '/employees': 'Employees',
    '/shifts': 'Shifts',
};

function Header() {
    const { user, isOnline, store } = useAuthStore();
    const { theme, setTheme, toggleSidebar } = useSettingsStore();
    const location = useLocation();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');

    const title = pageTitle[location.pathname] || 'King\'s POS';

    const handleThemeToggle = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const handleSyncNow = async () => {
        if (!isOnline || isSyncing) return;

        setIsSyncing(true);
        setSyncMessage('Syncing...');

        try {
            const result = await syncPendingChanges(store.id);

            if (result.success) {
                setSyncMessage(`✓ Synced successfully!`);
                setTimeout(() => setSyncMessage(''), 3000);

                // Reload current page to show updated data
                window.location.reload();
            } else {
                setSyncMessage(`✗ Sync failed: ${result.error || 'Unknown error'}`);
                setTimeout(() => setSyncMessage(''), 5000);
            }
        } catch (error) {
            console.error('Sync error:', error);
            setSyncMessage(`✗ Sync failed: ${error.message}`);
            setTimeout(() => setSyncMessage(''), 5000);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="btn btn-ghost btn-icon header-menu-btn"
                    onClick={toggleSidebar}
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>
                <h1 className="header-title">{title}</h1>
            </div>

            <div className="header-right">
                <div className={`sync-status ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Connected to cloud' : 'Offline mode'}>
                    {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
                </div>

                {/* Sync Now Button */}
                <button
                    className={`btn btn-ghost btn-icon ${isSyncing ? 'syncing' : ''}`}
                    onClick={handleSyncNow}
                    disabled={!isOnline || isSyncing}
                    title={isSyncing ? 'Syncing...' : 'Sync all data now'}
                    aria-label="Sync now"
                >
                    <RefreshCw size={18} className={isSyncing ? 'spin' : ''} />
                </button>

                {/* Sync Message */}
                {syncMessage && (
                    <div className="sync-message" style={{
                        position: 'absolute',
                        top: '50px',
                        right: '200px',
                        background: syncMessage.includes('✓') ? '#10b981' : '#ef4444',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                        {syncMessage}
                    </div>
                )}

                <button
                    className="btn btn-ghost btn-icon"
                    onClick={handleThemeToggle}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <NotificationBell />

                <div className="header-user">
                    <div className="avatar">
                        {user?.name?.charAt(0).toUpperCase() || <User size={18} />}
                    </div>
                    <span className="header-user-name">{user?.name || 'User'}</span>
                </div>
            </div>
        </header>
    );
}

export default Header;
