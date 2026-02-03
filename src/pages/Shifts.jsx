/**
 * @fileoverview Shift & Schedule Management Page
 * 
 * This page provides shift scheduling including:
 * - Weekly calendar view
 * - Create/Edit/Delete shifts
 * - Clock in/out functionality
 * - Shift summary with sales activity at clock out
 * - Current employees on duty
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db, { dbHelpers } from '../db';
import {
    Calendar, Clock, Plus, Edit2, Trash2, X, Save,
    ChevronLeft, ChevronRight, Play, Square, User,
    DollarSign, Package, AlertCircle
} from 'lucide-react';
import './Shifts.css';

/**
 * Get the start of the week (Sunday)
 */
const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Format time for display
 */
const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
};

/**
 * Format date for display
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};

function Shifts() {
    const { store, user } = useAuthStore();
    const { formatCurrency } = useCurrency();

    // State
    const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [clockEvents, setClockEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showClockModal, setShowClockModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [shiftSummary, setShiftSummary] = useState(null);

    // Form state
    const [shiftForm, setShiftForm] = useState({
        employeeId: '',
        date: '',
        startTime: '09:00',
        endTime: '17:00',
        notes: ''
    });

    // Clock in state
    const [clockPin, setClockPin] = useState('');
    const [clockError, setClockError] = useState('');

    /**
     * Generate week days array
     */
    const getWeekDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeek);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        return days;
    };

    /**
     * Load data on mount
     */
    useEffect(() => {
        if (store?.id) {
            loadData();
        }
    }, [store?.id, currentWeek]);

    /**
     * Fetch all data
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load employees
            const employeeList = await db.employees
                .where('storeId')
                .equals(store.id)
                .filter(e => e.isActive !== false)
                .toArray();
            setEmployees(employeeList);

            // Load shifts for current week
            const weekEnd = new Date(currentWeek);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const shiftList = await db.shifts
                .where('storeId')
                .equals(store.id)
                .toArray();

            const weekShifts = shiftList.filter(s => {
                const shiftDate = new Date(s.date);
                return shiftDate >= currentWeek && shiftDate < weekEnd;
            });
            setShifts(weekShifts);

            // Load active clock events
            const events = await db.clockEvents
                .where('storeId')
                .equals(store.id)
                .toArray();
            setClockEvents(events.filter(e => !e.clockOut));
        } catch (error) {
            console.error('Failed to load data:', error);
        }
        setIsLoading(false);
    };

    /**
     * Navigate weeks
     */
    const goToPreviousWeek = () => {
        const prev = new Date(currentWeek);
        prev.setDate(prev.getDate() - 7);
        setCurrentWeek(prev);
    };

    const goToNextWeek = () => {
        const next = new Date(currentWeek);
        next.setDate(next.getDate() + 7);
        setCurrentWeek(next);
    };

    const goToToday = () => {
        setCurrentWeek(getWeekStart(new Date()));
    };

    /**
     * Open modal to create shift
     */
    const handleAddShift = (date = null) => {
        setEditingShift(null);
        setShiftForm({
            employeeId: employees[0]?.id || '',
            date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00',
            notes: ''
        });
        setShowShiftModal(true);
    };

    /**
     * Open modal to edit shift
     */
    const handleEditShift = (shift) => {
        setEditingShift(shift);
        setShiftForm({
            employeeId: shift.employeeId,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            notes: shift.notes || ''
        });
        setShowShiftModal(true);
    };

    /**
     * Save shift
     */
    const handleSaveShift = async () => {
        if (!shiftForm.employeeId || !shiftForm.date) return;

        try {
            const shiftData = {
                ...shiftForm,
                status: 'scheduled',
                updatedAt: new Date().toISOString()
            };

            if (editingShift) {
                await db.shifts.update(editingShift.id, shiftData);
            } else {
                await db.shifts.add({
                    storeId: store.id,
                    ...shiftData,
                    createdAt: new Date().toISOString()
                });
            }
            setShowShiftModal(false);
            await loadData();
        } catch (error) {
            console.error('Failed to save shift:', error);
        }
    };

    /**
     * Delete shift
     */
    const handleDeleteShift = async (shiftId) => {
        if (!window.confirm('Delete this shift?')) return;

        try {
            await db.shifts.delete(shiftId);
            await loadData();
        } catch (error) {
            console.error('Failed to delete shift:', error);
        }
    };

    /**
     * Open clock in/out modal
     */
    const handleClockAction = (employee = null) => {
        setSelectedEmployee(employee);
        setClockPin('');
        setClockError('');
        setShowClockModal(true);
    };

    /**
     * Process clock in/out
     */
    const handleClockSubmit = async () => {
        if (!clockPin || clockPin.length !== 4) {
            setClockError('Please enter a 4-digit PIN');
            return;
        }

        try {
            // Find employee by PIN
            const employee = await db.employees
                .where('storeId')
                .equals(store.id)
                .filter(e => e.pin === clockPin && e.isActive !== false)
                .first();

            if (!employee) {
                setClockError('Invalid PIN. Please try again.');
                return;
            }

            // Check if already clocked in
            const activeEvent = await dbHelpers.getActiveClockEvent(store.id, employee.id);

            if (activeEvent) {
                // Clock out - calculate shift summary
                const clockOut = new Date().toISOString();
                const summary = await dbHelpers.calculateShiftSummary(
                    store.id,
                    employee.id,
                    activeEvent.clockIn,
                    clockOut
                );

                await db.clockEvents.update(activeEvent.id, {
                    clockOut,
                    salesCount: summary.salesCount,
                    salesTotal: summary.salesTotal,
                    itemsSold: summary.itemsSold
                });

                setShowClockModal(false);
                setShiftSummary({
                    employee,
                    clockIn: activeEvent.clockIn,
                    clockOut,
                    ...summary
                });
                setShowSummaryModal(true);
            } else {
                // Clock in
                await db.clockEvents.add({
                    storeId: store.id,
                    employeeId: employee.id,
                    shiftId: null,
                    clockIn: new Date().toISOString(),
                    clockOut: null,
                    salesCount: 0,
                    salesTotal: 0,
                    itemsSold: 0,
                    notes: '',
                    createdAt: new Date().toISOString()
                });

                setShowClockModal(false);
                alert(`✅ ${employee.name} clocked in successfully!`);
            }

            await loadData();
        } catch (error) {
            console.error('Clock action failed:', error);
            setClockError('An error occurred. Please try again.');
        }
    };

    /**
     * Get shifts for a specific day
     */
    const getShiftsForDay = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return shifts.filter(s => s.date === dateStr);
    };

    /**
     * Get employee by ID
     */
    const getEmployee = (employeeId) => {
        return employees.find(e => e.id === employeeId);
    };

    /**
     * Check if employee is clocked in
     */
    const isClockedIn = (employeeId) => {
        return clockEvents.some(e => e.employeeId === employeeId);
    };

    /**
     * Get clocked in employees
     */
    const getClockedInEmployees = () => {
        return clockEvents.map(event => ({
            ...getEmployee(event.employeeId),
            clockEvent: event
        })).filter(e => e.id);
    };

    const weekDays = getWeekDays();
    const today = new Date().toISOString().split('T')[0];
    const isCurrentWeek = weekDays.some(d => d.toISOString().split('T')[0] === today);

    if (isLoading) {
        return (
            <div className="shifts-loading">
                <span className="spinner spinner-lg" />
                <p>Loading schedule...</p>
            </div>
        );
    }

    return (
        <div className="shifts">
            {/* Header */}
            <div className="shifts-header">
                <div className="header-left">
                    <h2><Calendar size={24} /> Shift Schedule</h2>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleClockAction()}
                    >
                        <Clock size={18} /> Clock In/Out
                    </button>
                    <button className="btn btn-primary" onClick={() => handleAddShift()}>
                        <Plus size={18} /> Add Shift
                    </button>
                </div>
            </div>

            {/* Currently On Duty */}
            {getClockedInEmployees().length > 0 && (
                <div className="on-duty-section">
                    <h3><Clock size={18} /> Currently On Duty</h3>
                    <div className="on-duty-list">
                        {getClockedInEmployees().map(emp => (
                            <div key={emp.id} className="on-duty-card">
                                <div className="on-duty-avatar">
                                    <User size={20} />
                                </div>
                                <div className="on-duty-info">
                                    <span className="name">{emp.name}</span>
                                    <span className="since">
                                        Since {new Date(emp.clockEvent.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Week Navigation */}
            <div className="week-nav">
                <button className="btn btn-ghost" onClick={goToPreviousWeek}>
                    <ChevronLeft size={20} />
                </button>
                <div className="week-label">
                    <span className="week-range">
                        {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
                    </span>
                    {!isCurrentWeek && (
                        <button className="btn btn-ghost btn-sm" onClick={goToToday}>
                            Today
                        </button>
                    )}
                </div>
                <button className="btn btn-ghost" onClick={goToNextWeek}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {weekDays.map(day => {
                    const dayStr = day.toISOString().split('T')[0];
                    const isToday = dayStr === today;
                    const dayShifts = getShiftsForDay(day);

                    return (
                        <div
                            key={dayStr}
                            className={`calendar-day ${isToday ? 'today' : ''}`}
                        >
                            <div className="day-header">
                                <span className="day-name">
                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="day-date">
                                    {day.getDate()}
                                </span>
                            </div>
                            <div className="day-shifts">
                                {dayShifts.length === 0 ? (
                                    <button
                                        className="add-shift-btn"
                                        onClick={() => handleAddShift(day)}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                ) : (
                                    dayShifts.map(shift => {
                                        const employee = getEmployee(shift.employeeId);
                                        return (
                                            <div
                                                key={shift.id}
                                                className={`shift-card ${isClockedIn(shift.employeeId) ? 'active' : ''}`}
                                            >
                                                <div className="shift-info">
                                                    <span className="shift-employee">{employee?.name || 'Unknown'}</span>
                                                    <span className="shift-time">
                                                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                                    </span>
                                                </div>
                                                <div className="shift-actions">
                                                    <button
                                                        className="btn btn-ghost btn-xs"
                                                        onClick={() => handleEditShift(shift)}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-xs text-danger"
                                                        onClick={() => handleDeleteShift(shift.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {dayShifts.length > 0 && (
                                <button
                                    className="add-shift-btn small"
                                    onClick={() => handleAddShift(day)}
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Shift Modal */}
            {showShiftModal && (
                <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingShift ? 'Edit Shift' : 'Add Shift'}
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowShiftModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Employee</label>
                                <select
                                    className="input select"
                                    value={shiftForm.employeeId}
                                    onChange={(e) => setShiftForm(prev => ({ ...prev, employeeId: parseInt(e.target.value) }))}
                                >
                                    <option value="">Select employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={shiftForm.date}
                                    onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="time-row">
                                <div className="input-group">
                                    <label className="input-label">Start Time</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={shiftForm.startTime}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">End Time</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={shiftForm.endTime}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Notes (optional)</label>
                                <textarea
                                    className="input textarea"
                                    value={shiftForm.notes}
                                    onChange={(e) => setShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Any special notes for this shift..."
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowShiftModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveShift}>
                                <Save size={18} /> Save Shift
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clock In/Out Modal */}
            {showClockModal && (
                <div className="modal-overlay" onClick={() => setShowClockModal(false)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Clock size={20} /> Clock In / Out
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowClockModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="clock-instructions">
                                Enter your 4-digit PIN to clock in or out
                            </p>
                            <div className="pin-input-container">
                                <input
                                    type="password"
                                    className="input pin-input-large"
                                    value={clockPin}
                                    onChange={(e) => {
                                        setClockPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                        setClockError('');
                                    }}
                                    placeholder="• • • •"
                                    maxLength={4}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleClockSubmit()}
                                />
                            </div>
                            {clockError && (
                                <div className="clock-error">
                                    <AlertCircle size={16} /> {clockError}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowClockModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleClockSubmit}>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Summary Modal */}
            {showSummaryModal && shiftSummary && (
                <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Square size={20} /> Shift Complete
                            </h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowSummaryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="summary-header">
                                <h4>{shiftSummary.employee.name}</h4>
                                <p className="summary-time">
                                    {new Date(shiftSummary.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {new Date(shiftSummary.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="summary-stats">
                                <div className="summary-stat">
                                    <Clock size={24} className="stat-icon" />
                                    <div className="stat-content">
                                        <span className="stat-value">
                                            {((new Date(shiftSummary.clockOut) - new Date(shiftSummary.clockIn)) / (1000 * 60 * 60)).toFixed(1)}h
                                        </span>
                                        <span className="stat-label">Hours Worked</span>
                                    </div>
                                </div>
                                <div className="summary-stat">
                                    <DollarSign size={24} className="stat-icon" />
                                    <div className="stat-content">
                                        <span className="stat-value">{shiftSummary.salesCount}</span>
                                        <span className="stat-label">Sales Made</span>
                                    </div>
                                </div>
                                <div className="summary-stat">
                                    <Package size={24} className="stat-icon" />
                                    <div className="stat-content">
                                        <span className="stat-value">{shiftSummary.itemsSold}</span>
                                        <span className="stat-label">Items Sold</span>
                                    </div>
                                </div>
                            </div>
                            <div className="summary-total">
                                <span>Total Revenue</span>
                                <span className="total-value">
                                    {formatCurrency(shiftSummary.salesTotal)}
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowSummaryModal(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Shifts;
