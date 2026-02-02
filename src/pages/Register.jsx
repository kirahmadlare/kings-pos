import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    Mail, Lock, Eye, EyeOff, ArrowRight,
    User, Building, Phone, MapPin, Percent, DollarSign
} from 'lucide-react';
import './Auth.css';

// Currency options
const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
];

// Business types
const businessTypes = [
    { value: 'restaurant', label: 'Restaurant / Café', icon: '🍽️' },
    { value: 'retail', label: 'Retail Store', icon: '🏪' },
    { value: 'grocery', label: 'Grocery / Supermarket', icon: '🛒' },
    { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
    { value: 'electronics', label: 'Electronics', icon: '📱' },
    { value: 'clothing', label: 'Clothing / Fashion', icon: '👕' },
    { value: 'other', label: 'Other', icon: '📦' },
];

function Register() {
    const { register, isLoading, error, clearError } = useAuthStore();

    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        // User info
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        // Store info
        storeName: '',
        businessType: 'retail',
        storePhone: '',
        storeAddress: '',
        currency: 'USD',
        taxRate: '0'
    });
    const [formErrors, setFormErrors] = useState({});

    const handleInputChange = (e) => {
        clearError();
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field error
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateStep1 = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = () => {
        const errors = {};

        if (!formData.storeName.trim()) {
            errors.storeName = 'Store name is required';
        }

        const taxRate = parseFloat(formData.taxRate);
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
            errors.taxRate = 'Tax rate must be between 0 and 100';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep2()) return;

        const result = await register({
            ...formData,
            taxRate: parseFloat(formData.taxRate) || 0
        });

        if (result.success) {
            // Will automatically redirect via PublicRoute
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card auth-card-wide">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <img src="/logo.svg" alt="King's POS" className="auth-logo-img" />
                        </div>
                        <h1 className="auth-title">Create your account</h1>
                        <p className="auth-subtitle">
                            {step === 1 ? 'Enter your personal information' : 'Set up your store'}
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="auth-steps">
                        <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>
                            <span className="step-number">1</span>
                            <span className="step-label">Account</span>
                        </div>
                        <div className="step-line" />
                        <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>
                            <span className="step-number">2</span>
                            <span className="step-label">Store Setup</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && <div className="error-banner">{error}</div>}

                        {/* Step 1: User Information */}
                        {step === 1 && (
                            <>
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            name="name"
                                            className={`input ${formErrors.name ? 'input-error' : ''}`}
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Email</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={18} />
                                        <input
                                            type="email"
                                            name="email"
                                            className={`input ${formErrors.email ? 'input-error' : ''}`}
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label className="input-label">Password</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                className={`input ${formErrors.password ? 'input-error' : ''}`}
                                                placeholder="Min 6 characters"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm input-action"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {formErrors.password && <span className="error-text">{formErrors.password}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Confirm Password</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                className={`input ${formErrors.confirmPassword ? 'input-error' : ''}`}
                                                placeholder="Confirm password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        {formErrors.confirmPassword && <span className="error-text">{formErrors.confirmPassword}</span>}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary btn-lg w-full"
                                    onClick={handleNext}
                                >
                                    Continue
                                    <ArrowRight size={18} />
                                </button>
                            </>
                        )}

                        {/* Step 2: Store Setup */}
                        {step === 2 && (
                            <>
                                <div className="input-group">
                                    <label className="input-label">Store Name</label>
                                    <div className="input-wrapper">
                                        <Building className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            name="storeName"
                                            className={`input ${formErrors.storeName ? 'input-error' : ''}`}
                                            placeholder="My Awesome Store"
                                            value={formData.storeName}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    {formErrors.storeName && <span className="error-text">{formErrors.storeName}</span>}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Business Type</label>
                                    <div className="business-types">
                                        {businessTypes.map(type => (
                                            <label
                                                key={type.value}
                                                className={`business-type-option ${formData.businessType === type.value ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="businessType"
                                                    value={type.value}
                                                    checked={formData.businessType === type.value}
                                                    onChange={handleInputChange}
                                                />
                                                <span className="business-icon">{type.icon}</span>
                                                <span className="business-label">{type.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label className="input-label">Currency</label>
                                        <select
                                            name="currency"
                                            className="input select"
                                            value={formData.currency}
                                            onChange={handleInputChange}
                                        >
                                            {currencies.map(curr => (
                                                <option key={curr.code} value={curr.code}>
                                                    {curr.symbol} {curr.code} - {curr.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Tax Rate (%)</label>
                                        <div className="input-wrapper">
                                            <Percent className="input-icon" size={18} />
                                            <input
                                                type="number"
                                                name="taxRate"
                                                className={`input ${formErrors.taxRate ? 'input-error' : ''}`}
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={formData.taxRate}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        {formErrors.taxRate && <span className="error-text">{formErrors.taxRate}</span>}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Store Phone (optional)</label>
                                    <div className="input-wrapper">
                                        <Phone className="input-icon" size={18} />
                                        <input
                                            type="tel"
                                            name="storePhone"
                                            className="input"
                                            placeholder="+1 234 567 8900"
                                            value={formData.storePhone}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Store Address (optional)</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            name="storeAddress"
                                            className="input"
                                            placeholder="123 Main Street, City"
                                            value={formData.storeAddress}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-lg"
                                        onClick={handleBack}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg flex-1"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="spinner" />
                                        ) : (
                                            <>
                                                Create Account
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="auth-visual">
                <div className="auth-visual-content">
                    <h2>Start Your Royal Journey</h2>
                    <p>Join businesses using King's POS to manage their retail empire efficiently.</p>
                    <div className="auth-features">
                        <div className="auth-feature">
                            <span className="feature-icon">🚀</span>
                            <span>Quick Setup</span>
                        </div>
                        <div className="auth-feature">
                            <span className="feature-icon">🔒</span>
                            <span>Secure & Reliable</span>
                        </div>
                        <div className="auth-feature">
                            <span className="feature-icon">📱</span>
                            <span>Works Anywhere</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
