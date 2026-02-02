/**
 * @fileoverview Formatting Utilities
 *
 * Common formatting functions for currency, numbers, dates, etc.
 */

// Currency symbol mapping
const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹',
    AUD: 'A$', CAD: 'C$', CHF: 'Fr', SEK: 'kr', NZD: 'NZ$',
    MXN: 'Mex$', SGD: 'S$', HKD: 'HK$', NOK: 'kr', KRW: '₩',
    TRY: '₺', RUB: '₽', BRL: 'R$', ZAR: 'R', DKK: 'kr',
    PLN: 'zł', THB: '฿', IDR: 'Rp', HUF: 'Ft', CZK: 'Kč',
    ILS: '₪', CLP: 'CLP$', PHP: '₱', AED: 'د.إ', COP: 'COL$',
    SAR: '﷼', MYR: 'RM', RON: 'lei'
};

const CURRENCY_LOCALES = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP',
    CNY: 'zh-CN', INR: 'en-IN', AUD: 'en-AU', CAD: 'en-CA',
    CHF: 'de-CH', SEK: 'sv-SE', NZD: 'en-NZ', MXN: 'es-MX',
    SGD: 'en-SG', HKD: 'zh-HK', NOK: 'nb-NO', KRW: 'ko-KR',
    TRY: 'tr-TR', RUB: 'ru-RU', BRL: 'pt-BR', ZAR: 'en-ZA'
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';

    if (amount === null || amount === undefined || isNaN(amount)) {
        return `${symbol}0.00`;
    }

    const locale = CURRENCY_LOCALES[currency] || 'en-US';

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        // Fallback if currency not supported
        return `${symbol}${Number(amount).toFixed(2)}`;
    }
}

/**
 * Format a number with commas
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }

    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a date string
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    if (!date) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
}

/**
 * Format a date and time string
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
    if (!date) return '';

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(new Date(date));
}

/**
 * Format a phone number
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }

    // Return as-is if not 10 digits
    return phone;
}

/**
 * Format a percentage
 * @param {number} value - The value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }

    return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format file size in bytes to human-readable format
 * @param {number} bytes - The size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default {
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    formatPhone,
    formatPercentage,
    truncate,
    formatFileSize
};
