/**
 * @fileoverview Formatting Utilities
 *
 * Common formatting functions for dates, currency, numbers, etc.
 */

/**
 * Format currency value
 */
export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$0.00';
    return `$${Number(value).toFixed(2)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format number with commas
 */
export function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Number(value).toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format phone number
 */
export function formatPhone(phone) {
    if (!phone) return 'N/A';
    const cleaned = String(phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
}
