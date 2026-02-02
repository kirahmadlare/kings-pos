/**
 * @fileoverview API Service
 *
 * Handles communication with the backend API.
 * Provides methods for all API endpoints with error handling and retry logic.
 */

import { withRetry } from './retryStrategy';
import { toast } from '../stores/toastStore';

// Get API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
    return localStorage.getItem('auth_token');
};

/**
 * Set auth token in localStorage
 */
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
};

/**
 * Make authenticated API request (without retry)
 */
const apiRequestWithoutRetry = async (endpoint, options = {}) => {
    const token = getAuthToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle unauthorized - clear token
    if (response.status === 401) {
        setAuthToken(null);
        const error = new Error('Session expired. Please login again.');
        error.status = 401;
        throw error;
    }

    const data = await response.json();

    // Handle conflict (409)
    if (response.status === 409) {
        const conflictError = new Error('Conflict detected: This record was modified by another user');
        conflictError.status = 409;
        conflictError.conflictData = data;
        throw conflictError;
    }

    if (!response.ok) {
        const error = new Error(data.error || 'Request failed');
        error.status = response.status;
        throw error;
    }

    return data;
};

/**
 * Make authenticated API request with retry logic
 */
const apiRequest = async (endpoint, options = {}) => {
    try {
        // Wrap with retry logic
        return await withRetry(
            () => apiRequestWithoutRetry(endpoint, options),
            {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                onRetry: (attempt, maxRetries, delay, error) => {
                    console.log(`Retrying API request (${attempt}/${maxRetries})...`, error.message);
                    // Show toast only on first retry
                    if (attempt === 1) {
                        toast.warning(`Connection issue. Retrying...`, 'Retry');
                    }
                }
            }
        );
    } catch (error) {
        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            const offlineError = new Error('Unable to connect to server. Working offline.');
            offlineError.status = 0;
            toast.error('Unable to connect to server', 'Offline Mode');
            throw offlineError;
        }

        // Don't show toast for conflicts (handled separately)
        if (error.status !== 409) {
            // Show error toast for failed requests
            toast.error(error.message, 'Request Failed');
        }

        throw error;
    }
};

/**
 * Auth API methods
 */
export const authAPI = {
    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setAuthToken(data.token);
        return data;
    },

    async register(email, password, name, storeName) {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name, storeName })
        });
        setAuthToken(data.token);
        return data;
    },

    async getCurrentUser() {
        return apiRequest('/auth/me');
    },

    async refreshToken() {
        const data = await apiRequest('/auth/refresh', { method: 'POST' });
        setAuthToken(data.token);
        return data;
    },

    logout() {
        setAuthToken(null);
    }
};

/**
 * Employee API methods
 */
export const employeeAPI = {
    getAll: () => apiRequest('/employees'),
    getById: (id) => apiRequest(`/employees/${id}`),
    create: (data) => apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
    getPerformance: (id) => apiRequest(`/employees/${id}/performance`),
    clock: (pin) => apiRequest('/employees/clock', {
        method: 'POST',
        body: JSON.stringify({ pin })
    }),
    getOnDuty: () => apiRequest('/employees/status/on-duty')
};

/**
 * Shift API methods
 */
export const shiftAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/shifts${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/shifts/${id}`),
    create: (data) => apiRequest('/shifts', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/shifts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/shifts/${id}`, { method: 'DELETE' })
};

/**
 * Product API methods
 */
export const productAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/products/${id}`),
    create: (data) => apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
    updateStock: (id, quantity) => apiRequest(`/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity })
    }),
    // Get stock for specific store
    getStoreStock: (productId, storeId) => apiRequest(`/products/${productId}/stock/${storeId}`),
    // Bulk operations
    bulk: (operations) => apiRequest('/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ operations })
    }),
    bulkDelete: (ids) => apiRequest('/products/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids })
    }),
    // Import/Export
    import: async (formData) => {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/products/import`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: formData // FormData, don't set Content-Type
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Import failed');
        }

        return response.json();
    },
    export: async (format = 'csv') => {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/products/export?format=${format}`, {
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

/**
 * Sales API methods
 */
export const salesAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/sales${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/sales/${id}`),
    getStats: () => apiRequest('/sales/stats'),
    create: (data) => apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    void: (id) => apiRequest(`/sales/${id}/void`, { method: 'POST' })
};

/**
 * Customer API methods
 */
export const customerAPI = {
    getAll: (search = '') => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return apiRequest(`/customers${query}`);
    },
    getById: (id) => apiRequest(`/customers/${id}`),
    getOrders: (id) => apiRequest(`/customers/${id}/orders`),
    getCredits: (id) => apiRequest(`/customers/${id}/credits`),
    create: (data) => apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' })
};

/**
 * Credit API methods
 */
export const creditAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/credits${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/credits/${id}`),
    recordPayment: (id, amount) => apiRequest(`/credits/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify({ amount })
    }),
    update: (id, data) => apiRequest(`/credits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

/**
 * Sync API methods
 */
export const syncAPI = {
    push: (changes) => apiRequest('/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes })
    }),
    pull: (since = null) => {
        const query = since ? `?since=${encodeURIComponent(since)}` : '';
        return apiRequest(`/sync/pull${query}`);
    }
};

/**
 * Audit API methods
 */
export const auditAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/audit${query ? `?${query}` : ''}`);
    },
    getRecent: (limit = 50) => apiRequest(`/audit/recent?limit=${limit}`),
    getEntityHistory: (entityType, entityId) => apiRequest(`/audit/entity/${entityType}/${entityId}`),
    getUserActivity: (userId, startDate, endDate) => {
        const query = new URLSearchParams({ startDate, endDate }).toString();
        return apiRequest(`/audit/user/${userId}?${query}`);
    },
    getCritical: (hours = 24) => apiRequest(`/audit/critical?hours=${hours}`),
    getStats: (startDate, endDate) => {
        const query = new URLSearchParams({ startDate, endDate }).toString();
        return apiRequest(`/audit/stats?${query}`);
    },
    export: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/audit/export${query ? `?${query}` : ''}`);
    }
};

/**
 * Conflict Resolution API methods
 */
export const conflictAPI = {
    resolve: (entityType, entityId, strategy, clientData) => apiRequest('/conflicts/resolve', {
        method: 'POST',
        body: JSON.stringify({ entityType, entityId, strategy, clientData })
    }),
    getState: (entityType, entityId) => apiRequest(`/conflicts/${entityType}/${entityId}`)
};

/**
 * Analytics API methods
 */
export const analyticsAPI = {
    getDashboard: () => apiRequest('/analytics/dashboard'),
    getSalesTrends: (period = 'week', startDate, endDate) => {
        const params = new URLSearchParams({ period });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiRequest(`/analytics/sales/trends?${params}`);
    },
    getTopProducts: (limit = 10, period = 'month') =>
        apiRequest(`/analytics/products/top?limit=${limit}&period=${period}`),
    getCategoryBreakdown: (period = 'month') =>
        apiRequest(`/analytics/categories/breakdown?period=${period}`),
    getTopCustomers: (limit = 10) =>
        apiRequest(`/analytics/customers/top?limit=${limit}`),

    // Advanced analytics (Phase 3.3)
    getInventoryTurnover: (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiRequest(`/analytics/inventory-turnover?${params}`);
    },
    getCustomerSegments: () => apiRequest('/analytics/customer-segments'),
    getEmployeePerformance: (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return apiRequest(`/analytics/employee-performance?${params}`);
    },
    getSalesForecast: (forecastPeriods = 7) =>
        apiRequest(`/analytics/sales-forecast?forecastPeriods=${forecastPeriods}`)
};

/**
 * Store Management API methods
 */
export const storeAPI = {
    getAll: () => apiRequest('/stores'),
    getById: (id) => apiRequest(`/stores/${id}`),
    create: (data) => apiRequest('/stores', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/stores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/stores/${id}`, {
        method: 'DELETE'
    }),
    switch: (storeId) => apiRequest('/stores/switch', {
        method: 'POST',
        body: JSON.stringify({ storeId })
    }),
    getStats: (id) => apiRequest(`/stores/${id}/stats`),
    addManager: (storeId, userId) => apiRequest(`/stores/${storeId}/managers`, {
        method: 'POST',
        body: JSON.stringify({ userId })
    }),
    removeManager: (storeId, userId) => apiRequest(`/stores/${storeId}/managers/${userId}`, {
        method: 'DELETE'
    }),
    // Store comparison
    compare: (params) => {
        const query = new URLSearchParams();
        if (params.storeIds) {
            params.storeIds.forEach(id => query.append('storeIds[]', id));
        }
        if (params.days) query.append('days', params.days);
        return apiRequest(`/stores/compare?${query.toString()}`);
    },
    // Inventory transfer
    transfer: (data) => apiRequest('/stores/transfer', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getTransfers: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/stores/transfers${query ? `?${query}` : ''}`);
    }
};

/**
 * Loyalty Program API methods
 */
export const loyaltyAPI = {
    // Program configuration
    getProgram: () => apiRequest('/loyalty/program'),
    updateProgram: (data) => apiRequest('/loyalty/program', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Customer loyalty
    getCustomerLoyalty: (customerId) => apiRequest(`/loyalty/customer/${customerId}`),
    getAllCustomers: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/loyalty/customers${query ? `?${query}` : ''}`);
    },

    // Transactions
    earnPoints: (customerId, purchaseAmount, saleId) => apiRequest('/loyalty/earn', {
        method: 'POST',
        body: JSON.stringify({ customerId, purchaseAmount, saleId })
    }),
    redeemPoints: (customerId, points, saleId) => apiRequest('/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({ customerId, points, saleId })
    }),
    adjustPoints: (customerId, points, reason) => apiRequest('/loyalty/adjust', {
        method: 'POST',
        body: JSON.stringify({ customerId, points, reason })
    }),
    claimBirthdayReward: (customerId) => apiRequest('/loyalty/birthday', {
        method: 'POST',
        body: JSON.stringify({ customerId })
    }),

    // History & Analytics
    getTransactions: (customerId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/loyalty/transactions/${customerId}${query ? `?${query}` : ''}`);
    },
    getStats: () => apiRequest('/loyalty/stats'),
    getTopCustomers: (limit = 10, sortBy = 'points') => {
        const query = new URLSearchParams({ limit, sortBy }).toString();
        return apiRequest(`/loyalty/top-customers?${query}`);
    }
};

/**
 * Check if API is available
 */
export const checkAPIHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
        return response.ok;
    } catch {
        return false;
    }
};

export { apiRequest, API_BASE_URL };

export default {
    auth: authAPI,
    employees: employeeAPI,
    shifts: shiftAPI,
    products: productAPI,
    sales: salesAPI,
    customers: customerAPI,
    credits: creditAPI,
    sync: syncAPI,
    audit: auditAPI,
    conflicts: conflictAPI,
    analytics: analyticsAPI,
    stores: storeAPI,
    loyalty: loyaltyAPI,
    checkHealth: checkAPIHealth
};
