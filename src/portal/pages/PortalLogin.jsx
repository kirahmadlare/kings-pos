/**
 * @fileoverview Customer Portal Login Page
 *
 * OTP-based authentication for customers
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowRight, Check } from 'lucide-react';
import { apiRequest } from '../../services/api';
import './PortalLogin.css';

function PortalLogin() {
    const navigate = useNavigate();
    const [step, setStep] = useState('identifier'); // 'identifier' or 'otp'
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [devOtp, setDevOtp] = useState(''); // For development mode

    const isEmail = identifier.includes('@');

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!identifier) {
            setError('Please enter your email or phone number');
            return;
        }

        try {
            setLoading(true);

            const response = await apiRequest('/customer-portal/request-otp', {
                method: 'POST',
                body: JSON.stringify({ identifier })
            });

            // In development mode, OTP is returned
            if (response.otp) {
                setDevOtp(response.otp);
            }

            setStep('otp');
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        try {
            setLoading(true);

            const response = await apiRequest('/customer-portal/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ identifier, otp })
            });

            // Store token
            localStorage.setItem('customer_token', response.token);
            localStorage.setItem('customer_data', JSON.stringify(response.customer));

            // Redirect to dashboard
            navigate('/portal/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="portal-login">
            <div className="portal-login-container">
                <div className="portal-login-header">
                    <h1>Customer Portal</h1>
                    <p>Access your orders, credits, and profile</p>
                </div>

                {step === 'identifier' ? (
                    <form onSubmit={handleRequestOTP} className="portal-login-form">
                        <div className="form-group">
                            <label>Email or Phone Number</label>
                            <div className="input-with-icon">
                                {isEmail ? <Mail size={20} /> : <Phone size={20} />}
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="john@example.com or +1234567890"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : (
                                <>
                                    Send Verification Code
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="portal-login-form">
                        <div className="step-indicator">
                            <Check size={16} />
                            Code sent to {identifier}
                        </div>

                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                className="form-control otp-input"
                                placeholder="000000"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                                autoFocus
                            />
                            {devOtp && (
                                <small className="dev-otp-hint">
                                    Development OTP: {devOtp}
                                </small>
                            )}
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-ghost btn-block"
                            onClick={() => {
                                setStep('identifier');
                                setOtp('');
                                setError('');
                            }}
                        >
                            Use different email/phone
                        </button>
                    </form>
                )}

                <div className="portal-login-footer">
                    <p>Need help? Contact the store for assistance.</p>
                </div>
            </div>
        </div>
    );
}

export default PortalLogin;
