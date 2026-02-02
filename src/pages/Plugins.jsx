/**
 * @fileoverview Plugins Management Page
 *
 * Marketplace and management for installed plugins
 */

import { useState, useEffect } from 'react';
import {
    Package, Download, Settings, Trash2, Power, PowerOff,
    Search, Filter, Star, TrendingUp, DollarSign, ExternalLink,
    CheckCircle, XCircle, AlertTriangle, Activity
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './Plugins.css';

function Plugins() {
    const [activeTab, setActiveTab] = useState('installed'); // 'installed' or 'marketplace'
    const [installedPlugins, setInstalledPlugins] = useState([]);
    const [marketplacePlugins, setMarketplacePlugins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlugin, setSelectedPlugin] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        loadPlugins();
    }, [activeTab]);

    const loadPlugins = async () => {
        try {
            setLoading(true);

            if (activeTab === 'installed') {
                const plugins = await apiRequest('/plugins');
                setInstalledPlugins(plugins);
            } else {
                const marketplace = await apiRequest('/plugins/marketplace');
                setMarketplacePlugins(marketplace);
            }
        } catch (error) {
            console.error('Failed to load plugins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (plugin) => {
        try {
            await apiRequest('/plugins/install', {
                method: 'POST',
                body: JSON.stringify({
                    pluginId: plugin.pluginId,
                    name: plugin.name,
                    version: plugin.version,
                    author: plugin.author,
                    description: plugin.description,
                    category: plugin.category,
                    icon: plugin.icon,
                    capabilities: {
                        permissions: ['plugin:read', 'plugin:create', 'plugin:update']
                    }
                })
            });

            alert(`Plugin "${plugin.name}" installed successfully!`);
            setActiveTab('installed');
            loadPlugins();
        } catch (error) {
            console.error('Failed to install plugin:', error);
            alert('Failed to install plugin');
        }
    };

    const handleActivate = async (plugin) => {
        try {
            await apiRequest(`/plugins/${plugin._id}/activate`, {
                method: 'POST'
            });

            alert(`Plugin "${plugin.name}" activated!`);
            loadPlugins();
        } catch (error) {
            console.error('Failed to activate plugin:', error);
            alert(error.message || 'Failed to activate plugin');
        }
    };

    const handleDeactivate = async (plugin) => {
        try {
            await apiRequest(`/plugins/${plugin._id}/deactivate`, {
                method: 'POST'
            });

            alert(`Plugin "${plugin.name}" deactivated!`);
            loadPlugins();
        } catch (error) {
            console.error('Failed to deactivate plugin:', error);
            alert('Failed to deactivate plugin');
        }
    };

    const handleUninstall = async (plugin) => {
        if (!confirm(`Are you sure you want to uninstall "${plugin.name}"?`)) {
            return;
        }

        try {
            await apiRequest(`/plugins/${plugin._id}`, {
                method: 'DELETE'
            });

            alert(`Plugin "${plugin.name}" uninstalled!`);
            loadPlugins();
        } catch (error) {
            console.error('Failed to uninstall plugin:', error);
            alert('Failed to uninstall plugin');
        }
    };

    const handleViewStats = async (plugin) => {
        try {
            const stats = await apiRequest(`/plugins/${plugin._id}/stats`);
            setSelectedPlugin({ ...plugin, stats });
            setShowConfig(false);
        } catch (error) {
            console.error('Failed to load plugin stats:', error);
        }
    };

    const filteredInstalledPlugins = installedPlugins.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const filteredMarketplacePlugins = marketplacePlugins.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', 'payment', 'shipping', 'loyalty', 'analytics', 'integration', 'utility'];

    if (loading) {
        return (
            <div className="plugins-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading plugins...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="plugins-page">
            {/* Header */}
            <div className="plugins-header">
                <div>
                    <h1>Plugins</h1>
                    <p className="subtitle">Extend your POS with powerful plugins</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="plugins-tabs">
                <button
                    className={`tab ${activeTab === 'installed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('installed')}
                >
                    <Package size={18} />
                    Installed ({installedPlugins.length})
                </button>
                <button
                    className={`tab ${activeTab === 'marketplace' ? 'active' : ''}`}
                    onClick={() => setActiveTab('marketplace')}
                >
                    <Download size={18} />
                    Marketplace
                </button>
            </div>

            {/* Search and Filters */}
            <div className="plugins-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search plugins..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Content */}
            <div className="plugins-content">
                {activeTab === 'installed' ? (
                    <div className="plugins-grid">
                        {filteredInstalledPlugins.map(plugin => (
                            <PluginCard
                                key={plugin._id}
                                plugin={plugin}
                                installed={true}
                                onActivate={() => handleActivate(plugin)}
                                onDeactivate={() => handleDeactivate(plugin)}
                                onUninstall={() => handleUninstall(plugin)}
                                onViewStats={() => handleViewStats(plugin)}
                            />
                        ))}
                        {filteredInstalledPlugins.length === 0 && (
                            <div className="empty-state">
                                <Package size={64} />
                                <h3>No Plugins Installed</h3>
                                <p>Browse the marketplace to install your first plugin</p>
                                <button className="btn btn-primary" onClick={() => setActiveTab('marketplace')}>
                                    Browse Marketplace
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="plugins-grid">
                        {filteredMarketplacePlugins.map(plugin => (
                            <MarketplaceCard
                                key={plugin.pluginId}
                                plugin={plugin}
                                onInstall={() => handleInstall(plugin)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Plugin Details Modal */}
            {selectedPlugin && (
                <div className="modal-overlay" onClick={() => setSelectedPlugin(null)}>
                    <div className="modal-content plugin-details" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedPlugin.name}</h2>
                            <button className="btn-icon" onClick={() => setSelectedPlugin(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="plugin-stats-grid">
                                <div className="stat-card">
                                    <Activity size={20} />
                                    <div className="stat-value">{selectedPlugin.stats?.activations || 0}</div>
                                    <div className="stat-label">Activations</div>
                                </div>
                                <div className="stat-card">
                                    <TrendingUp size={20} />
                                    <div className="stat-value">{selectedPlugin.stats?.apiCalls || 0}</div>
                                    <div className="stat-label">API Calls</div>
                                </div>
                                <div className="stat-card">
                                    <AlertTriangle size={20} />
                                    <div className="stat-value">{selectedPlugin.stats?.errors || 0}</div>
                                    <div className="stat-label">Errors</div>
                                </div>
                            </div>

                            {selectedPlugin.stats?.lastError && (
                                <div className="error-info">
                                    <h4>Last Error</h4>
                                    <p>{selectedPlugin.stats.lastError.message}</p>
                                    <small>{new Date(selectedPlugin.stats.lastError.timestamp).toLocaleString()}</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Plugin Card Component (Installed)
 */
function PluginCard({ plugin, onActivate, onDeactivate, onUninstall, onViewStats }) {
    const isActive = plugin.status === 'active';
    const hasError = plugin.status === 'error';

    return (
        <div className={`plugin-card ${hasError ? 'error' : ''}`}>
            <div className="plugin-card-header">
                <div className="plugin-icon">
                    {plugin.icon || <Package size={32} />}
                </div>
                <div className={`status-badge ${plugin.status}`}>
                    {plugin.status === 'active' && <CheckCircle size={14} />}
                    {plugin.status === 'inactive' && <PowerOff size={14} />}
                    {plugin.status === 'error' && <XCircle size={14} />}
                    {plugin.status}
                </div>
            </div>

            <h3>{plugin.name}</h3>
            <p className="plugin-description">{plugin.description}</p>

            <div className="plugin-meta">
                <span className="plugin-version">v{plugin.version}</span>
                <span className="plugin-category">{plugin.category}</span>
            </div>

            <div className="plugin-actions">
                {isActive ? (
                    <button className="btn btn-sm btn-secondary" onClick={onDeactivate}>
                        <PowerOff size={14} />
                        Deactivate
                    </button>
                ) : (
                    <button className="btn btn-sm btn-primary" onClick={onActivate}>
                        <Power size={14} />
                        Activate
                    </button>
                )}

                <button className="btn btn-sm btn-secondary" onClick={onViewStats}>
                    <Activity size={14} />
                    Stats
                </button>

                <button className="btn-icon" onClick={onUninstall}>
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

/**
 * Marketplace Card Component
 */
function MarketplaceCard({ plugin, onInstall }) {
    return (
        <div className="plugin-card marketplace">
            <div className="plugin-card-header">
                <div className="plugin-icon">
                    {plugin.icon || <Package size={32} />}
                </div>
                {plugin.price > 0 ? (
                    <div className="price-badge">
                        <DollarSign size={14} />
                        {plugin.price}
                    </div>
                ) : (
                    <div className="price-badge free">FREE</div>
                )}
            </div>

            <h3>{plugin.name}</h3>
            <p className="plugin-description">{plugin.description}</p>

            <div className="plugin-meta">
                <span className="plugin-version">v{plugin.version}</span>
                <span className="plugin-category">{plugin.category}</span>
            </div>

            <div className="plugin-stats-row">
                <span><Star size={14} fill="gold" /> {plugin.rating}</span>
                <span><Download size={14} /> {plugin.downloads}</span>
            </div>

            <div className="plugin-actions">
                <button className="btn btn-primary btn-block" onClick={onInstall}>
                    <Download size={14} />
                    Install
                </button>
            </div>
        </div>
    );
}

export default Plugins;
