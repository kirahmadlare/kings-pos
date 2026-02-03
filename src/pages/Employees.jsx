/**
 * @fileoverview Employee Management Page
 * 
 * This page provides employee management including:
 * - Employee list with roles
 * - Add/Edit/Delete employees
 * - Employee PIN for quick clock-in
 * - View employee shift history and performance
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import { employeeSync } from '../services/sync';
import {
    Users, Search, Plus, Edit2, Trash2, X, Save,
    Phone, Mail, User, Shield, Clock, DollarSign,
    Key, Eye, EyeOff, CheckCircle, XCircle
} from 'lucide-react';
import AdvancedSearchBar from '../components/AdvancedSearchBar';
import Pagination from '../components/Pagination';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import './Employees.css';

/**
 * Available employee roles
 */
const ROLES = [
    { value: 'owner', label: 'Owner', color: '#f59e0b' },
    { value: 'manager', label: 'Manager', color: '#8b5cf6' },
    { value: 'cashier', label: 'Cashier', color: '#10b981' },
    { value: 'staff', label: 'Staff', color: '#6b7280' }
];

function Employees() {
    const { store } = useAuthStore();
    const { formatCurrency } = useCurrency();

    // State
    const [employees, setEmployees] = useState([]);
    const [clockedInEmployees, setClockedInEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeStats, setEmployeeStats] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'cashier',
        pin: '',
        hourlyRate: '',
        isActive: true
    });
    const [showPin, setShowPin] = useState(false);

    // Advanced search configuration
    const searchConfig = {
        searchFields: ['name', 'email', 'phone', 'role'],
        filterFields: {
            role: {
                label: 'Role',
                type: 'select',
                options: ROLES.map(r => ({ value: r.value, label: r.label }))
            },
            isActive: {
                label: 'Status',
                type: 'boolean'
            },
            hourlyRate: {
                label: 'Hourly Rate',
                type: 'range',
                min: 0
            }
        },
        defaultSort: 'name',
        defaultOrder: 'asc',
        itemsPerPage: 20
    };

    const search = useAdvancedSearch(employees, searchConfig);

    /**
     * Load employees on mount
     */
    useEffect(() => {
        if (store?.id) {
            loadData();
        }
    }, [store?.id]);

    /**
     * Fetch employees from database
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const employeeList = await db.employees
                .where('storeId')
                .equals(store.id)
                .toArray();
            setEmployees(employeeList);

            // Get currently clocked-in employees
            const clockedIn = await db.dbHelpers?.getClockedInEmployees?.(store.id) || [];
            setClockedInEmployees(clockedIn);
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
        setIsLoading(false);
    };

    /**
     * Open modal to add new employee
     */
    const handleAddEmployee = () => {
        setEditingEmployee(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            role: 'cashier',
            pin: '',
            hourlyRate: '',
            isActive: true
        });
        setShowModal(true);
    };

    /**
     * Open modal to edit existing employee
     */
    const handleEditEmployee = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name || '',
            email: employee.email || '',
            phone: employee.phone || '',
            role: employee.role || 'cashier',
            pin: employee.pin || '',
            hourlyRate: employee.hourlyRate?.toString() || '',
            isActive: employee.isActive !== false
        });
        setShowModal(true);
    };

    /**
     * Save employee (add or update)
     */
    const handleSaveEmployee = async () => {
        if (!formData.name.trim()) return;

        try {
            const employeeData = {
                ...formData,
                hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0
            };

            if (editingEmployee) {
                // Update existing employee and sync to server
                const result = await employeeSync.update(editingEmployee.id, employeeData);
                console.log('Employee updated, synced:', result.synced);
            } else {
                // Add new employee and sync to server
                const result = await employeeSync.create(employeeData, store.id);
                console.log('Employee created, synced:', result.synced);
            }
            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error('Failed to save employee:', error);
        }
    };

    /**
     * Delete an employee
     */
    const handleDeleteEmployee = async (employeeId) => {
        if (!window.confirm('Delete this employee? Their shift history will be preserved.')) {
            return;
        }

        try {
            const result = await employeeSync.delete(employeeId);
            console.log('Employee deleted, synced:', result.synced);
            await loadData();
        } catch (error) {
            console.error('Failed to delete employee:', error);
        }
    };

    /**
     * Toggle employee active status
     */
    const handleToggleActive = async (employee) => {
        try {
            await db.employees.update(employee.id, {
                isActive: !employee.isActive,
                updatedAt: new Date().toISOString()
            });
            await loadData();
        } catch (error) {
            console.error('Failed to toggle employee status:', error);
        }
    };

    /**
     * View employee performance
     */
    const handleViewPerformance = async (employee) => {
        setSelectedEmployee(employee);

        try {
            // Get all clock events for this employee
            const clockEvents = await db.clockEvents
                .where('storeId')
                .equals(store.id)
                .filter(e => e.employeeId === employee.id)
                .toArray();

            // Get all sales by this employee
            const sales = await db.sales
                .where('storeId')
                .equals(store.id)
                .filter(s => s.employeeId === employee.id)
                .toArray();

            // Calculate totals
            const totalShifts = clockEvents.filter(e => e.clockOut).length;
            const totalHours = clockEvents.reduce((sum, e) => {
                if (e.clockIn && e.clockOut) {
                    const hours = (new Date(e.clockOut) - new Date(e.clockIn)) / (1000 * 60 * 60);
                    return sum + hours;
                }
                return sum;
            }, 0);
            const totalSales = sales.length;
            const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

            setEmployeeStats({
                totalShifts,
                totalHours: totalHours.toFixed(1),
                totalSales,
                totalRevenue,
                avgSalesPerShift: totalShifts > 0 ? (totalSales / totalShifts).toFixed(1) : 0,
                recentShifts: clockEvents.slice(-5).reverse()
            });

            setShowPerformance(true);
        } catch (error) {
            console.error('Failed to load performance:', error);
        }
    };

    /**
     * Generate random 4-digit PIN
     */
    const generatePin = () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, pin }));
    };

    /**
     * Get role badge color
     */
    const getRoleColor = (role) => {
        const roleConfig = ROLES.find(r => r.value === role);
        return roleConfig?.color || '#6b7280';
    };

    /**
     * Check if employee is clocked in
     */
    const isClockedIn = (employeeId) => {
        return clockedInEmployees.some(e => e.id === employeeId);
    };

    if (isLoading) {
        return (
            <div className="employees-loading">
                <span className="spinner spinner-lg" />
                <p>Loading employees...</p>
            </div>
        );
    }

    return (
        <div className="employees">
            {/* Header */}
            <div className="employees-header">
                <div className="header-left">
                    <h2><Users size={24} /> Employees</h2>
                    <div className="header-stats">
                        <span className="stat">{employees.length} total</span>
                        <span className="stat stat-success">
                            <Clock size={14} /> {clockedInEmployees.length} on duty
                        </span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleAddEmployee}>
                    <Plus size={18} /> Add Employee
                </button>
            </div>

            {/* Advanced Search */}
            <div className="mb-4">
                <AdvancedSearchBar
                    searchQuery={search.searchQuery}
                    onSearchChange={search.setSearchQuery}
                    filters={search.filters}
                    filterFields={searchConfig.filterFields}
                    onUpdateFilter={search.updateFilter}
                    onRemoveFilter={search.removeFilter}
                    onClearFilters={search.clearFilters}
                    activeFilterCount={search.activeFilterCount}
                    sortBy={search.sortBy}
                    sortOrder={search.sortOrder}
                    onToggleSort={search.toggleSort}
                    sortOptions={[
                        { value: 'name', label: 'Name' },
                        { value: 'role', label: 'Role' },
                        { value: 'hourlyRate', label: 'Hourly Rate' }
                    ]}
                    placeholder="Search employees by name, email, phone, or role..."
                />
            </div>

            {/* Employees List */}
            <div className="employees-list">
                {search.data.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No employees found</h3>
                        <p>{employees.length === 0 ? 'Add your first employee to start managing shifts' : 'Try adjusting your search or filters'}</p>
                        {employees.length === 0 && (
                            <button className="btn btn-primary" onClick={handleAddEmployee}>
                                <Plus size={18} /> Add Employee
                            </button>
                        )}
                    </div>
                ) : (
                    search.data.map(employee => (
                        <div
                            key={employee.id}
                            className={`employee-card ${!employee.isActive ? 'inactive' : ''}`}
                        >
                            <div className="employee-avatar" style={{ backgroundColor: getRoleColor(employee.role) }}>
                                <User size={24} />
                            </div>
                            <div className="employee-info">
                                <div className="employee-name-row">
                                    <h4>{employee.name}</h4>
                                    {isClockedIn(employee.id) && (
                                        <span className="on-duty-badge">
                                            <Clock size={12} /> On Duty
                                        </span>
                                    )}
                                    {!employee.isActive && (
                                        <span className="inactive-badge">Inactive</span>
                                    )}
                                </div>
                                <div className="employee-details">
                                    <span
                                        className="role-badge"
                                        style={{ backgroundColor: getRoleColor(employee.role) + '20', color: getRoleColor(employee.role) }}
                                    >
                                        <Shield size={12} /> {ROLES.find(r => r.value === employee.role)?.label || employee.role}
                                    </span>
                                    {employee.phone && (
                                        <span><Phone size={14} /> {employee.phone}</span>
                                    )}
                                    {employee.email && (
                                        <span><Mail size={14} /> {employee.email}</span>
                                    )}
                                </div>
                            </div>
                            <div className="employee-actions">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleViewPerformance(employee)}
                                >
                                    <DollarSign size={16} /> Stats
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleEditEmployee(employee)}
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className={`btn btn-ghost btn-sm ${employee.isActive ? 'text-success' : 'text-danger'}`}
                                    onClick={() => handleToggleActive(employee)}
                                    title={employee.isActive ? 'Deactivate' : 'Activate'}
                                >
                                    {employee.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm text-danger"
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {search.totalPages > 1 && (
                <Pagination
                    currentPage={search.currentPage}
                    totalPages={search.totalPages}
                    totalResults={search.totalResults}
                    itemsPerPage={search.itemsPerPage}
                    onPageChange={search.goToPage}
                    onPrevPage={search.prevPage}
                    onNextPage={search.nextPage}
                />
            )}

            {/* Add/Edit Employee Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="input-group span-2">
                                    <label className="input-label">Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Employee name"
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="employee@email.com"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Role</label>
                                    <select
                                        className="input select"
                                        value={formData.role}
                                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        {ROLES.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Hourly Rate</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.hourlyRate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="input-group span-2">
                                    <label className="input-label">
                                        <Key size={14} /> PIN Code (for quick clock-in)
                                    </label>
                                    <div className="pin-input-row">
                                        <div className="input-wrapper">
                                            <input
                                                type={showPin ? 'text' : 'password'}
                                                className="input"
                                                value={formData.pin}
                                                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.slice(0, 4) }))}
                                                placeholder="4-digit PIN"
                                                maxLength={4}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm input-action"
                                                onClick={() => setShowPin(!showPin)}
                                            >
                                                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={generatePin}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEmployee}>
                                <Save size={18} /> Save Employee
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Modal */}
            {showPerformance && selectedEmployee && employeeStats && (
                <div className="modal-overlay" onClick={() => setShowPerformance(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <DollarSign size={20} /> {selectedEmployee.name} - Performance
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPerformance(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="stats-grid">
                                <div className="stat-card-sm">
                                    <span className="stat-value">{employeeStats.totalShifts}</span>
                                    <span className="stat-label">Total Shifts</span>
                                </div>
                                <div className="stat-card-sm">
                                    <span className="stat-value">{employeeStats.totalHours}h</span>
                                    <span className="stat-label">Hours Worked</span>
                                </div>
                                <div className="stat-card-sm">
                                    <span className="stat-value">{employeeStats.totalSales}</span>
                                    <span className="stat-label">Total Sales</span>
                                </div>
                                <div className="stat-card-sm">
                                    <span className="stat-value">{formatCurrency(employeeStats.totalRevenue)}</span>
                                    <span className="stat-label">Revenue Generated</span>
                                </div>
                            </div>

                            <h4 className="section-title">Recent Shifts</h4>
                            {employeeStats.recentShifts.length === 0 ? (
                                <p className="text-secondary text-center p-4">No shifts recorded yet</p>
                            ) : (
                                <div className="shifts-list">
                                    {employeeStats.recentShifts.map(shift => (
                                        <div key={shift.id} className="shift-item">
                                            <div className="shift-date">
                                                {new Date(shift.clockIn).toLocaleDateString()}
                                            </div>
                                            <div className="shift-time">
                                                {new Date(shift.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' - '}
                                                {shift.clockOut
                                                    ? new Date(shift.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : 'Active'
                                                }
                                            </div>
                                            <div className="shift-stats">
                                                <span>{shift.salesCount || 0} sales</span>
                                                <span>{formatCurrency(shift.salesTotal || 0)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Employees;
