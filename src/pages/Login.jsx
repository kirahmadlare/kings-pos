import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Crown } from 'lucide-react';
import TwoFactorLogin from '../components/TwoFactorLogin';
import './Auth.css';

function Login() {
    const { login, verifyOTP, skipOTP, pendingOTP, pending2FA, complete2FALogin, isLoading, error, clearError } = useAuthStore();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [otpCode, setOtpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        clearError();
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(formData.email, formData.password);
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        await verifyOTP(otpCode);
    };

    const handle2FASuccess = async (response) => {
        await complete2FALogin(response);
    };

    const handle2FACancel = () => {
        useAuthStore.setState({ pending2FA: null });
    };

    // Show 2FA verification screen
    if (pending2FA) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card">
                        <TwoFactorLogin
                            userId={pending2FA.userId}
                            email={pending2FA.email}
                            onSuccess={handle2FASuccess}
                            onCancel={handle2FACancel}
                        />
                    </div>
                </div>

                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2>Enhanced Security</h2>
                        <p>Two-factor authentication provides an extra layer of protection for your account.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show OTP verification screen
    if (pendingOTP) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card">
                        <div className="auth-header">
                            <div className="auth-logo">
                                <Shield size={32} />
                            </div>
                            <h1 className="auth-title">Verification Required</h1>
                            <p className="auth-subtitle">
                                {pendingOTP.type === 'email'
                                    ? `We've sent a verification code to ${pendingOTP.email}`
                                    : 'Enter the code from your authenticator app'
                                }
                            </p>
                        </div>

                        {/* DEV MODE: Show OTP */}
                        <div className="dev-notice">
                            <span className="badge badge-warning">DEV MODE</span>
                            <p>Your OTP code is: <strong>{pendingOTP.otp}</strong></p>
                        </div>

                        <form onSubmit={handleOTPSubmit} className="auth-form">
                            {error && <div className="error-banner">{error}</div>}

                            <div className="input-group">
                                <label className="input-label">Verification Code</label>
                                <input
                                    type="text"
                                    className="input otp-input"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-full"
                                disabled={isLoading || otpCode.length !== 6}
                            >
                                {isLoading ? <span className="spinner" /> : 'Verify Code'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost w-full"
                                onClick={skipOTP}
                            >
                                Skip for now (Dev only)
                            </button>
                        </form>
                    </div>
                </div>

                <div className="auth-visual">
                    <div className="auth-visual-content">
                        <h2>Secure Access</h2>
                        <p>Two-factor authentication keeps your business data safe and secure.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <img src="/logo.svg" alt="King's POS" className="auth-logo-img" />
                        </div>
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">Sign in to your King's POS account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && <div className="error-banner">{error}</div>}

                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="input"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm input-action"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/register">Create one</Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="auth-visual">
                <div className="auth-visual-content">
                    <h2>Manage Your Business Like Royalty</h2>
                    <p>Track inventory, process sales, and grow your retail empire with King's POS - the crown jewel of point of sale systems.</p>
                    <div className="auth-features">
                        <div className="auth-feature">
                            <span className="feature-icon">📦</span>
                            <span>Inventory Management</span>
                        </div>
                        <div className="auth-feature">
                            <span className="feature-icon">💳</span>
                            <span>Quick Checkout</span>
                        </div>
                        <div className="auth-feature">
                            <span className="feature-icon">📊</span>
                            <span>Sales Reports</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
