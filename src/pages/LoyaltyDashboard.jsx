/**
 * @fileoverview Loyalty Dashboard Page
 *
 * Shows loyalty program statistics, top customers, and recent activity
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Users, TrendingUp, Gift, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import api from '../services/api';
import { toast } from '../stores/toastStore';
import { useCurrency } from '../hooks/useCurrency';
import './Loyalty.css';

export default function LoyaltyDashboard() {
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [topCustomers, setTopCustomers] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedTier, setSelectedTier] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, topData, allData] = await Promise.all([
                api.loyalty.getStats(),
                api.loyalty.getTopCustomers(10, 'points'),
                api.loyalty.getAllCustomers()
            ]);

            setStats(statsData);
            setTopCustomers(topData);
            setAllCustomers(allData.customers || []);
        } catch (error) {
            console.error('Failed to load loyalty data:', error);
            toast.error('Failed to load loyalty data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loyalty-loading">
                <div className="spinner spinner-lg"></div>
                <p className="loyalty-loading-text">Loading loyalty data...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="loyalty-empty">
                <Award size={48} />
                <h3>No loyalty data available</h3>
            </div>
        );
    }

    const filteredCustomers = selectedTier === 'all'
        ? allCustomers
        : allCustomers.filter(c => c.tier === selectedTier);

    return (
        <div className="loyalty-page">
            {/* Header */}
            <div className="loyalty-header">
                <div className="loyalty-header-content">
                    <h1>Loyalty Program Dashboard</h1>
                    <p>Track your customer loyalty program performance</p>
                </div>
                <button
                    onClick={() => navigate('/loyalty/settings')}
                    className="btn btn-primary"
                >
                    <Settings className="w-5 h-5" />
                    Loyalty Settings
                </button>
            </div>

            {/* KPI Cards */}
            <div className="loyalty-stats-grid">
                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-header">
                        <h3 className="loyalty-stat-label">Total Members</h3>
                        <div className="loyalty-stat-icon">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="loyalty-stat-value">
                        {stats.overview.totalMembers.toLocaleString()}
                    </div>
                    <div className="loyalty-stat-meta success">
                        <ArrowUp className="w-4 h-4" />
                        {stats.overview.activeMembers} active
                    </div>
                </div>

                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-header">
                        <h3 className="loyalty-stat-label">Points Issued</h3>
                        <div className="loyalty-stat-icon success">
                            <Gift className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="loyalty-stat-value">
                        {stats.overview.totalPointsIssued.toLocaleString()}
                    </div>
                    <div className="loyalty-stat-meta">
                        Lifetime total
                    </div>
                </div>

                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-header">
                        <h3 className="loyalty-stat-label">Points Redeemed</h3>
                        <div className="loyalty-stat-icon warning">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="loyalty-stat-value">
                        {stats.overview.totalPointsRedeemed.toLocaleString()}
                    </div>
                    <div className="loyalty-stat-meta">
                        {stats.overview.redemptionRate}% redemption rate
                    </div>
                </div>

                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-header">
                        <h3 className="loyalty-stat-label">Outstanding Points</h3>
                        <div className="loyalty-stat-icon">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="loyalty-stat-value">
                        {(stats.overview.totalPointsIssued - stats.overview.totalPointsRedeemed).toLocaleString()}
                    </div>
                    <div className="loyalty-stat-meta">
                        Available for redemption
                    </div>
                </div>
            </div>

            {/* Tier Breakdown */}
            <div className="loyalty-section">
                <div className="loyalty-section-header">
                    <h2 className="loyalty-section-title">Member Tiers</h2>
                </div>
                <div className="tier-grid">
                    {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
                        <div key={tier} className={`tier-card ${tier}`}>
                            <div className={`tier-badge ${tier}`}>
                                <Award className="w-4 h-4" />
                                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                            </div>
                            <div className="tier-count">
                                {stats.tiers[tier]?.count || 0}
                            </div>
                            <div className="tier-label">
                                Avg: {stats.tiers[tier]?.avgPoints || 0} pts
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Customers */}
            <div className="loyalty-section">
                <div className="loyalty-section-header">
                    <h2 className="loyalty-section-title">Top Loyalty Members</h2>
                </div>
                <div className="loyalty-table-container">
                    <table className="loyalty-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Customer</th>
                                <th>Tier</th>
                                <th>Points</th>
                                <th>Lifetime Spending</th>
                                <th>Lifetime Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topCustomers.map((customer, index) => (
                                <tr key={customer._id}>
                                    <td>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full"
                                             style={{ background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                                                     color: 'var(--primary-700)',
                                                     fontWeight: 'bold' }}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>
                                            {customer.customerId?.firstName} {customer.customerId?.lastName}
                                        </div>
                                        <div className="text-sm text-secondary">
                                            {customer.customerId?.phone}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`tier-badge ${customer.tier}`}>
                                            <Award className="w-3 h-3" />
                                            {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>
                                        {customer.points.toLocaleString()} pts
                                    </td>
                                    <td>
                                        {formatCurrency(customer.lifetimeSpending)}
                                    </td>
                                    <td className="text-secondary">
                                        {customer.lifetimePoints.toLocaleString()} pts
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Activity */}
            {stats.recentActivity && stats.recentActivity.length > 0 && (
                <div className="loyalty-section">
                    <div className="loyalty-section-header">
                        <h2 className="loyalty-section-title">Recent Activity</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        {stats.recentActivity.map((transaction) => (
                            <div key={transaction._id} className="flex items-center justify-between p-4"
                                 style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <div className="flex items-center gap-4">
                                    <div className={`loyalty-stat-icon ${
                                        transaction.type === 'earn' ? 'success' :
                                        transaction.type === 'redeem' ? 'warning' : ''
                                    }`} style={{ width: '40px', height: '40px' }}>
                                        {transaction.type === 'earn' ? <ArrowUp className="w-5 h-5" /> :
                                         transaction.type === 'redeem' ? <ArrowDown className="w-5 h-5" /> :
                                         <Gift className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>
                                            {transaction.customerId?.firstName} {transaction.customerId?.lastName}
                                        </div>
                                        <div className="text-sm text-secondary">
                                            {transaction.formattedDescription || transaction.description}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontWeight: 'bold',
                                        color: transaction.points > 0 ? 'var(--success-600)' : 'var(--warning-600)'
                                    }}>
                                        {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                                    </div>
                                    <div className="text-sm text-secondary">
                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
