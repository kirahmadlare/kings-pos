/**
 * @fileoverview Analytics Dashboard Page
 *
 * Comprehensive analytics and reporting dashboard with interactive charts
 */

import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Award, Target, Activity } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import api from '../services/api';
import './Analytics.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

function Analytics() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [salesTrends, setSalesTrends] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [period, setPeriod] = useState('week');

    // Advanced analytics state
    const [inventoryTurnover, setInventoryTurnover] = useState(null);
    const [customerSegments, setCustomerSegments] = useState([]);
    const [employeePerformance, setEmployeePerformance] = useState([]);
    const [salesForecast, setSalesForecast] = useState([]);
    const [advancedLoading, setAdvancedLoading] = useState(false);

    useEffect(() => {
        loadAnalytics();
        loadAdvancedAnalytics();
    }, [period]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            // Load all analytics data in parallel
            const [dashboardData, trendsData, productsData, categoriesData] = await Promise.all([
                api.analytics.getDashboard(),
                api.analytics.getSalesTrends(period),
                api.analytics.getTopProducts(10, period),
                api.analytics.getCategoryBreakdown(period)
            ]);

            setDashboard(dashboardData);
            setSalesTrends(trendsData);
            setTopProducts(productsData);
            setCategoryBreakdown(categoriesData);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAdvancedAnalytics = async () => {
        try {
            setAdvancedLoading(true);

            // Calculate date range based on period
            const endDate = new Date();
            let startDate;
            switch (period) {
                case 'today':
                    startDate = startOfDay(new Date());
                    break;
                case 'week':
                    startDate = subDays(endDate, 7);
                    break;
                case 'month':
                    startDate = subDays(endDate, 30);
                    break;
                default:
                    startDate = subDays(endDate, 7);
            }

            // Load advanced analytics in parallel
            const [turnoverData, segmentsData, performanceData, forecastData] = await Promise.all([
                api.analytics.getInventoryTurnover(startDate.toISOString(), endDate.toISOString()).catch(() => null),
                api.analytics.getCustomerSegments().catch(() => []),
                api.analytics.getEmployeePerformance(startDate.toISOString(), endDate.toISOString()).catch(() => []),
                api.analytics.getSalesForecast(7).catch(() => [])
            ]);

            setInventoryTurnover(turnoverData);
            setCustomerSegments(segmentsData);
            setEmployeePerformance(performanceData);
            setSalesForecast(forecastData);
        } catch (error) {
            console.error('Failed to load advanced analytics:', error);
        } finally {
            setAdvancedLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: 0
                    }}>
                        Analytics Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        Track your store's performance and insights
                    </p>
                </div>
                <div className="period-selector">
                    <button
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: period === 'today' ? 'none' : '1px solid var(--border-color)',
                            background: period === 'today'
                                ? 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))'
                                : 'var(--surface)',
                            color: period === 'today' ? 'white' : 'var(--text-primary)'
                        }}
                        onClick={() => setPeriod('today')}
                    >
                        Today
                    </button>
                    <button
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: period === 'week' ? 'none' : '1px solid var(--border-color)',
                            background: period === 'week'
                                ? 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))'
                                : 'var(--surface)',
                            color: period === 'week' ? 'white' : 'var(--text-primary)'
                        }}
                        onClick={() => setPeriod('week')}
                    >
                        Week
                    </button>
                    <button
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: period === 'month' ? 'none' : '1px solid var(--border-color)',
                            background: period === 'month'
                                ? 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))'
                                : 'var(--surface)',
                            color: period === 'month' ? 'white' : 'var(--text-primary)'
                        }}
                        onClick={() => setPeriod('month')}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <KPICard
                    title="Today's Sales"
                    value={`$${dashboard?.sales?.today?.revenue?.toFixed(2) || 0}`}
                    subtitle={`${dashboard?.sales?.today?.transactions || 0} transactions`}
                    change={dashboard?.sales?.today?.change}
                    icon={<DollarSign />}
                />
                <KPICard
                    title="This Week"
                    value={`$${dashboard?.sales?.week?.revenue?.toFixed(2) || 0}`}
                    subtitle={`${dashboard?.sales?.week?.transactions || 0} transactions`}
                    icon={<ShoppingCart />}
                />
                <KPICard
                    title="This Month"
                    value={`$${dashboard?.sales?.month?.revenue?.toFixed(2) || 0}`}
                    subtitle={`${dashboard?.sales?.month?.transactions || 0} transactions`}
                    change={dashboard?.sales?.month?.change}
                    icon={<TrendingUp />}
                />
                <KPICard
                    title="Total Customers"
                    value={dashboard?.customers?.total || 0}
                    subtitle={`${dashboard?.customers?.newThisMonth || 0} new this month`}
                    icon={<Users />}
                />
                <KPICard
                    title="Products"
                    value={dashboard?.products?.total || 0}
                    subtitle={`${dashboard?.products?.lowStock || 0} low stock`}
                    alert={dashboard?.products?.lowStock > 0}
                    icon={<Package />}
                />
                <KPICard
                    title="Out of Stock"
                    value={dashboard?.products?.outOfStock || 0}
                    subtitle="Products"
                    alert={dashboard?.products?.outOfStock > 0}
                    icon={<Package />}
                />
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Sales Trend Chart */}
                <div className="chart-card">
                    <h3>Sales Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="_id.day"
                                label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => `$${value.toFixed(2)}`}
                                labelFormatter={(label) => `Day ${label}`}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name="Revenue"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Breakdown */}
                <div className="chart-card">
                    <h3>Sales by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryBreakdown}
                                dataKey="revenue"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => entry.category}
                            >
                                {categoryBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products Chart */}
                <div className="chart-card chart-card-full">
                    <h3>Top Selling Products</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="totalSold" fill="#3b82f6" name="Units Sold" />
                            <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Advanced Analytics Section */}
            <div style={{ marginTop: '3rem' }}>
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '1.5rem'
                }}>
                    Advanced Business Intelligence
                </h2>

                {advancedLoading ? (
                    <div className="loading-state" style={{ minHeight: '200px' }}>
                        <div className="spinner"></div>
                        <p>Loading advanced analytics...</p>
                    </div>
                ) : (
                    <>
                        {/* Inventory Turnover Section */}
                        {inventoryTurnover && (
                            <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Activity size={20} />
                                        Inventory Turnover Analysis
                                    </h3>
                                </div>
                                <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                                    <div className="kpi-card">
                                        <div className="kpi-title">Turnover Rate</div>
                                        <div className="kpi-value">{(Number(inventoryTurnover.turnoverRate) || 0).toFixed(2)}x</div>
                                        <div className="kpi-subtitle">Times per period</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-title">Days in Inventory</div>
                                        <div className="kpi-value">{(Number(inventoryTurnover.daysInInventory) || 0).toFixed(0)}</div>
                                        <div className="kpi-subtitle">Average days</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-title">Current Inventory Value</div>
                                        <div className="kpi-value">${(Number(inventoryTurnover.currentInventoryValue) || 0).toFixed(2)}</div>
                                        <div className="kpi-subtitle">Total value</div>
                                    </div>
                                </div>
                                {inventoryTurnover.slowMoving?.length > 0 && (
                                    <div>
                                        <h4 style={{ marginBottom: '1rem', color: 'var(--warning-color)' }}>Slow Moving Products</h4>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {inventoryTurnover.slowMoving.slice(0, 5).map((product, idx) => (
                                                <div key={idx} style={{
                                                    padding: '0.75rem',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    borderRadius: 'var(--radius-md)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span style={{ fontWeight: 500 }}>{product.name}</span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        Turnover: {(Number(product.turnover) || 0).toFixed(2)}x
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Customer Segmentation (RFM) */}
                        {customerSegments.length > 0 && (
                            <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
                                <div className="chart-card">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={20} />
                                        Customer Segmentation (RFM)
                                    </h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={customerSegments}
                                                dataKey="count"
                                                nameKey="segment"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={(entry) => `${entry.segment} (${entry.count})`}
                                            >
                                                {customerSegments.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="chart-card">
                                    <h3>Segment Revenue Contribution</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={customerSegments}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="segment" angle={-45} textAnchor="end" height={100} />
                                            <YAxis />
                                            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                            <Bar dataKey="avgSpend" fill="#8b5cf6" name="Avg Spend" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Employee Performance */}
                        {employeePerformance.length > 0 && (
                            <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Award size={20} />
                                    Employee Performance Rankings
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={employeePerformance.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="employeeName" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="totalRevenue" fill="#3b82f6" name="Revenue ($)" />
                                        <Bar dataKey="totalSales" fill="#10b981" name="Sales Count" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {employeePerformance.slice(0, 3).map((emp, idx) => (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            background: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--surface)',
                                            borderRadius: 'var(--radius-md)',
                                            color: idx === 0 ? 'white' : 'var(--text-primary)'
                                        }}>
                                            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>#{emp.rank} {emp.employeeName}</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
                                                ${(Number(emp.totalRevenue) || 0).toFixed(2)}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                                {emp.totalSales} sales | ${(Number(emp.avgSale) || 0).toFixed(2)} avg
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sales Forecast */}
                        {salesForecast.length > 0 && (
                            <div className="chart-card">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Target size={20} />
                                    Sales Forecast (Next 7 Days)
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={salesForecast}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM dd')} />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value, name) => [`$${value.toFixed(2)}`, name === 'predicted' ? 'Forecast' : 'Historical']}
                                            labelFormatter={(date) => format(new Date(date), 'MMMM dd, yyyy')}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="actual"
                                            stroke="#3b82f6"
                                            fill="#3b82f6"
                                            fillOpacity={0.6}
                                            name="Historical"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="predicted"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.3}
                                            strokeDasharray="5 5"
                                            name="Forecast"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * KPI Card Component
 */
function KPICard({ title, value, subtitle, change, icon, alert }) {
    return (
        <div className={`kpi-card ${alert ? 'kpi-card-alert' : ''}`}>
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                <div className="kpi-icon">{icon}</div>
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-footer">
                <span className="kpi-subtitle">{subtitle}</span>
                {change !== undefined && change !== null && (
                    <span className={`kpi-change ${change >= 0 ? 'positive' : 'negative'}`}>
                        {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(change)}%
                    </span>
                )}
            </div>
        </div>
    );
}

export default Analytics;
