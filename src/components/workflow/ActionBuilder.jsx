/**
 * @fileoverview Action Builder Component
 *
 * Allows configuring workflow actions
 */

import { Mail, Bell, Webhook, Database, Plus, X } from 'lucide-react';

function ActionBuilder({ action, index, onChange, onRemove }) {
    const actionTypes = [
        { value: 'email', label: 'Send Email', icon: Mail },
        { value: 'notification', label: 'Send Notification', icon: Bell },
        { value: 'webhook', label: 'Call Webhook', icon: Webhook },
        { value: 'update', label: 'Update Record', icon: Database }
    ];

    const getActionIcon = (type) => {
        const actionType = actionTypes.find(t => t.value === type);
        return actionType ? <actionType.icon size={18} /> : <Plus size={18} />;
    };

    return (
        <div className="action-builder">
            <div className="action-header">
                <div className="action-number">{index + 1}</div>
                <select
                    className="action-type-selector"
                    value={action.type}
                    onChange={(e) => onChange({ type: e.target.value, config: {} })}
                >
                    {actionTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
                <button type="button" className="btn-icon" onClick={onRemove}>
                    <X size={16} />
                </button>
            </div>

            <div className="action-config">
                {action.type === 'email' && (
                    <EmailActionConfig action={action} onChange={onChange} />
                )}

                {action.type === 'notification' && (
                    <NotificationActionConfig action={action} onChange={onChange} />
                )}

                {action.type === 'webhook' && (
                    <WebhookActionConfig action={action} onChange={onChange} />
                )}

                {action.type === 'update' && (
                    <UpdateActionConfig action={action} onChange={onChange} />
                )}
            </div>

            <div className="action-options">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={action.continueOnError || false}
                        onChange={(e) => onChange({ continueOnError: e.target.checked })}
                    />
                    <span>Continue workflow if this action fails</span>
                </label>
            </div>
        </div>
    );
}

/**
 * Email Action Configuration
 */
function EmailActionConfig({ action, onChange }) {
    const updateConfig = (updates) => {
        onChange({
            config: { ...action.config, ...updates }
        });
    };

    return (
        <div className="form-grid">
            <div className="form-group form-full">
                <label>To (email addresses, comma-separated)</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="owner@example.com, {{data.customer.email}}"
                    value={action.config.to?.join(', ') || ''}
                    onChange={(e) => updateConfig({ to: e.target.value.split(',').map(s => s.trim()) })}
                />
                <small className="form-hint">Use {'{{data.field}}'} for dynamic values</small>
            </div>

            <div className="form-group form-full">
                <label>Subject</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Low Stock Alert for {{data.name}}"
                    value={action.config.subject || ''}
                    onChange={(e) => updateConfig({ subject: e.target.value })}
                />
            </div>

            <div className="form-group form-full">
                <label>Body</label>
                <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Product {{data.name}} has {{data.quantity}} units remaining."
                    value={action.config.body || ''}
                    onChange={(e) => updateConfig({ body: e.target.value })}
                />
            </div>
        </div>
    );
}

/**
 * Notification Action Configuration
 */
function NotificationActionConfig({ action, onChange }) {
    const updateConfig = (updates) => {
        onChange({
            config: { ...action.config, ...updates }
        });
    };

    return (
        <div className="form-grid">
            <div className="form-group">
                <label>User ID</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="{{context.userId}} or specific ID"
                    value={action.config.userId || ''}
                    onChange={(e) => updateConfig({ userId: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label>Priority</label>
                <select
                    className="form-control"
                    value={action.config.priority || 'normal'}
                    onChange={(e) => updateConfig({ priority: e.target.value })}
                >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>

            <div className="form-group form-full">
                <label>Title</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Low Stock Alert"
                    value={action.config.title || ''}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                />
            </div>

            <div className="form-group form-full">
                <label>Message</label>
                <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Product {{data.name}} has only {{data.quantity}} units left."
                    value={action.config.message || ''}
                    onChange={(e) => updateConfig({ message: e.target.value })}
                />
            </div>
        </div>
    );
}

/**
 * Webhook Action Configuration
 */
function WebhookActionConfig({ action, onChange }) {
    const updateConfig = (updates) => {
        onChange({
            config: { ...action.config, ...updates }
        });
    };

    return (
        <div className="form-grid">
            <div className="form-group">
                <label>URL</label>
                <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/webhook"
                    value={action.config.url || ''}
                    onChange={(e) => updateConfig({ url: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label>Method</label>
                <select
                    className="form-control"
                    value={action.config.method || 'POST'}
                    onChange={(e) => updateConfig({ method: e.target.value })}
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
            </div>

            <div className="form-group form-full">
                <label>Body (JSON)</label>
                <textarea
                    className="form-control"
                    rows={4}
                    placeholder='{"productId": "{{data._id}}", "quantity": "{{data.quantity}}"}'
                    value={action.config.body ? JSON.stringify(action.config.body, null, 2) : ''}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            updateConfig({ body: parsed });
                        } catch (err) {
                            // Invalid JSON, update anyway to show in textarea
                            updateConfig({ body: e.target.value });
                        }
                    }}
                />
            </div>
        </div>
    );
}

/**
 * Update Action Configuration
 */
function UpdateActionConfig({ action, onChange }) {
    const updateConfig = (updates) => {
        onChange({
            config: { ...action.config, ...updates }
        });
    };

    return (
        <div className="form-grid">
            <div className="form-group">
                <label>Entity Type</label>
                <select
                    className="form-control"
                    value={action.config.entity || 'product'}
                    onChange={(e) => updateConfig({ entity: e.target.value })}
                >
                    <option value="product">Product</option>
                    <option value="customer">Customer</option>
                    <option value="sale">Sale</option>
                    <option value="employee">Employee</option>
                </select>
            </div>

            <div className="form-group">
                <label>Entity ID</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="{{data._id}}"
                    value={action.config.entityId || ''}
                    onChange={(e) => updateConfig({ entityId: e.target.value })}
                />
            </div>

            <div className="form-group form-full">
                <label>Updates (JSON)</label>
                <textarea
                    className="form-control"
                    rows={4}
                    placeholder='{"status": "pending_approval", "notes": "High value sale"}'
                    value={action.config.updates ? JSON.stringify(action.config.updates, null, 2) : ''}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            updateConfig({ updates: parsed });
                        } catch (err) {
                            updateConfig({ updates: e.target.value });
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default ActionBuilder;
