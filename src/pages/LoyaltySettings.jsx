/**
 * @fileoverview Loyalty Settings Page
 *
 * Configure loyalty program settings, tiers, rewards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Award, Gift, Users, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { toast } from '../stores/toastStore';
import './Loyalty.css';

export default function LoyaltySettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    const [program, setProgram] = useState({
        name: 'Rewards Program',
        description: 'Earn points on every purchase!',
        isActive: true,
        pointsPerDollar: 1,
        pointsPerUnit: 10,
        minPointsToRedeem: 100,
        maxPointsPerTransaction: 1000,
        pointsExpirationDays: 365,
        tiers: {
            bronze: { name: 'Bronze', minSpending: 0, multiplier: 1, benefits: [] },
            silver: { name: 'Silver', minSpending: 500, multiplier: 1.5, benefits: [] },
            gold: { name: 'Gold', minSpending: 1000, multiplier: 2, benefits: [] },
            platinum: { name: 'Platinum', minSpending: 5000, multiplier: 3, benefits: [] }
        },
        birthdayBonus: {
            enabled: true,
            points: 100
        },
        referralBonus: {
            enabled: true,
            referrerPoints: 500,
            referredPoints: 200
        },
        settings: {
            allowNegativeBalance: false,
            autoApplyDiscount: false,
            notifyOnEarn: true,
            notifyOnExpire: true
        }
    });

    useEffect(() => {
        loadProgram();
    }, []);

    const loadProgram = async () => {
        try {
            const data = await api.loyalty.getProgram();
            setProgram(data);
        } catch (error) {
            console.error('Failed to load loyalty program:', error);
            toast.error('Failed to load loyalty program');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.loyalty.updateProgram(program);
            toast.success('Loyalty program settings saved successfully');
        } catch (error) {
            console.error('Failed to save loyalty program:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateProgram = (field, value) => {
        setProgram(prev => ({ ...prev, [field]: value }));
    };

    const updateTier = (tierName, field, value) => {
        setProgram(prev => ({
            ...prev,
            tiers: {
                ...prev.tiers,
                [tierName]: {
                    ...prev.tiers[tierName],
                    [field]: value
                }
            }
        }));
    };

    const updateBonus = (bonusType, field, value) => {
        setProgram(prev => ({
            ...prev,
            [bonusType]: {
                ...prev[bonusType],
                [field]: value
            }
        }));
    };

    const updateSettings = (field, value) => {
        setProgram(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="loyalty-loading">
                <div className="spinner spinner-lg"></div>
                <p className="loyalty-loading-text">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="loyalty-page">
            {/* Header */}
            <div className="loyalty-header">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/loyalty')}
                        className="btn btn-ghost btn-icon"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="loyalty-header-content">
                        <h1>Loyalty Program Settings</h1>
                        <p>Configure your customer rewards program</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="loyalty-settings-tabs">
                {[
                    { id: 'basic', label: 'Basic Settings', icon: SettingsIcon },
                    { id: 'tiers', label: 'Loyalty Tiers', icon: Award },
                    { id: 'rewards', label: 'Special Rewards', icon: Gift },
                    { id: 'advanced', label: 'Advanced', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`loyalty-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Basic Settings Tab */}
            {activeTab === 'basic' && (
                <div className="loyalty-form-section">
                    <h2 className="loyalty-form-section-title">General Information</h2>
                    <div className="loyalty-form-grid">
                        <div className="input-group">
                            <label className="input-label">Program Name</label>
                            <input
                                type="text"
                                value={program.name}
                                onChange={(e) => updateProgram('name', e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Status</label>
                            <select
                                value={program.isActive}
                                onChange={(e) => updateProgram('isActive', e.target.value === 'true')}
                                className="input select"
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">Description</label>
                            <textarea
                                value={program.description}
                                onChange={(e) => updateProgram('description', e.target.value)}
                                rows={3}
                                className="input"
                            />
                        </div>
                    </div>

                    <h2 className="loyalty-form-section-title" style={{ marginTop: 'var(--space-8)' }}>Points Configuration</h2>
                    <div className="loyalty-form-grid">
                        <div className="input-group">
                            <label className="input-label">Points per Dollar Spent</label>
                            <input
                                type="number"
                                value={program.pointsPerDollar}
                                onChange={(e) => updateProgram('pointsPerDollar', parseFloat(e.target.value))}
                                min="0"
                                step="0.1"
                                className="input"
                            />
                            <p className="text-sm text-secondary mt-1">
                                Customer earns this many points for each dollar spent
                            </p>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Points per Dollar Discount</label>
                            <input
                                type="number"
                                value={program.pointsPerUnit}
                                onChange={(e) => updateProgram('pointsPerUnit', parseInt(e.target.value))}
                                min="1"
                                className="input"
                            />
                            <p className="text-sm text-secondary mt-1">
                                This many points = $1 discount (e.g., 10 points = $1 off)
                            </p>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Minimum Points to Redeem</label>
                            <input
                                type="number"
                                value={program.minPointsToRedeem}
                                onChange={(e) => updateProgram('minPointsToRedeem', parseInt(e.target.value))}
                                min="0"
                                className="input"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Maximum Points per Transaction</label>
                            <input
                                type="number"
                                value={program.maxPointsPerTransaction}
                                onChange={(e) => updateProgram('maxPointsPerTransaction', parseInt(e.target.value))}
                                min="0"
                                className="input"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Points Expiration (Days)</label>
                            <input
                                type="number"
                                value={program.pointsExpirationDays}
                                onChange={(e) => updateProgram('pointsExpirationDays', parseInt(e.target.value))}
                                min="0"
                                className="input"
                            />
                            <p className="text-sm text-secondary mt-1">
                                Set to 0 for points that never expire
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
                <div className="tier-config-list">
                    {Object.entries(program.tiers).map(([tierKey, tier]) => (
                        <div key={tierKey} className="tier-config-item">
                            <div className="tier-config-header">
                                <div className={`tier-config-icon tier-badge ${tierKey}`}>
                                    <Award className="w-6 h-6" />
                                </div>
                                <div className="tier-config-info">
                                    <h4>{tier.name} Tier</h4>
                                    <p>Configure {tier.name.toLowerCase()} tier settings</p>
                                </div>
                            </div>
                            <div className="tier-config-fields">
                                <div className="input-group">
                                    <label className="input-label">Tier Name</label>
                                    <input
                                        type="text"
                                        value={tier.name}
                                        onChange={(e) => updateTier(tierKey, 'name', e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Minimum Lifetime Spending ($)</label>
                                    <input
                                        type="number"
                                        value={tier.minSpending}
                                        onChange={(e) => updateTier(tierKey, 'minSpending', parseFloat(e.target.value))}
                                        min="0"
                                        className="input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Points Multiplier</label>
                                    <input
                                        type="number"
                                        value={tier.multiplier}
                                        onChange={(e) => updateTier(tierKey, 'multiplier', parseFloat(e.target.value))}
                                        min="1"
                                        step="0.1"
                                        className="input"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Special Rewards Tab */}
            {activeTab === 'rewards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Birthday Bonus */}
                    <div className="loyalty-form-section">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="loyalty-form-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>
                                <Gift className="w-5 h-5" style={{ display: 'inline', marginRight: 'var(--space-2)' }} />
                                Birthday Rewards
                            </h2>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={program.birthdayBonus.enabled}
                                    onChange={(e) => updateBonus('birthdayBonus', 'enabled', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Enabled</span>
                            </label>
                        </div>
                        <div style={{ maxWidth: '500px' }}>
                            <div className="input-group">
                                <label className="input-label">Birthday Points</label>
                                <input
                                    type="number"
                                    value={program.birthdayBonus.points}
                                    onChange={(e) => updateBonus('birthdayBonus', 'points', parseInt(e.target.value))}
                                    disabled={!program.birthdayBonus.enabled}
                                    min="0"
                                    className="input"
                                />
                                <p className="text-sm text-secondary mt-1">
                                    Points awarded to customers on their birthday
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Referral Bonus */}
                    <div className="loyalty-form-section">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="loyalty-form-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>
                                <Users className="w-5 h-5" style={{ display: 'inline', marginRight: 'var(--space-2)' }} />
                                Referral Rewards
                            </h2>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={program.referralBonus.enabled}
                                    onChange={(e) => updateBonus('referralBonus', 'enabled', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Enabled</span>
                            </label>
                        </div>
                        <div className="loyalty-form-grid">
                            <div className="input-group">
                                <label className="input-label">Points for Referrer</label>
                                <input
                                    type="number"
                                    value={program.referralBonus.referrerPoints}
                                    onChange={(e) => updateBonus('referralBonus', 'referrerPoints', parseInt(e.target.value))}
                                    disabled={!program.referralBonus.enabled}
                                    min="0"
                                    className="input"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Points for Referred Customer</label>
                                <input
                                    type="number"
                                    value={program.referralBonus.referredPoints}
                                    onChange={(e) => updateBonus('referralBonus', 'referredPoints', parseInt(e.target.value))}
                                    disabled={!program.referralBonus.enabled}
                                    min="0"
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
                <div className="loyalty-form-section">
                    <h2 className="loyalty-form-section-title">Advanced Settings</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={program.settings.allowNegativeBalance}
                                onChange={(e) => updateSettings('allowNegativeBalance', e.target.checked)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Allow Negative Balance</div>
                                <div className="text-sm text-secondary">
                                    Allow customers to redeem more points than they have (credit system)
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={program.settings.autoApplyDiscount}
                                onChange={(e) => updateSettings('autoApplyDiscount', e.target.checked)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Auto-Apply Discount</div>
                                <div className="text-sm text-secondary">
                                    Automatically suggest points redemption at checkout
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={program.settings.notifyOnEarn}
                                onChange={(e) => updateSettings('notifyOnEarn', e.target.checked)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Notify on Points Earned</div>
                                <div className="text-sm text-secondary">
                                    Show notification when customer earns points
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={program.settings.notifyOnExpire}
                                onChange={(e) => updateSettings('notifyOnExpire', e.target.checked)}
                                className="w-4 h-4"
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Notify on Points Expiring</div>
                                <div className="text-sm text-secondary">
                                    Alert customers before their points expire
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
