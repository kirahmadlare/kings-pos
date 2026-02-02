/**
 * @fileoverview Central Management Dashboard
 *
 * Aggregated metrics and insights across all stores in the organization
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
    Store, AlertTriangle, CheckCircle, BarChart3, ArrowRight, RefreshCw
} from 'lucide-react';
import { apiRequest } from '../services/api';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './CentralDashboard.css';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function CentralDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState(null);
    const [salesReport, setSalesReport] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('month');

    useEffect(() => {
        loadDashboard();
    }, [selectedPeriod]);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            // Get user's organization
            const orgsResponse = await apiRequest('/organizations');

            if (orgsResponse && orgsResponse.length > 0) {
                const orgId = orgsResponse[0]._id;

                // Load stats and sales report in parallel
                const [statsData, reportData] = await Promise.all([
                    apiRequest(`/organizations/${orgId}/stats`),
                    apiRequest(`/organizations/${orgId}/reports?reportType=sales&startDate=${getStartDate(selectedPeriod)}`)
                ]);

                setStats(statsData);
                setSalesReport(reportData);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    };

    const getStartDate = (period) => {
        const now = new Date();
        switch (period) {
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            case 'month':
                return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            case 'quarter':
                return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
            case 'year':
                return new Date(now.getFullYear(), 0, 1).toISOString();
            default:
                return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="central-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="central-dashboard">
                <div className="empty-state">
                    <Store size={64} />
                    <h2>No Data Available</h2>
                    <p>Set up your organization to view consolidated metrics</p>
                    <button className="btn btn-primary" onClick={() => navigate('/organization')}>
                        Go to Organization
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="central-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Central Management Console</h1>
                    <p className="subtitle">
                        {stats.organizationName} • {stats.activeStores}/{stats.storeCount} Stores Active
                    </p>
                </div>
                <div className="header-actions">
                    <select
                        className="period-select"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                        Refresh
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/stores/comparison')}
                    >
                        <BarChart3 size={18} />
                        Compare Stores
                    </button>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="kpi-section">
                <h2 className="section-title">Organization Overview</h2>
                <div className="kpi-grid">
                    <KPICard
                        title="Total Revenue"
                        value={formatCurrency(stats.sales.month.revenue)}
                        subtitle={`${stats.sales.month.transactions} transactions`}
                        icon={<DollarSign />}
                        color="blue"
                    />
                    <KPICard
                        title="Today's Sales"
                        value={formatCurrency(stats.sales.today.revenue)}
                        subtitle={`${stats.sales.today.transactions} transactions`}
                        icon={<ShoppingCart />}
                        color="purple"
                    />
                    <KPICard
                        title="Total Customers"
                        value={stats.customers.total.toLocaleString()}
                        subtitle={`${stats.customers.newThisMonth} new this month`}
                        icon={<Users />}
                        color="pink"
                    />
                    <KPICard
                        title="Inventory Health"
                        value={`${stats.inventory.healthPercentage}%`}
                        subtitle={`${stats.inventory.lowStockProducts} low stock`}
                        icon={<Package />}
                        color="green"
                        alert={stats.inventory.lowStockProducts > 0}
                    />
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-row">
                    {/* Sales Trend */}
                    <div className="chart-card chart-full">
                        <h3>Sales Trend Across All Stores</h3>
                        {salesReport?.dailyTrend && salesReport.dailyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesReport.dailyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="_id"
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return `${date.getMonth() + 1}/${date.getDate()}`;
                                        }}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                                            return [value, 'Transactions'];
                                        }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="Revenue"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="transactions"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        name="Transactions"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No sales data available</div>
                        )}
                    </div>
                </div>

                <div className="chart-row">
                    {/* Top Stores */}
                    <div className="chart-card">
                        <h3>Top Performing Stores</h3>
                        {stats.topStores && stats.topStores.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.topStores}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="storeName" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No store data available</div>
                        )}
                    </div>

                    {/* Store Performance */}
                    <div className="chart-card">
                        <h3>Store Distribution</h3>
                        {salesReport?.salesByStore && salesReport.salesByStore.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={salesReport.salesByStore}
                                        dataKey="revenue"
                                        nameKey="storeName"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={(entry) => entry.storeName}
                                    >
                                        {salesReport.salesByStore.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">No distribution data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Store Performance Table */}
            <div className="stores-section">
                <div className="section-header">
                    <h2>Store Performance Details</h2>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/organization')}
                    >
                        View All Stores
                        <ArrowRight size={18} />
                    </button>
                </div>

                <div className="stores-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Store Name</th>
                                <th>Revenue</th>
                                <th>Transactions</th>
                                <th>Avg Transaction</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesReport?.salesByStore?.map((store) => (
                                <tr key={store.storeId}>
                                    <td className="store-name">{store.storeName}</td>
                                    <td className="revenue">{formatCurrency(store.revenue)}</td>
                                    <td>{store.transactions}</td>
                                    <td>{formatCurrency(store.avgTransaction)}</td>
                                    <td>
                                        <span className="status-badge status-active">
                                            <CheckCircle size={14} />
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <button
                    className="action-card"
                    onClick={() => navigate('/stores/transfer')}
                >
                    <Package size={24} />
                    <span>Transfer Inventory</span>
                </button>
                <button
                    className="action-card"
                    onClick={() => navigate('/organization')}
                >
                    <Store size={24} />
                    <span>Manage Stores</span>
                </button>
                <button
                    className="action-card"
                    onClick={() => navigate('/central/reports')}
                >
                    <BarChart3 size={24} />
                    <span>View Reports</span>
                </button>
            </div>
        </div>
    );
}

// KPI Card Component
function KPICard({ title, value, subtitle, icon, color, alert }) {
    const colorMap = {
        blue: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        purple: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        pink: 'linear-gradient(135deg, #ec4899, #f59e0b)',
        green: 'linear-gradient(135deg, #10b981, #06b6d4)',
        orange: 'linear-gradient(135deg, #f59e0b, #ef4444)'
    };

    return (
        <div className={`kpi-card ${alert ? 'kpi-alert' : ''}`}>
            <div className="kpi-icon" style={{ background: colorMap[color] || colorMap.blue }}>
                {icon}
            </div>
            <div className="kpi-content">
                <div className="kpi-title">{title}</div>
                <div className="kpi-value">{value}</div>
                <div className="kpi-subtitle">{subtitle}</div>
            </div>
        </div>
    );
}

export default CentralDashboard;
