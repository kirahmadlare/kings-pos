import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, AlertCircle, Info, XCircle, CheckCircle, Package,
  TrendingDown, Clock, Archive, Filter, RefreshCw, X
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './Inventory.css';

/**
 * InventoryAlerts Component
 *
 * Dashboard for viewing and managing inventory alerts
 * Supports filtering by type and severity, and resolving alerts
 */
const InventoryAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showResolvedModal, setShowResolvedModal] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/inventory/alerts');
      setAlerts(response);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId, note) => {
    try {
      await apiRequest(`/inventory/alerts/${alertId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNote: note })
      });

      await loadAlerts();
      setShowResolvedModal(false);
      setResolvingAlert(null);
      setResolutionNote('');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const openResolveModal = (alert) => {
    setResolvingAlert(alert);
    setResolutionNote('');
    setShowResolvedModal(true);
  };

  const getAlertIcon = (type, severity) => {
    if (severity === 'critical') return AlertTriangle;
    if (severity === 'warning') return AlertCircle;
    if (type === 'low_stock') return Package;
    if (type === 'out_of_stock') return XCircle;
    if (type === 'expiring_soon') return Clock;
    if (type === 'expired') return XCircle;
    if (type === 'overstock') return Archive;
    if (type === 'slow_moving') return TrendingDown;
    return Info;
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock',
      expiring_soon: 'Expiring Soon',
      expired: 'Expired',
      overstock: 'Overstock',
      slow_moving: 'Slow Moving'
    };
    return labels[type] || type;
  };

  const getSeverityClass = (severity) => {
    const classes = {
      critical: 'critical',
      warning: 'warning',
      info: 'info'
    };
    return classes[severity] || 'info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  // Group alerts by severity
  const criticalAlerts = filteredAlerts.filter(a => a.severity === 'critical' && !a.resolvedAt);
  const warningAlerts = filteredAlerts.filter(a => a.severity === 'warning' && !a.resolvedAt);
  const infoAlerts = filteredAlerts.filter(a => a.severity === 'info' && !a.resolvedAt);
  const resolvedAlerts = filteredAlerts.filter(a => a.resolvedAt);

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="inventory-loading">
          <div className="inventory-loading-spinner" />
          Loading alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="inventory-header">
        <div>
          <h1>Inventory Alerts</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Monitor and manage inventory alerts across your products
          </p>
        </div>
        <button
          onClick={loadAlerts}
          className="inventory-btn inventory-btn-secondary"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="inventory-stats-grid">
        <div className="inventory-stat-card">
          <div className="inventory-stat-header">
            <div>
              <p className="inventory-stat-label">Critical Alerts</p>
              <h3 className="inventory-stat-value">{criticalAlerts.length}</h3>
            </div>
            <div className="inventory-stat-icon danger">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="inventory-stat-header">
            <div>
              <p className="inventory-stat-label">Warning Alerts</p>
              <h3 className="inventory-stat-value">{warningAlerts.length}</h3>
            </div>
            <div className="inventory-stat-icon warning">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="inventory-stat-header">
            <div>
              <p className="inventory-stat-label">Info Alerts</p>
              <h3 className="inventory-stat-value">{infoAlerts.length}</h3>
            </div>
            <div className="inventory-stat-icon primary">
              <Info size={24} />
            </div>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="inventory-stat-header">
            <div>
              <p className="inventory-stat-label">Resolved</p>
              <h3 className="inventory-stat-value">{resolvedAlerts.length}</h3>
            </div>
            <div className="inventory-stat-icon success">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Alert Type:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'overstock', 'slow_moving'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`inventory-btn inventory-btn-sm ${typeFilter === type ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
              >
                {type === 'all' ? 'All Types' : getAlertTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Severity:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'critical', 'warning', 'info'].map(severity => (
              <button
                key={severity}
                onClick={() => setSeverityFilter(severity)}
                className={`inventory-btn inventory-btn-sm ${severityFilter === severity ? 'inventory-btn-primary' : 'inventory-btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {severity === 'all' ? 'All Severities' : severity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="inventory-empty">
          <div className="inventory-empty-icon">🔔</div>
          <h3 className="inventory-empty-title">No Alerts Found</h3>
          <p className="inventory-empty-message">
            {alerts.length === 0
              ? 'No inventory alerts at this time. Everything looks good!'
              : 'No alerts match your current filters.'}
          </p>
        </div>
      ) : (
        <>
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger-color)' }} />
                Critical Alerts ({criticalAlerts.length})
              </h2>
              <div className="inventory-alerts-list">
                {criticalAlerts.map(alert => (
                  <AlertCard
                    key={alert._id}
                    alert={alert}
                    onResolve={openResolveModal}
                    getAlertIcon={getAlertIcon}
                    getAlertTypeLabel={getAlertTypeLabel}
                    getSeverityClass={getSeverityClass}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warning Alerts */}
          {warningAlerts.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={20} style={{ color: 'var(--warning-color)' }} />
                Warning Alerts ({warningAlerts.length})
              </h2>
              <div className="inventory-alerts-list">
                {warningAlerts.map(alert => (
                  <AlertCard
                    key={alert._id}
                    alert={alert}
                    onResolve={openResolveModal}
                    getAlertIcon={getAlertIcon}
                    getAlertTypeLabel={getAlertTypeLabel}
                    getSeverityClass={getSeverityClass}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Info Alerts */}
          {infoAlerts.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={20} style={{ color: 'var(--info-color)' }} />
                Info Alerts ({infoAlerts.length})
              </h2>
              <div className="inventory-alerts-list">
                {infoAlerts.map(alert => (
                  <AlertCard
                    key={alert._id}
                    alert={alert}
                    onResolve={openResolveModal}
                    getAlertIcon={getAlertIcon}
                    getAlertTypeLabel={getAlertTypeLabel}
                    getSeverityClass={getSeverityClass}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved Alerts */}
          {resolvedAlerts.length > 0 && (
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={20} style={{ color: 'var(--success-color)' }} />
                Resolved Alerts ({resolvedAlerts.length})
              </h2>
              <div className="inventory-alerts-list">
                {resolvedAlerts.map(alert => (
                  <AlertCard
                    key={alert._id}
                    alert={alert}
                    onResolve={null}
                    getAlertIcon={getAlertIcon}
                    getAlertTypeLabel={getAlertTypeLabel}
                    getSeverityClass={getSeverityClass}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolve Alert Modal */}
      {showResolvedModal && resolvingAlert && (
        <div className="modal-overlay" onClick={() => setShowResolvedModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Resolve Alert</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowResolvedModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {resolvingAlert.productName || 'Unknown Product'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {resolvingAlert.message}
                </p>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Resolution Note (Optional)</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="inventory-form-textarea"
                  placeholder="Add notes about how this alert was resolved..."
                  rows={4}
                />
              </div>
            </div>

            <div className="inventory-form-actions">
              <button
                onClick={() => setShowResolvedModal(false)}
                className="inventory-btn inventory-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAlert(resolvingAlert._id, resolutionNote)}
                className="inventory-btn inventory-btn-success"
              >
                <CheckCircle size={18} />
                Resolve Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * AlertCard Component
 * Displays individual alert with icon, message, and actions
 */
const AlertCard = ({ alert, onResolve, getAlertIcon, getAlertTypeLabel, getSeverityClass, formatDate }) => {
  const Icon = getAlertIcon(alert.type, alert.severity);
  const severityClass = getSeverityClass(alert.severity);

  return (
    <div className={`inventory-alert-card ${severityClass}`}>
      <div className="inventory-alert-icon">
        <Icon size={20} />
      </div>

      <div className="inventory-alert-content">
        <h4 className="inventory-alert-title">
          {alert.productName || 'Unknown Product'}
        </h4>
        <p className="inventory-alert-message">{alert.message}</p>
        <div className="inventory-alert-meta">
          <span>
            <strong>Type:</strong> {getAlertTypeLabel(alert.type)}
          </span>
          <span>
            <strong>Severity:</strong> {alert.severity}
          </span>
          <span>
            <strong>Created:</strong> {formatDate(alert.createdAt)}
          </span>
          {alert.resolvedAt && (
            <span>
              <strong>Resolved:</strong> {formatDate(alert.resolvedAt)}
            </span>
          )}
        </div>
        {alert.resolutionNote && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem'
          }}>
            <strong>Resolution Note:</strong> {alert.resolutionNote}
          </div>
        )}
        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)'
          }}>
            {alert.metadata.currentStock !== undefined && (
              <span style={{ marginRight: '1rem' }}>
                Stock: {alert.metadata.currentStock}
              </span>
            )}
            {alert.metadata.threshold !== undefined && (
              <span style={{ marginRight: '1rem' }}>
                Threshold: {alert.metadata.threshold}
              </span>
            )}
            {alert.metadata.expiryDate && (
              <span>
                Expires: {formatDate(alert.metadata.expiryDate)}
              </span>
            )}
          </div>
        )}
      </div>

      {onResolve && !alert.resolvedAt && (
        <div className="inventory-alert-actions">
          <button
            onClick={() => onResolve(alert)}
            className="inventory-btn inventory-btn-sm inventory-btn-success"
            title="Resolve alert"
          >
            <CheckCircle size={16} />
            Resolve
          </button>
        </div>
      )}

      {alert.resolvedAt && (
        <div style={{
          flexShrink: 0,
          padding: '0.5rem 0.75rem',
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--success-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <CheckCircle size={16} />
          Resolved
        </div>
      )}
    </div>
  );
};

export default InventoryAlerts;
