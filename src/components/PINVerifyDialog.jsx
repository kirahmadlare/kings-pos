/**
 * @fileoverview PIN Verification Dialog
 * 
 * A modal dialog that requires the current employee to enter their PIN
 * before performing sensitive actions like switching/logging out.
 */

import { useState } from 'react';
import { useEmployeeSession } from '../stores/employeeSessionStore';
import { Lock, Delete, X, LogOut } from 'lucide-react';
import './PINVerifyDialog.css';

function PINVerifyDialog({ title, message, onSuccess, onCancel }) {
    const { verifyPIN, isLoading, currentEmployee } = useEmployeeSession();

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

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

    const handleSubmit = async () => {
        if (pin.length !== 4) return;

        const result = await verifyPIN(pin);

        if (result.success) {
            onSuccess?.();
        } else {
            setError(result.error || 'Incorrect PIN');
            setPin('');
        }
    };

    return (
        <div className="pin-verify-overlay" onClick={onCancel}>
            <div className="pin-verify-dialog" onClick={e => e.stopPropagation()}>
                <div className="verify-header">
                    <Lock size={24} />
                    <div>
                        <h3>{title || 'Confirm Identity'}</h3>
                        <p>{message || `Enter PIN for ${currentEmployee?.name}`}</p>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

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
                    <div className="verify-error">
                        {error}
                    </div>
                )}

                {/* Keypad */}
                <div className="keypad compact">
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
                        <Delete size={18} />
                    </button>
                </div>

                {/* Actions */}
                <div className="verify-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={pin.length !== 4 || isLoading}
                    >
                        {isLoading ? (
                            <span className="spinner" />
                        ) : (
                            <>
                                <LogOut size={18} /> Confirm
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PINVerifyDialog;
