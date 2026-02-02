/**
 * @fileoverview Advanced Search Hook
 *
 * Manages search state, filters, sorting, and pagination
 */

import { useState, useEffect, useMemo } from 'react';

/**
 * Advanced search hook for list pages
 * @param {Array} data - Array of data to search/filter
 * @param {Object} config - Search configuration
 * @returns {Object} Search state and methods
 */
export function useAdvancedSearch(data, config = {}) {
    const {
        searchFields = [], // Fields to search in
        filterFields = {}, // Available filter fields with types
        defaultSort = 'createdAt',
        defaultOrder = 'desc',
        defaultFilters = {},
        itemsPerPage = 50
    } = config;

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState(defaultFilters);
    const [sortBy, setSortBy] = useState(defaultSort);
    const [sortOrder, setSortOrder] = useState(defaultOrder);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when search/filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters, sortBy, sortOrder]);

    // Apply search
    const searchedData = useMemo(() => {
        if (!searchQuery || searchQuery.trim() === '') {
            return data;
        }

        const query = searchQuery.toLowerCase();

        return data.filter(item => {
            // Search in configured fields
            if (searchFields.length > 0) {
                return searchFields.some(field => {
                    const value = getNestedValue(item, field);
                    return value && String(value).toLowerCase().includes(query);
                });
            }

            // Search in all string fields if no fields specified
            return Object.values(item).some(value => {
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(query);
                }
                return false;
            });
        });
    }, [data, searchQuery, searchFields]);

    // Apply filters
    const filteredData = useMemo(() => {
        let result = searchedData;

        Object.entries(filters).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                return; // Skip empty filters
            }

            const filterConfig = filterFields[key];
            if (!filterConfig) {
                return; // Skip unknown filters
            }

            result = result.filter(item => {
                const itemValue = getNestedValue(item, key);

                switch (filterConfig.type) {
                    case 'select':
                    case 'enum':
                        return itemValue === value;

                    case 'multiselect':
                        return Array.isArray(value) && value.includes(itemValue);

                    case 'boolean':
                        return itemValue === (value === 'true' || value === true);

                    case 'number':
                    case 'range':
                        if (typeof value === 'object') {
                            const min = value.min !== undefined ? parseFloat(value.min) : -Infinity;
                            const max = value.max !== undefined ? parseFloat(value.max) : Infinity;
                            const num = parseFloat(itemValue);
                            return num >= min && num <= max;
                        }
                        return parseFloat(itemValue) === parseFloat(value);

                    case 'date':
                    case 'daterange':
                        if (typeof value === 'object') {
                            const itemDate = new Date(itemValue);
                            const start = value.start ? new Date(value.start) : new Date(0);
                            const end = value.end ? new Date(value.end) : new Date(8640000000000000);
                            return itemDate >= start && itemDate <= end;
                        }
                        return new Date(itemValue).toDateString() === new Date(value).toDateString();

                    case 'text':
                    case 'search':
                    default:
                        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
                }
            });
        });

        return result;
    }, [searchedData, filters, filterFields]);

    // Apply sorting
    const sortedData = useMemo(() => {
        if (!sortBy) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {
            const aValue = getNestedValue(a, sortBy);
            const bValue = getNestedValue(b, sortBy);

            // Handle null/undefined
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
            if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

            // Handle dates
            if (aValue instanceof Date || bValue instanceof Date) {
                const aTime = new Date(aValue).getTime();
                const bTime = new Date(bValue).getTime();
                return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
            }

            // Handle numbers
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Handle strings
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();

            if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortBy, sortOrder]);

    // Apply pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, itemsPerPage]);

    // Pagination info
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Methods
    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const removeFilter = (key) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[key];
            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters({});
    };

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const nextPage = () => {
        if (hasNextPage) setCurrentPage(prev => prev + 1);
    };

    const prevPage = () => {
        if (hasPrevPage) setCurrentPage(prev => prev - 1);
    };

    const activeFilterCount = Object.keys(filters).filter(
        key => filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
    ).length;

    return {
        // Data
        data: paginatedData,
        allData: sortedData,
        totalResults: sortedData.length,

        // Search
        searchQuery,
        setSearchQuery,

        // Filters
        filters,
        updateFilter,
        removeFilter,
        clearFilters,
        activeFilterCount,

        // Sorting
        sortBy,
        sortOrder,
        setSortBy,
        setSortOrder,
        toggleSort,

        // Pagination
        currentPage,
        totalPages,
        itemsPerPage,
        hasNextPage,
        hasPrevPage,
        goToPage,
        nextPage,
        prevPage
    };
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., 'user.name')
 * @returns {*} Value at path
 */
function getNestedValue(obj, path) {
    if (!path) return obj;

    return path.split('.').reduce((current, key) => {
        return current?.[key];
    }, obj);
}

export default useAdvancedSearch;
