/**
 * @fileoverview Employee Login Page
 * 
 * Dedicated login page for employees to access POS directly.
 * Works INDEPENDENTLY of admin login - connects directly to server.
 * Employees enter their store ACCESS CODE and PIN to clock in.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeSession } from '../stores/employeeSessionStore';
import {
    User, Delete, LogIn, Clock, Store, ArrowRight, RefreshCw, Key
} from 'lucide-react';
import './EmployeeLoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function EmployeeLoginPage() {
    const navigate = useNavigate();
    const employeeSession = useEmployeeSession();

    const [step, setStep] = useState('store'); // 'store' or 'pin'
    const [accessCode, setAccessCode] = useState('');
    const [selectedStore, setSelectedStore] = useState(null);
    const [pin, setPin] = useState('');
    const [showClockIn, setShowClockIn] = useState(false);
    const [employee, setEmployee] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Verify store access code with server
     */
    const handleStoreSubmit = async () => {
        if (!accessCode.trim()) {
            setError('Please enter your store access code');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/employee/store`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: accessCode.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid access code');
            }

            setSelectedStore(data.store);
            setStep('pin');
        } catch (err) {
            setError(err.message || 'Failed to verify store');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle PIN keypad press
     */
    const handleKeyPress = (digit) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit);
            setError('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    /**
     * Verify employee PIN with server
     */
    const handlePinSubmit = async () => {
        if (pin.length !== 4 || !selectedStore) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/employee/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessCode: accessCode.trim(),
                    pin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid PIN');
            }

            // Store employee session data
            setEmployee(data.employee);

            // Update the employee session store with server data
            employeeSession.setEmployeeFromServer(data.employee, data.store);

            // Show clock-in option
            setShowClockIn(true);
        } catch (err) {
            setError(err.message || 'Login failed');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClockIn = async () => {
        // Clock in via employee session store
        await employeeSession.clockIn(selectedStore.id);
        navigate('/pos');
    };

    const handleSkipClockIn = () => {
        navigate('/pos');
    };

    const handleBackToStore = () => {
        setStep('store');
        setPin('');
        setSelectedStore(null);
        setError('');
    };

    // Clock in confirmation screen
    if (showClockIn && employee) {
        return (
            <div className="employee-login-page">
                <div className="employee-login-card">
                    <div className="clock-in-screen">
                        <div className="welcome-avatar">
                            {employee.name?.charAt(0).toUpperCase()}
                        </div>
                        <h2>Welcome, {employee.name}!</h2>
                        <p>Ready to start your shift at <strong>{selectedStore?.name}</strong>?</p>

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
                                Continue Without Clocking In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="employee-login-page">
            <div className="employee-login-card">
                {/* Header */}
                <div className="login-page-header">
                    <img src="/logo.svg" alt="King's POS" className="login-logo" />
                    <h1>Employee Login</h1>
                    <p>Enter your store access code and PIN</p>
                </div>

                {/* Step 1: Store Access Code */}
                {step === 'store' && (
                    <div className="store-step">
                        <div className="input-group">
                            <label className="input-label">
                                <Key size={16} /> Store Access Code
                            </label>
                            <input
                                type="text"
                                className="input input-lg access-code-input"
                                placeholder="Enter 6-digit code..."
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleStoreSubmit()}
                                maxLength={8}
                                autoFocus
                            />
                            <p className="input-hint">
                                Ask your manager for the store access code
                            </p>
                            {error && (
                                <span className="input-error">{error}</span>
                            )}
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={handleStoreSubmit}
                            disabled={!accessCode.trim() || isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner" />
                            ) : (
                                <>Continue <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                )}

                {/* Step 2: PIN Entry */}
                {step === 'pin' && selectedStore && (
                    <div className="pin-step">
                        <div className="selected-store">
                            <Store size={16} />
                            <span>{selectedStore.name}</span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleBackToStore}
                            >
                                <RefreshCw size={14} /> Change
                            </button>
                        </div>

                        <p className="pin-instruction">Enter your 4-digit PIN</p>

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
                            className="btn btn-primary btn-lg w-full"
                            onClick={handlePinSubmit}
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
                )}

                {/* Footer - Link to admin login */}
                <div className="login-page-footer">
                    <a href="/login">Owner/Admin Login →</a>
                </div>
            </div>
        </div>
    );
}

export default EmployeeLoginPage;
