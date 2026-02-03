/**
 * @fileoverview Settings Page
 * 
 * This page provides application settings including:
 * - Store information management
 * - Category management (add/edit/delete)
 * - Theme preferences
 * - Data export
 * - Account management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import db from '../db';
import { resetLocalDatabase, clearTransactionData } from '../utils/resetDatabase';
import {
    Store, User, Sun, Moon, Monitor, Save, Palette, Database, Download,
    Tag, Plus, Edit2, Trash2, X, Check, AlertTriangle, RefreshCw, Image, Upload,
    BarChart3, PieChart, Building2, Puzzle, Zap, FileText, Shield, Settings as SettingsIcon
} from 'lucide-react';
import './Settings.css';

// Available currencies
const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
];

// Default category colors for the color picker
const categoryColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#6b7280'
];

function Settings() {
    const navigate = useNavigate();
    const { user, store, updateStore, logout } = useAuthStore();
    const { theme, setTheme } = useSettingsStore();
    const isOwner = user?.role === 'owner';

    // Store settings state
    const [storeData, setStoreData] = useState({
        name: store?.name || '',
        currency: store?.currency || 'USD',
        taxRate: store?.taxRate?.toString() || '0',
        phone: store?.phone || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Branding state
    const [logo, setLogo] = useState(store?.logo || null);
    const [logoPreview, setLogoPreview] = useState(store?.logo || null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    // Category management state
    const [categories, setCategories] = useState([]);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });
    const [showAddCategory, setShowAddCategory] = useState(false);

    /**
     * Load categories when component mounts
     */
    useEffect(() => {
        loadCategories();
    }, [store?.id]);

    /**
     * Fetch categories from IndexedDB
     */
    const loadCategories = async () => {
        if (!store?.id) return;
        try {
            const cats = await db.categories.where('storeId').equals(store.id).toArray();
            setCategories(cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    /**
     * Handle store input changes
     */
    const handleStoreChange = (e) => {
        setStoreData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    /**
     * Save store settings
     */
    const handleSaveStore = async () => {
        setIsSaving(true);
        await updateStore({ ...storeData, taxRate: parseFloat(storeData.taxRate) || 0 });
        setIsSaving(false);
    };

    /**
     * Handle logo file selection
     */
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size must be less than 2MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload logo
        handleUploadLogo(file);
    };

    /**
     * Upload logo to server
     */
    const handleUploadLogo = async (file) => {
        setIsUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch(`http://localhost:3001/api/stores/${store.serverId || store._id}/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload logo');
            }

            const data = await response.json();
            setLogo(data.logo);
            await updateStore({ logo: data.logo });
            alert('✅ Logo uploaded successfully!');
        } catch (error) {
            console.error('Logo upload error:', error);
            alert('❌ Failed to upload logo: ' + error.message);
            setLogoPreview(logo); // Reset preview on error
        } finally {
            setIsUploadingLogo(false);
        }
    };

    /**
     * Remove logo
     */
    const handleRemoveLogo = async () => {
        if (!window.confirm('Remove logo? The shop name will be displayed instead.')) {
            return;
        }

        setIsUploadingLogo(true);
        try {
            const response = await fetch(`http://localhost:3001/api/stores/${store.serverId || store._id}/logo`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove logo');
            }

            setLogo(null);
            setLogoPreview(null);
            await updateStore({ logo: null });
            alert('✅ Logo removed successfully!');
        } catch (error) {
            console.error('Logo removal error:', error);
            alert('❌ Failed to remove logo: ' + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    /**
     * Add a new category
     */
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) return;

        try {
            await db.categories.add({
                storeId: store.id,
                name: newCategory.name.trim(),
                color: newCategory.color,
                icon: 'package',
                sortOrder: categories.length
            });
            setNewCategory({ name: '', color: '#6366f1' });
            setShowAddCategory(false);
            await loadCategories();
        } catch (error) {
            console.error('Failed to add category:', error);
        }
    };

    /**
     * Start editing a category
     */
    const startEditCategory = (category) => {
        setEditingCategory({ ...category });
    };

    /**
     * Save category changes
     */
    const handleSaveCategory = async () => {
        if (!editingCategory.name.trim()) return;

        try {
            await db.categories.update(editingCategory.id, {
                name: editingCategory.name.trim(),
                color: editingCategory.color
            });
            setEditingCategory(null);
            await loadCategories();
        } catch (error) {
            console.error('Failed to update category:', error);
        }
    };

    /**
     * Delete a category
     */
    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm('Delete this category? Products in this category will become uncategorized.')) {
            return;
        }

        try {
            // Remove category reference from products
            const products = await db.products.where('categoryId').equals(categoryId).toArray();
            for (const product of products) {
                await db.products.update(product.id, { categoryId: null });
            }
            // Delete the category
            await db.categories.delete(categoryId);
            await loadCategories();
        } catch (error) {
            console.error('Failed to delete category:', error);
        }
    };

    /**
     * Reset local database (IndexedDB only)
     */
    const handleResetLocalDatabase = async () => {
        if (!window.confirm('⚠️ WARNING: This will delete ALL local data from IndexedDB!\n\nThis action cannot be undone. Are you sure?')) {
            return;
        }

        if (!window.confirm('This is your LAST CHANCE to cancel.\n\nClick OK to proceed with deleting ALL local data.')) {
            return;
        }

        try {
            const result = await resetLocalDatabase();
            if (result.success) {
                alert('✅ Local database cleared successfully!\n\nYou will be logged out. Please refresh the page.');
                setTimeout(() => {
                    logout();
                    window.location.reload();
                }, 1000);
            } else {
                alert('❌ Failed to reset database: ' + result.error);
            }
        } catch (error) {
            console.error('Reset database error:', error);
            alert('❌ Error resetting database: ' + error.message);
        }
    };

    /**
     * Clear transaction data only (keep users and settings)
     */
    const handleClearTransactionData = async () => {
        if (!window.confirm('⚠️ This will delete products, sales, customers, employees, etc.\n\nYour account and settings will be preserved.\n\nContinue?')) {
            return;
        }

        try {
            const result = await clearTransactionData();
            if (result.success) {
                alert('✅ Transaction data cleared successfully!\n\nThe page will refresh.');
                window.location.reload();
            } else {
                alert('❌ Failed to clear data: ' + result.error);
            }
        } catch (error) {
            console.error('Clear data error:', error);
            alert('❌ Error clearing data: ' + error.message);
        }
    };

    /**
     * Export all store data as JSON
     */
    const handleExportData = async () => {
        const data = {
            store: store,
            categories: await db.categories.where('storeId').equals(store.id).toArray(),
            products: await db.products.where('storeId').equals(store.id).toArray(),
            sales: await db.sales.where('storeId').equals(store.id).toArray(),
            orders: await db.orders.where('storeId').equals(store.id).toArray(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `kings-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <div className="settings">
            <h2>Settings</h2>

            {/* Store Information Section */}
            <section className="settings-section">
                <div className="section-header"><Store size={20} /><h3>Store Information</h3></div>
                <div className="settings-grid">
                    <div className="input-group">
                        <label className="input-label">Store Name</label>
                        <input type="text" name="name" className="input" value={storeData.name} onChange={handleStoreChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Currency</label>
                        <select name="currency" className="input select" value={storeData.currency} onChange={handleStoreChange}>
                            {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Tax Rate (%)</label>
                        <input type="number" name="taxRate" className="input" value={storeData.taxRate} onChange={handleStoreChange} min="0" max="100" />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Phone</label>
                        <input type="tel" name="phone" className="input" value={storeData.phone} onChange={handleStoreChange} />
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleSaveStore} disabled={isSaving}>
                    {isSaving ? <span className="spinner" /> : <Save size={18} />} Save
                </button>
            </section>

            {/* Branding Section */}
            <section className="settings-section">
                <div className="section-header">
                    <Image size={20} />
                    <h3>Branding</h3>
                </div>
                <p className="section-description">
                    Customize your POS appearance with a custom logo. Recommended size: 128x128 pixels.
                </p>
                <div className="settings-grid">
                    <div className="input-group full-width">
                        <label className="input-label">Logo</label>
                        <div className="logo-upload-container">
                            <div className="logo-preview">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Store Logo" className="logo-preview-image" />
                                ) : (
                                    <div className="logo-placeholder">
                                        <Store size={48} />
                                        <span>{storeData.name || 'Shop Name'}</span>
                                    </div>
                                )}
                            </div>
                            <div className="logo-actions">
                                <label className="btn btn-secondary" disabled={isUploadingLogo}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        style={{ display: 'none' }}
                                        disabled={isUploadingLogo}
                                    />
                                    {isUploadingLogo ? (
                                        <span className="spinner" />
                                    ) : (
                                        <Upload size={18} />
                                    )}
                                    Upload Logo
                                </label>
                                {logoPreview && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleRemoveLogo}
                                        disabled={isUploadingLogo}
                                    >
                                        <Trash2 size={18} />
                                        Remove
                                    </button>
                                )}
                                <small className="text-muted">
                                    PNG, JPG up to 2MB. Recommended: 128x128px
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Management Section */}
            <section className="settings-section">
                <div className="section-header">
                    <Tag size={20} />
                    <h3>Product Categories</h3>
                    <button
                        className="btn btn-sm btn-primary ml-auto"
                        onClick={() => setShowAddCategory(true)}
                    >
                        <Plus size={16} /> Add Category
                    </button>
                </div>

                {/* Add New Category Form */}
                {showAddCategory && (
                    <div className="category-form">
                        <input
                            type="text"
                            className="input"
                            placeholder="Category name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                            autoFocus
                        />
                        <div className="color-picker">
                            {categoryColors.map(color => (
                                <button
                                    key={color}
                                    className={`color-swatch ${newCategory.color === color ? 'selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                                />
                            ))}
                        </div>
                        <div className="category-form-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAddCategory(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleAddCategory}>
                                <Check size={16} /> Add
                            </button>
                        </div>
                    </div>
                )}

                {/* Categories List */}
                <div className="categories-list">
                    {categories.length === 0 ? (
                        <p className="text-secondary">No categories yet. Add your first category above.</p>
                    ) : (
                        categories.map(category => (
                            <div key={category.id} className="category-item">
                                {editingCategory?.id === category.id ? (
                                    /* Editing Mode */
                                    <>
                                        <input
                                            type="text"
                                            className="input category-edit-input"
                                            value={editingCategory.name}
                                            onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                            autoFocus
                                        />
                                        <div className="color-picker-inline">
                                            {categoryColors.slice(0, 9).map(color => (
                                                <button
                                                    key={color}
                                                    className={`color-swatch-sm ${editingCategory.color === color ? 'selected' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => setEditingCategory(prev => ({ ...prev, color }))}
                                                />
                                            ))}
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingCategory(null)}>
                                            <X size={16} />
                                        </button>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveCategory}>
                                            <Check size={16} />
                                        </button>
                                    </>
                                ) : (
                                    /* Display Mode */
                                    <>
                                        <span
                                            className="category-color"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="category-name">{category.name}</span>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => startEditCategory(category)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm text-danger"
                                            onClick={() => handleDeleteCategory(category.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Appearance Section */}
            <section className="settings-section">
                <div className="section-header"><Palette size={20} /><h3>Appearance</h3></div>
                <div className="theme-options">
                    <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                        <Sun size={24} /><span>Light</span>
                    </button>
                    <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                        <Moon size={24} /><span>Dark</span>
                    </button>
                    <button className={`theme-option ${theme === 'auto' ? 'active' : ''}`} onClick={() => setTheme('auto')}>
                        <Monitor size={24} /><span>Auto</span>
                    </button>
                </div>
            </section>

            {/* Data Section */}
            <section className="settings-section">
                <div className="section-header"><Database size={20} /><h3>Data</h3></div>
                <button className="btn btn-secondary" onClick={handleExportData}>
                    <Download size={18} /> Export Data
                </button>
            </section>

            {/* Database Management Section */}
            <section className="settings-section">
                <div className="section-header">
                    <Database size={20} />
                    <h3>Database Management</h3>
                </div>
                <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                        <strong style={{ color: '#92400e' }}>Danger Zone</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#78350f' }}>
                        These actions will permanently delete data. Use only for testing and development.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Clear Transaction Data</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Deletes products, sales, customers, employees, etc. Keeps your account and settings.
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={handleClearTransactionData}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={18} />
                            Clear Transaction Data
                        </button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#dc2626' }}>Reset Entire Database</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Deletes ALL local data including your account. You will be logged out.
                        </p>
                        <button
                            className="btn btn-danger"
                            onClick={handleResetLocalDatabase}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Trash2 size={18} />
                            Reset Entire Database
                        </button>
                    </div>
                </div>
            </section>

            {/* Advanced Settings Section */}
            <section className="settings-section">
                <div className="section-header">
                    <SettingsIcon size={20} />
                    <h3>Advanced Settings</h3>
                </div>
                <div className="advanced-settings-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginTop: '1rem'
                }}>
                    {/* Reports */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/reports')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1.5rem 1rem'
                        }}
                    >
                        <BarChart3 size={24} />
                        <span>Reports</span>
                    </button>

                    {/* Report Builder - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/reports/builder')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <PieChart size={24} />
                            <span>Report Builder</span>
                        </button>
                    )}

                    {/* Multi-Store - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/stores')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <Building2 size={24} />
                            <span>Multi-Store</span>
                        </button>
                    )}

                    {/* Plugins - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/plugins')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <Puzzle size={24} />
                            <span>Plugins</span>
                        </button>
                    )}

                    {/* Workflows - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/workflows')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <Zap size={24} />
                            <span>Workflows</span>
                        </button>
                    )}

                    {/* Audit Logs - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/audit-logs')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <FileText size={24} />
                            <span>Audit Logs</span>
                        </button>
                    )}

                    {/* Permissions - Owner Only */}
                    {isOwner && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/permissions')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1.5rem 1rem'
                            }}
                        >
                            <Shield size={24} />
                            <span>Permissions</span>
                        </button>
                    )}
                </div>
            </section>

            {/* Account Section */}
            <section className="settings-section">
                <div className="section-header"><User size={20} /><h3>Account</h3></div>
                <p>Logged in as: <strong>{user?.email}</strong> ({user?.role || 'owner'})</p>
                <button className="btn btn-danger" onClick={logout}>Sign Out</button>
            </section>
        </div>
    );
}

export default Settings;
