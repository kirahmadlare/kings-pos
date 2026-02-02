/**
 * @fileoverview Trigger Selector Component
 *
 * Allows selecting and configuring workflow triggers
 */

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { apiRequest } from '../../services/api';

function TriggerSelector({ trigger, onChange }) {
    const [availableTriggers, setAvailableTriggers] = useState([]);

    useEffect(() => {
        loadTriggers();
    }, []);

    const loadTriggers = async () => {
        try {
            const triggers = await apiRequest('/workflows/triggers/available');
            setAvailableTriggers(triggers);
        } catch (error) {
            console.error('Failed to load triggers:', error);
        }
    };

    const handleTriggerTypeChange = (type) => {
        onChange({
            ...trigger,
            type,
            conditions: []
        });
    };

    const addCondition = () => {
        onChange({
            ...trigger,
            conditions: [
                ...trigger.conditions,
                { field: '', operator: 'equals', value: '' }
            ]
        });
    };

    const updateCondition = (index, updates) => {
        const newConditions = [...trigger.conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onChange({ ...trigger, conditions: newConditions });
    };

    const removeCondition = (index) => {
        const newConditions = trigger.conditions.filter((_, i) => i !== index);
        onChange({ ...trigger, conditions: newConditions });
    };

    const selectedTriggerInfo = availableTriggers.find(t => t.type === trigger.type);

    return (
        <div className="trigger-selector">
            <div className="form-group">
                <label>Trigger Type *</label>
                <select
                    className="form-control"
                    value={trigger.type}
                    onChange={(e) => handleTriggerTypeChange(e.target.value)}
                >
                    {availableTriggers.map(t => (
                        <option key={t.type} value={t.type}>
                            {t.label}
                        </option>
                    ))}
                </select>
                {selectedTriggerInfo && (
                    <small className="form-hint">{selectedTriggerInfo.description}</small>
                )}
            </div>

            {/* Schedule Configuration */}
            {trigger.type === 'schedule' && (
                <div className="schedule-config">
                    <h4>Schedule Configuration</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Frequency</label>
                            <select
                                className="form-control"
                                value={trigger.schedule?.type || 'daily'}
                                onChange={(e) => onChange({
                                    ...trigger,
                                    schedule: { ...trigger.schedule, type: e.target.value }
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
                                value={trigger.schedule?.time || '09:00'}
                                onChange={(e) => onChange({
                                    ...trigger,
                                    schedule: { ...trigger.schedule, time: e.target.value }
                                })}
                            />
                        </div>

                        {trigger.schedule?.type === 'weekly' && (
                            <div className="form-group">
                                <label>Day of Week</label>
                                <select
                                    className="form-control"
                                    value={trigger.schedule?.dayOfWeek || 1}
                                    onChange={(e) => onChange({
                                        ...trigger,
                                        schedule: { ...trigger.schedule, dayOfWeek: parseInt(e.target.value) }
                                    })}
                                >
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                </select>
                            </div>
                        )}

                        {trigger.schedule?.type === 'monthly' && (
                            <div className="form-group">
                                <label>Day of Month</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    min="1"
                                    max="31"
                                    value={trigger.schedule?.dayOfMonth || 1}
                                    onChange={(e) => onChange({
                                        ...trigger,
                                        schedule: { ...trigger.schedule, dayOfMonth: parseInt(e.target.value) }
                                    })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Conditions */}
            {trigger.type !== 'schedule' && trigger.type !== 'manual' && (
                <div className="conditions-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4>Conditions (Optional)</h4>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={addCondition}>
                            <Plus size={14} />
                            Add Condition
                        </button>
                    </div>

                    {trigger.conditions.length === 0 ? (
                        <p className="form-hint">No conditions added. Workflow will trigger for all events of this type.</p>
                    ) : (
                        <div className="conditions-list">
                            {trigger.conditions.map((condition, index) => (
                                <div key={index} className="condition-row">
                                    <select
                                        className="form-control"
                                        value={condition.field}
                                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                                    >
                                        <option value="">Select field...</option>
                                        {selectedTriggerInfo?.availableFields.map(field => (
                                            <option key={field} value={field}>{field}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="form-control"
                                        value={condition.operator}
                                        onChange={(e) => updateCondition(index, { operator: e.target.value })}
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="not_equals">Not Equals</option>
                                        <option value="greater_than">Greater Than</option>
                                        <option value="less_than">Less Than</option>
                                        <option value="greater_or_equal">Greater or Equal</option>
                                        <option value="less_or_equal">Less or Equal</option>
                                        <option value="contains">Contains</option>
                                        <option value="not_contains">Not Contains</option>
                                    </select>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Value"
                                        value={condition.value}
                                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                                    />

                                    <button
                                        type="button"
                                        className="btn-icon"
                                        onClick={() => removeCondition(index)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TriggerSelector;
