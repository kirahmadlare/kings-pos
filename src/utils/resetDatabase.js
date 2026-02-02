/**
 * @fileoverview IndexedDB Reset Utility
 *
 * CAUTION: This will delete ALL local data!
 * Use only for development/testing purposes.
 */

import db from '../db';

/**
 * Clear all data from IndexedDB
 * @returns {Promise<object>} Result with counts of deleted records
 */
export async function resetLocalDatabase() {
    try {
        console.log('🗑️  Starting IndexedDB reset...');

        const results = {};

        // List of all tables
        const tables = [
            'users',
            'stores',
            'products',
            'categories',
            'sales',
            'customers',
            'credits',
            'employees',
            'shifts',
            'clockEvents',
            'suppliers',
            'purchaseOrders',
            'settings',
            'sessions',
            'syncQueue'
        ];

        // Clear each table
        for (const table of tables) {
            try {
                if (db[table]) {
                    const count = await db[table].count();
                    await db[table].clear();
                    results[table] = count;
                    console.log(`   ✓ Cleared ${table}: ${count} records`);
                }
            } catch (error) {
                console.error(`   ✗ Failed to clear ${table}:`, error);
                results[table] = { error: error.message };
            }
        }

        console.log('\n✅ IndexedDB reset complete!');
        return {
            success: true,
            results,
            message: 'All local data has been cleared'
        };

    } catch (error) {
        console.error('❌ Error resetting IndexedDB:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Clear specific tables from IndexedDB
 * @param {string[]} tableNames - Array of table names to clear
 * @returns {Promise<object>} Result with counts of deleted records
 */
export async function clearTables(tableNames) {
    try {
        console.log(`🗑️  Clearing ${tableNames.length} tables...`);

        const results = {};

        for (const table of tableNames) {
            try {
                if (db[table]) {
                    const count = await db[table].count();
                    await db[table].clear();
                    results[table] = count;
                    console.log(`   ✓ Cleared ${table}: ${count} records`);
                } else {
                    console.warn(`   ⚠️  Table ${table} not found`);
                    results[table] = { error: 'Table not found' };
                }
            } catch (error) {
                console.error(`   ✗ Failed to clear ${table}:`, error);
                results[table] = { error: error.message };
            }
        }

        return {
            success: true,
            results,
            message: `Cleared ${tableNames.length} tables`
        };

    } catch (error) {
        console.error('❌ Error clearing tables:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Clear transaction data only (keep users, stores, settings)
 * @returns {Promise<object>} Result with counts of deleted records
 */
export async function clearTransactionData() {
    const transactionTables = [
        'products',
        'sales',
        'customers',
        'credits',
        'employees',
        'shifts',
        'clockEvents',
        'suppliers',
        'purchaseOrders',
        'syncQueue'
    ];

    console.log('🗑️  Clearing transaction data (keeping users & settings)...');
    return await clearTables(transactionTables);
}

export default {
    resetLocalDatabase,
    clearTables,
    clearTransactionData
};
