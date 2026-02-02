/**
 * @fileoverview Two-Factor Authentication Login Component
 *
 * Component for entering 2FA code during login
 */

import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { apiRequest } from '../services/api';

function TwoFactorLogin({ userId, email, onSuccess, onCancel }) {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (token.length !== 6 && token.length !== 8) {
            setError('Please enter a valid 6-digit token or 8-character backup code');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Verify 2FA token
            await apiRequest('/auth/2fa/verify-login', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    token
                })
            });

            // Complete login
            const response = await apiRequest('/auth/login/2fa', {
                method: 'POST',
                body: JSON.stringify({
                    userId
                })
            });

            onSuccess(response);
        } catch (error) {
            console.error('2FA verification error:', error);
            setError(error.message || 'Invalid token or backup code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="two-factor-login">
            <div className="two-factor-header">
                <Shield size={48} className="shield-icon" />
                <h2>Two-Factor Authentication</h2>
                <p>Enter the 6-digit code from your authenticator app</p>
                <p className="email-hint">{email}</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="two-factor-form">
                <div className="form-group">
                    <input
                        type="text"
                        className="form-control code-input"
                        placeholder="000000"
                        maxLength={8}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase())}
                        disabled={loading}
                        autoFocus
                    />
                    <p className="help-text">Or enter an 8-character backup code</p>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || token.length < 6}
                    >
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .two-factor-login {
                    width: 100%;
                    max-width: 420px;
                }

                .two-factor-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .shield-icon {
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                }

                .two-factor-header h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.5rem;
                }

                .two-factor-header p {
                    color: var(--text-secondary);
                    margin: 0.25rem 0;
                    font-size: 0.875rem;
                }

                .email-hint {
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .two-factor-form {
                    margin-top: 1.5rem;
                }

                .code-input {
                    text-align: center;
                    font-size: 1.5rem;
                    letter-spacing: 0.5rem;
                    font-weight: 600;
                    font-family: 'Courier New', monospace;
                }

                .help-text {
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                    margin-top: 0.5rem;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }

                .form-actions button {
                    flex: 1;
                }
            `}</style>
        </div>
    );
}

export default TwoFactorLogin;
