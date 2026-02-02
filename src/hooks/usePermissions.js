/**
 * @fileoverview Permissions Hook
 * 
 * Provides permission checking for the current user/employee.
 * Returns permission flags for each module and CRUD operation.
 */

import { useAuthStore } from '../stores/authStore';
import { useEmployeeSession } from '../stores/employeeSessionStore';

/**
 * Default permission structures by role
 */
const DEFAULT_PERMISSIONS = {
    owner: {
        dashboard: { read: true, create: true, update: true, delete: true },
        inventory: { read: true, create: true, update: true, delete: true },
        pos: { read: true, create: true, update: true, delete: true },
        customers: { read: true, create: true, update: true, delete: true },
        orders: { read: true, create: true, update: true, delete: true },
        employees: { read: true, create: true, update: true, delete: true },
        shifts: { read: true, create: true, update: true, delete: true },
        reports: { read: true, create: true, update: true, delete: true },
        settings: { read: true, create: true, update: true, delete: true },
        permissions: { read: true, create: true, update: true, delete: true }
    },
    manager: {
        dashboard: { read: true },
        inventory: { read: true, create: true, update: true, delete: true },
        pos: { read: true, create: true },
        customers: { read: true, create: true, update: true, delete: false },
        orders: { read: true, update: true },
        employees: { read: true, create: false, update: false, delete: false },
        shifts: { read: true, create: true, update: true, delete: false },
        reports: { read: true },
        settings: { read: true },
        permissions: { read: false }
    },
    cashier: {
        dashboard: { read: true },
        inventory: { read: true },
        pos: { read: true, create: true },
        customers: { read: true, create: true },
        orders: { read: true },
        employees: { read: false },
        shifts: { read: true, create: true, update: true },
        reports: { read: false },
        settings: { read: false },
        permissions: { read: false }
    },
    staff: {
        dashboard: { read: true },
        inventory: { read: true },
        pos: { read: true, create: true },
        customers: { read: true },
        orders: { read: true },
        employees: { read: false },
        shifts: { read: true, create: true },
        reports: { read: false },
        settings: { read: false },
        permissions: { read: false }
    }
};

/**
 * Hook to check permissions for a specific module
 * 
 * @param {string} module - The module to check permissions for
 * @returns {Object} Permission flags for the module
 */
export function usePermissions(module) {
    const { user } = useAuthStore();
    const { currentEmployee } = useEmployeeSession();

    // Determine which user/employee to check
    const activeUser = currentEmployee || user;

    // Owners always have full access
    if (user?.role === 'owner' || activeUser?.role === 'owner') {
        return {
            canAccess: true,
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            isOwner: true
        };
    }

    // Get role-based permissions
    const role = activeUser?.role || 'staff';
    const rolePermissions = activeUser?.permissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
    const modulePermissions = rolePermissions[module] || {};

    return {
        canAccess: modulePermissions.read || false,
        canRead: modulePermissions.read || false,
        canCreate: modulePermissions.create || false,
        canUpdate: modulePermissions.update || false,
        canDelete: modulePermissions.delete || false,
        isOwner: false
    };
}

/**
 * Get all permissions for the current user
 */
export function useAllPermissions() {
    const { user } = useAuthStore();
    const { currentEmployee } = useEmployeeSession();

    const activeUser = currentEmployee || user;

    if (user?.role === 'owner' || activeUser?.role === 'owner') {
        return DEFAULT_PERMISSIONS.owner;
    }

    const role = activeUser?.role || 'staff';
    return activeUser?.permissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
}

/**
 * Check if user can access a specific module
 */
export function useCanAccess(module) {
    const permissions = usePermissions(module);
    return permissions.canAccess;
}

export default usePermissions;
