/**
 * @fileoverview Dashboard Page
 * 
 * This page provides an overview of the store's performance:
 * - Today's revenue and sales count
 * - Weekly and monthly revenue
 * - Low stock alerts
 * - Credit payment due alerts
 * - Recent sales
 * - Top selling products
 * - Quick action buttons
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCurrency } from '../hooks/useCurrency';
import db from '../db';
import {
    Package, ShoppingCart, TrendingUp, DollarSign,
    AlertTriangle, ArrowUpRight, BarChart3, Users,
    CreditCard, Calendar, Clock, UserCog
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
    const { formatCurrency } = useCurrency();
    const { store } = useAuthStore();
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockItems: 0,
        todaySales: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [dueCredits, setDueCredits] = useState([]);
    const [onDutyEmployees, setOnDutyEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [store?.id]);

    /**
     * Load all dashboard data
     */
    const loadDashboardData = async () => {
        if (!store?.id) return;

        try {
            // Get products count
            const products = await db.products
                .where('storeId')
                .equals(store.id)
                .toArray();

            const lowStock = products.filter(p =>
                p.quantity <= (p.lowStockThreshold || 5)
            );

            // Get sales data
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);

            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const sales = await db.sales
                .where('storeId')
                .equals(store.id)
                .toArray();

            const todaySales = sales.filter(s =>
                new Date(s.createdAt) >= today
            );

            const weekSales = sales.filter(s =>
                new Date(s.createdAt) >= weekAgo
            );

            const monthSales = sales.filter(s =>
                new Date(s.createdAt) >= monthAgo
            );

            // Calculate product sales frequency
            const productSalesCount = {};
            sales.forEach(sale => {
                (sale.items || []).forEach(item => {
                    productSalesCount[item.productId] = (productSalesCount[item.productId] || 0) + item.quantity;
                });
            });

            // Get top products
            const topProductIds = Object.entries(productSalesCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id]) => parseInt(id));

            const topProductsData = await Promise.all(
                topProductIds.map(async id => {
                    const product = await db.products.get(id);
                    return product ? { ...product, soldCount: productSalesCount[id] } : null;
                })
            );

            // Get credits due within 7 days or overdue
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            const credits = await db.credits
                .where('storeId')
                .equals(store.id)
                .filter(c => c.status !== 'paid')
                .toArray();

            const dueCreditsList = credits
                .filter(c => new Date(c.dueDate) <= sevenDaysFromNow)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            // Enrich credits with customer names
            const enrichedCredits = await Promise.all(
                dueCreditsList.map(async credit => {
                    const customer = await db.customers.get(credit.customerId);
                    return { ...credit, customerName: customer?.name || 'Unknown' };
                })
            );

            // Get currently clocked-in employees
            const clockEvents = await db.clockEvents
                .where('storeId')
                .equals(store.id)
                .filter(e => !e.clockOut)
                .toArray();

            const onDutyList = await Promise.all(
                clockEvents.map(async event => {
                    const employee = await db.employees.get(event.employeeId);
                    return employee ? { ...employee, clockIn: event.clockIn } : null;
                })
            );

            setStats({
                totalProducts: products.length,
                lowStockItems: lowStock.length,
                todaySales: todaySales.length,
                todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
                weekRevenue: weekSales.reduce((sum, s) => sum + s.total, 0),
                monthRevenue: monthSales.reduce((sum, s) => sum + s.total, 0)
            });

            setRecentSales(sales.slice(-5).reverse());
            setTopProducts(topProductsData.filter(Boolean));
            setDueCredits(enrichedCredits);
            setOnDutyEmployees(onDutyList.filter(Boolean));
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Calculate days until/since a date
     */
    const getDaysFromNow = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    /**
     * Get credit status display
     */
    const getCreditStatusLabel = (credit) => {
        const days = getDaysFromNow(credit.dueDate);
        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        return `Due in ${days} days`;
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner spinner-lg" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Welcome Section */}
            <div className="dashboard-welcome">
                <div>
                    <h2>Welcome back! 👋</h2>
                    <p>Here's what's happening with your store today.</p>
                </div>
                <Link to="/pos" className="btn btn-primary btn-lg">
                    <ShoppingCart size={20} />
                    Open POS
                </Link>
            </div>

            {/* Credit Alerts */}
            {dueCredits.length > 0 && (
                <div className="credit-alerts">
                    <div className="alert-header">
                        <CreditCard size={20} />
                        <h3>Payment Reminders</h3>
                        <Link to="/customers" className="btn btn-ghost btn-sm">View all</Link>
                    </div>
                    <div className="credit-alert-list">
                        {dueCredits.slice(0, 3).map(credit => {
                            const days = getDaysFromNow(credit.dueDate);
                            const isOverdue = days < 0;
                            const remaining = credit.amount - (credit.amountPaid || 0);
                            return (
                                <div key={credit.id} className={`credit-alert-item ${isOverdue ? 'overdue' : ''}`}>
                                    <div className="credit-alert-info">
                                        <span className="customer-name">{credit.customerName}</span>
                                        <span className="credit-amount">{formatCurrency(remaining)}</span>
                                    </div>
                                    <span className={`credit-due ${isOverdue ? 'overdue' : days === 0 ? 'today' : ''}`}>
                                        {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                                        {getCreditStatusLabel(credit)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* On Duty Employees */}
            {onDutyEmployees.length > 0 && (
                <div className="on-duty-section">
                    <div className="alert-header">
                        <UserCog size={20} />
                        <h3>Currently On Duty</h3>
                        <Link to="/shifts" className="btn btn-ghost btn-sm">View shifts</Link>
                    </div>
                    <div className="on-duty-list">
                        {onDutyEmployees.map(emp => (
                            <div key={emp.id} className="on-duty-badge">
                                <span className="emp-name">{emp.name}</span>
                                <span className="emp-since">
                                    <Clock size={12} />
                                    Since {new Date(emp.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-primary">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Today's Revenue</span>
                        <span className="stat-value">{formatCurrency(stats.todayRevenue)}</span>
                        <span className="stat-change positive">
                            <ArrowUpRight size={14} />
                            {stats.todaySales} sales
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-success">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">This Week</span>
                        <span className="stat-value">{formatCurrency(stats.weekRevenue)}</span>
                        <span className="stat-change positive">
                            <ArrowUpRight size={14} />
                            vs last week
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-info">
                        <Package size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Products</span>
                        <span className="stat-value">{stats.totalProducts}</span>
                        <Link to="/inventory" className="stat-link">
                            Manage inventory
                        </Link>
                    </div>
                </div>

                <div className="stat-card">
                    <div className={`stat-icon ${stats.lowStockItems > 0 ? 'stat-icon-warning' : 'stat-icon-success'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Low Stock Items</span>
                        <span className="stat-value">{stats.lowStockItems}</span>
                        {stats.lowStockItems > 0 && (
                            <Link to="/orders" className="stat-link text-warning">
                                Restock needed
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Recent Sales */}
                <div className="card dashboard-card">
                    <div className="card-header">
                        <h3>Recent Sales</h3>
                        <Link to="/reports" className="btn btn-ghost btn-sm">
                            View all
                        </Link>
                    </div>

                    {recentSales.length > 0 ? (
                        <div className="recent-sales-list">
                            {recentSales.map(sale => (
                                <div key={sale.id} className="sale-item">
                                    <div className="sale-info">
                                        <span className="sale-id">#{sale.id}</span>
                                        <span className="sale-time">
                                            {new Date(sale.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="sale-details">
                                        <span className="sale-items">
                                            {sale.items?.length || 0} items
                                        </span>
                                        <span className={`sale-method ${sale.paymentMethod}`}>
                                            {sale.paymentMethod}
                                        </span>
                                        <span className="sale-total">{formatCurrency(sale.total)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <ShoppingCart size={32} />
                            <p>No sales yet today</p>
                            <Link to="/pos" className="btn btn-primary btn-sm">
                                Make your first sale
                            </Link>
                        </div>
                    )}
                </div>

                {/* Top Products */}
                <div className="card dashboard-card">
                    <div className="card-header">
                        <h3>Top Products</h3>
                        <Link to="/reports" className="btn btn-ghost btn-sm">
                            View report
                        </Link>
                    </div>

                    {topProducts.length > 0 ? (
                        <div className="top-products-list">
                            {topProducts.map((product, index) => (
                                <div key={product.id} className="product-item">
                                    <span className="product-rank">#{index + 1}</span>
                                    <div className="product-info">
                                        <span className="product-name">{product.name}</span>
                                        <span className="product-sold">{product.soldCount} sold</span>
                                    </div>
                                    <span className="product-price">{formatCurrency(product.price)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <BarChart3 size={32} />
                            <p>No sales data yet</p>
                            <p className="text-sm text-secondary">
                                Start selling to see top products
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <Link to="/inventory" className="action-card">
                        <Package size={24} />
                        <span>Add Product</span>
                    </Link>
                    <Link to="/pos" className="action-card">
                        <ShoppingCart size={24} />
                        <span>New Sale</span>
                    </Link>
                    <Link to="/customers" className="action-card">
                        <Users size={24} />
                        <span>Customers</span>
                    </Link>
                    <Link to="/reports" className="action-card">
                        <BarChart3 size={24} />
                        <span>View Reports</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
