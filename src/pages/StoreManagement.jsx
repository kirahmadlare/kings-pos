/**
 * @fileoverview Store Management Page
 *
 * Manage multiple store locations
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { toast } from '../stores/toastStore';
import './StoreManagement.css';

function StoreManagement() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [storeStats, setStoreStats] = useState({});

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        try {
            setLoading(true);
            const data = await api.stores.getAll();
            setStores(data);

            // Load stats for each store
            const stats = {};
            await Promise.all(
                data.map(async (store) => {
                    try {
                        const storeStat = await api.stores.getStats(store._id);
                        stats[store._id] = storeStat;
                    } catch (error) {
                        console.error(`Failed to load stats for store ${store._id}:`, error);
                    }
                })
            );
            setStoreStats(stats);
        } catch (error) {
            console.error('Failed to load stores:', error);
            toast.error('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingStore(null);
        setShowModal(true);
    };

    const handleEdit = (store) => {
        setEditingStore(store);
        setShowModal(true);
    };

    const handleDelete = async (store) => {
        if (!confirm(`Are you sure you want to deactivate "${store.name}"?`)) {
            return;
        }

        try {
            await api.stores.delete(store._id);
            toast.success('Store deactivated successfully');
            loadStores();
        } catch (error) {
            console.error('Failed to delete store:', error);
            toast.error('Failed to deactivate store');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading stores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container store-management-page">
            <div className="page-header">
                <h1>Store Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <Plus size={18} />
                    Add Store
                </button>
            </div>

            <div className="stores-grid">
                {stores.map(store => (
                    <StoreCard
                        key={store._id}
                        store={store}
                        stats={storeStats[store._id]}
                        onEdit={() => handleEdit(store)}
                        onDelete={() => handleDelete(store)}
                    />
                ))}
            </div>

            {stores.length === 0 && (
                <div className="empty-state">
                    <p>No stores yet. Create your first store to get started!</p>
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={18} />
                        Create Store
                    </button>
                </div>
            )}

            {showModal && (
                <StoreFormModal
                    store={editingStore}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        loadStores();
                    }}
                />
            )}
        </div>
    );
}

/**
 * Store Card Component
 */
function StoreCard({ store, stats, onEdit, onDelete }) {
    return (
        <div className="store-card">
            <div className="store-card-header">
                <h3>{store.name}</h3>
                <div className="store-card-actions">
                    <button
                        className="btn btn-small btn-ghost btn-icon"
                        onClick={onEdit}
                        title="Edit store"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        className="btn btn-small btn-ghost btn-icon text-danger"
                        onClick={onDelete}
                        title="Deactivate store"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="store-card-info">
                {store.address && (
                    <div className="info-row">
                        <span className="info-label">Address:</span>
                        <span className="info-value">{store.address}</span>
                    </div>
                )}
                {store.phone && (
                    <div className="info-row">
                        <span className="info-label">Phone:</span>
                        <span className="info-value">{store.phone}</span>
                    </div>
                )}
                <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className={`status-badge status-${store.status}`}>
                        {store.status}
                    </span>
                </div>
            </div>

            {stats && (
                <div className="store-card-stats">
                    <div className="stat-item">
                        <TrendingUp size={16} className="stat-icon" />
                        <div>
                            <div className="stat-value">${stats.todaySales.revenue.toFixed(2)}</div>
                            <div className="stat-label">Today's Sales</div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <Users size={16} className="stat-icon" />
                        <div>
                            <div className="stat-value">{stats.customers}</div>
                            <div className="stat-label">Customers</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Store Form Modal Component
 */
function StoreFormModal({ store, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: store?.name || '',
        address: store?.address || '',
        phone: store?.phone || '',
        email: store?.email || '',
        currency: store?.currency || 'USD',
        taxRate: store?.taxRate || 0
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            if (store) {
                await api.stores.update(store._id, formData);
                toast.success('Store updated successfully');
            } else {
                await api.stores.create(formData);
                toast.success('Store created successfully');
            }

            onSave();
        } catch (error) {
            console.error('Failed to save store:', error);
            toast.error('Failed to save store');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{store ? 'Edit Store' : 'Create New Store'}</h3>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Store Name *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                className="form-control"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                className="form-control"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Currency</label>
                            <select
                                className="form-control"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CAD">CAD ($)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tax Rate (%)</label>
                            <input
                                type="number"
                                className="form-control"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.taxRate}
                                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (store ? 'Update Store' : 'Create Store')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StoreManagement;
