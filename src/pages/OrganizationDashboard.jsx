/**
 * @fileoverview Organization Dashboard
 *
 * Multi-store overview and management for enterprise organizations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Users, Package, DollarSign, TrendingUp, Store,
    Plus, Edit2, Trash2, Settings, BarChart3, Grid, List, Eye, X
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './OrganizationDashboard.css';

function OrganizationDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState(null);
    const [stores, setStores] = useState([]);
    const [groups, setGroups] = useState([]);
    const [stats, setStats] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showOrgModal, setShowOrgModal] = useState(false);
    const [orgFormData, setOrgFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        loadOrganization();
    }, []);

    const loadOrganization = async () => {
        try {
            setLoading(true);

            // Get user's organization
            const orgsResponse = await apiRequest('/organizations');

            if (orgsResponse && orgsResponse.length > 0) {
                const org = orgsResponse[0];
                setOrganization(org);

                // Load stores, groups, and stats
                await Promise.all([
                    loadStores(org._id),
                    loadGroups(org._id),
                    loadStats(org._id)
                ]);
            }
        } catch (error) {
            console.error('Failed to load organization:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStores = async (orgId) => {
        try {
            const response = await apiRequest(`/stores?organizationId=${orgId}`);
            setStores(response || []);
        } catch (error) {
            console.error('Failed to load stores:', error);
        }
    };

    const loadGroups = async (orgId) => {
        try {
            const response = await apiRequest(`/organizations/${orgId}/groups`);
            setGroups(response || []);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const loadStats = async (orgId) => {
        try {
            const response = await apiRequest(`/organizations/${orgId}/stats`);
            setStats(response || {});
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleCreateGroup = () => {
        setEditingGroup(null);
        setShowGroupModal(true);
    };

    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setShowGroupModal(true);
    };

    const handleSaveGroup = async (groupData) => {
        try {
            if (editingGroup) {
                await apiRequest(`/organizations/${organization._id}/groups/${editingGroup._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(groupData)
                });
            } else {
                await apiRequest(`/organizations/${organization._id}/groups`, {
                    method: 'POST',
                    body: JSON.stringify(groupData)
                });
            }

            await loadGroups(organization._id);
            setShowGroupModal(false);
        } catch (error) {
            console.error('Failed to save group:', error);
            alert('Failed to save store group');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Are you sure you want to delete this store group?')) {
            return;
        }

        try {
            await apiRequest(`/organizations/${organization._id}/groups/${groupId}`, {
                method: 'DELETE'
            });

            await loadGroups(organization._id);
        } catch (error) {
            console.error('Failed to delete group:', error);
            alert(error.message || 'Failed to delete store group');
        }
    };

    const handleCreateOrganization = async (e) => {
        e.preventDefault();

        if (!orgFormData.name.trim()) {
            alert('Organization name is required');
            return;
        }

        try {
            await apiRequest('/organizations', {
                method: 'POST',
                body: JSON.stringify(orgFormData)
            });

            setShowOrgModal(false);
            setOrgFormData({ name: '', description: '' });

            // Reload to show the new organization
            await loadOrganization();
        } catch (error) {
            console.error('Failed to create organization:', error);
            alert(error.message || 'Failed to create organization');
        }
    };

    if (loading) {
        return (
            <div className="organization-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading organization...</p>
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="organization-dashboard">
                <div className="empty-state">
                    <Building2 size={64} />
                    <h2>No Organization Found</h2>
                    <p>Create an organization to manage multiple stores</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowOrgModal(true)}
                    >
                        <Plus size={18} />
                        Create Organization
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="organization-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>{organization.name}</h1>
                    <p className="subtitle">Multi-Store Management Dashboard</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/stores')}
                    >
                        <Store size={18} />
                        Manage Stores
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/settings')}
                    >
                        <Settings size={18} />
                        Settings
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <Store size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Total Stores</div>
                        <div className="kpi-value">{stores.length}</div>
                        <div className="kpi-detail">
                            {stores.filter(s => s.status === 'active').length} active
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                        <Grid size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Store Groups</div>
                        <div className="kpi-value">{groups.length}</div>
                        <div className="kpi-detail">
                            {groups.filter(g => g.type === 'region').length} regions
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f59e0b)' }}>
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Subscription</div>
                        <div className="kpi-value">{organization.subscription?.plan || 'Basic'}</div>
                        <div className="kpi-detail">
                            {stores.length}/{organization.subscription?.maxStores || 5} stores
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #10b981)' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-label">Status</div>
                        <div className="kpi-value">{organization.subscription?.status || 'Active'}</div>
                        <div className="kpi-detail">
                            {organization.isActive ? 'Operational' : 'Inactive'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Groups Section */}
            <div className="section">
                <div className="section-header">
                    <h2>Store Groups</h2>
                    <button
                        className="btn btn-primary"
                        onClick={handleCreateGroup}
                    >
                        <Plus size={18} />
                        Create Group
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="empty-section">
                        <Grid size={48} />
                        <p>No store groups yet</p>
                        <button className="btn btn-secondary" onClick={handleCreateGroup}>
                            Create First Group
                        </button>
                    </div>
                ) : (
                    <div className="groups-grid">
                        {groups.map(group => (
                            <div key={group._id} className="group-card">
                                <div className="group-header">
                                    <div className="group-info">
                                        <h3>{group.name}</h3>
                                        <span className="group-type">{group.type}</span>
                                    </div>
                                    <div className="group-actions">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditGroup(group)}
                                            title="Edit group"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleDeleteGroup(group._id)}
                                            title="Delete group"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="group-description">{group.description}</p>
                                <div className="group-stats">
                                    <span><Store size={14} /> {group.storeCount || 0} stores</span>
                                    {group.managerId && (
                                        <span><Users size={14} /> {group.managerId.name}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stores Section */}
            <div className="section">
                <div className="section-header">
                    <h2>All Stores</h2>
                    <div className="view-controls">
                        <button
                            className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {stores.length === 0 ? (
                    <div className="empty-section">
                        <Store size={48} />
                        <p>No stores yet</p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/stores')}
                        >
                            Add First Store
                        </button>
                    </div>
                ) : (
                    <div className={`stores-${viewMode}`}>
                        {stores.map(store => (
                            <div key={store._id} className="store-card">
                                <div className="store-header">
                                    <div className="store-info">
                                        <h3>{store.name}</h3>
                                        <span className={`store-status status-${store.status}`}>
                                            {store.status}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => navigate('/stores')}
                                    >
                                        <Eye size={14} />
                                        View
                                    </button>
                                </div>
                                <div className="store-details">
                                    {store.address && <p><Building2 size={14} /> {store.address}</p>}
                                    {store.phone && <p>📞 {store.phone}</p>}
                                    <p className="store-type">{store.storeType || 'Standalone'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Organization Modal */}
            {showOrgModal && (
                <div className="modal-overlay" onClick={() => setShowOrgModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create Organization</h2>
                            <button className="btn-close" onClick={() => setShowOrgModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrganization}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Organization Name *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter organization name"
                                        value={orgFormData.name}
                                        onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <textarea
                                        className="form-control"
                                        placeholder="Enter organization description"
                                        rows={3}
                                        value={orgFormData.description}
                                        onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowOrgModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={16} />
                                    Create Organization
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {showGroupModal && (
                <GroupModal
                    group={editingGroup}
                    onSave={handleSaveGroup}
                    onClose={() => setShowGroupModal(false)}
                />
            )}
        </div>
    );
}

// Group Modal Component
function GroupModal({ group, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: group?.name || '',
        description: group?.description || '',
        type: group?.type || 'region'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{group ? 'Edit Store Group' : 'Create Store Group'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Group Name *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="form-control"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label>Group Type *</label>
                        <select
                            className="form-control"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="region">Region</option>
                            <option value="franchise">Franchise</option>
                            <option value="department">Department</option>
                            <option value="brand">Brand</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {group ? 'Update Group' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OrganizationDashboard;
