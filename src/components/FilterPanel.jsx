/**
 * @fileoverview Filter Panel Component
 *
 * Dynamic filter UI based on field configuration
 */

import { X, Filter, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import './AdvancedSearch.css';

export default function FilterPanel({ filters, filterFields, updateFilter, removeFilter, clearFilters, activeFilterCount }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!filterFields || Object.keys(filterFields).length === 0) {
        return null;
    }

    return (
        <div className="filter-panel">
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="filter-panel-button"
            >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                    <span className="filter-count-badge">
                        {activeFilterCount}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 filter-panel-chevron ${isOpen ? 'rotated' : ''}`} />
            </button>

            {/* Filter Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="filter-panel-backdrop"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="filter-panel-dropdown">
                        {/* Header */}
                        <div className="filter-panel-header">
                            <h3 className="filter-panel-title">Filters</h3>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="filter-panel-clear-btn"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Filter Fields */}
                        <div className="filter-panel-body">
                            {Object.entries(filterFields).map(([key, config]) => (
                                <FilterField
                                    key={key}
                                    fieldKey={key}
                                    config={config}
                                    value={filters[key]}
                                    onChange={(value) => updateFilter(key, value)}
                                    onRemove={() => removeFilter(key)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function FilterField({ fieldKey, config, value, onChange, onRemove }) {
    const { label, type, options, min, max, placeholder } = config;

    const renderInput = () => {
        switch (type) {
            case 'select':
            case 'enum':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value || null)}
                        className="filter-field-select"
                    >
                        <option value="">All</option>
                        {options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'boolean':
                return (
                    <select
                        value={value === null || value === undefined ? '' : String(value)}
                        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
                        className="filter-field-select"
                    >
                        <option value="">All</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value || null)}
                        min={min}
                        max={max}
                        placeholder={placeholder || 'Enter number'}
                        className="filter-field-input"
                    />
                );

            case 'range':
                return (
                    <div className="filter-field-range">
                        <input
                            type="number"
                            value={value?.min || ''}
                            onChange={(e) => onChange({ ...(value || {}), min: e.target.value || undefined })}
                            placeholder="Min"
                            className="filter-field-input"
                        />
                        <input
                            type="number"
                            value={value?.max || ''}
                            onChange={(e) => onChange({ ...(value || {}), max: e.target.value || undefined })}
                            placeholder="Max"
                            className="filter-field-input"
                        />
                    </div>
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value || null)}
                        className="filter-field-input"
                    />
                );

            case 'daterange':
                return (
                    <div className="filter-field-range">
                        <input
                            type="date"
                            value={value?.start || ''}
                            onChange={(e) => onChange({ ...(value || {}), start: e.target.value || undefined })}
                            placeholder="Start date"
                            className="filter-field-input"
                        />
                        <input
                            type="date"
                            value={value?.end || ''}
                            onChange={(e) => onChange({ ...(value || {}), end: e.target.value || undefined })}
                            placeholder="End date"
                            className="filter-field-input"
                        />
                    </div>
                );

            case 'text':
            case 'search':
            default:
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value || null)}
                        placeholder={placeholder || 'Enter text'}
                        className="filter-field-input"
                    />
                );
        }
    };

    const hasValue = value !== null && value !== undefined && value !== '' &&
        (typeof value !== 'object' || Object.keys(value).some(k => value[k] !== undefined && value[k] !== ''));

    return (
        <div className="filter-field">
            <div className="filter-field-header">
                <label className="filter-field-label">
                    {label || fieldKey}
                </label>
                {hasValue && (
                    <button
                        onClick={onRemove}
                        className="filter-field-clear"
                        title="Clear filter"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            {renderInput()}
        </div>
    );
}
