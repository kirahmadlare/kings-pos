/**
 * @fileoverview Authentication Store - Zustand State Management
 * 
 * This store manages all authentication-related state and operations:
 * - User registration with store creation (via Backend API)
 * - Login with email/password (via Backend API)
 * - OTP verification (email and TOTP/Google Authenticator)
 * - Session persistence using localStorage
 * - Role-based access control (admin, owner, manager, cashier)
 * - Offline fallback to IndexedDB when API unavailable
 * 
 * @requires zustand for state management
 * @requires ../db for IndexedDB operations
 * @requires ../services/api for backend API calls
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import db from '../db';
import { authAPI, setAuthToken, checkAPIHealth, syncAPI } from '../services/api';
import socketManager from '../services/socket';

/**
 * Hash a password using SHA-256 (for offline mode)
 */
const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Generate a 6-digit OTP code.
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Auth Store - Main authentication state management
 */
export const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,
            store: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            pendingOTP: null,
            pending2FA: null, // For 2FA authentication
            isOnline: true, // Track online/offline status
            lastSync: null, // Last sync timestamp

            /**
             * Check if API is available
             */
            checkConnection: async () => {
                const online = await checkAPIHealth();
                set({ isOnline: online });
                return online;
            },

            /**
             * Register a new user and create their store.
             * First tries API, falls back to offline mode if unavailable.
             */
            register: async (userData) => {
                set({ isLoading: true, error: null });

                try {
                    // Try API registration first
                    const isOnline = await checkAPIHealth();

                    if (isOnline) {
                        // Use backend API
                        const response = await authAPI.register(
                            userData.email,
                            userData.password,
                            userData.name,
                            userData.storeName
                        );

                        // Also save to IndexedDB for offline access
                        const localStoreId = await db.stores.add({
                            serverId: response.store._id,
                            name: response.store.name,
                            currency: userData.currency || 'USD',
                            taxRate: userData.taxRate || 0,
                            businessType: userData.businessType || 'retail',
                            createdAt: new Date().toISOString()
                        });

                        const localUserId = await db.users.add({
                            serverId: response.user._id,
                            email: response.user.email,
                            name: response.user.name,
                            role: response.user.role,
                            storeId: localStoreId,
                            createdAt: new Date().toISOString()
                        });

                        // Create default categories
                        const defaultCategories = [
                            { name: 'Food', color: '#ef4444', icon: 'utensils', sortOrder: 0 },
                            { name: 'Beverages', color: '#3b82f6', icon: 'coffee', sortOrder: 1 },
                            { name: 'Electronics', color: '#8b5cf6', icon: 'smartphone', sortOrder: 2 },
                            { name: 'Clothing', color: '#ec4899', icon: 'shirt', sortOrder: 3 },
                            { name: 'Other', color: '#6b7280', icon: 'package', sortOrder: 4 }
                        ];

                        for (const cat of defaultCategories) {
                            await db.categories.add({ ...cat, storeId: localStoreId });
                        }

                        const localUser = await db.users.get(localUserId);
                        const localStore = await db.stores.get(localStoreId);

                        set({
                            user: { ...localUser, serverId: response.user._id },
                            store: { ...localStore, serverId: response.store._id },
                            isAuthenticated: true,
                            isOnline: true,
                            isLoading: false
                        });

                        return { success: true, online: true };
                    }

                    // Offline fallback - save to IndexedDB only
                    const existingUser = await db.users
                        .where('email')
                        .equals(userData.email.toLowerCase())
                        .first();

                    if (existingUser) {
                        throw new Error('Email already registered');
                    }

                    const passwordHash = await hashPassword(userData.password);

                    const storeId = await db.stores.add({
                        name: userData.storeName,
                        currency: userData.currency || 'USD',
                        taxRate: userData.taxRate || 0,
                        businessType: userData.businessType || 'retail',
                        address: userData.storeAddress || '',
                        phone: userData.storePhone || '',
                        createdAt: new Date().toISOString(),
                        needsSync: true // Mark for later sync
                    });

                    const userId = await db.users.add({
                        email: userData.email.toLowerCase(),
                        name: userData.name,
                        passwordHash,
                        role: 'owner',
                        storeId,
                        createdAt: new Date().toISOString(),
                        needsSync: true
                    });

                    const defaultCategories = [
                        { name: 'Food', color: '#ef4444', icon: 'utensils', sortOrder: 0 },
                        { name: 'Beverages', color: '#3b82f6', icon: 'coffee', sortOrder: 1 },
                        { name: 'Electronics', color: '#8b5cf6', icon: 'smartphone', sortOrder: 2 },
                        { name: 'Clothing', color: '#ec4899', icon: 'shirt', sortOrder: 3 },
                        { name: 'Other', color: '#6b7280', icon: 'package', sortOrder: 4 }
                    ];

                    for (const cat of defaultCategories) {
                        await db.categories.add({ ...cat, storeId });
                    }

                    const user = await db.users.get(userId);
                    const store = await db.stores.get(storeId);

                    set({
                        user: { ...user, passwordHash: undefined },
                        store,
                        isAuthenticated: true,
                        isOnline: false,
                        isLoading: false
                    });

                    return { success: true, online: false };
                } catch (error) {
                    set({ error: error.message, isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Login with email and password.
             * Uses API when online, falls back to IndexedDB when offline.
             */
            login: async (email, password) => {
                set({ isLoading: true, error: null });

                try {
                    const isOnline = await checkAPIHealth();

                    if (isOnline) {
                        // Use backend API
                        const response = await authAPI.login(email, password);

                        // Check if 2FA is required
                        if (response.requires2FA) {
                            set({
                                isLoading: false,
                                pending2FA: {
                                    userId: response.userId,
                                    email: response.email
                                }
                            });
                            return { success: false, requires2FA: true };
                        }

                        // Update local IndexedDB
                        let localUser = await db.users
                            .where('email')
                            .equals(email.toLowerCase())
                            .first();

                        let localStore;

                        if (!localUser) {
                            // First login on this device - create local records
                            const storeId = await db.stores.add({
                                serverId: response.store._id,
                                name: response.store.name,
                                currency: response.store.currency || 'USD',
                                taxRate: response.store.taxRate || 0,
                                createdAt: response.store.createdAt
                            });

                            const userId = await db.users.add({
                                serverId: response.user._id,
                                email: response.user.email,
                                name: response.user.name,
                                role: response.user.role,
                                storeId,
                                createdAt: response.user.createdAt
                            });

                            localUser = await db.users.get(userId);
                            localStore = await db.stores.get(storeId);
                        } else {
                            localStore = await db.stores.get(localUser.storeId);
                        }

                        // Skip OTP for API login (API already authenticated)
                        set({
                            user: { ...localUser, serverId: response.user._id },
                            store: { ...localStore, serverId: response.store._id },
                            isAuthenticated: true,
                            isOnline: true,
                            isLoading: false,
                            pendingOTP: null
                        });

                        // Connect to Socket.io for real-time sync
                        const token = localStorage.getItem('auth_token');
                        if (token) {
                            try {
                                socketManager.connect(token);
                            } catch (error) {
                                console.warn('Socket connection failed:', error);
                                // Don't fail login if socket connection fails
                            }
                        }

                        // Sync data from server
                        get().syncFromServer();

                        return { success: true, requiresOTP: false };
                    }

                    // Offline fallback
                    const user = await db.users
                        .where('email')
                        .equals(email.toLowerCase())
                        .first();

                    if (!user) {
                        throw new Error('Invalid email or password');
                    }

                    const passwordHash = await hashPassword(password);
                    if (user.passwordHash !== passwordHash) {
                        throw new Error('Invalid email or password');
                    }

                    // Generate OTP for offline mode
                    const otp = generateOTP();
                    // Only log OTP in development mode
                    if (import.meta.env.DEV) {
                        console.log(`[OFFLINE MODE] Email OTP for ${email}: ${otp}`);
                    }

                    set({
                        pendingOTP: { userId: user.id, otp, type: 'email', email },
                        isOnline: false,
                        isLoading: false
                    });

                    return { success: true, requiresOTP: true, otpType: 'email', offline: true };
                } catch (error) {
                    set({ error: error.message, isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Verify OTP code and complete login (offline mode only)
             */
            verifyOTP: async (code) => {
                set({ isLoading: true, error: null });

                try {
                    const { pendingOTP } = get();

                    if (!pendingOTP) {
                        throw new Error('No pending verification');
                    }

                    if (pendingOTP.type === 'email') {
                        if (code !== pendingOTP.otp) {
                            throw new Error('Invalid verification code');
                        }
                    }

                    if (pendingOTP.type === 'totp') {
                        // Allow test code 000000 only in development
                        const isValidCode = code === pendingOTP.otp || (import.meta.env.DEV && code === '000000');
                        if (!isValidCode) {
                            throw new Error('Invalid authenticator code');
                        }
                    }

                    const user = await db.users.get(pendingOTP.userId);
                    const store = await db.stores.get(user.storeId);

                    set({
                        user: { ...user, passwordHash: undefined },
                        store,
                        isAuthenticated: true,
                        pendingOTP: null,
                        isLoading: false
                    });

                    return { success: true };
                } catch (error) {
                    set({ error: error.message, isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Skip OTP verification (for development only)
             */
            skipOTP: async () => {
                // Only allow in development mode
                if (!import.meta.env.DEV) {
                    console.warn('skipOTP is only available in development mode');
                    return { success: false, error: 'Not available in production' };
                }

                const { pendingOTP } = get();
                if (!pendingOTP) return { success: false };

                const user = await db.users.get(pendingOTP.userId);
                const store = await db.stores.get(user.storeId);

                set({
                    user: { ...user, passwordHash: undefined },
                    store,
                    isAuthenticated: true,
                    pendingOTP: null
                });

                return { success: true };
            },

            /**
             * Complete 2FA verification and login
             */
            complete2FALogin: async (response) => {
                set({ isLoading: true, error: null });

                try {
                    // Update local IndexedDB
                    let localUser = await db.users
                        .where('email')
                        .equals(response.user.email.toLowerCase())
                        .first();

                    let localStore;

                    if (!localUser) {
                        // First login on this device - create local records
                        const storeId = await db.stores.add({
                            serverId: response.store._id,
                            name: response.store.name,
                            currency: response.store.currency || 'USD',
                            taxRate: response.store.taxRate || 0,
                            createdAt: response.store.createdAt
                        });

                        const userId = await db.users.add({
                            serverId: response.user._id,
                            email: response.user.email,
                            name: response.user.name,
                            role: response.user.role,
                            storeId,
                            createdAt: response.user.createdAt
                        });

                        localUser = await db.users.get(userId);
                        localStore = await db.stores.get(storeId);
                    } else {
                        localStore = await db.stores.get(localUser.storeId);
                    }

                    set({
                        user: { ...localUser, serverId: response.user._id },
                        store: { ...localStore, serverId: response.store._id },
                        isAuthenticated: true,
                        isOnline: true,
                        isLoading: false,
                        pending2FA: null
                    });

                    // Connect to Socket.io for real-time sync
                    const token = response.token || localStorage.getItem('auth_token');
                    if (token) {
                        try {
                            socketManager.connect(token);
                        } catch (error) {
                            console.warn('Socket connection failed:', error);
                        }
                    }

                    // Sync data from server
                    get().syncFromServer();

                    return { success: true };
                } catch (error) {
                    set({ error: error.message, isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Sync data from server to local IndexedDB
             */
            syncFromServer: async () => {
                try {
                    const { lastSync } = get();
                    const data = await syncAPI.pull(lastSync);

                    // Import data to IndexedDB
                    if (data.products?.length) {
                        for (const item of data.products) {
                            const existing = await db.products.where('serverId').equals(item._id).first();
                            if (existing) {
                                await db.products.update(existing.id, { ...item, serverId: item._id });
                            } else {
                                await db.products.add({ ...item, serverId: item._id, storeId: get().store?.id });
                            }
                        }
                    }

                    if (data.categories?.length) {
                        for (const item of data.categories) {
                            const existing = await db.categories.where('serverId').equals(item._id).first();
                            if (existing) {
                                await db.categories.update(existing.id, { ...item, serverId: item._id });
                            } else {
                                await db.categories.add({ ...item, serverId: item._id, storeId: get().store?.id });
                            }
                        }
                    }

                    if (data.customers?.length) {
                        for (const item of data.customers) {
                            const existing = await db.customers.where('serverId').equals(item._id).first();
                            if (existing) {
                                await db.customers.update(existing.id, { ...item, serverId: item._id });
                            } else {
                                await db.customers.add({ ...item, serverId: item._id, storeId: get().store?.id });
                            }
                        }
                    }

                    if (data.employees?.length) {
                        for (const item of data.employees) {
                            const existing = await db.employees.where('serverId').equals(item._id).first();
                            if (existing) {
                                await db.employees.update(existing.id, { ...item, serverId: item._id });
                            } else {
                                await db.employees.add({ ...item, serverId: item._id, storeId: get().store?.id });
                            }
                        }
                    }

                    set({ lastSync: data.syncedAt });
                    console.log('✅ Synced data from server');
                    return { success: true };
                } catch (error) {
                    console.error('Sync from server failed:', error);
                    return { success: false, error: error.message };
                }
            },

            /**
             * Logout current user and clear session.
             */
            logout: () => {
                // Disconnect socket
                socketManager.disconnect();

                setAuthToken(null); // Clear API token
                set({
                    user: null,
                    store: null,
                    isAuthenticated: false,
                    pendingOTP: null,
                    error: null,
                    lastSync: null
                });
            },

            /**
             * Update store settings.
             */
            updateStore: async (updates) => {
                const { store } = get();
                if (!store) return { success: false };

                await db.stores.update(store.id, updates);
                const updatedStore = await db.stores.get(store.id);

                set({ store: updatedStore });
                return { success: true };
            },

            /**
             * Clear the current error message.
             */
            clearError: () => set({ error: null })
        }),
        {
            name: 'retailpos-auth',
            partialize: (state) => ({
                user: state.user,
                store: state.store,
                isAuthenticated: state.isAuthenticated,
                lastSync: state.lastSync
            })
        }
    )
);

export default useAuthStore;
