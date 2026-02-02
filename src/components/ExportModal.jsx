import React, { useState } from 'react';
import { X, Download, FileText, File, FileSpreadsheet } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import './BulkImport.css';

/**
 * ExportModal Component
 *
 * Universal export modal for CSV, Excel, and PDF exports
 * Supports column selection and filter application
 */
const ExportModal = ({
  isOpen,
  onClose,
  entityType, // 'products', 'sales', 'customers', etc.
  entityName = 'Data', // Display name
  availableColumns = [], // Array of {key, label} objects
  currentFilters = {}, // Current active filters to apply
  endpoint, // API endpoint for export (e.g., '/api/export/products')
  customParams = {} // Additional query parameters
}) => {
  const [format, setFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map(col => col.key)
  );
  const [includeFilters, setIncludeFilters] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleColumnToggle = (columnKey) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === availableColumns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(availableColumns.map(col => col.key));
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column to export');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      // Build query parameters
      const params = new URLSearchParams({
        format,
        columns: selectedColumns.join(','),
        ...customParams
      });

      // Add filters if enabled
      if (includeFilters && currentFilters) {
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            params.append(key, value);
          }
        });
      }

      // Make export request
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from header or generate default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${entityType}_export_${Date.now()}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Close modal on success
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel workbook' },
    { value: 'pdf', label: 'PDF', icon: File, description: 'Portable document format' }
  ];

  const activeFiltersCount = includeFilters && currentFilters
    ? Object.keys(currentFilters).filter(key => {
        const value = currentFilters[key];
        return value !== null && value !== undefined && value !== '';
      }).length
    : 0;

  return (
    <div className="bulk-import-overlay">
      <div className="bulk-import-modal" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div className="bulk-import-header">
          <div>
            <h2 className="bulk-import-title">Export {entityName}</h2>
            <p className="bulk-import-subtitle">
              Choose format and columns to export
            </p>
          </div>
          <button
            onClick={onClose}
            className="bulk-import-close"
            disabled={isExporting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="bulk-import-content">
          {/* Format Selection */}
          <div className="bulk-import-section">
            <h3 className="bulk-import-section-title">Export Format</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {formatOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={`format-option ${format === option.value ? 'active' : ''}`}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      border: format === option.value
                        ? '2px solid var(--primary-color)'
                        : '1px solid var(--border-color)',
                      background: format === option.value
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'var(--card-background)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                  >
                    <Icon
                      size={32}
                      style={{
                        color: format === option.value ? 'var(--primary-color)' : 'var(--text-secondary)',
                        marginBottom: '0.5rem'
                      }}
                    />
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column Selection */}
          <div className="bulk-import-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="bulk-import-section-title" style={{ margin: 0 }}>
                Select Columns
              </h3>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--primary-color)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {selectedColumns.length === availableColumns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem'
            }}>
              {availableColumns.map(column => (
                <label
                  key={column.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      marginRight: '0.75rem',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    {column.label}
                  </span>
                </label>
              ))}
            </div>

            <div style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              {selectedColumns.length} of {availableColumns.length} columns selected
            </div>
          </div>

          {/* Filter Options */}
          {Object.keys(currentFilters || {}).length > 0 && (
            <div className="bulk-import-section">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--surface)'
              }}>
                <input
                  type="checkbox"
                  checked={includeFilters}
                  onChange={(e) => setIncludeFilters(e.target.checked)}
                  style={{
                    width: '1rem',
                    height: '1rem',
                    marginRight: '0.75rem',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem'
                  }}>
                    Apply Current Filters
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {activeFiltersCount > 0
                      ? `${activeFiltersCount} active filter${activeFiltersCount > 1 ? 's' : ''} will be applied`
                      : 'No active filters'
                    }
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              color: 'var(--danger-color)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bulk-import-footer">
          <button
            onClick={onClose}
            className="bulk-import-button bulk-import-button-secondary"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="bulk-import-button bulk-import-button-primary"
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? (
              <>
                <div className="bulk-import-spinner" style={{ width: '1rem', height: '1rem' }} />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                Export {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
