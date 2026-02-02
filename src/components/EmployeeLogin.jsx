/**
 * @fileoverview Employee PIN Login Component
 * 
 * A numeric keypad for employees to login with their PIN.
 * Used on shared POS terminals.
 */

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEmployeeSession } from '../stores/employeeSessionStore';
import { User, Delete, LogIn, Clock, X } from 'lucide-react';
import './EmployeeLogin.css';

function EmployeeLogin({ onClose, onSuccess }) {
    const { store } = useAuthStore();
    const { loginWithPIN, clockIn, isLoading, error, clearError } = useEmployeeSession();

    const [pin, setPin] = useState('');
    const [showClockIn, setShowClockIn] = useState(false);
    const [employee, setEmployee] = useState(null);

    const handleKeyPress = (digit) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit);
            clearError();
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        clearError();
    };

    const handleClear = () => {
        setPin('');
        clearError();
    };

    const handleSubmit = async () => {
        if (pin.length !== 4) return;

        const result = await loginWithPIN(pin, store.id);

        if (result.success) {
            setEmployee(result.employee);
            if (result.needsClockIn) {
                setShowClockIn(true);
            } else {
                onSuccess?.(result.employee);
            }
        }
    };

    const handleClockIn = async () => {
        const result = await clockIn(store.id);
        if (result.success) {
            onSuccess?.(employee);
        }
    };

    const handleSkipClockIn = () => {
        onSuccess?.(employee);
    };

    // Clock in confirmation screen
    if (showClockIn && employee) {
        return (
            <div className="employee-login-overlay" onClick={onClose}>
                <div className="employee-login" onClick={e => e.stopPropagation()}>
                    <div className="login-header">
                        <h2>Welcome, {employee.name}!</h2>
                        <button className="btn btn-ghost btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="clock-in-prompt">
                        <Clock size={48} />
                        <p>Would you like to clock in for your shift?</p>

                        <div className="clock-in-buttons">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleClockIn}
                                disabled={isLoading}
                            >
                                <Clock size={20} /> Clock In & Start
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleSkipClockIn}
                            >
                                Skip (Already Clocked In)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="employee-login-overlay" onClick={onClose}>
            <div className="employee-login" onClick={e => e.stopPropagation()}>
                <div className="login-header">
                    <User size={32} />
                    <h2>Employee Login</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <p className="login-subtitle">Enter your 4-digit PIN</p>

                {/* PIN Display */}
                <div className="pin-display">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`pin-dot ${i < pin.length ? 'filled' : ''}`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {/* Keypad */}
                <div className="keypad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                        <button
                            key={digit}
                            className="keypad-btn"
                            onClick={() => handleKeyPress(digit.toString())}
                            disabled={isLoading}
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        className="keypad-btn keypad-action"
                        onClick={handleClear}
                        disabled={isLoading}
                    >
                        C
                    </button>
                    <button
                        className="keypad-btn"
                        onClick={() => handleKeyPress('0')}
                        disabled={isLoading}
                    >
                        0
                    </button>
                    <button
                        className="keypad-btn keypad-action"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        <Delete size={20} />
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    className="btn btn-primary btn-lg login-submit"
                    onClick={handleSubmit}
                    disabled={pin.length !== 4 || isLoading}
                >
                    {isLoading ? (
                        <span className="spinner" />
                    ) : (
                        <>
                            <LogIn size={20} /> Login
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default EmployeeLogin;
