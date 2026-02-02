import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// App settings store
export const useSettingsStore = create(
    persist(
        (set) => ({
            // Theme settings
            theme: 'auto', // 'auto', 'light', 'dark'

            // UI settings
            sidebarCollapsed: false,
            compactMode: false,

            // POS settings
            showProductImages: true,
            quickAddMode: true,
            soundEffects: true,

            // Receipt settings
            printAutomatically: false,
            emailReceipt: false,

            // Display settings
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',

            // Actions
            setTheme: (theme) => {
                set({ theme });
                // Apply theme to document
                if (theme === 'auto') {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', theme);
                }
            },

            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),

            updateSettings: (updates) => set(updates),

            // Initialize theme on app load
            initializeTheme: () => {
                const { theme } = useSettingsStore.getState();
                if (theme !== 'auto') {
                    document.documentElement.setAttribute('data-theme', theme);
                }
            }
        }),
        {
            name: 'retailpos-settings'
        }
    )
);

export default useSettingsStore;
