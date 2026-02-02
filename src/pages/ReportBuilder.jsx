/**
 * @fileoverview Custom Report Builder
 *
 * Visual report builder for creating custom reports
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save, Play, Star, Trash2, Calendar, Filter, BarChart3,
    TrendingUp, Package, Users, DollarSign, Clock, Edit
} from 'lucide-react';
import { apiRequest } from '../services/api';
import './ReportBuilder.css';

function ReportBuilder() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingReport, setEditingReport] = useState(null);

    // Report form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        reportType: 'sales',
        config: {
            filters: {
                dateRange: {
                    type: 'month',
                    startDate: '',
                    endDate: ''
                }
            },
            metrics: [],
            groupBy: [],
            sortBy: 'revenue',
            sortOrder: 'desc',
            chartType: 'table'
        },
        schedule: {
            enabled: false,
            frequency: 'weekly',
            time: '09:00',
            recipients: []
        }
    });

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/reports');
            setReports(data || []);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingReport(null);
        setFormData({
            name: '',
            description: '',
            reportType: 'sales',
            config: {
                filters: {
                    dateRange: {
                        type: 'month',
                        startDate: '',
                        endDate: ''
                    }
                },
                metrics: [],
                groupBy: [],
                sortBy: 'revenue',
                sortOrder: 'desc',
                chartType: 'table'
            },
            schedule: {
                enabled: false,
                frequency: 'weekly',
                time: '09:00',
                recipients: []
            }
        });
        setShowBuilder(true);
    };

    const handleEdit = (report) => {
        setEditingReport(report);
        setFormData(report);
        setShowBuilder(true);
    };

    const handleSave = async () => {
        try {
            if (editingReport) {
                await apiRequest(`/reports/${editingReport._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await apiRequest('/reports', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }

            await loadReports();
            setShowBuilder(false);
        } catch (error) {
            console.error('Failed to save report:', error);
            alert('Failed to save report');
        }
    };

    const handleRun = async (reportId) => {
        try {
            const result = await apiRequest(`/reports/${reportId}/run`, {
                method: 'POST'
            });

            // Store result and navigate to view
            sessionStorage.setItem('reportResult', JSON.stringify(result));
            navigate('/reports/view');
        } catch (error) {
            console.error('Failed to run report:', error);
            alert('Failed to run report');
        }
    };

    const handleToggleFavorite = async (reportId) => {
        try {
            await apiRequest(`/reports/${reportId}/favorite`, {
                method: 'POST'
            });
            await loadReports();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const handleDelete = async (reportId) => {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            await apiRequest(`/reports/${reportId}`, {
                method: 'DELETE'
            });
            await loadReports();
        } catch (error) {
            console.error('Failed to delete report:', error);
            alert('Failed to delete report');
        }
    };

    const reportTypeOptions = [
        { value: 'sales', label: 'Sales Report', icon: DollarSign },
        { value: 'inventory', label: 'Inventory Report', icon: Package },
        { value: 'customers', label: 'Customer Report', icon: Users },
        { value: 'employees', label: 'Employee Report', icon: Users }
    ];

    const chartTypes = [
        { value: 'table', label: 'Table' },
        { value: 'line', label: 'Line Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' }
    ];

    if (loading) {
        return (
            <div className="report-builder">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading reports...</p>
                </div>
            </div>
        );
    }

    if (showBuilder) {
        return (
            <div className="report-builder">
                <div className="builder-header">
                    <h1>{editingReport ? 'Edit Report' : 'Create New Report'}</h1>
                    <div className="builder-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowBuilder(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                        >
                            <Save size={18} />
                            Save Report
                        </button>
                    </div>
                </div>

                <div className="builder-content">
                    {/* Basic Info */}
                    <div className="builder-section">
                        <h2>Basic Information</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Report Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Monthly Sales Summary"
                                />
                            </div>

                            <div className="form-group">
                                <label>Report Type *</label>
                                <select
                                    className="form-control"
                                    value={formData.reportType}
                                    onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                                >
                                    {reportTypeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group form-full">
                                <label>Description</label>
                                <textarea
                                    className="form-control"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Describe what this report shows..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="builder-section">
                        <h2>Filters</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Date Range</label>
                                <select
                                    className="form-control"
                                    value={formData.config.filters.dateRange.type}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: {
                                            ...formData.config,
                                            filters: {
                                                ...formData.config.filters,
                                                dateRange: {
                                                    ...formData.config.filters.dateRange,
                                                    type: e.target.value
                                                }
                                            }
                                        }
                                    })}
                                >
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">This Month</option>
                                    <option value="quarter">This Quarter</option>
                                    <option value="year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {formData.config.filters.dateRange.type === 'custom' && (
                                <>
                                    <div className="form-group">
                                        <label>Start Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.config.filters.dateRange.startDate}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                config: {
                                                    ...formData.config,
                                                    filters: {
                                                        ...formData.config.filters,
                                                        dateRange: {
                                                            ...formData.config.filters.dateRange,
                                                            startDate: e.target.value
                                                        }
                                                    }
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>End Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.config.filters.dateRange.endDate}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                config: {
                                                    ...formData.config,
                                                    filters: {
                                                        ...formData.config.filters,
                                                        dateRange: {
                                                            ...formData.config.filters.dateRange,
                                                            endDate: e.target.value
                                                        }
                                                    }
                                                }
                                            })}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Visualization */}
                    <div className="builder-section">
                        <h2>Visualization</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Chart Type</label>
                                <select
                                    className="form-control"
                                    value={formData.config.chartType}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: {
                                            ...formData.config,
                                            chartType: e.target.value
                                        }
                                    })}
                                >
                                    {chartTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="builder-section">
                        <h2>Schedule (Optional)</h2>
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.schedule.enabled}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        schedule: {
                                            ...formData.schedule,
                                            enabled: e.target.checked
                                        }
                                    })}
                                />
                                <span>Enable scheduled delivery</span>
                            </label>
                        </div>

                        {formData.schedule.enabled && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Frequency</label>
                                    <select
                                        className="form-control"
                                        value={formData.schedule.frequency}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            schedule: {
                                                ...formData.schedule,
                                                frequency: e.target.value
                                            }
                                        })}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.schedule.time}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            schedule: {
                                                ...formData.schedule,
                                                time: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="report-builder">
            <div className="builder-header">
                <div>
                    <h1>Custom Reports</h1>
                    <p className="subtitle">Create and manage custom reports</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <BarChart3 size={18} />
                    Create Report
                </button>
            </div>

            {/* Report List */}
            <div className="reports-grid">
                {reports.map((report) => (
                    <div key={report._id} className="report-card">
                        <div className="report-card-header">
                            <div className="report-type-icon">
                                {report.reportType === 'sales' && <DollarSign size={24} />}
                                {report.reportType === 'inventory' && <Package size={24} />}
                                {report.reportType === 'customers' && <Users size={24} />}
                                {report.reportType === 'employees' && <Users size={24} />}
                            </div>
                            <button
                                className={`btn-icon ${report.isFavorite ? 'favorite' : ''}`}
                                onClick={() => handleToggleFavorite(report._id)}
                            >
                                <Star size={18} fill={report.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        <h3>{report.name}</h3>
                        <p className="report-description">{report.description || 'No description'}</p>

                        <div className="report-meta">
                            <span className="report-type">{report.reportType}</span>
                            {report.schedule?.enabled && (
                                <span className="report-scheduled">
                                    <Clock size={14} />
                                    Scheduled
                                </span>
                            )}
                        </div>

                        <div className="report-stats">
                            <span>{report.runCount || 0} runs</span>
                            {report.lastRunAt && (
                                <span>Last: {new Date(report.lastRunAt).toLocaleDateString()}</span>
                            )}
                        </div>

                        <div className="report-actions">
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleRun(report._id)}
                            >
                                <Play size={14} />
                                Run
                            </button>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEdit(report)}
                            >
                                <Edit size={14} />
                                Edit
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => handleDelete(report._id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {reports.length === 0 && (
                    <div className="empty-reports">
                        <BarChart3 size={64} />
                        <h3>No Reports Yet</h3>
                        <p>Create your first custom report</p>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            Create Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReportBuilder;
