/**
 * @fileoverview Customer Portal Dashboard
 *
 * Main dashboard for customer portal
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ShoppingBag, CreditCard, User, LogOut, DollarSign,
    Award, TrendingUp, Package
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import './PortalDashboard.css';

function PortalDashboard() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            // Check if logged in
            const token = localStorage.getItem('customer_token');
            if (!token) {
                navigate('/portal/login');
                return;
            }

            // Load dashboard data
            const [profileData, statsData, ordersData] = await Promise.all([
                apiRequest('/customer-portal/profile', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                apiRequest('/customer-portal/stats', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                apiRequest('/customer-portal/orders?limit=5', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
            ]);

            setCustomer(profileData);
            setStats(statsData);
            setRecentOrders(ordersData.orders);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            if (error.message.includes('401') || error.message.includes('Authentication')) {
                localStorage.removeItem('customer_token');
                localStorage.removeItem('customer_data');
                navigate('/portal/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
        navigate('/portal/login');
    };

    if (loading) {
        return (
            <div className="portal-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="portal-dashboard">
            {/* Header */}
            <div className="portal-header">
                <div>
                    <h1>Welcome back, {customer?.name}!</h1>
                    <p>{customer?.store?.name}</p>
                </div>
                <button className="btn btn-ghost" onClick={handleLogout}>
                    <LogOut size={18} />
                    Logout
                </button>
            </div>

            {/* Navigation */}
            <div className="portal-nav">
                <Link to="/portal/dashboard" className="portal-nav-item active">
                    <LayoutDashboard size={20} />
                    Dashboard
                </Link>
                <Link to="/portal/orders" className="portal-nav-item">
                    <ShoppingBag size={20} />
                    Orders
                </Link>
                <Link to="/portal/credits" className="portal-nav-item">
                    <CreditCard size={20} />
                    Credits
                </Link>
                <Link to="/portal/profile" className="portal-nav-item">
                    <User size={20} />
                    Profile
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Spent</div>
                        <div className="stat-value">${stats?.totalSpent?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Package size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Orders</div>
                        <div className="stat-value">{stats?.purchaseCount || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Loyalty Points</div>
                        <div className="stat-value">{stats?.loyaltyPoints || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <CreditCard size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Credits Balance</div>
                        <div className="stat-value">${stats?.pendingCredits?.balance?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
            </div>

            {/* VIP Status */}
            {stats?.vipStatus && (
                <div className="vip-banner">
                    <Award size={24} />
                    <div>
                        <strong>VIP Customer</strong>
                        <p>You enjoy exclusive benefits and rewards</p>
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>Recent Orders</h2>
                    <Link to="/portal/orders" className="btn btn-sm btn-ghost">
                        View All
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="empty-state">
                        <ShoppingBag size={48} />
                        <p>No orders yet</p>
                    </div>
                ) : (
                    <div className="orders-list">
                        {recentOrders.map((order) => (
                            <div key={order._id} className="order-item">
                                <div className="order-info">
                                    <div className="order-id">Order #{order._id.slice(-8)}</div>
                                    <div className="order-date">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="order-details">
                                    <div className="order-items">
                                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="order-total">${order.total.toFixed(2)}</div>
                                </div>
                                <div className={`order-status status-${order.status}`}>
                                    {order.status}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Credits Alert */}
            {stats?.pendingCredits?.count > 0 && (
                <div className="credits-alert">
                    <CreditCard size={20} />
                    <div>
                        <strong>You have {stats.pendingCredits.count} pending credit{stats.pendingCredits.count !== 1 ? 's' : ''}</strong>
                        <p>Total balance: ${stats.pendingCredits.balance.toFixed(2)}</p>
                    </div>
                    <Link to="/portal/credits" className="btn btn-sm btn-primary">
                        View Credits
                    </Link>
                </div>
            )}
        </div>
    );
}

// Missing import - add LayoutDashboard
import { LayoutDashboard } from 'lucide-react';

export default PortalDashboard;
