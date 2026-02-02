/**
 * @fileoverview Advanced Search Bar Component
 *
 * Combined search input with filter panel and active filters display
 */

import { Search, X, SortAsc, SortDesc } from 'lucide-react';
import FilterPanel from './FilterPanel';
import './AdvancedSearch.css';

export default function AdvancedSearchBar({
    searchQuery,
    onSearchChange,
    filters,
    filterFields,
    onUpdateFilter,
    onRemoveFilter,
    onClearFilters,
    activeFilterCount,
    sortBy,
    sortOrder,
    onToggleSort,
    sortOptions = [],
    placeholder = 'Search...'
}) {
    return (
        <div className="advanced-search-container">
            {/* Search and Filter Row */}
            <div className="advanced-search-row">
                {/* Search Input */}
                <div className="advanced-search-input-wrapper">
                    <Search className="w-5 h-5 advanced-search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        className="advanced-search-input"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="advanced-search-clear"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Sort Dropdown */}
                {sortOptions && sortOptions.length > 0 && (
                    <div className="advanced-search-sort">
                        {sortOrder === 'asc' ? (
                            <SortAsc className="w-4 h-4 advanced-search-sort-icon" />
                        ) : (
                            <SortDesc className="w-4 h-4 advanced-search-sort-icon" />
                        )}
                        <select
                            value={sortBy}
                            onChange={(e) => onToggleSort && onToggleSort(e.target.value)}
                            className="advanced-search-sort-select"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => onToggleSort && onToggleSort(sortBy)}
                            className="advanced-search-sort-toggle"
                            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                            {sortOrder === 'asc' ? (
                                <SortDesc className="w-4 h-4" />
                            ) : (
                                <SortAsc className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                )}

                {/* Filter Panel */}
                {filterFields && (
                    <FilterPanel
                        filters={filters}
                        filterFields={filterFields}
                        updateFilter={onUpdateFilter}
                        removeFilter={onRemoveFilter}
                        clearFilters={onClearFilters}
                        activeFilterCount={activeFilterCount}
                    />
                )}
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
                <div className="active-filters-container">
                    <span className="active-filters-label">
                        Active filters:
                    </span>
                    {Object.entries(filters).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;

                        const filterConfig = filterFields?.[key];
                        const label = filterConfig?.label || key;

                        // Format value for display
                        let displayValue = value;
                        if (typeof value === 'object') {
                            if (value.min !== undefined || value.max !== undefined) {
                                displayValue = `${value.min || ''}...${value.max || ''}`;
                            } else if (value.start !== undefined || value.end !== undefined) {
                                displayValue = `${value.start || ''} to ${value.end || ''}`;
                            }
                        } else if (typeof value === 'boolean') {
                            displayValue = value ? 'Yes' : 'No';
                        } else if (filterConfig?.options) {
                            const option = filterConfig.options.find(opt => opt.value === value);
                            displayValue = option?.label || value;
                        }

                        return (
                            <span key={key} className="filter-chip">
                                <span className="filter-chip-label">{label}:</span>
                                <span>{String(displayValue)}</span>
                                <button
                                    onClick={() => onRemoveFilter(key)}
                                    className="filter-chip-remove"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                    <button
                        onClick={onClearFilters}
                        className="filter-chip-clear-all"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
