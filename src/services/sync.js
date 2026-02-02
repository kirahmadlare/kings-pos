/**
 * @fileoverview Sync Service
 * 
 * Handles bidirectional data synchronization between IndexedDB and MongoDB.
 * Provides automatic sync when online, queues changes when offline.
 */

import db from '../db';
import {
    productAPI, customerAPI, employeeAPI, shiftAPI,
    salesAPI, creditAPI, syncAPI, checkAPIHealth
} from './api';

/**
 * Check if we're online and API is available
 */
export const isOnline = async () => {
    return await checkAPIHealth();
};

/**
 * Sync all data from server to local IndexedDB
 */
export const syncFromServer = async (storeId) => {
    try {
        const online = await isOnline();
        if (!online) {
            console.log('📴 Offline - skipping sync from server');
            return { success: false, reason: 'offline' };
        }

        console.log('🔄 Syncing data from server...');
        const data = await syncAPI.pull();

        // Sync products
        if (data.products?.length) {
            for (const item of data.products) {
                await upsertLocal('products', item, storeId);
            }
            console.log(`  ✓ Synced ${data.products.length} products`);
        }

        // Sync categories
        if (data.categories?.length) {
            for (const item of data.categories) {
                await upsertLocal('categories', item, storeId);
            }
            console.log(`  ✓ Synced ${data.categories.length} categories`);
        }

        // Sync customers
        if (data.customers?.length) {
            for (const item of data.customers) {
                await upsertLocal('customers', item, storeId);
            }
            console.log(`  ✓ Synced ${data.customers.length} customers`);
        }

        // Sync employees
        if (data.employees?.length) {
            for (const item of data.employees) {
                await upsertLocal('employees', item, storeId);
            }
            console.log(`  ✓ Synced ${data.employees.length} employees`);
        }

        // Sync shifts
        if (data.shifts?.length) {
            for (const item of data.shifts) {
                await upsertLocal('shifts', item, storeId);
            }
            console.log(`  ✓ Synced ${data.shifts.length} shifts`);
        }

        // Sync sales (limited)
        if (data.sales?.length) {
            for (const item of data.sales) {
                await upsertLocal('sales', item, storeId);
            }
            console.log(`  ✓ Synced ${data.sales.length} sales`);
        }

        // Sync credits
        if (data.credits?.length) {
            for (const item of data.credits) {
                await upsertLocal('credits', item, storeId);
            }
            console.log(`  ✓ Synced ${data.credits.length} credits`);
        }

        // Sync clock events
        if (data.clockEvents?.length) {
            for (const item of data.clockEvents) {
                await upsertLocal('clockEvents', item, storeId);
            }
            console.log(`  ✓ Synced ${data.clockEvents.length} clock events`);
        }

        console.log('✅ Sync from server complete');
        return { success: true, syncedAt: data.syncedAt };
    } catch (error) {
        console.error('❌ Sync from server failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Upsert a record to local IndexedDB
 */
const upsertLocal = async (table, serverItem, storeId) => {
    const serverId = serverItem._id;
    const existing = await db[table].where('serverId').equals(serverId).first();

    const localData = {
        ...serverItem,
        serverId,
        storeId,
        _id: undefined // Remove MongoDB _id
    };
    delete localData._id;

    if (existing) {
        await db[table].update(existing.id, localData);
    } else {
        await db[table].add(localData);
    }
};

/**
 * Product sync operations
 */
export const productSync = {
    async create(productData, storeId) {
        // Save locally first
        const localId = await db.products.add({
            ...productData,
            storeId,
            createdAt: new Date().toISOString(),
            needsSync: true
        });

        // Try to sync to server
        const online = await isOnline();
        if (online) {
            try {
                const serverProduct = await productAPI.create(productData);
                await db.products.update(localId, {
                    serverId: serverProduct._id,
                    needsSync: false
                });
                return { id: localId, serverId: serverProduct._id, synced: true };
            } catch (error) {
                console.error('Failed to sync product to server:', error);
            }
        }

        return { id: localId, synced: false };
    },

    async update(localId, updates) {
        const product = await db.products.get(localId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Update locally with sync flag
        await db.products.update(localId, {
            ...updates,
            needsSync: true,
            updatedAt: new Date().toISOString()
        });

        const online = await isOnline();
        if (online && product?.serverId) {
            try {
                await productAPI.update(product.serverId, updates);
                await db.products.update(localId, { needsSync: false });
                console.log(`✓ Product ${product.name} synced to server`);
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync product update:', error);
            }
        }

        return { synced: false };
    },

    async updateStock(localId, quantityChange, reason = 'sale') {
        const product = await db.products.get(localId);
        if (!product) {
            throw new Error('Product not found');
        }

        const newQuantity = Math.max(0, product.quantity + quantityChange);

        // Update locally with sync flag
        await db.products.update(localId, {
            quantity: newQuantity,
            updatedAt: new Date().toISOString(),
            needsSync: true
        });

        console.log(`📦 Stock updated: ${product.name} (${product.quantity} → ${newQuantity})`);

        const online = await isOnline();
        if (online && product?.serverId) {
            try {
                // Use the updateStock API endpoint for atomic server-side update
                await productAPI.updateStock(product.serverId, newQuantity);
                await db.products.update(localId, { needsSync: false });
                console.log(`✓ Stock sync complete for ${product.name}`);
                return { synced: true, newQuantity };
            } catch (error) {
                console.error(`Failed to sync stock update for ${product.name}:`, error);
            }
        }

        return { synced: false, newQuantity };
    },

    async delete(localId) {
        const product = await db.products.get(localId);
        await db.products.delete(localId);

        const online = await isOnline();
        if (online && product?.serverId) {
            try {
                await productAPI.delete(product.serverId);
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync product delete:', error);
            }
        }

        return { synced: false };
    }
};

/**
 * Customer sync operations
 */
export const customerSync = {
    async create(customerData, storeId) {
        const localId = await db.customers.add({
            ...customerData,
            storeId,
            createdAt: new Date().toISOString(),
            needsSync: true
        });

        const online = await isOnline();
        if (online) {
            try {
                const serverCustomer = await customerAPI.create(customerData);
                await db.customers.update(localId, {
                    serverId: serverCustomer._id,
                    needsSync: false
                });
                return { id: localId, serverId: serverCustomer._id, synced: true };
            } catch (error) {
                console.error('Failed to sync customer to server:', error);
            }
        }

        return { id: localId, synced: false };
    },

    async update(localId, updates) {
        const customer = await db.customers.get(localId);
        await db.customers.update(localId, { ...updates, needsSync: true });

        const online = await isOnline();
        if (online && customer?.serverId) {
            try {
                await customerAPI.update(customer.serverId, updates);
                await db.customers.update(localId, { needsSync: false });
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync customer update:', error);
            }
        }

        return { synced: false };
    },

    async delete(localId) {
        const customer = await db.customers.get(localId);
        await db.customers.delete(localId);

        const online = await isOnline();
        if (online && customer?.serverId) {
            try {
                await customerAPI.delete(customer.serverId);
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync customer delete:', error);
            }
        }

        return { synced: false };
    }
};

/**
 * Employee sync operations
 */
export const employeeSync = {
    async create(employeeData, storeId) {
        const localId = await db.employees.add({
            ...employeeData,
            storeId,
            createdAt: new Date().toISOString(),
            needsSync: true
        });

        const online = await isOnline();
        if (online) {
            try {
                const serverEmployee = await employeeAPI.create(employeeData);
                await db.employees.update(localId, {
                    serverId: serverEmployee._id,
                    needsSync: false
                });
                return { id: localId, serverId: serverEmployee._id, synced: true };
            } catch (error) {
                console.error('Failed to sync employee to server:', error);
            }
        }

        return { id: localId, synced: false };
    },

    async update(localId, updates) {
        const employee = await db.employees.get(localId);
        await db.employees.update(localId, { ...updates, needsSync: true });

        const online = await isOnline();
        if (online && employee?.serverId) {
            try {
                await employeeAPI.update(employee.serverId, updates);
                await db.employees.update(localId, { needsSync: false });
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync employee update:', error);
            }
        }

        return { synced: false };
    },

    async delete(localId) {
        const employee = await db.employees.get(localId);
        await db.employees.delete(localId);

        const online = await isOnline();
        if (online && employee?.serverId) {
            try {
                await employeeAPI.delete(employee.serverId);
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync employee delete:', error);
            }
        }

        return { synced: false };
    }
};

/**
 * Shift sync operations
 */
export const shiftSync = {
    async create(shiftData, storeId) {
        const localId = await db.shifts.add({
            ...shiftData,
            storeId,
            createdAt: new Date().toISOString(),
            needsSync: true
        });

        const online = await isOnline();
        if (online) {
            try {
                const serverShift = await shiftAPI.create(shiftData);
                await db.shifts.update(localId, {
                    serverId: serverShift._id,
                    needsSync: false
                });
                return { id: localId, serverId: serverShift._id, synced: true };
            } catch (error) {
                console.error('Failed to sync shift to server:', error);
            }
        }

        return { id: localId, synced: false };
    },

    async update(localId, updates) {
        const shift = await db.shifts.get(localId);
        await db.shifts.update(localId, { ...updates, needsSync: true });

        const online = await isOnline();
        if (online && shift?.serverId) {
            try {
                await shiftAPI.update(shift.serverId, updates);
                await db.shifts.update(localId, { needsSync: false });
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync shift update:', error);
            }
        }

        return { synced: false };
    },

    async delete(localId) {
        const shift = await db.shifts.get(localId);
        await db.shifts.delete(localId);

        const online = await isOnline();
        if (online && shift?.serverId) {
            try {
                await shiftAPI.delete(shift.serverId);
                return { synced: true };
            } catch (error) {
                console.error('Failed to sync shift delete:', error);
            }
        }

        return { synced: false };
    }
};

/**
 * Sales sync operations
 */
export const salesSync = {
    async create(saleData, storeId) {
        const localId = await db.sales.add({
            ...saleData,
            storeId,
            createdAt: new Date().toISOString(),
            needsSync: true
        });

        const online = await isOnline();
        if (online) {
            try {
                const serverSale = await salesAPI.create(saleData);
                await db.sales.update(localId, {
                    serverId: serverSale._id,
                    needsSync: false
                });
                return { id: localId, serverId: serverSale._id, synced: true };
            } catch (error) {
                console.error('Failed to sync sale to server:', error);
            }
        }

        return { id: localId, synced: false };
    }
};

/**
 * Sync all pending local changes to server
 */
export const syncPendingChanges = async () => {
    try {
        const online = await isOnline();
        if (!online) {
            return { success: false, error: 'You are offline. Check your internet connection.' };
        }

        console.log('🔄 Syncing pending changes to server...');
        let syncedCount = 0;
        const errors = [];

    // Sync products - find records without serverId OR with needsSync=true
    const allProducts = await db.products.toArray();
    const unsyncedProducts = allProducts.filter(p => !p.serverId || p.needsSync === true);
    for (const product of unsyncedProducts) {
        try {
            if (product.serverId) {
                await productAPI.update(product.serverId, product);
            } else {
                const serverProduct = await productAPI.create(product);
                await db.products.update(product.id, { serverId: serverProduct._id });
            }
            await db.products.update(product.id, { needsSync: false });
            syncedCount++;
        } catch (error) {
            console.error('Failed to sync product:', product.name, error);
            errors.push(`Product "${product.name}": ${error.message || error}`);
        }
    }

    // Sync customers
    const allCustomers = await db.customers.toArray();
    const unsyncedCustomers = allCustomers.filter(c => !c.serverId || c.needsSync === true);
    for (const customer of unsyncedCustomers) {
        try {
            if (customer.serverId) {
                await customerAPI.update(customer.serverId, customer);
            } else {
                const serverCustomer = await customerAPI.create(customer);
                await db.customers.update(customer.id, { serverId: serverCustomer._id });
            }
            await db.customers.update(customer.id, { needsSync: false });
            syncedCount++;
        } catch (error) {
            console.error('Failed to sync customer:', customer.name, error);
            errors.push(`Customer "${customer.name}": ${error.message || error}`);
        }
    }

    // Sync employees
    const allEmployees = await db.employees.toArray();
    const unsyncedEmployees = allEmployees.filter(e => !e.serverId || e.needsSync === true);
    for (const employee of unsyncedEmployees) {
        try {
            if (employee.serverId) {
                await employeeAPI.update(employee.serverId, employee);
            } else {
                const serverEmployee = await employeeAPI.create(employee);
                await db.employees.update(employee.id, { serverId: serverEmployee._id });
            }
            await db.employees.update(employee.id, { needsSync: false });
            syncedCount++;
        } catch (error) {
            console.error('Failed to sync employee:', employee.name, error);
            errors.push(`Employee "${employee.name}": ${error.message || error}`);
        }
    }

    // Sync sales
    const allSales = await db.sales.toArray();
    const unsyncedSales = allSales.filter(s => !s.serverId || s.needsSync === true);
    for (const sale of unsyncedSales) {
        try {
            if (!sale.serverId) {
                const serverSale = await salesAPI.create(sale);
                await db.sales.update(sale.id, { serverId: serverSale._id });
            }
            await db.sales.update(sale.id, { needsSync: false });
            syncedCount++;
        } catch (error) {
            console.error('Failed to sync sale:', sale.id, error);
            errors.push(`Sale #${sale.id}: ${error.message || error}`);
        }
    }

    console.log(`✅ Synced ${syncedCount} records`);
    if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} errors occurred:`, errors);
        return {
            success: false,
            syncedCount,
            error: `Synced ${syncedCount} records, but ${errors.length} failed. First error: ${errors[0]}`
        };
    }
    return { success: true, syncedCount };
    } catch (error) {
        console.error('Sync failed with error:', error);
        return { success: false, error: error.message || 'Unknown sync error occurred' };
    }
};

export default {
    isOnline,
    syncFromServer,
    syncPendingChanges,
    product: productSync,
    customer: customerSync,
    employee: employeeSync,
    shift: shiftSync,
    sales: salesSync
};
