/**
 * @fileoverview Workflow Builder Page
 *
 * Visual workflow builder for creating automated business processes
 */

import { useState, useEffect } from 'react';
import {
    Plus, Play, Trash2, Power, PowerOff, Edit, Save, X,
    Zap, Mail, Bell, Webhook, Database, GitBranch, Clock,
    Settings, TrendingUp, AlertTriangle
} from 'lucide-react';
import { apiRequest } from '../services/api';
import TriggerSelector from '../components/workflow/TriggerSelector';
import ActionBuilder from '../components/workflow/ActionBuilder';
import './WorkflowBuilder.css';

function WorkflowBuilder() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [showStats, setShowStats] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger: {
            type: 'sale.created',
            conditions: [],
            schedule: null
        },
        actions: [],
        isActive: true
    });

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            setLoading(true);
            const data = await apiRequest('/workflows');
            setWorkflows(data);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingWorkflow(null);
        setFormData({
            name: '',
            description: '',
            trigger: {
                type: 'sale.created',
                conditions: [],
                schedule: null
            },
            actions: [],
            isActive: true
        });
        setShowBuilder(true);
    };

    const handleEdit = (workflow) => {
        setEditingWorkflow(workflow);
        setFormData({
            name: workflow.name,
            description: workflow.description,
            trigger: workflow.trigger,
            actions: workflow.actions,
            isActive: workflow.isActive
        });
        setShowBuilder(true);
    };

    const handleSave = async () => {
        try {
            if (editingWorkflow) {
                await apiRequest(`/workflows/${editingWorkflow._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await apiRequest('/workflows', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }

            await loadWorkflows();
            setShowBuilder(false);
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert('Failed to save workflow');
        }
    };

    const handleActivate = async (workflow) => {
        try {
            await apiRequest(`/workflows/${workflow._id}/activate`, {
                method: 'POST'
            });
            await loadWorkflows();
        } catch (error) {
            console.error('Failed to activate workflow:', error);
            alert('Failed to activate workflow');
        }
    };

    const handleDeactivate = async (workflow) => {
        try {
            await apiRequest(`/workflows/${workflow._id}/deactivate`, {
                method: 'POST'
            });
            await loadWorkflows();
        } catch (error) {
            console.error('Failed to deactivate workflow:', error);
            alert('Failed to deactivate workflow');
        }
    };

    const handleDelete = async (workflow) => {
        if (!confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
            return;
        }

        try {
            await apiRequest(`/workflows/${workflow._id}`, {
                method: 'DELETE'
            });
            await loadWorkflows();
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const handleTest = async (workflow) => {
        try {
            await apiRequest(`/workflows/${workflow._id}/test`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            alert('Workflow test completed! Check logs for results.');
        } catch (error) {
            console.error('Failed to test workflow:', error);
            alert(`Test failed: ${error.message}`);
        }
    };

    const handleViewStats = async (workflow) => {
        try {
            const stats = await apiRequest(`/workflows/${workflow._id}/stats`);
            setSelectedWorkflow({ ...workflow, stats });
            setShowStats(true);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const addAction = () => {
        setFormData({
            ...formData,
            actions: [
                ...formData.actions,
                {
                    type: 'email',
                    config: {},
                    order: formData.actions.length,
                    continueOnError: false
                }
            ]
        });
    };

    const updateAction = (index, updates) => {
        const newActions = [...formData.actions];
        newActions[index] = { ...newActions[index], ...updates };
        setFormData({ ...formData, actions: newActions });
    };

    const removeAction = (index) => {
        const newActions = formData.actions.filter((_, i) => i !== index);
        setFormData({ ...formData, actions: newActions });
    };

    if (loading) {
        return (
            <div className="workflow-builder">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            </div>
        );
    }

    if (showBuilder) {
        return (
            <div className="workflow-builder">
                <div className="builder-header">
                    <h1>{editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}</h1>
                    <div className="builder-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowBuilder(false)}
                        >
                            <X size={18} />
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                        >
                            <Save size={18} />
                            Save Workflow
                        </button>
                    </div>
                </div>

                <div className="builder-content">
                    {/* Basic Info */}
                    <div className="builder-section">
                        <h2>Basic Information</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Workflow Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Low Stock Alert"
                                />
                            </div>

                            <div className="form-group form-full">
                                <label>Description</label>
                                <textarea
                                    className="form-control"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    placeholder="Describe what this workflow does..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Trigger */}
                    <div className="builder-section">
                        <h2><Zap size={20} /> Trigger</h2>
                        <TriggerSelector
                            trigger={formData.trigger}
                            onChange={(trigger) => setFormData({ ...formData, trigger })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="builder-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>Actions ({formData.actions.length})</h2>
                            <button className="btn btn-sm btn-primary" onClick={addAction}>
                                <Plus size={14} />
                                Add Action
                            </button>
                        </div>

                        {formData.actions.length === 0 ? (
                            <div className="empty-actions">
                                <p>No actions yet. Add an action to define what happens when the workflow triggers.</p>
                            </div>
                        ) : (
                            <div className="actions-list">
                                {formData.actions.map((action, index) => (
                                    <ActionBuilder
                                        key={index}
                                        action={action}
                                        index={index}
                                        onChange={(updates) => updateAction(index, updates)}
                                        onRemove={() => removeAction(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="workflow-builder">
            {/* Header */}
            <div className="builder-header">
                <div>
                    <h1>Workflows</h1>
                    <p className="subtitle">Automate your business processes</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <Plus size={18} />
                    Create Workflow
                </button>
            </div>

            {/* Workflows List */}
            <div className="workflows-grid">
                {workflows.map((workflow) => (
                    <WorkflowCard
                        key={workflow._id}
                        workflow={workflow}
                        onActivate={() => handleActivate(workflow)}
                        onDeactivate={() => handleDeactivate(workflow)}
                        onEdit={() => handleEdit(workflow)}
                        onDelete={() => handleDelete(workflow)}
                        onTest={() => handleTest(workflow)}
                        onViewStats={() => handleViewStats(workflow)}
                    />
                ))}

                {workflows.length === 0 && (
                    <div className="empty-state">
                        <Zap size={64} />
                        <h3>No Workflows Yet</h3>
                        <p>Create your first workflow to automate business processes</p>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            Create Workflow
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Modal */}
            {showStats && selectedWorkflow && (
                <div className="modal-overlay" onClick={() => setShowStats(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedWorkflow.name} - Statistics</h2>
                            <button className="btn-icon" onClick={() => setShowStats(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <TrendingUp size={20} />
                                    <div className="stat-value">{selectedWorkflow.stats.totalExecutions}</div>
                                    <div className="stat-label">Total Executions</div>
                                </div>
                                <div className="stat-card success">
                                    <div className="stat-value">{selectedWorkflow.stats.successfulExecutions}</div>
                                    <div className="stat-label">Successful</div>
                                </div>
                                <div className="stat-card error">
                                    <div className="stat-value">{selectedWorkflow.stats.failedExecutions}</div>
                                    <div className="stat-label">Failed</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{selectedWorkflow.stats.successRate}%</div>
                                    <div className="stat-label">Success Rate</div>
                                </div>
                            </div>

                            {selectedWorkflow.stats.lastError && (
                                <div className="error-info">
                                    <h4><AlertTriangle size={16} /> Last Error</h4>
                                    <p>{selectedWorkflow.stats.lastError.message}</p>
                                    <small>{new Date(selectedWorkflow.stats.lastError.timestamp).toLocaleString()}</small>
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
 * Workflow Card Component
 */
function WorkflowCard({ workflow, onActivate, onDeactivate, onEdit, onDelete, onTest, onViewStats }) {
    const isActive = workflow.isActive;

    const getTriggerIcon = (type) => {
        if (type.includes('sale')) return <Zap size={20} />;
        if (type.includes('product')) return <Database size={20} />;
        if (type.includes('customer')) return <Bell size={20} />;
        if (type === 'schedule') return <Clock size={20} />;
        return <Settings size={20} />;
    };

    return (
        <div className={`workflow-card ${isActive ? 'active' : 'inactive'}`}>
            <div className="workflow-card-header">
                <div className="workflow-icon">
                    {getTriggerIcon(workflow.trigger.type)}
                </div>
                <div className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                </div>
            </div>

            <h3>{workflow.name}</h3>
            <p className="workflow-description">{workflow.description || 'No description'}</p>

            <div className="workflow-meta">
                <span className="workflow-trigger">{workflow.trigger.type.replace('_', ' ')}</span>
                <span className="workflow-actions">{workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="workflow-stats-row">
                <span>{workflow.stats?.totalExecutions || 0} runs</span>
                {workflow.stats?.lastExecutedAt && (
                    <span>Last: {new Date(workflow.stats.lastExecutedAt).toLocaleDateString()}</span>
                )}
            </div>

            <div className="workflow-actions">
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

                <button className="btn btn-sm btn-secondary" onClick={onEdit}>
                    <Edit size={14} />
                    Edit
                </button>

                <button className="btn btn-sm btn-secondary" onClick={onTest}>
                    <Play size={14} />
                    Test
                </button>

                <button className="btn-icon" onClick={onViewStats}>
                    <TrendingUp size={14} />
                </button>

                <button className="btn-icon" onClick={onDelete}>
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

export default WorkflowBuilder;
