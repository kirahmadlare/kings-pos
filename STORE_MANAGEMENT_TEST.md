# Multi-Store Management Testing Guide

## Prerequisites
- ✅ Backend running on http://localhost:3001
- ✅ Frontend running on http://localhost:5174
- ✅ MongoDB connected
- 📝 User account created (login credentials ready)

---

## Test Suite Overview

This guide will test:
1. ✅ Creating multiple stores
2. ✅ Store switcher in navbar
3. ✅ Store statistics display
4. ✅ Editing store details
5. ✅ Store access control
6. ✅ Data isolation between stores

---

## Test 1: Access Store Management Page (30 seconds)

### Steps:
1. Open browser to: **http://localhost:5174**
2. Login with your credentials
3. Navigate to: **http://localhost:5174/stores**
4. You should see the Store Management page

### Expected Results:
```
┌────────────────────────────────────┐
│ Store Management   [+ Add Store]   │
├────────────────────────────────────┤
│ (Your existing store card)         │
│ - Store name                       │
│ - Address, Phone                   │
│ - Today's Sales: $0.00             │
│ - Status: Active                   │
└────────────────────────────────────┘
```

**✓ Pass if:** You see the Store Management page with your existing store

**✗ Fail if:**
- 404 error → Check if route is added to App.jsx
- Blank page → Check browser console for errors
- "Failed to load stores" → Check backend logs

---

## Test 2: Create New Store (1 minute)

### Steps:
1. On Store Management page, click **"Add Store"** button
2. Modal should appear with form
3. Fill in the form:
   ```
   Store Name: "Uptown Branch"
   Address: "456 Oak Avenue, Suite 200"
   Phone: "555-0123"
   Email: "uptown@example.com"
   Currency: "USD"
   Tax Rate: "8.5"
   ```
4. Click **"Create Store"**
5. Modal closes, page reloads

### Expected Results:
```
✅ Toast: "Store created successfully"
✅ New store card appears in grid
✅ Store card shows:
   - Name: "Uptown Branch"
   - Address: "456 Oak Avenue, Suite 200"
   - Phone: "555-0123"
   - Status: Active
   - Today's Sales: $0.00
   - Customers: 0
```

**✓ Pass if:**
- Store created successfully
- Toast notification appears
- New store card visible

**✗ Fail if:**
- "Failed to save store" error
- Modal doesn't close
- No new store appears

---

## Test 3: Create Second Store (1 minute)

### Steps:
1. Click **"Add Store"** again
2. Fill in different details:
   ```
   Store Name: "Downtown Store"
   Address: "123 Main Street"
   Phone: "555-9876"
   Email: "downtown@example.com"
   Currency: "USD"
   Tax Rate: "7.0"
   ```
3. Click **"Create Store"**

### Expected Results:
```
✅ Now you have 3 stores total:
   1. Original store
   2. Uptown Branch
   3. Downtown Store

✅ All three displayed in grid layout
```

**✓ Pass if:** Three store cards visible

---

## Test 4: Store Switcher in Navbar (2 minutes)

### Steps:
1. Look at the top navigation bar (navbar)
2. Find the Store Switcher dropdown (usually top-right)
3. It should show: **"🏪 [Current Store Name] ▼"**
4. Click on it

### Expected Results:
```
┌─────────────────────────┐
│ Switch Store            │
├─────────────────────────┤
│ ✓ [Current Store]       │  ← Checkmark
│   📍 Address            │
├─────────────────────────┤
│   Uptown Branch         │
│   📍 456 Oak Avenue     │
├─────────────────────────┤
│   Downtown Store        │
│   📍 123 Main Street    │
└─────────────────────────┘
```

**✓ Pass if:**
- Dropdown shows all 3 stores
- Current store has checkmark
- Each store shows name and address

**✗ Fail if:**
- Switcher not visible → Check if StoreSwitcher added to Layout
- Only 1 store shown → Check API response
- Dropdown doesn't open → Check console for errors

---

## Test 5: Switch to Different Store (2 minutes)

### Steps:
1. Open Store Switcher dropdown
2. Click on **"Uptown Branch"**
3. Confirm the switch

### Expected Results:
```
✅ Toast: "Store switched successfully"
✅ Page reloads automatically
✅ Store switcher now shows: "🏪 Uptown Branch ▼"
✅ All data now shows Uptown Branch data
```

**Important Notes:**
- Page **WILL reload** - this is expected!
- After reload, you're now "in" Uptown Branch
- All products, sales, customers shown are for Uptown Branch only

**✓ Pass if:**
- Store switches successfully
- Navbar shows new store name
- Page reloads

**Test Data Isolation:**
1. Go to Inventory page
2. Products from original store **should NOT be visible**
3. This is because each store has isolated data

---

## Test 6: Create Store-Specific Data (3 minutes)

### Purpose:
Verify that data created in one store doesn't appear in another.

### Steps:

**A. In Uptown Branch (currently active):**
1. Go to Inventory page
2. Create a product:
   ```
   Name: "Uptown Special Coffee"
   Price: $5.99
   Quantity: 100
   ```
3. Note: Product created in Uptown Branch

**B. Switch to Downtown Store:**
1. Use Store Switcher → Select "Downtown Store"
2. Wait for page reload
3. Go to Inventory page

**C. Verify Isolation:**
4. Check if "Uptown Special Coffee" is visible
5. It should **NOT** be visible! ✅

**D. Create Different Product in Downtown:**
6. Create product:
   ```
   Name: "Downtown Espresso"
   Price: $4.99
   Quantity: 50
   ```

**E. Switch Back to Uptown:**
7. Use Store Switcher → Select "Uptown Branch"
8. Go to Inventory
9. Verify:
   - ✅ "Uptown Special Coffee" IS visible
   - ✅ "Downtown Espresso" is NOT visible

### Expected Results:
```
Store Data Isolation:
┌──────────────────┬────────────────────┐
│ Uptown Branch    │ Downtown Store     │
├──────────────────┼────────────────────┤
│ • Uptown Coffee  │ • Downtown Espresso│
│ • $5.99          │ • $4.99            │
├──────────────────┼────────────────────┤
│ Does NOT see     │ Does NOT see       │
│ Downtown products│ Uptown products    │
└──────────────────┴────────────────────┘
```

**✓ Pass if:** Data is completely isolated between stores

**✗ Fail if:** Products appear in both stores

---

## Test 7: Edit Store Details (1 minute)

### Steps:
1. Go to Store Management page (/stores)
2. Find "Downtown Store" card
3. Click the **Edit (pencil icon)** button
4. Modal opens with current details
5. Change:
   ```
   Tax Rate: 7.0 → 8.0
   Phone: 555-9876 → 555-1111
   ```
6. Click **"Update Store"**

### Expected Results:
```
✅ Toast: "Store updated successfully"
✅ Modal closes
✅ Store card shows updated info:
   - Phone: 555-1111
   - (Tax rate not visible on card but saved)
```

**✓ Pass if:** Changes saved and displayed

---

## Test 8: Store Statistics (2 minutes)

### Purpose:
Verify each store shows its own statistics.

### Steps:
1. Switch to "Uptown Branch"
2. Go to POS page
3. Create a sale:
   - Add "Uptown Special Coffee"
   - Complete sale for $5.99
4. Go to Store Management page
5. Check "Uptown Branch" card

### Expected Results:
```
Uptown Branch Card:
┌─────────────────────────┐
│ Uptown Branch           │
├─────────────────────────┤
│ Today's Sales: $5.99    │
│ Customers: 1            │
│ Products: 1             │
└─────────────────────────┘

Downtown Store Card:
┌─────────────────────────┐
│ Downtown Store          │
├─────────────────────────┤
│ Today's Sales: $0.00    │  ← Still $0
│ Customers: 0            │
│ Products: 1             │
└─────────────────────────┘
```

**✓ Pass if:** Each store shows its own stats independently

---

## Test 9: Analytics Dashboard (1 minute)

### Steps:
1. Make sure you're in "Uptown Branch"
2. Go to Analytics page (/analytics)
3. Check KPI cards

### Expected Results:
```
Analytics Dashboard for Uptown Branch:
┌─────────────────────────────────────┐
│ Today's Sales: $5.99                │
│ Transactions: 1                     │
│ Products: 1                         │
└─────────────────────────────────────┘
```

4. Switch to "Downtown Store"
5. Go to Analytics page

```
Analytics Dashboard for Downtown Store:
┌─────────────────────────────────────┐
│ Today's Sales: $0.00                │  ← Different!
│ Transactions: 0                     │
│ Products: 1                         │
└─────────────────────────────────────┘
```

**✓ Pass if:** Analytics shows different data per store

---

## Test 10: Deactivate Store (1 minute)

### Steps:
1. Go to Store Management page
2. Find "Downtown Store" card
3. Click the **Delete (trash icon)** button
4. Confirm: "Are you sure you want to deactivate...?"
5. Click OK

### Expected Results:
```
✅ Toast: "Store deactivated successfully"
✅ Downtown Store card updates:
   - Status badge: "INACTIVE" (red)
   - Card slightly grayed out
```

**Note:** Store is **soft deleted** (deactivated), not permanently deleted.

**✓ Pass if:** Store status changes to inactive

---

## Test 11: Store Switcher After Deactivation (30 seconds)

### Steps:
1. Open Store Switcher dropdown

### Expected Results:
```
Store Switcher Dropdown:
✅ Downtown Store should NOT appear
✅ Only active stores shown:
   - Original Store
   - Uptown Branch
```

**✓ Pass if:** Inactive stores don't appear in switcher

---

## Test 12: Multiple Browser Windows (2 minutes)

### Purpose:
Test real-time sync across browsers (Phase 1 integration).

### Steps:
1. Open **TWO browser windows** side-by-side:
   - Window 1: http://localhost:5174/stores
   - Window 2: http://localhost:5174/stores (incognito)
2. Login to both with same account
3. **Window 1:** Create a new store "Test Store"
4. **Window 2:** Page may need manual refresh

### Expected Results:
```
Window 1: Shows new "Test Store" immediately
Window 2: May need refresh (WebSocket for stores not yet implemented)
```

**Note:** Full real-time sync for store changes could be added in future enhancement.

---

## Test Results Summary

Fill this out as you test:

```
┌────────────────────────────────────────┬──────┐
│ Test Case                              │ Pass │
├────────────────────────────────────────┼──────┤
│ 1. Access Store Management Page        │ [ ]  │
│ 2. Create New Store                    │ [ ]  │
│ 3. Create Second Store                 │ [ ]  │
│ 4. Store Switcher Visibility           │ [ ]  │
│ 5. Switch Between Stores               │ [ ]  │
│ 6. Data Isolation                      │ [ ]  │
│ 7. Edit Store Details                  │ [ ]  │
│ 8. Store Statistics                    │ [ ]  │
│ 9. Analytics Per Store                 │ [ ]  │
│ 10. Deactivate Store                   │ [ ]  │
│ 11. Switcher After Deactivation        │ [ ]  │
│ 12. Multiple Browser Windows           │ [ ]  │
└────────────────────────────────────────┴──────┘

Overall Result: _____ / 12 tests passed
```

---

## Troubleshooting

### Issue: "Failed to load stores"
**Solution:**
1. Check backend is running: http://localhost:3001/health
2. Check browser console for errors
3. Verify you're logged in
4. Check MongoDB is connected

### Issue: Store Switcher not visible
**Solution:**
1. Check if you have only 1 store (switcher hidden with 1 store)
2. Create a second store
3. Refresh page
4. Check Layout component has StoreSwitcher

### Issue: Data appearing in wrong store
**Solution:**
1. Check which store is active (navbar shows current)
2. Verify storeId in database records
3. Check API requests include correct storeId
4. Clear browser cache and reload

### Issue: Page not reloading after switch
**Solution:**
1. This is expected behavior
2. Page SHOULD reload to refresh data
3. If it doesn't, manually refresh

---

## Advanced Testing (Optional)

### Test Manager Access:
1. Create a second user account
2. Add them as manager to "Uptown Branch"
3. Login as that user
4. Verify they only see "Uptown Branch"

### Test Cross-Store Analytics:
1. Create sales in multiple stores
2. Check if owner can see combined data
3. (This feature could be added in Phase 2.2 enhancement)

---

## Success Criteria

Multi-Store Management is working if:
- ✅ Can create multiple stores
- ✅ Store switcher appears with 2+ stores
- ✅ Switching stores reloads page with new data
- ✅ Data is completely isolated per store
- ✅ Statistics show per-store metrics
- ✅ Analytics dashboard filters by active store
- ✅ Can edit and deactivate stores
- ✅ Inactive stores hidden from switcher

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 2.2 is production-ready!
2. 📝 Document any issues found
3. 🚀 Continue to Phase 2.3 (Loyalty Program)
4. 💡 Consider enhancements:
   - Cross-store inventory transfer
   - Consolidated owner dashboard
   - Store performance comparison

If tests fail:
1. 📋 Document which tests failed
2. 🐛 Share error messages
3. 🔧 We'll fix issues together

---

**Happy Testing! 🧪**
