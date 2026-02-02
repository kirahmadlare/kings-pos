/**
 * @fileoverview Currency Hook
 *
 * Hook to get currency settings from the current store
 */

import { useAuthStore } from '../stores/authStore';

// Currency symbol mapping
const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    SEK: 'kr',
    NZD: 'NZ$',
    MXN: 'Mex$',
    SGD: 'S$',
    HKD: 'HK$',
    NOK: 'kr',
    KRW: '₩',
    TRY: '₺',
    RUB: '₽',
    BRL: 'R$',
    ZAR: 'R',
    DKK: 'kr',
    PLN: 'zł',
    THB: '฿',
    IDR: 'Rp',
    HUF: 'Ft',
    CZK: 'Kč',
    ILS: '₪',
    CLP: 'CLP$',
    PHP: '₱',
    AED: 'د.إ',
    COP: 'COL$',
    SAR: '﷼',
    MYR: 'RM',
    RON: 'lei'
};

// Get currency locale mapping
const CURRENCY_LOCALES = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    INR: 'en-IN',
    AUD: 'en-AU',
    CAD: 'en-CA',
    CHF: 'de-CH',
    SEK: 'sv-SE',
    NZD: 'en-NZ',
    MXN: 'es-MX',
    SGD: 'en-SG',
    HKD: 'zh-HK',
    NOK: 'nb-NO',
    KRW: 'ko-KR',
    TRY: 'tr-TR',
    RUB: 'ru-RU',
    BRL: 'pt-BR',
    ZAR: 'en-ZA',
    DKK: 'da-DK',
    PLN: 'pl-PL',
    THB: 'th-TH',
    IDR: 'id-ID',
    HUF: 'hu-HU',
    CZK: 'cs-CZ',
    ILS: 'he-IL',
    CLP: 'es-CL',
    PHP: 'en-PH',
    AED: 'ar-AE',
    COP: 'es-CO',
    SAR: 'ar-SA',
    MYR: 'ms-MY',
    RON: 'ro-RO'
};

/**
 * Hook to get currency configuration from store settings
 * @returns {object} Currency configuration
 */
export function useCurrency() {
    const { store } = useAuthStore();

    const currency = store?.currency || 'USD';
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const locale = CURRENCY_LOCALES[currency] || 'en-US';

    /**
     * Format amount as currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return `${symbol}0.00`;
        }

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback if currency/locale not supported
            return `${symbol}${Number(amount).toFixed(2)}`;
        }
    };

    /**
     * Get just the currency symbol
     * @returns {string} Currency symbol
     */
    const getCurrencySymbol = () => symbol;

    return {
        currency,
        symbol,
        locale,
        formatCurrency,
        getCurrencySymbol
    };
}

export default useCurrency;
