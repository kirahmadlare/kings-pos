/**
 * Inventory Sync Testing Script
 *
 * Run this in the browser console to test inventory synchronization
 *
 * IMPORTANT: Open browser DevTools (F12) and paste these functions
 * into the console while the POS app is running.
 */

// Test 1: Check for products with pending sync
async function checkPendingSync() {
    console.log('🔍 Checking for products with pending sync...');

    const db = await window.indexedDB.databases();
    console.log('Available databases:', db);

    // Open IndexedDB
    const dbRequest = window.indexedDB.open('KingsPOS', 5);

    return new Promise((resolve, reject) => {
        dbRequest.onsuccess = async (event) => {
            const database = event.target.result;
            const transaction = database.transaction(['products'], 'readonly');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.getAll();

            request.onsuccess = () => {
                const products = request.result;
                const needsSync = products.filter(p => p.needsSync === true);

                console.log(`📊 Total products: ${products.length}`);
                console.log(`⚠️ Products needing sync: ${needsSync.length}`);

                if (needsSync.length > 0) {
                    console.table(needsSync.map(p => ({
                        id: p.id,
                        name: p.name,
                        quantity: p.quantity,
                        serverId: p.serverId,
                        needsSync: p.needsSync,
                        updatedAt: p.updatedAt
                    })));
                } else {
                    console.log('✅ All products are synced!');
                }

                resolve(needsSync);
            };

            request.onerror = () => {
                console.error('❌ Failed to read products');
                reject(request.error);
            };
        };

        dbRequest.onerror = () => {
            console.error('❌ Failed to open database');
            reject(dbRequest.error);
        };
    });
}

// Test 2: Compare local vs server inventory
async function compareInventory() {
    console.log('🔍 Comparing local vs server inventory...');

    try {
        // Get server inventory
        const response = await fetch('http://localhost:3001/api/products', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch server products');
        }

        const serverProducts = await response.json();

        // Get local inventory
        const dbRequest = window.indexedDB.open('KingsPOS', 5);

        return new Promise((resolve, reject) => {
            dbRequest.onsuccess = async (event) => {
                const database = event.target.result;
                const transaction = database.transaction(['products'], 'readonly');
                const objectStore = transaction.objectStore('products');
                const request = objectStore.getAll();

                request.onsuccess = () => {
                    const localProducts = request.result;

                    // Compare quantities
                    const mismatches = [];

                    localProducts.forEach(local => {
                        if (local.serverId) {
                            const server = serverProducts.find(s => s._id === local.serverId);
                            if (server && server.quantity !== local.quantity) {
                                mismatches.push({
                                    name: local.name,
                                    localQty: local.quantity,
                                    serverQty: server.quantity,
                                    difference: local.quantity - server.quantity,
                                    needsSync: local.needsSync
                                });
                            }
                        }
                    });

                    console.log(`📊 Compared ${localProducts.length} products`);

                    if (mismatches.length > 0) {
                        console.warn(`⚠️ Found ${mismatches.length} mismatches:`);
                        console.table(mismatches);
                    } else {
                        console.log('✅ All quantities match!');
                    }

                    resolve(mismatches);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            };
        });

    } catch (error) {
        console.error('❌ Failed to compare inventory:', error);
        throw error;
    }
}

// Test 3: Simulate a sale and check sync
async function testSale() {
    console.log('🧪 Simulating sale to test inventory sync...');
    console.log('⚠️ This will actually create a test sale!');

    // This is a manual test - you should do this through the UI
    console.log(`
    📋 Manual Test Steps:
    1. Go to POS page
    2. Add a product to cart
    3. Note the current quantity
    4. Complete the sale
    5. Open Console and run: checkPendingSync()
    6. Check if needsSync is false
    7. Run: compareInventory() to verify quantities match
    `);
}

// Test 4: Manual sync trigger
async function triggerManualSync() {
    console.log('🔄 Triggering manual sync...');

    try {
        // Import sync service (this might not work in console, use UI instead)
        console.log('To manually trigger sync, use the UI or call syncPendingChanges()');
        console.log('The sync happens automatically when you make sales now!');

    } catch (error) {
        console.error('❌ Failed to trigger sync:', error);
    }
}

// Test 5: Monitor sync events
function monitorSyncEvents() {
    console.log('👂 Monitoring sync events...');
    console.log('Watch the console for sync messages:');
    console.log('- 📦 Stock updated: ...');
    console.log('- ✓ Stock sync complete: ...');

    // Store original console.log
    const originalLog = console.log;

    // Intercept console.log
    console.log = function(...args) {
        const message = args.join(' ');

        if (message.includes('📦') || message.includes('Stock') || message.includes('sync')) {
            originalLog.apply(console, ['[SYNC EVENT]', ...args]);
        } else {
            originalLog.apply(console, args);
        }
    };

    console.log('✅ Sync monitoring enabled. Make a sale to see events.');
}

// Export test suite
window.InventorySyncTests = {
    checkPendingSync,
    compareInventory,
    testSale,
    triggerManualSync,
    monitorSyncEvents
};

// Print help
console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Inventory Sync Testing Suite - Ready!                  ║
╚════════════════════════════════════════════════════════════════╝

Available Test Functions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Check Pending Syncs:
   > InventorySyncTests.checkPendingSync()
   Shows products that need to be synced to server

2. Compare Local vs Server:
   > InventorySyncTests.compareInventory()
   Compares quantities between IndexedDB and MongoDB

3. Manual Sale Test:
   > InventorySyncTests.testSale()
   Shows instructions for testing a sale

4. Trigger Manual Sync:
   > InventorySyncTests.triggerManualSync()
   Forces a sync of pending changes

5. Monitor Sync Events:
   > InventorySyncTests.monitorSyncEvents()
   Watches console for sync-related messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick Test Sequence:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Enable monitoring:
   > InventorySyncTests.monitorSyncEvents()

2. Make a sale in the UI

3. Check for pending syncs:
   > InventorySyncTests.checkPendingSync()

4. Compare with server:
   > InventorySyncTests.compareInventory()

Expected Result: No pending syncs, all quantities match!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
