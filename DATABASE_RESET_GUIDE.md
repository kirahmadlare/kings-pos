# Database Reset Guide

## Overview

This guide explains how to clear all data from your POS system for fresh testing. There are multiple methods available depending on what you want to clear.

---

## ⚠️ WARNING

**These operations will permanently delete data!**

- Use only for development and testing
- Always backup important data before resetting
- Cannot be undone once executed

---

## Methods

### Method 1: UI-Based Reset (Recommended for Testing)

The easiest way to reset data is through the Settings page.

#### Steps:

1. Open the POS application
2. Navigate to **Settings** page
3. Scroll to the **Database Management** section
4. Choose one of the options:

#### Option A: Clear Transaction Data

- **What it does**: Deletes products, sales, customers, employees, suppliers, purchase orders, etc.
- **What it keeps**: Your account, store settings, and theme preferences
- **Best for**: Starting fresh with data while keeping your login
- **Button**: "Clear Transaction Data"

#### Option B: Reset Entire Database

- **What it does**: Deletes EVERYTHING from IndexedDB including your account
- **Result**: You will be logged out and need to re-register
- **Best for**: Complete fresh start
- **Button**: "Reset Entire Database"

---

### Method 2: Backend MongoDB Reset (Command Line)

Reset the MongoDB database from the command line.

#### Steps:

1. Open terminal/command prompt
2. Navigate to the server directory:
   ```bash
   cd C:\Users\kingm\Downloads\POS\server
   ```

3. Run the reset script:
   ```bash
   npm run reset-db
   ```

4. The script will:
   - Connect to MongoDB
   - List all collections
   - Drop each collection
   - Disconnect

#### Output:
```
⚠️  WARNING: This will DELETE ALL DATA from the database!
📍 Database: mongodb://localhost:27017/kings-pos

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 15 collections

🗑️  Dropping collections:
   ✓ Dropped: users
   ✓ Dropped: stores
   ✓ Dropped: products
   ✓ Dropped: categories
   ✓ Dropped: sales
   ✓ Dropped: customers
   ... (and more)

✅ Database reset complete!
```

---

### Method 3: Frontend IndexedDB Reset (Browser Console)

Use browser developer tools to reset IndexedDB.

#### Steps:

1. Open your POS application
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Copy and paste one of these commands:

#### Option A: Reset Entire IndexedDB

```javascript
import('/src/utils/resetDatabase.js').then(module => {
    module.resetLocalDatabase().then(result => {
        console.log('Reset result:', result);
        if (result.success) {
            alert('✅ Database cleared! Reloading...');
            location.reload();
        }
    });
});
```

#### Option B: Clear Transaction Data Only

```javascript
import('/src/utils/resetDatabase.js').then(module => {
    module.clearTransactionData().then(result => {
        console.log('Clear result:', result);
        if (result.success) {
            alert('✅ Transaction data cleared! Reloading...');
            location.reload();
        }
    });
});
```

#### Option C: Clear Specific Tables

```javascript
import('/src/utils/resetDatabase.js').then(module => {
    const tables = ['products', 'sales', 'customers'];
    module.clearTables(tables).then(result => {
        console.log('Clear result:', result);
    });
});
```

---

### Method 4: Direct MongoDB Commands

If you have MongoDB shell access:

```bash
# Connect to MongoDB
mongosh

# Switch to database
use kings-pos

# List all collections
show collections

# Drop specific collection
db.products.drop()
db.sales.drop()
db.customers.drop()

# Drop entire database
db.dropDatabase()
```

---

## What Gets Cleared

### Transaction Data Only:
- ✅ Products
- ✅ Categories
- ✅ Sales
- ✅ Customers
- ✅ Credits
- ✅ Employees
- ✅ Shifts
- ✅ Clock Events
- ✅ Suppliers
- ✅ Purchase Orders
- ✅ Sync Queue
- ❌ Users (kept)
- ❌ Stores (kept)
- ❌ Settings (kept)

### Complete Reset:
- ✅ Everything (all tables/collections)

---

## After Resetting

### If you cleared transaction data only:
1. You're still logged in
2. Your store settings are intact
3. Start adding products, customers, etc.

### If you reset the entire database:
1. **Backend (MongoDB)**: Empty database
   - Need to re-register account
   - Need to create store

2. **Frontend (IndexedDB)**: Empty database
   - Will be logged out
   - Need to refresh page
   - Need to re-register

---

## Comparison Table

| Method | Location | Clears | Keeps | Best For |
|--------|----------|--------|-------|----------|
| **Clear Transaction Data** (UI) | Frontend | Products, Sales, etc. | Account, Settings | Starting fresh with data |
| **Reset Entire Database** (UI) | Frontend | Everything | Nothing | Complete fresh start |
| **npm run reset-db** | Backend | MongoDB collections | Nothing | Server-side testing |
| **Browser Console** | Frontend | IndexedDB tables | Nothing | Frontend debugging |
| **MongoDB Shell** | Backend | Selected collections | Depends | Advanced users |

---

## Testing Workflow

### Recommended workflow for module testing:

1. **Start Fresh**
   ```bash
   # In server directory
   npm run reset-db
   ```

2. **Clear Frontend**
   - Go to Settings → Database Management
   - Click "Reset Entire Database"

3. **Register New Account**
   - Email: test@example.com
   - Password: test123

4. **Create Store**
   - Name: Test Store
   - Currency: USD
   - Tax Rate: 0%

5. **Test Modules One by One**
   - Products & Inventory
   - Categories
   - Customers
   - Employees
   - Sales & POS
   - Reports
   - etc.

6. **Clear Between Modules** (if needed)
   - Settings → Clear Transaction Data
   - Keeps your account
   - Fresh data for next module

---

## Troubleshooting

### "Database already empty"
- Database is already clear
- Safe to proceed with testing

### "Failed to drop collection"
- Collection might not exist
- Script continues with other collections

### "Connection refused"
- MongoDB not running
- Start MongoDB first: `mongod`

### Frontend not clearing
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check browser console for errors

### Still seeing old data
1. Clear IndexedDB: Settings → Reset Entire Database
2. Clear MongoDB: `npm run reset-db`
3. Clear browser cache
4. Hard refresh page

---

## Scripts Location

### Backend Script:
```
C:\Users\kingm\Downloads\POS\server\scripts\resetDatabase.js
```

### Frontend Utility:
```
C:\Users\kingm\Downloads\POS\src\utils\resetDatabase.js
```

### Settings Page:
```
C:\Users\kingm\Downloads\POS\src\pages\Settings.jsx
```

---

## Quick Commands Reference

```bash
# Backend - Reset MongoDB
cd C:\Users\kingm\Downloads\POS\server
npm run reset-db

# Frontend - UI Reset
Settings → Database Management → Reset/Clear buttons

# Both - Complete Fresh Start
npm run reset-db  # Backend
# Then in UI: Settings → Reset Entire Database
```

---

## Safety Tips

✅ **Always confirm** before running reset commands
✅ **Export data** before resetting (Settings → Export Data)
✅ **Use in development** only, never in production
✅ **Double-check** the database you're connected to
✅ **Test on sample data** first

❌ **Never run** in production environment
❌ **Don't use** without backups of important data
❌ **Avoid** running multiple resets simultaneously

---

## Need Help?

If you encounter issues:

1. Check MongoDB is running
2. Check server is running
3. Check browser console for errors
4. Try hard refresh (Ctrl+Shift+R)
5. Check connection indicator in UI
6. Review error messages carefully

---

Happy Testing! 🧪
