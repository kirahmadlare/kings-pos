/**
 * @fileoverview Database Configuration - IndexedDB with Dexie
 * 
 * This module sets up the local IndexedDB database for offline-first storage.
 * It includes tables for:
 * - Users and authentication
 * - Stores and settings
 * - Products and categories
 * - Sales and transactions
 * - Customers and order history
 * - Credits (buy now, pay later)
 * - Employees and shifts
 * - Suppliers and purchase orders
 */

import Dexie from 'dexie';

// Create database instance
export const db = new Dexie('KingsPOS');

/**
 * Database Schema Version 5
 * Added: needsSync index to all tables for efficient sync queries
 */
db.version(5).stores({
    // Users table - store employees and owners
    users: '++id, email, role, storeId, serverId, needsSync, createdAt',

    // Stores table - business locations
    stores: '++id, name, ownerId, currency, taxRate, serverId, needsSync, createdAt',

    // Products/Inventory table
    products: '++id, storeId, name, barcode, sku, categoryId, price, costPrice, quantity, lowStockThreshold, serverId, needsSync, createdAt, updatedAt',

    // Categories table
    categories: '++id, storeId, name, color, icon, sortOrder, serverId, needsSync',

    // Sales/Transactions table
    sales: '++id, storeId, userId, customerId, employeeId, shiftId, items, subtotal, discount, tax, total, paymentMethod, paymentStatus, status, serverId, needsSync, createdAt',

    // Customers table
    customers: '++id, storeId, name, phone, email, address, totalOrders, totalSpent, lastOrderDate, serverId, needsSync, createdAt, updatedAt',

    // Credits table
    credits: '++id, storeId, customerId, saleId, amount, amountPaid, dueDate, status, serverId, needsSync, createdAt, paidAt',

    // Employees table
    employees: '++id, storeId, name, email, phone, role, pin, hourlyRate, isActive, serverId, needsSync, createdAt, updatedAt',

    // Shifts table
    shifts: '++id, storeId, employeeId, date, startTime, endTime, status, serverId, needsSync, createdAt',

    // Clock Events table
    clockEvents: '++id, storeId, employeeId, shiftId, clockIn, clockOut, salesCount, salesTotal, itemsSold, serverId, needsSync, createdAt',

    // Suppliers table
    suppliers: '++id, storeId, name, email, phone, address, serverId, needsSync, createdAt',

    // Purchase Orders table
    purchaseOrders: '++id, storeId, supplierId, items, status, total, serverId, needsSync, createdAt, expectedDate',

    // Settings table
    settings: 'key, value',

    // Sessions table (for auth)
    sessions: '++id, userId, token, expiresAt, createdAt',

    // Sync Queue table
    syncQueue: '++id, tableName, action, recordId, data, createdAt, synced'
});

/**
 * Database Schema Version 4
 * Added: syncVersion, lastSyncedAt to all entities for conflict resolution
 *
 * Note: syncVersion and lastSyncedAt are non-indexed fields added to:
 * products, sales, customers, employees, credits, categories, suppliers
 */
db.version(4).stores({
    // Users table - store employees and owners
    users: '++id, email, role, storeId, serverId, createdAt',

    // Stores table - business locations
    stores: '++id, name, ownerId, currency, taxRate, serverId, createdAt',

    // Products/Inventory table
    products: '++id, storeId, name, barcode, sku, categoryId, price, costPrice, quantity, lowStockThreshold, serverId, createdAt, updatedAt',

    // Categories table
    categories: '++id, storeId, name, color, icon, sortOrder, serverId',

    // Sales/Transactions table
    sales: '++id, storeId, userId, customerId, employeeId, shiftId, items, subtotal, discount, tax, total, paymentMethod, paymentStatus, status, serverId, createdAt',

    // Customers table
    customers: '++id, storeId, name, phone, email, address, totalOrders, totalSpent, lastOrderDate, serverId, createdAt, updatedAt',

    // Credits table
    credits: '++id, storeId, customerId, saleId, amount, amountPaid, dueDate, status, serverId, createdAt, paidAt',

    // Employees table
    employees: '++id, storeId, name, email, phone, role, pin, hourlyRate, isActive, serverId, createdAt, updatedAt',

    // Shifts table
    shifts: '++id, storeId, employeeId, date, startTime, endTime, status, serverId, createdAt',

    // Clock Events table
    clockEvents: '++id, storeId, employeeId, shiftId, clockIn, clockOut, salesCount, salesTotal, itemsSold, serverId, createdAt',

    // Suppliers table
    suppliers: '++id, storeId, name, email, phone, address, serverId, createdAt',

    // Purchase Orders table
    purchaseOrders: '++id, storeId, supplierId, items, status, total, serverId, createdAt, expectedDate',

    // Settings table
    settings: 'key, value',

    // Sessions table (for auth)
    sessions: '++id, userId, token, expiresAt, createdAt',

    // Sync Queue table
    syncQueue: '++id, tableName, action, recordId, data, createdAt, synced'
});

/**
 * Database Schema Version 3
 * Added: employees, shifts, clockEvents tables
 */
db.version(3).stores({
    // Users table - store employees and owners
    users: '++id, email, role, storeId, createdAt',

    // Stores table - business locations
    stores: '++id, name, ownerId, currency, taxRate, createdAt',

    // Products/Inventory table
    products: '++id, storeId, name, barcode, sku, categoryId, price, costPrice, quantity, lowStockThreshold, imageUrl, discountPercent, discountStart, discountEnd, isActive, createdAt, updatedAt',

    // Categories table
    categories: '++id, storeId, name, color, icon, sortOrder',

    // Sales/Transactions table - now includes employeeId for tracking
    sales: '++id, storeId, userId, customerId, employeeId, shiftId, items, subtotal, discount, tax, total, paymentMethod, paymentStatus, creditId, status, createdAt',

    // Customers table
    customers: '++id, storeId, name, phone, email, address, totalOrders, totalSpent, lastOrderDate, notes, createdAt, updatedAt',

    // Credits table - buy now pay later tracking
    credits: '++id, storeId, customerId, saleId, amount, amountPaid, dueDate, status, notes, createdAt, paidAt',

    // Employees table - staff members
    employees: '++id, storeId, name, email, phone, role, pin, hourlyRate, isActive, createdAt, updatedAt',

    // Shifts table - scheduled work periods
    shifts: '++id, storeId, employeeId, date, startTime, endTime, status, notes, createdAt',

    // Clock Events table - actual clock in/out times with shift summary
    clockEvents: '++id, storeId, employeeId, shiftId, clockIn, clockOut, salesCount, salesTotal, itemsSold, notes, createdAt',

    // Suppliers table
    suppliers: '++id, storeId, name, email, phone, address, createdAt',

    // Purchase Orders table
    purchaseOrders: '++id, storeId, supplierId, items, status, total, notes, createdAt, expectedDate',

    // Settings table
    settings: 'key, value',

    // Sessions table (for auth)
    sessions: '++id, userId, token, expiresAt, createdAt',

    // Sync Queue table - for offline changes
    syncQueue: '++id, tableName, action, recordId, data, createdAt, synced'
});

// Migration from version 2
db.version(2).stores({
    users: '++id, email, role, storeId, createdAt',
    stores: '++id, name, ownerId, currency, taxRate, createdAt',
    products: '++id, storeId, name, barcode, sku, categoryId, price, costPrice, quantity, lowStockThreshold, imageUrl, discountPercent, discountStart, discountEnd, isActive, createdAt, updatedAt',
    categories: '++id, storeId, name, color, icon, sortOrder',
    sales: '++id, storeId, userId, customerId, items, subtotal, discount, tax, total, paymentMethod, paymentStatus, creditId, status, createdAt',
    customers: '++id, storeId, name, phone, email, address, totalOrders, totalSpent, lastOrderDate, notes, createdAt, updatedAt',
    credits: '++id, storeId, customerId, saleId, amount, amountPaid, dueDate, status, notes, createdAt, paidAt',
    suppliers: '++id, storeId, name, email, phone, address, createdAt',
    purchaseOrders: '++id, storeId, supplierId, items, status, total, notes, createdAt, expectedDate',
    settings: 'key, value',
    sessions: '++id, userId, token, expiresAt, createdAt'
});

// Migration from version 1
db.version(1).stores({
    users: '++id, email, role, storeId, createdAt',
    stores: '++id, name, ownerId, currency, taxRate, createdAt',
    products: '++id, storeId, name, barcode, sku, categoryId, price, costPrice, quantity, lowStockThreshold, imageUrl, discountPercent, discountStart, discountEnd, isActive, createdAt, updatedAt',
    categories: '++id, storeId, name, color, icon, sortOrder',
    sales: '++id, storeId, userId, items, subtotal, discount, tax, total, paymentMethod, status, customerId, createdAt',
    suppliers: '++id, storeId, name, email, phone, address, createdAt',
    purchaseOrders: '++id, storeId, supplierId, items, status, total, notes, createdAt, expectedDate',
    settings: 'key, value',
    sessions: '++id, userId, token, expiresAt, createdAt'
});

/**
 * Database helper functions
 */
export const dbHelpers = {
    /**
     * Clear all data (for logout/reset)
     */
    async clearAll() {
        await db.users.clear();
        await db.stores.clear();
        await db.products.clear();
        await db.categories.clear();
        await db.sales.clear();
        await db.customers.clear();
        await db.credits.clear();
        await db.employees.clear();
        await db.shifts.clear();
        await db.clockEvents.clear();
        await db.suppliers.clear();
        await db.purchaseOrders.clear();
        await db.settings.clear();
        await db.sessions.clear();
        await db.syncQueue.clear();
    },

    /**
     * Export all data (for backup)
     */
    async exportData() {
        return {
            users: await db.users.toArray(),
            stores: await db.stores.toArray(),
            products: await db.products.toArray(),
            categories: await db.categories.toArray(),
            sales: await db.sales.toArray(),
            customers: await db.customers.toArray(),
            credits: await db.credits.toArray(),
            employees: await db.employees.toArray(),
            shifts: await db.shifts.toArray(),
            clockEvents: await db.clockEvents.toArray(),
            suppliers: await db.suppliers.toArray(),
            purchaseOrders: await db.purchaseOrders.toArray(),
            settings: await db.settings.toArray()
        };
    },

    /**
     * Import data (for restore)
     */
    async importData(data) {
        if (data.users) await db.users.bulkPut(data.users);
        if (data.stores) await db.stores.bulkPut(data.stores);
        if (data.products) await db.products.bulkPut(data.products);
        if (data.categories) await db.categories.bulkPut(data.categories);
        if (data.sales) await db.sales.bulkPut(data.sales);
        if (data.customers) await db.customers.bulkPut(data.customers);
        if (data.credits) await db.credits.bulkPut(data.credits);
        if (data.employees) await db.employees.bulkPut(data.employees);
        if (data.shifts) await db.shifts.bulkPut(data.shifts);
        if (data.clockEvents) await db.clockEvents.bulkPut(data.clockEvents);
        if (data.suppliers) await db.suppliers.bulkPut(data.suppliers);
        if (data.purchaseOrders) await db.purchaseOrders.bulkPut(data.purchaseOrders);
        if (data.settings) await db.settings.bulkPut(data.settings);
    },

    /**
     * Get credits that are due soon (within X days) or overdue
     */
    async getDueCredits(storeId, daysAhead = 7) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const credits = await db.credits
            .where('storeId')
            .equals(storeId)
            .filter(credit =>
                credit.status !== 'paid' &&
                new Date(credit.dueDate) <= futureDate
            )
            .toArray();

        return credits;
    },

    /**
     * Get customer order history
     */
    async getCustomerOrders(customerId) {
        return await db.sales
            .where('customerId')
            .equals(customerId)
            .reverse()
            .sortBy('createdAt');
    },

    /**
     * Get current active shift for an employee
     */
    async getActiveClockEvent(storeId, employeeId) {
        const events = await db.clockEvents
            .where('storeId')
            .equals(storeId)
            .filter(e => e.employeeId === employeeId && !e.clockOut)
            .toArray();
        return events[0] || null;
    },

    /**
     * Get all currently clocked-in employees
     */
    async getClockedInEmployees(storeId) {
        const events = await db.clockEvents
            .where('storeId')
            .equals(storeId)
            .filter(e => !e.clockOut)
            .toArray();

        // Get employee details
        const employeeIds = events.map(e => e.employeeId);
        const employees = await Promise.all(
            employeeIds.map(id => db.employees.get(id))
        );

        return employees.filter(Boolean).map((emp, i) => ({
            ...emp,
            clockEvent: events[i]
        }));
    },

    /**
     * Calculate shift summary when clocking out
     */
    async calculateShiftSummary(storeId, employeeId, clockIn, clockOut) {
        const sales = await db.sales
            .where('storeId')
            .equals(storeId)
            .filter(s =>
                s.employeeId === employeeId &&
                new Date(s.createdAt) >= new Date(clockIn) &&
                new Date(s.createdAt) <= new Date(clockOut)
            )
            .toArray();

        return {
            salesCount: sales.length,
            salesTotal: sales.reduce((sum, s) => sum + (s.total || 0), 0),
            itemsSold: sales.reduce((sum, s) => sum + (s.items?.length || 0), 0)
        };
    }
};

export default db;
