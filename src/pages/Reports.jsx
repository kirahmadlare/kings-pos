import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import {
    TrendingUp, TrendingDown, DollarSign, Package,
    ShoppingCart, Calendar, Download, BarChart3
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import './Reports.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function Reports() {
    const { store } = useAuthStore();
    const { formatCurrency } = useCurrency();
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('week'); // 'week', 'month', 'year'

    useEffect(() => {
        loadData();
    }, [store?.id]);

    const loadData = async () => {
        if (!store?.id) return;

        try {
            const [salesData, productsData] = await Promise.all([
                db.sales.where('storeId').equals(store.id).toArray(),
                db.products.where('storeId').equals(store.id).toArray()
            ]);

            setSales(salesData);
            setProducts(productsData);
        } catch (error) {
            console.error('Failed to load reports data:', error);
        } finally {
            setIsLoading(false);
        }
    };


    // Calculate date range
    const getDateRange = () => {
        const now = new Date();
        let startDate;

        switch (dateRange) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
        }

        return { startDate, endDate: now };
    };

    // Filter sales by date range
    const filteredSales = useMemo(() => {
        const { startDate } = getDateRange();
        return sales.filter(sale => new Date(sale.createdAt) >= startDate);
    }, [sales, dateRange]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = filteredSales.reduce((sum, s) => {
            const itemsProfit = (s.items || []).reduce((iSum, item) => {
                const product = products.find(p => p.id === item.productId);
                const cost = product?.costPrice || 0;
                return iSum + ((item.price - cost) * item.quantity);
            }, 0);
            return sum + itemsProfit;
        }, 0);
        const averageOrder = filteredSales.length > 0
            ? totalRevenue / filteredSales.length
            : 0;
        const totalTransactions = filteredSales.length;

        return { totalRevenue, totalProfit, averageOrder, totalTransactions };
    }, [filteredSales, products]);

    // Prepare chart data for sales over time
    const salesChartData = useMemo(() => {
        const { startDate, endDate } = getDateRange();
        const days = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        const salesByDay = days.map(day => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const daySales = filteredSales.filter(s => {
                const saleDate = new Date(s.createdAt);
                return saleDate >= dayStart && saleDate <= dayEnd;
            });

            return daySales.reduce((sum, s) => sum + s.total, 0);
        });

        return {
            labels: days.map(d => d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })),
            datasets: [{
                label: 'Revenue',
                data: salesByDay,
                fill: true,
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4
            }]
        };
    }, [filteredSales, dateRange]);

    // Top products
    const topProducts = useMemo(() => {
        const productSales = {};

        filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });

        return Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [filteredSales]);

    // Category distribution
    const categoryData = useMemo(() => {
        const categorySales = {};

        filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const categoryId = product?.categoryId || 'other';

                if (!categorySales[categoryId]) {
                    categorySales[categoryId] = 0;
                }
                categorySales[categoryId] += item.price * item.quantity;
            });
        });

        const colors = [
            'rgb(99, 102, 241)',
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
            'rgb(245, 158, 11)',
            'rgb(139, 92, 246)'
        ];

        return {
            labels: Object.keys(categorySales).map(id => `Category ${id}`),
            datasets: [{
                data: Object.values(categorySales),
                backgroundColor: colors.slice(0, Object.keys(categorySales).length)
            }]
        };
    }, [filteredSales, products]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    if (isLoading) {
        return (
            <div className="reports-loading">
                <div className="spinner spinner-lg" />
                <p>Loading reports...</p>
            </div>
        );
    }

    return (
        <div className="reports">
            {/* Header */}
            <div className="reports-header">
                <h2>Sales Reports</h2>
                <div className="header-actions">
                    <div className="date-range-selector">
                        <button
                            className={`range-btn ${dateRange === 'week' ? 'active' : ''}`}
                            onClick={() => setDateRange('week')}
                        >
                            Week
                        </button>
                        <button
                            className={`range-btn ${dateRange === 'month' ? 'active' : ''}`}
                            onClick={() => setDateRange('month')}
                        >
                            Month
                        </button>
                        <button
                            className={`range-btn ${dateRange === 'year' ? 'active' : ''}`}
                            onClick={() => setDateRange('year')}
                        >
                            Year
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Revenue</span>
                        <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-success">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Profit</span>
                        <span className="stat-value">{formatCurrency(stats.totalProfit)}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-info">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Orders</span>
                        <span className="stat-value">{stats.totalTransactions}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-warning">
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Avg Order Value</span>
                        <span className="stat-value">{formatCurrency(stats.averageOrder)}</span>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="card chart-card">
                    <h3>Revenue Over Time</h3>
                    <div className="chart-container">
                        {filteredSales.length > 0 ? (
                            <Line data={salesChartData} options={chartOptions} />
                        ) : (
                            <div className="chart-empty">
                                <BarChart3 size={32} />
                                <p>No sales data available</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card chart-card chart-small">
                    <h3>Sales by Category</h3>
                    <div className="chart-container">
                        {filteredSales.length > 0 ? (
                            <Doughnut data={categoryData} options={doughnutOptions} />
                        ) : (
                            <div className="chart-empty">
                                <BarChart3 size={32} />
                                <p>No data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Products */}
            <div className="card">
                <h3 className="card-title">Top Selling Products</h3>
                {topProducts.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Product</th>
                                    <th>Units Sold</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((product, i) => (
                                    <tr key={i}>
                                        <td>
                                            <span className="rank-badge">#{i + 1}</span>
                                        </td>
                                        <td>{product.name}</td>
                                        <td>{product.quantity}</td>
                                        <td className="font-semibold">{formatCurrency(product.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-table">
                        <Package size={32} />
                        <p>No sales data available for this period</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Reports;
