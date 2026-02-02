/**
 * @fileoverview Audit Logs Hook
 *
 * Custom hook for fetching and managing audit log data with filters
 */

import { useState, useEffect, useCallback } from 'react';
import { auditAPI } from '../services/api';

/**
 * Hook for fetching audit logs with filtering and pagination
 *
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Audit logs data and control functions
 */
export function useAuditLogs(initialFilters = {}) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 50,
        ...initialFilters
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        pages: 1
    });

    /**
     * Fetch audit logs with current filters
     */
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Build query params from filters
            const params = {};

            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.entityType) params.entityType = filters.entityType;
            if (filters.action) params.action = filters.action;
            if (filters.userId) params.userId = filters.userId;
            if (filters.level) params.level = filters.level;
            if (filters.search) params.search = filters.search;

            params.page = filters.page;
            params.limit = filters.limit;

            const data = await auditAPI.getAll(params);

            setLogs(data.logs || []);
            setPagination({
                total: data.pagination?.total || 0,
                page: data.pagination?.page || 1,
                pages: data.pagination?.pages || 1
            });
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    /**
     * Update filters and reset to page 1
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            page: 1 // Reset to first page when filters change
        }));
    }, []);

    /**
     * Change page
     */
    const changePage = useCallback((newPage) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    }, []);

    /**
     * Reset filters to initial state
     */
    const resetFilters = useCallback(() => {
        setFilters({
            page: 1,
            limit: 50,
            ...initialFilters
        });
    }, [initialFilters]);

    /**
     * Export logs with current filters
     */
    const exportLogs = useCallback(async () => {
        try {
            const params = {};

            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.entityType) params.entityType = filters.entityType;
            if (filters.action) params.action = filters.action;
            if (filters.userId) params.userId = filters.userId;
            if (filters.level) params.level = filters.level;

            const data = await auditAPI.export(params);

            // Create blob and download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return true;
        } catch (err) {
            setError(err.message);
            console.error('Failed to export audit logs:', err);
            return false;
        }
    }, [filters]);

    // Fetch logs when filters change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return {
        logs,
        loading,
        error,
        filters,
        pagination,
        updateFilters,
        changePage,
        resetFilters,
        refetch: fetchLogs,
        exportLogs
    };
}

/**
 * Hook for fetching critical audit events
 *
 * @param {number} hours - Number of hours to look back
 * @returns {Object} Critical events data
 */
export function useCriticalEvents(hours = 24) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCritical = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await auditAPI.getCritical(hours);
            setEvents(data.logs || []);
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch critical events:', err);
        } finally {
            setLoading(false);
        }
    }, [hours]);

    useEffect(() => {
        fetchCritical();

        // Refresh every 30 seconds
        const interval = setInterval(fetchCritical, 30000);

        return () => clearInterval(interval);
    }, [fetchCritical]);

    return {
        events,
        count: events.length,
        loading,
        error,
        refetch: fetchCritical
    };
}

/**
 * Hook for fetching audit statistics
 *
 * @param {string} startDate - Start date for stats
 * @param {string} endDate - End date for stats
 * @returns {Object} Statistics data
 */
export function useAuditStats(startDate, endDate) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        setError(null);

        try {
            const data = await auditAPI.getStats(startDate, endDate);
            setStats(data);
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch audit stats:', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refetch: fetchStats
    };
}
