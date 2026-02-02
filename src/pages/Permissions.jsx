/**
 * @fileoverview Permissions Management Page
 * 
 * Allows store owners to:
 * - View and edit role templates
 * - Assign permissions to individual employees
 * - Control module access and CRUD permissions
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePermissions } from '../hooks/usePermissions';
import db from '../db';
import {
    Shield, Users, Edit2, Save, X, Check, Eye, Plus, Trash2,
    LayoutDashboard, Package, ShoppingCart, UserCheck, Clock,
    FileText, Settings, Lock, Unlock
} from 'lucide-react';
import './Permissions.css';

/**
 * Available modules and their icons
 */
const MODULES = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'pos', label: 'POS', icon: ShoppingCart },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'orders', label: 'Orders', icon: FileText },
    { key: 'employees', label: 'Employees', icon: UserCheck },
    { key: 'shifts', label: 'Shifts', icon: Clock },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'settings', label: 'Settings', icon: Settings }
];

/**
 * Default role permissions
 */
const DEFAULT_ROLES = {
    owner: {
        label: 'Owner',
        color: '#f59e0b',
        permissions: Object.fromEntries(
            MODULES.map(m => [m.key, { read: true, create: true, update: true, delete: true }])
        )
    },
    manager: {
        label: 'Manager',
        color: '#8b5cf6',
        permissions: {
            dashboard: { read: true },
            inventory: { read: true, create: true, update: true, delete: true },
            pos: { read: true, create: true },
            customers: { read: true, create: true, update: true, delete: false },
            orders: { read: true, update: true },
            employees: { read: true },
            shifts: { read: true, create: true, update: true },
            reports: { read: true },
            settings: { read: true }
        }
    },
    cashier: {
        label: 'Cashier',
        color: '#10b981',
        permissions: {
            dashboard: { read: true },
            inventory: { read: true },
            pos: { read: true, create: true },
            customers: { read: true, create: true },
            orders: { read: true },
            employees: {},
            shifts: { read: true, create: true, update: true },
            reports: {},
            settings: {}
        }
    },
    staff: {
        label: 'Staff',
        color: '#6b7280',
        permissions: {
            dashboard: { read: true },
            inventory: { read: true },
            pos: { read: true, create: true },
            customers: { read: true },
            orders: { read: true },
            employees: {},
            shifts: { read: true, create: true },
            reports: {},
            settings: {}
        }
    }
};

function Permissions() {
    const { store } = useAuthStore();
    const { isOwner } = usePermissions('permissions');

    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editingPermissions, setEditingPermissions] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('employees'); // 'employees' or 'roles'

    useEffect(() => {
        if (store?.id) {
            loadEmployees();
        }
    }, [store?.id]);

    const loadEmployees = async () => {
        setIsLoading(true);
        try {
            const list = await db.employees
                .where('storeId')
                .equals(store.id)
                .toArray();
            setEmployees(list);
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
        setIsLoading(false);
    };

    const handleEditPermissions = (employee) => {
        setSelectedEmployee(employee);
        // Use existing permissions or default based on role
        const defaultPerms = DEFAULT_ROLES[employee.role]?.permissions || DEFAULT_ROLES.staff.permissions;
        setEditingPermissions(employee.permissions || { ...defaultPerms });
    };

    const handleTogglePermission = (module, action) => {
        setEditingPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: !prev[module]?.[action]
            }
        }));
    };

    const handleApplyRoleTemplate = (roleKey) => {
        const template = DEFAULT_ROLES[roleKey];
        if (template) {
            setEditingPermissions({ ...template.permissions });
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedEmployee || !editingPermissions) return;

        try {
            await db.employees.update(selectedEmployee.id, {
                permissions: editingPermissions,
                updatedAt: new Date().toISOString()
            });

            // Update local state
            setEmployees(prev =>
                prev.map(e =>
                    e.id === selectedEmployee.id
                        ? { ...e, permissions: editingPermissions }
                        : e
                )
            );

            setSelectedEmployee(null);
            setEditingPermissions(null);
        } catch (error) {
            console.error('Failed to save permissions:', error);
        }
    };

    const getPermissionCount = (employee) => {
        const perms = employee.permissions || DEFAULT_ROLES[employee.role]?.permissions || {};
        let count = 0;
        Object.values(perms).forEach(p => {
            if (p.read) count++;
            if (p.create) count++;
            if (p.update) count++;
            if (p.delete) count++;
        });
        return count;
    };

    if (!isOwner) {
        return (
            <div className="permissions-denied">
                <Lock size={48} />
                <h2>Access Denied</h2>
                <p>Only store owners can manage permissions.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="permissions-loading">
                <span className="spinner spinner-lg" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="permissions">
            <div className="permissions-header">
                <div className="header-left">
                    <h2><Shield size={24} /> Permissions</h2>
                    <p className="header-subtitle">Control what each employee can access</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="permissions-tabs">
                <button
                    className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
                    onClick={() => setActiveTab('employees')}
                >
                    <Users size={18} /> Employee Permissions
                </button>
                <button
                    className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <Shield size={18} /> Role Templates
                </button>
            </div>

            {/* Employee Permissions */}
            {activeTab === 'employees' && (
                <div className="permissions-content">
                    {employees.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <h3>No employees yet</h3>
                            <p>Add employees to manage their permissions</p>
                        </div>
                    ) : (
                        <div className="employees-permissions-list">
                            {employees.map(employee => (
                                <div key={employee.id} className="employee-permission-card">
                                    <div className="employee-info">
                                        <div
                                            className="employee-avatar"
                                            style={{
                                                backgroundColor: DEFAULT_ROLES[employee.role]?.color || '#6b7280'
                                            }}
                                        >
                                            {employee.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4>{employee.name}</h4>
                                            <span
                                                className="role-badge"
                                                style={{
                                                    backgroundColor: (DEFAULT_ROLES[employee.role]?.color || '#6b7280') + '20',
                                                    color: DEFAULT_ROLES[employee.role]?.color || '#6b7280'
                                                }}
                                            >
                                                {DEFAULT_ROLES[employee.role]?.label || employee.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="permission-summary">
                                        <span className="permission-count">
                                            <Check size={14} /> {getPermissionCount(employee)} permissions
                                        </span>
                                        {employee.permissions && (
                                            <span className="custom-badge">Custom</span>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleEditPermissions(employee)}
                                    >
                                        <Edit2 size={16} /> Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Role Templates View */}
            {activeTab === 'roles' && (
                <div className="permissions-content">
                    <div className="role-templates-grid">
                        {Object.entries(DEFAULT_ROLES).map(([key, role]) => (
                            <div key={key} className="role-template-card">
                                <div
                                    className="role-header"
                                    style={{ borderLeftColor: role.color }}
                                >
                                    <Shield size={20} style={{ color: role.color }} />
                                    <h4>{role.label}</h4>
                                </div>
                                <div className="role-permissions">
                                    {MODULES.map(module => {
                                        const perms = role.permissions[module.key] || {};
                                        const hasAccess = perms.read;
                                        return (
                                            <div
                                                key={module.key}
                                                className={`role-module ${hasAccess ? 'has-access' : 'no-access'}`}
                                            >
                                                <module.icon size={14} />
                                                <span>{module.label}</span>
                                                <div className="perm-icons">
                                                    {perms.read && <Eye size={10} title="Read" />}
                                                    {perms.create && <Plus size={10} title="Create" />}
                                                    {perms.update && <Edit2 size={10} title="Update" />}
                                                    {perms.delete && <Trash2 size={10} title="Delete" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Permissions Modal */}
            {selectedEmployee && editingPermissions && (
                <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Shield size={20} /> Edit Permissions - {selectedEmployee.name}
                            </h3>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => setSelectedEmployee(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Quick Apply Templates */}
                            <div className="template-buttons">
                                <span className="template-label">Apply template:</span>
                                {Object.entries(DEFAULT_ROLES).map(([key, role]) => (
                                    <button
                                        key={key}
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleApplyRoleTemplate(key)}
                                        style={{ borderColor: role.color }}
                                    >
                                        {role.label}
                                    </button>
                                ))}
                            </div>

                            {/* Permission Matrix */}
                            <div className="permission-matrix">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Module</th>
                                            <th><Eye size={14} /> Read</th>
                                            <th><Plus size={14} /> Create</th>
                                            <th><Edit2 size={14} /> Update</th>
                                            <th><Trash2 size={14} /> Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MODULES.map(module => {
                                            const perms = editingPermissions[module.key] || {};
                                            return (
                                                <tr key={module.key}>
                                                    <td>
                                                        <module.icon size={16} />
                                                        {module.label}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={perms.read || false}
                                                            onChange={() => handleTogglePermission(module.key, 'read')}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={perms.create || false}
                                                            onChange={() => handleTogglePermission(module.key, 'create')}
                                                            disabled={!perms.read}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={perms.update || false}
                                                            onChange={() => handleTogglePermission(module.key, 'update')}
                                                            disabled={!perms.read}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={perms.delete || false}
                                                            onChange={() => handleTogglePermission(module.key, 'delete')}
                                                            disabled={!perms.read}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedEmployee(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSavePermissions}
                            >
                                <Save size={18} /> Save Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Permissions;
