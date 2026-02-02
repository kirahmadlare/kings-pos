/**
 * @fileoverview Toast Store - Zustand State Management
 *
 * Manages toast notifications state and actions
 */

import { create } from 'zustand';

let toastIdCounter = 0;

export const useToastStore = create((set) => ({
    toasts: [],

    /**
     * Add a new toast notification
     *
     * @param {Object} toast - Toast configuration
     * @param {string} toast.message - Toast message
     * @param {string} toast.type - Toast type (success, error, warning, info)
     * @param {string} toast.title - Optional title
     * @param {number} toast.duration - Duration in ms (default: 5000)
     */
    addToast: (toast) => {
        const id = ++toastIdCounter;
        const newToast = {
            id,
            type: toast.type || 'info',
            message: toast.message,
            title: toast.title,
            duration: toast.duration || 5000
        };

        set((state) => ({
            toasts: [...state.toasts, newToast]
        }));

        return id;
    },

    /**
     * Remove a toast by ID
     */
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter(toast => toast.id !== id)
        }));
    },

    /**
     * Remove all toasts
     */
    clearToasts: () => {
        set({ toasts: [] });
    },

    /**
     * Show success toast
     */
    success: (message, title) => {
        return set((state) => {
            const id = ++toastIdCounter;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'success',
                    message,
                    title,
                    duration: 5000
                }]
            };
        });
    },

    /**
     * Show error toast
     */
    error: (message, title) => {
        return set((state) => {
            const id = ++toastIdCounter;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'error',
                    message,
                    title,
                    duration: 7000 // Errors stay longer
                }]
            };
        });
    },

    /**
     * Show warning toast
     */
    warning: (message, title) => {
        return set((state) => {
            const id = ++toastIdCounter;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'warning',
                    message,
                    title,
                    duration: 6000
                }]
            };
        });
    },

    /**
     * Show info toast
     */
    info: (message, title) => {
        return set((state) => {
            const id = ++toastIdCounter;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'info',
                    message,
                    title,
                    duration: 5000
                }]
            };
        });
    }
}));

/**
 * Helper functions for showing toasts
 * Can be used without hooks
 */
export const toast = {
    success: (message, title) => {
        useToastStore.getState().success(message, title);
    },
    error: (message, title) => {
        useToastStore.getState().error(message, title);
    },
    warning: (message, title) => {
        useToastStore.getState().warning(message, title);
    },
    info: (message, title) => {
        useToastStore.getState().info(message, title);
    }
};

export default useToastStore;
