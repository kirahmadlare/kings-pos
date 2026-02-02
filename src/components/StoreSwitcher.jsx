/**
 * @fileoverview Store Switcher Component
 *
 * Enhanced dropdown to switch between multiple stores with:
 * - Store count badge
 * - Animated transitions
 * - LocalStorage persistence
 * - Data refresh on switch
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Store, Check, Building2, MapPin } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import './StoreSwitcher.css';

function StoreSwitcher() {
    const [stores, setStores] = useState([]);
    const [currentStore, setCurrentStore] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(false);
    const { user, setUser } = useAuthStore();

    useEffect(() => {
        loadStores();
    }, []);

    useEffect(() => {
        // Load last selected store from localStorage
        const savedStoreId = localStorage.getItem('selectedStoreId');
        if (savedStoreId && stores.length > 0) {
            const savedStore = stores.find(s => s._id === savedStoreId);
            if (savedStore) {
                setCurrentStore(savedStore);
            }
        }
    }, [stores]);

    const loadStores = async () => {
        try {
            const data = await api.stores.getAll();
            setStores(data);

            // Set current store from user data or localStorage
            const savedStoreId = localStorage.getItem('selectedStoreId');
            let current = null;

            if (savedStoreId) {
                current = data.find(s => s._id === savedStoreId);
            }

            if (!current && user?.currentStoreId) {
                current = data.find(s => s._id === user.currentStoreId);
            }

            if (!current && data.length > 0) {
                current = data[0];
            }

            if (current) {
                setCurrentStore(current);
                localStorage.setItem('selectedStoreId', current._id);
            }
        } catch (error) {
            console.error('Failed to load stores:', error);
            toast.error('Failed to load stores', 'Error');
        }
    };

    const switchStore = async (store) => {
        if (store._id === currentStore?._id) {
            setIsOpen(false);
            return;
        }

        try {
            setSwitching(true);
            await api.stores.switch(store._id);

            // Save to localStorage
            localStorage.setItem('selectedStoreId', store._id);

            // Update current store
            setCurrentStore(store);

            // Update user object
            if (user) {
                setUser({
                    ...user,
                    currentStoreId: store._id,
                    storeId: store._id
                });
            }

            setIsOpen(false);

            // Show success message
            toast.success(`Switched to ${store.name}`, 'Store Changed');

            // Reload page to refresh data for new store
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Failed to switch store:', error);
            toast.error('Failed to switch store', 'Error');
            setSwitching(false);
        }
    };

    if (stores.length === 0) {
        return null;
    }

    if (stores.length === 1) {
        // Show badge only if only one store
        return currentStore ? (
            <div className="store-badge">
                <Building2 size={16} />
                <span>{currentStore.name}</span>
            </div>
        ) : null;
    }

    return (
        <div className="store-switcher">
            <button
                className="store-switcher-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading || switching}
            >
                <Building2 size={16} />
                <span className="store-name">{currentStore?.name || 'Select Store'}</span>
                <span className="store-count-badge">{stores.length}</span>
                <ChevronDown size={14} className={`chevron ${isOpen ? 'rotate' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="store-switcher-overlay" onClick={() => setIsOpen(false)} />
                    <div className="store-switcher-dropdown store-switcher-dropdown-animated">
                        <div className="dropdown-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Store size={16} />
                                <span>Switch Store</span>
                            </div>
                            <div className="store-total-badge">
                                {stores.length} {stores.length === 1 ? 'store' : 'stores'}
                            </div>
                        </div>
                        <div className="dropdown-list">
                            {stores.map((store, index) => (
                                <button
                                    key={store._id}
                                    className={`dropdown-item ${store._id === currentStore?._id ? 'active' : ''}`}
                                    onClick={() => switchStore(store)}
                                    disabled={switching}
                                    style={{
                                        animationDelay: `${index * 0.05}s`
                                    }}
                                >
                                    <div className="store-icon-wrapper">
                                        <Building2 size={18} />
                                    </div>
                                    <div className="store-info">
                                        <span className="store-name-item">{store.name}</span>
                                        {store.address && (
                                            <span className="store-address">
                                                <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                {store.address}
                                            </span>
                                        )}
                                        {store._id === currentStore?._id && (
                                            <span className="current-store-label">Current Store</span>
                                        )}
                                    </div>
                                    {store._id === currentStore?._id && (
                                        <Check size={18} className="check-icon" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {switching && (
                            <div className="dropdown-footer">
                                <div className="switching-indicator">
                                    <div className="switching-spinner"></div>
                                    <span>Switching store...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default StoreSwitcher;
