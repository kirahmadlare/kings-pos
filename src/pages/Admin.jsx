/**
 * @fileoverview Admin Dashboard Page
 * 
 * This page provides multi-store administration functionality including:
 * - Overview of all managed stores
 * - Aggregated statistics across stores
 * - User and role management
 * - Store performance comparison
 * 
 * Only accessible to users with 'admin' role.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import db from '../db';
import {
    Building2, Users, DollarSign, TrendingUp,
    Plus, Settings, BarChart3, Eye, Shield, AlertTriangle
} from 'lucide-react';
import './Admin.css';

/**
 * Admin Component - Multi-store administration dashboard
 * 
 * Displays aggregated metrics, store listings, and provides
 * management capabilities for admin users.
 */
function Admin() {
    const navigate = useNavigate();
    const { user, store } = useAuthStore();

    // Aggregated statistics
    const [stats, setStats] = useState({
        totalStores: 0,
        totalUsers: 0,
        totalRevenue: 0,
        totalProducts: 0
    });

    // Stores managed by this admin
    const [stores, setStores] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Check if user has admin privileges.
     * Redirect non-admin users to dashboard.
     */
    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    /**
     * Load all stores and users for admin view.
     */
    useEffect(() => {
        loadAdminData();
    }, []);

    /**
     * Fetch admin data from IndexedDB.
     * Loads all stores, users, and calculates aggregate stats.
     */
    const loadAdminData = async () => {
        try {
            // Get all stores and users
            const [allStores, allUsers, allSales, allProducts] = await Promise.all([
                db.stores.toArray(),
                db.users.toArray(),
                db.sales.toArray(),
                db.products.toArray()
            ]);

            // Calculate aggregate statistics
            const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

            setStores(allStores);
            setUsers(allUsers);
            setStats({
                totalStores: allStores.length,
                totalUsers: allUsers.length,
                totalRevenue,
                totalProducts: allProducts.length
            });
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Format currency for display.
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    /**
     * Get role badge styling.
     * @param {string} role - User role
     * @returns {Object} Style object for badge
     */
    const getRoleBadge = (role) => {
        const styles = {
            admin: { bg: 'var(--danger-100)', color: 'var(--danger-600)' },
            owner: { bg: 'var(--primary-100)', color: 'var(--primary-600)' },
            manager: { bg: 'var(--warning-100)', color: 'var(--warning-600)' },
            cashier: { bg: 'var(--success-100)', color: 'var(--success-600)' }
        };
        return styles[role] || styles.cashier;
    };

    // Redirect while checking permissions
    if (!user) {
        return null;
    }

    // Show access denied for non-admin users
    if (user.role !== 'admin') {
        return (
            <div className="admin-denied">
                <Shield size={64} />
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin dashboard.</p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="spinner spinner-lg" />
                <p>Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin">
            {/* Header */}
            <div className="admin-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p className="text-secondary">Manage all stores and users</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="admin-stats">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-600)' }}>
                        <Building2 size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalStores}</span>
                        <span className="stat-label">Total Stores</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalUsers}</span>
                        <span className="stat-label">Total Users</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--warning-100)', color: 'var(--warning-600)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
                        <span className="stat-label">Total Revenue</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--danger-100)', color: 'var(--danger-600)' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalProducts}</span>
                        <span className="stat-label">Total Products</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="admin-grid">
                {/* Stores List */}
                <div className="card">
                    <div className="card-header">
                        <h3>Stores</h3>
                    </div>
                    <div className="card-body">
                        {stores.length === 0 ? (
                            <div className="empty-state">
                                <Building2 size={32} />
                                <p>No stores registered yet</p>
                            </div>
                        ) : (
                            <div className="stores-list">
                                {stores.map(storeItem => (
                                    <div key={storeItem.id} className="store-item">
                                        <div className="store-icon">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="store-info">
                                            <span className="store-name">{storeItem.name}</span>
                                            <span className="store-meta">
                                                {storeItem.businessType} • {storeItem.currency}
                                            </span>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" title="View store">
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Users List */}
                <div className="card">
                    <div className="card-header">
                        <h3>Users</h3>
                    </div>
                    <div className="card-body">
                        {users.length === 0 ? (
                            <div className="empty-state">
                                <Users size={32} />
                                <p>No users registered yet</p>
                            </div>
                        ) : (
                            <div className="users-list">
                                {users.map(userItem => {
                                    const roleStyle = getRoleBadge(userItem.role);
                                    return (
                                        <div key={userItem.id} className="user-item">
                                            <div className="user-avatar">
                                                {userItem.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="user-info">
                                                <span className="user-name">{userItem.name}</span>
                                                <span className="user-email">{userItem.email}</span>
                                            </div>
                                            <span
                                                className="badge"
                                                style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}
                                            >
                                                {userItem.role || 'owner'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Admin Notice */}
            <div className="admin-notice">
                <AlertTriangle size={20} />
                <div>
                    <strong>Development Mode</strong>
                    <p>Role-based access control is set up. In production, connect to a backend API for proper authentication and authorization.</p>
                </div>
            </div>
        </div>
    );
}

export default Admin;
