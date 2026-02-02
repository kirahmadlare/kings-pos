/**
 * @fileoverview Permissions Manager Page
 *
 * Manage granular permissions for users
 */

import { useState, useEffect } from 'react';
import { Shield, User, Check, X, Save } from 'lucide-react';
import { apiRequest } from '../services/api';
import './Settings.css';

const PERMISSION_CATEGORIES = {
    inventory: {
        label: 'Inventory Management',
        actions: {
            create: 'Create Products',
            read: 'View Products',
            update: 'Update Products',
            delete: 'Delete Products'
        }
    },
    sales: {
        label: 'Sales Management',
        actions: {
            create: 'Create Sales',
            read: 'View Sales',
            void: 'Void Sales',
            refund: 'Process Refunds'
        }
    },
    customers: {
        label: 'Customer Management',
        actions: {
            create: 'Add Customers',
            read: 'View Customers',
            update: 'Update Customers',
            delete: 'Delete Customers'
        }
    },
    employees: {
        label: 'Employee Management',
        actions: {
            create: 'Add Employees',
            read: 'View Employees',
            update: 'Update Employees',
            delete: 'Delete Employees'
        }
    },
    reports: {
        label: 'Reports & Analytics',
        actions: {
            view: 'View Reports',
            export: 'Export Reports',
            financial: 'View Financial Reports'
        }
    },
    settings: {
        label: 'Settings',
        actions: {
            view: 'View Settings',
            update: 'Modify Settings'
        }
    },
    admin: {
        label: 'Administration',
        actions: {
            users: 'Manage Users',
            stores: 'Manage Stores',
            system: 'System Administration'
        }
    }
};

function PermissionsManager() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            // Assuming there's an endpoint to get all users
            const data = await apiRequest('/admin/users');
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setPermissions(user.permissions || {});
    };

    const handleTogglePermission = (category, action) => {
        setPermissions(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [action]: !prev[category]?.[action]
            }
        }));
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;

        try {
            setSaving(true);
            await apiRequest(`/admin/users/${selectedUser._id}/permissions`, {
                method: 'PUT',
                body: JSON.stringify({ permissions })
            });

            alert('Permissions updated successfully');
            loadUsers();
        } catch (error) {
            console.error('Failed to save permissions:', error);
            alert('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleSetPreset = (preset) => {
        if (preset === 'admin') {
            // Admin gets all permissions
            const adminPermissions = {};
            Object.keys(PERMISSION_CATEGORIES).forEach(category => {
                adminPermissions[category] = {};
                Object.keys(PERMISSION_CATEGORIES[category].actions).forEach(action => {
                    adminPermissions[category][action] = true;
                });
            });
            setPermissions(adminPermissions);
        } else if (preset === 'manager') {
            // Manager gets most permissions except admin
            const managerPermissions = {};
            Object.keys(PERMISSION_CATEGORIES).forEach(category => {
                managerPermissions[category] = {};
                Object.keys(PERMISSION_CATEGORIES[category].actions).forEach(action => {
                    managerPermissions[category][action] = category !== 'admin';
                });
            });
            setPermissions(managerPermissions);
        } else if (preset === 'cashier') {
            // Cashier gets basic permissions
            setPermissions({
                inventory: { create: false, read: true, update: false, delete: false },
                sales: { create: true, read: true, void: false, refund: false },
                customers: { create: true, read: true, update: true, delete: false },
                employees: { create: false, read: false, update: false, delete: false },
                reports: { view: false, export: false, financial: false },
                settings: { view: false, update: false },
                admin: { users: false, stores: false, system: false }
            });
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>Permissions Manager</h1>
                <p>Manage granular permissions for users</p>
            </div>

            <div className="permissions-layout">
                {/* Users List */}
                <div className="users-sidebar">
                    <h3>Users</h3>
                    <div className="users-list">
                        {users.map(user => (
                            <div
                                key={user._id}
                                className={`user-item ${selectedUser?._id === user._id ? 'active' : ''}`}
                                onClick={() => handleSelectUser(user)}
                            >
                                <User size={20} />
                                <div>
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-role">{user.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permissions Editor */}
                <div className="permissions-editor">
                    {selectedUser ? (
                        <>
                            <div className="editor-header">
                                <div>
                                    <h2>{selectedUser.name}</h2>
                                    <p className="user-email">{selectedUser.email}</p>
                                </div>
                                <div className="preset-buttons">
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleSetPreset('cashier')}
                                    >
                                        Cashier Preset
                                    </button>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleSetPreset('manager')}
                                    >
                                        Manager Preset
                                    </button>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleSetPreset('admin')}
                                    >
                                        Admin Preset
                                    </button>
                                </div>
                            </div>

                            <div className="permissions-grid">
                                {Object.entries(PERMISSION_CATEGORIES).map(([category, config]) => (
                                    <div key={category} className="permission-category">
                                        <div className="category-header">
                                            <Shield size={20} />
                                            <h3>{config.label}</h3>
                                        </div>
                                        <div className="permission-actions">
                                            {Object.entries(config.actions).map(([action, label]) => {
                                                const isEnabled = permissions[category]?.[action];
                                                return (
                                                    <div
                                                        key={action}
                                                        className={`permission-item ${isEnabled ? 'enabled' : 'disabled'}`}
                                                        onClick={() => handleTogglePermission(category, action)}
                                                    >
                                                        <div className="permission-checkbox">
                                                            {isEnabled ? (
                                                                <Check size={16} />
                                                            ) : (
                                                                <X size={16} />
                                                            )}
                                                        </div>
                                                        <span>{label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="editor-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSavePermissions}
                                    disabled={saving}
                                >
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Permissions'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <Shield size={64} />
                            <h3>Select a User</h3>
                            <p>Choose a user from the list to manage their permissions</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .permissions-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 2rem;
                    margin-top: 2rem;
                }

                .users-sidebar {
                    background: var(--card-background);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                }

                .users-sidebar h3 {
                    margin: 0 0 1rem 0;
                    font-size: 1rem;
                    color: var(--text-primary);
                }

                .users-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .user-item:hover {
                    background: var(--surface);
                }

                .user-item.active {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary-color);
                }

                .user-name {
                    font-weight: 500;
                    font-size: 0.875rem;
                }

                .user-role {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }

                .permissions-editor {
                    background: var(--card-background);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                }

                .editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .user-email {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .preset-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .permissions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .permission-category {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 1rem;
                }

                .category-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .category-header h3 {
                    margin: 0;
                    font-size: 0.9375rem;
                }

                .permission-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .permission-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                }

                .permission-item:hover {
                    background: var(--surface);
                }

                .permission-item.enabled {
                    background: rgba(16, 185, 129, 0.1);
                }

                .permission-item.enabled .permission-checkbox {
                    background: var(--success-color);
                    color: white;
                }

                .permission-item.disabled .permission-checkbox {
                    background: var(--border-color);
                    color: var(--text-secondary);
                }

                .permission-checkbox {
                    width: 20px;
                    height: 20px;
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .editor-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-color);
                }

                @media (max-width: 968px) {
                    .permissions-layout {
                        grid-template-columns: 1fr;
                    }

                    .permissions-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default PermissionsManager;
