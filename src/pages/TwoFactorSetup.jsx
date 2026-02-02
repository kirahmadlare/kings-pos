/**
 * @fileoverview Two-Factor Authentication Setup Page
 *
 * Allow users to enable, disable, and manage 2FA
 */

import { useState, useEffect } from 'react';
import { Shield, Key, Download, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../services/api';
import './Settings.css';

function TwoFactorSetup() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupMode, setSetupMode] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [secret, setSecret] = useState(null);
    const [verificationToken, setVerificationToken] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableToken, setDisableToken] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/auth/2fa/status');
            setStatus(data);
        } catch (error) {
            console.error('Failed to load 2FA status:', error);
            setError('Failed to load 2FA status');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async () => {
        try {
            setProcessing(true);
            setError(null);

            const data = await apiRequest('/auth/2fa/setup', {
                method: 'POST'
            });

            setQrCode(data.qrCode);
            setSecret(data.secret);
            setSetupMode(true);
        } catch (error) {
            console.error('2FA setup error:', error);
            setError(error.message || 'Failed to setup 2FA');
        } finally {
            setProcessing(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();

        if (verificationToken.length !== 6) {
            setError('Token must be 6 digits');
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            const data = await apiRequest('/auth/2fa/verify', {
                method: 'POST',
                body: JSON.stringify({ token: verificationToken })
            });

            setBackupCodes(data.backupCodes);
            setSetupMode(false);
            loadStatus();
        } catch (error) {
            console.error('2FA verification error:', error);
            setError(error.message || 'Invalid token');
        } finally {
            setProcessing(false);
        }
    };

    const handleDisable = async (e) => {
        e.preventDefault();

        if (!disablePassword || !disableToken) {
            setError('Password and token are required');
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            await apiRequest('/auth/2fa/disable', {
                method: 'POST',
                body: JSON.stringify({
                    password: disablePassword,
                    token: disableToken
                })
            });

            alert('2FA disabled successfully');
            setDisablePassword('');
            setDisableToken('');
            loadStatus();
        } catch (error) {
            console.error('2FA disable error:', error);
            setError(error.message || 'Failed to disable 2FA');
        } finally {
            setProcessing(false);
        }
    };

    const handleRegenerateBackupCodes = async () => {
        const password = prompt('Enter your password:');
        const token = prompt('Enter your 2FA token:');

        if (!password || !token) {
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            const data = await apiRequest('/auth/2fa/regenerate-backup-codes', {
                method: 'POST',
                body: JSON.stringify({ password, token })
            });

            setBackupCodes(data.backupCodes);
            loadStatus();
        } catch (error) {
            console.error('Backup codes regeneration error:', error);
            setError(error.message || 'Failed to regenerate backup codes');
        } finally {
            setProcessing(false);
        }
    };

    const downloadBackupCodes = () => {
        const content = backupCodes.join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
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
                <h1>Two-Factor Authentication</h1>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {!setupMode && !status?.twoFactorEnabled && (
                <div className="settings-card">
                    <div className="settings-section">
                        <div className="section-header">
                            <Shield size={24} />
                            <div>
                                <h3>Secure Your Account</h3>
                                <p>Enable two-factor authentication for enhanced security</p>
                            </div>
                        </div>

                        <div className="feature-list">
                            <div className="feature-item">
                                <Key size={20} />
                                <div>
                                    <strong>Extra Layer of Security</strong>
                                    <p>Protect your account with a second verification step</p>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSetup}
                            disabled={processing}
                        >
                            {processing ? 'Setting up...' : 'Enable 2FA'}
                        </button>
                    </div>
                </div>
            )}

            {setupMode && (
                <div className="settings-card">
                    <div className="settings-section">
                        <h3>Setup Two-Factor Authentication</h3>

                        <div className="setup-steps">
                            <div className="step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h4>Scan QR Code</h4>
                                    <p>Use an authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:</p>
                                    {qrCode && (
                                        <div className="qr-code-container">
                                            <img src={qrCode} alt="2FA QR Code" />
                                        </div>
                                    )}
                                    <p className="small-text">Or enter this secret manually: <code>{secret}</code></p>
                                </div>
                            </div>

                            <div className="step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h4>Verify Setup</h4>
                                    <p>Enter the 6-digit code from your authenticator app:</p>
                                    <form onSubmit={handleVerify}>
                                        <input
                                            type="text"
                                            className="form-control code-input"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={verificationToken}
                                            onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                                            disabled={processing}
                                        />
                                        <div className="form-actions">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setSetupMode(false);
                                                    setQrCode(null);
                                                    setSecret(null);
                                                    setVerificationToken('');
                                                }}
                                                disabled={processing}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={processing || verificationToken.length !== 6}
                                            >
                                                {processing ? 'Verifying...' : 'Verify & Enable'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {status?.twoFactorEnabled && !setupMode && (
                <div className="settings-card">
                    <div className="settings-section">
                        <div className="section-header success">
                            <Shield size={24} />
                            <div>
                                <h3>2FA is Enabled</h3>
                                <p>Your account is protected with two-factor authentication</p>
                            </div>
                        </div>

                        {status.backupCodesRemaining > 0 && (
                            <div className="info-box">
                                <p><strong>Backup Codes:</strong> {status.backupCodesRemaining} remaining</p>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleRegenerateBackupCodes}
                                    disabled={processing}
                                >
                                    Regenerate Backup Codes
                                </button>
                            </div>
                        )}

                        <div className="danger-zone">
                            <h4>Disable Two-Factor Authentication</h4>
                            <p className="warning-text">This will make your account less secure</p>

                            <form onSubmit={handleDisable}>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                        disabled={processing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>2FA Token</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={disableToken}
                                        onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                                        disabled={processing}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-danger"
                                    disabled={processing}
                                >
                                    {processing ? 'Disabling...' : 'Disable 2FA'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {backupCodes.length > 0 && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Save Your Backup Codes</h2>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-warning">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>Important!</strong>
                                    <p>Save these backup codes in a safe place. Each code can only be used once.</p>
                                </div>
                            </div>

                            <div className="backup-codes-list">
                                {backupCodes.map((code, index) => (
                                    <div key={index} className="backup-code">
                                        <code>{code}</code>
                                    </div>
                                ))}
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={downloadBackupCodes}
                                >
                                    <Download size={16} />
                                    Download Codes
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setBackupCodes([])}
                                >
                                    I've Saved My Codes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TwoFactorSetup;
