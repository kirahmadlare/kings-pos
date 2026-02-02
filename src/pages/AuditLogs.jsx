/**
 * @fileoverview Audit Logs Page
 *
 * Displays comprehensive audit trail of all system activities with:
 * - Advanced filtering (date range, entity type, action, user, level)
 * - Searchable table with pagination
 * - Before/after comparison modal
 * - Export functionality
 * - Critical events badge
 */

import { useState } from 'react';
import { useAuditLogs, useCriticalEvents } from '../hooks/useAuditLogs';
import {
    FileText,
    Download,
    Search,
    Filter,
    RefreshCw,
    X,
    AlertTriangle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import './AuditLogs.css';

/**
 * Format timestamp to readable date/time
 */
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Get badge color based on action type
 */
const getActionBadgeClass = (action) => {
    const actionMap = {
        create: 'badge-success',
        update: 'badge-info',
        delete: 'badge-danger',
        login: 'badge-primary',
        logout: 'badge-secondary',
        void: 'badge-warning'
    };
    return actionMap[action] || 'badge-secondary';
};

/**
 * Get badge color based on level
 */
const getLevelBadgeClass = (level) => {
    const levelMap = {
        critical: 'badge-danger',
        warning: 'badge-warning',
        info: 'badge-info'
    };
    return levelMap[level] || 'badge-secondary';
};

/**
 * Detail Modal Component - Shows before/after changes
 */
function DetailModal({ log, onClose }) {
    if (!log) return null;

    const hasChanges = log.changes && (log.changes.before || log.changes.after);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content audit-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Audit Log Details</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Basic Info */}
                    <div className="detail-section">
                        <h4>Basic Information</h4>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <span className="detail-label">Timestamp:</span>
                                <span className="detail-value">{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">User:</span>
                                <span className="detail-value">{log.userId?.name || log.userId?.email || 'Unknown'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Action:</span>
                                <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                    {log.action}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Entity Type:</span>
                                <span className="detail-value">{log.entityType}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Entity ID:</span>
                                <span className="detail-value font-mono">{log.entityId}</span>
                            </div>
                            {log.level && (
                                <div className="detail-item">
                                    <span className="detail-label">Level:</span>
                                    <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                                        {log.level}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="detail-section">
                            <h4>Metadata</h4>
                            <div className="detail-grid">
                                {log.metadata.ipAddress && (
                                    <div className="detail-item">
                                        <span className="detail-label">IP Address:</span>
                                        <span className="detail-value font-mono">{log.metadata.ipAddress}</span>
                                    </div>
                                )}
                                {log.metadata.userAgent && (
                                    <div className="detail-item">
                                        <span className="detail-label">User Agent:</span>
                                        <span className="detail-value">{log.metadata.userAgent}</span>
                                    </div>
                                )}
                                {log.metadata.deviceId && (
                                    <div className="detail-item">
                                        <span className="detail-label">Device ID:</span>
                                        <span className="detail-value font-mono">{log.metadata.deviceId}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Changes - Before/After */}
                    {hasChanges && (
                        <div className="detail-section">
                            <h4>Changes</h4>
                            <div className="changes-comparison">
                                {log.changes.before && (
                                    <div className="change-block">
                                        <h5 className="change-title before">Before</h5>
                                        <pre className="change-content">
                                            {JSON.stringify(log.changes.before, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {log.changes.after && (
                                    <div className="change-block">
                                        <h5 className="change-title after">After</h5>
                                        <pre className="change-content">
                                            {JSON.stringify(log.changes.after, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Filter Panel Component
 */
function FilterPanel({ filters, onFilterChange, onReset, onClose }) {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleApply = () => {
        onFilterChange(localFilters);
        onClose();
    };

    const handleChange = (key, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }));
    };

    return (
        <div className="filter-panel">
            <div className="filter-header">
                <h3>Filters</h3>
                <button className="btn btn-ghost btn-icon" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="filter-body">
                {/* Date Range */}
                <div className="filter-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={localFilters.startDate || ''}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={localFilters.endDate || ''}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                    />
                </div>

                {/* Entity Type */}
                <div className="filter-group">
                    <label>Entity Type</label>
                    <select
                        className="form-input"
                        value={localFilters.entityType || ''}
                        onChange={(e) => handleChange('entityType', e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="product">Product</option>
                        <option value="sale">Sale</option>
                        <option value="customer">Customer</option>
                        <option value="employee">Employee</option>
                        <option value="shift">Shift</option>
                        <option value="credit">Credit</option>
                        <option value="user">User</option>
                    </select>
                </div>

                {/* Action */}
                <div className="filter-group">
                    <label>Action</label>
                    <select
                        className="form-input"
                        value={localFilters.action || ''}
                        onChange={(e) => handleChange('action', e.target.value)}
                    >
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="void">Void</option>
                    </select>
                </div>

                {/* Level */}
                <div className="filter-group">
                    <label>Level</label>
                    <select
                        className="form-input"
                        value={localFilters.level || ''}
                        onChange={(e) => handleChange('level', e.target.value)}
                    >
                        <option value="">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
            </div>

            <div className="filter-footer">
                <button className="btn btn-secondary" onClick={onReset}>
                    Reset
                </button>
                <button className="btn btn-primary" onClick={handleApply}>
                    Apply Filters
                </button>
            </div>
        </div>
    );
}

/**
 * Audit Logs Page Component
 */
function AuditLogs() {
    const [selectedLog, setSelectedLog] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const {
        logs,
        loading,
        error,
        filters,
        pagination,
        updateFilters,
        changePage,
        resetFilters,
        refetch,
        exportLogs
    } = useAuditLogs();

    const { count: criticalCount } = useCriticalEvents(24);

    const handleSearch = (e) => {
        e.preventDefault();
        updateFilters({ search: searchQuery });
    };

    const handleExport = async () => {
        const success = await exportLogs();
        if (success) {
            alert('Audit logs exported successfully!');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <FileText size={24} />
                    <h1>Audit Logs</h1>
                    {criticalCount > 0 && (
                        <span className="badge badge-danger critical-badge">
                            <AlertTriangle size={14} />
                            {criticalCount} Critical
                        </span>
                    )}
                </div>

                <div className="page-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={() => setShowFilters(!showFilters)}
                        title="Filter logs"
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={refetch}
                        disabled={loading}
                        title="Refresh logs"
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        title="Export logs"
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <form onSubmit={handleSearch}>
                    <div className="search-input-group">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search audit logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                onClick={() => {
                                    setSearchQuery('');
                                    updateFilters({ search: undefined });
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    filters={filters}
                    onFilterChange={updateFilters}
                    onReset={() => {
                        resetFilters();
                        setShowFilters(false);
                    }}
                    onClose={() => setShowFilters(false)}
                />
            )}

            {/* Error Message */}
            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity Type</th>
                                <th>Entity ID</th>
                                <th>Level</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center">
                                        <div className="loading-spinner">Loading...</div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="clickable" onClick={() => setSelectedLog(log)}>
                                        <td className="font-mono text-sm">
                                            {formatTimestamp(log.timestamp)}
                                        </td>
                                        <td>{log.userId?.name || log.userId?.email || 'System'}</td>
                                        <td>
                                            <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="capitalize">{log.entityType}</td>
                                        <td className="font-mono text-sm">{log.entityId?.slice(0, 8)}...</td>
                                        <td>
                                            {log.level && (
                                                <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                                                    {log.level}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedLog(log);
                                                }}
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="table-pagination">
                        <div className="pagination-info">
                            Showing {((pagination.page - 1) * filters.limit) + 1} to{' '}
                            {Math.min(pagination.page * filters.limit, pagination.total)} of{' '}
                            {pagination.total} entries
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => changePage(pagination.page - 1)}
                                disabled={pagination.page === 1}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="pagination-page">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => changePage(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <DetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
}

export default AuditLogs;
