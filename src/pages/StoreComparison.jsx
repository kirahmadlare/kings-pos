/**
 * @fileoverview Store Comparison Page
 *
 * Compare multiple stores side-by-side with key metrics and visualizations.
 * Allows users to select up to 4 stores and compare their performance.
 */

import { useState, useEffect } from 'react';
import {
    Building2, TrendingUp, ShoppingCart, Package, Users,
    AlertTriangle, Calendar, Download, BarChart3, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { toast } from '../stores/toastStore';
import '../pages/Inventory.css';

function StoreComparison() {
    const [stores, setStores] = useState([]);
    const [selectedStores, setSelectedStores] = useState([]);
    const [dateRange, setDateRange] = useState('7');
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        loadStores();
    }, []);

    useEffect(() => {
        if (selectedStores.length > 0) {
            loadComparisonData();
        }
    }, [selectedStores, dateRange]);

    const loadStores = async () => {
        try {
            const data = await api.stores.getAll();
            setStores(data);
            // Auto-select first 2 stores if available
            if (data.length > 0) {
                setSelectedStores(data.slice(0, Math.min(2, data.length)).map(s => s._id));
            }
        } catch (error) {
            console.error('Failed to load stores:', error);
            toast.error('Failed to load stores', 'Error');
        } finally {
            setInitialLoading(false);
        }
    };

    const loadComparisonData = async () => {
        if (selectedStores.length === 0) return;

        try {
            setLoading(true);
            const response = await api.stores.compare({
                storeIds: selectedStores,
                days: parseInt(dateRange)
            });
            setComparisonData(response);
        } catch (error) {
            console.error('Failed to load comparison data:', error);
            toast.error('Failed to load comparison data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleStoreToggle = (storeId) => {
        if (selectedStores.includes(storeId)) {
            setSelectedStores(selectedStores.filter(id => id !== storeId));
        } else {
            if (selectedStores.length >= 4) {
                toast.warning('You can compare up to 4 stores at a time', 'Limit Reached');
                return;
            }
            setSelectedStores([...selectedStores, storeId]);
        }
    };

    const handleExport = () => {
        if (!comparisonData) return;

        const csvData = generateCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `store-comparison-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Comparison data exported successfully', 'Export Complete');
    };

    const generateCSV = () => {
        if (!comparisonData || !comparisonData.stores) return '';

        const headers = ['Metric', ...comparisonData.stores.map(s => s.name)];
        const rows = [
            ['Revenue', ...comparisonData.stores.map(s => `$${s.metrics.revenue.toFixed(2)}`)],
            ['Transactions', ...comparisonData.stores.map(s => s.metrics.transactions)],
            ['Avg Basket', ...comparisonData.stores.map(s => `$${s.metrics.avgBasket.toFixed(2)}`)],
            ['Inventory Value', ...comparisonData.stores.map(s => `$${s.metrics.inventoryValue.toFixed(2)}`)],
            ['Customers', ...comparisonData.stores.map(s => s.metrics.customers)],
            ['Low Stock Items', ...comparisonData.stores.map(s => s.metrics.lowStockItems)]
        ];

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    const getChartData = () => {
        if (!comparisonData || !comparisonData.stores) return [];

        return comparisonData.stores.map(store => ({
            name: store.name,
            revenue: store.metrics.revenue,
            transactions: store.metrics.transactions,
            customers: store.metrics.customers
        }));
    };

    const getRankedStores = () => {
        if (!comparisonData || !comparisonData.stores) return [];

        return [...comparisonData.stores].sort((a, b) => b.metrics.revenue - a.metrics.revenue);
    };

    if (initialLoading) {
        return (
            <div className="inventory-page">
                <div className="inventory-loading">
                    <div className="inventory-loading-spinner"></div>
                    <p>Loading stores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inventory-page">
            {/* Header */}
            <div className="inventory-header">
                <div>
                    <h1>Store Comparison</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Compare performance across multiple stores
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="inventory-btn inventory-btn-secondary"
                        onClick={loadComparisonData}
                        disabled={loading || selectedStores.length === 0}
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button
                        className="inventory-btn inventory-btn-primary"
                        onClick={handleExport}
                        disabled={!comparisonData || selectedStores.length === 0}
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Store Selector */}
            <div className="inventory-form" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <label className="inventory-form-label">
                            Select Stores to Compare (Max 4)
                        </label>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                            {selectedStores.length} of 4 stores selected
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                        <select
                            className="inventory-form-select"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                    {stores.map(store => (
                        <label
                            key={store._id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                background: selectedStores.includes(store._id) ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface)',
                                border: `2px solid ${selectedStores.includes(store._id) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedStores.includes(store._id)}
                                onChange={() => handleStoreToggle(store._id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <Building2 size={20} style={{ color: 'var(--primary-color)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    {store.name}
                                </div>
                                {store.address && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {store.address}
                                    </div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Comparison Content */}
            {selectedStores.length === 0 ? (
                <div className="inventory-empty">
                    <Building2 size={64} className="inventory-empty-icon" />
                    <h3 className="inventory-empty-title">No Stores Selected</h3>
                    <p className="inventory-empty-message">
                        Select at least one store from the checkboxes above to start comparing
                    </p>
                </div>
            ) : loading ? (
                <div className="inventory-loading">
                    <div className="inventory-loading-spinner"></div>
                    <p>Loading comparison data...</p>
                </div>
            ) : comparisonData && comparisonData.stores ? (
                <>
                    {/* Metrics Grid */}
                    <div className="inventory-stats-grid" style={{ marginBottom: '2rem' }}>
                        {comparisonData.stores.map(store => (
                            <div key={store._id} className="inventory-stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Building2 size={20} style={{ color: 'var(--primary-color)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{store.name}</h3>
                                </div>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Revenue</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success-color)' }}>
                                            ${store.metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Transactions</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{store.metrics.transactions}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Avg Basket</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                            ${store.metrics.avgBasket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Inventory Value</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--info-color)' }}>
                                            ${store.metrics.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Customers</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{store.metrics.customers}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Low Stock Items</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: store.metrics.lowStockItems > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                                            {store.metrics.lowStockItems}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Revenue Comparison Chart */}
                    <div className="inventory-forecast-container" style={{ marginBottom: '2rem' }}>
                        <div className="inventory-forecast-header">
                            <div>
                                <h2 className="inventory-forecast-title">Revenue Comparison</h2>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                                    Compare revenue across selected stores
                                </p>
                            </div>
                        </div>
                        <div style={{ height: '400px', marginTop: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--card-background)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value, name) => {
                                            if (name === 'revenue') {
                                                return [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue'];
                                            }
                                            return [value, name === 'transactions' ? 'Transactions' : 'Customers'];
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Ranking Table */}
                    <div className="inventory-form">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <BarChart3 size={24} style={{ color: 'var(--primary-color)' }} />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Store Rankings by Revenue</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="abc-products-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>Rank</th>
                                        <th>Store</th>
                                        <th style={{ textAlign: 'right' }}>Revenue</th>
                                        <th style={{ textAlign: 'right' }}>Transactions</th>
                                        <th style={{ textAlign: 'right' }}>Avg Basket</th>
                                        <th style={{ textAlign: 'right' }}>Customers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getRankedStores().map((store, index) => (
                                        <tr key={store._id}>
                                            <td>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: index === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : index === 1 ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' : index === 2 ? 'linear-gradient(135deg, #fb923c, #f97316)' : 'var(--surface)',
                                                    color: index < 3 ? 'white' : 'var(--text-primary)',
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Building2 size={16} style={{ color: 'var(--primary-color)' }} />
                                                    <span style={{ fontWeight: 600 }}>{store.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                                                ${store.metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{store.metrics.transactions}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                ${store.metrics.avgBasket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{store.metrics.customers}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

export default StoreComparison;
