# Phase 1 Testing Guide

## Prerequisites
- ✅ Backend running on http://localhost:3001
- ✅ Frontend running on http://localhost:5173
- ✅ MongoDB connected
- ⚠️ Redis optional (graceful fallback works)

---

## Test 1: Toast Notifications ✅

### Steps:
1. Open http://localhost:5173
2. Try to login with wrong credentials
3. **Expected**: See error toast notification (red) at top-right
4. Login successfully
5. **Expected**: See success toast notification (green)

### What to verify:
- [ ] Toasts appear at top-right
- [ ] Auto-dismiss after 5 seconds
- [ ] Can manually close with X button
- [ ] Multiple toasts stack vertically

---

## Test 2: Connection Monitoring ✅

### Steps:
1. Open http://localhost:5173 and login
2. Open DevTools (F12) → Network tab
3. Go offline: Check "Offline" in Network tab
4. **Expected**: Orange "Offline" banner appears at bottom
5. Click "Retry" button
6. **Expected**: "Unable to connect" toast
7. Go back online: Uncheck "Offline"
8. **Expected**:
   - "Connection restored" toast (green)
   - "Syncing data..." toast
   - "Data synced successfully" toast
   - Offline banner disappears

### What to verify:
- [ ] Offline banner shows when disconnected
- [ ] Reconnect attempts are counted
- [ ] Auto-sync triggers on reconnect
- [ ] Status indicator updates in real-time

---

## Test 3: Conflict Resolution 🎯

### Steps:
1. **Setup**: Open two browser windows side-by-side
   - Window 1: http://localhost:5173 (login as user)
   - Window 2: http://localhost:5173 (incognito, login as same user)

2. **Create Conflict**:
   - Both windows: Go to Inventory page
   - Both windows: Click same product (e.g., "Product A")
   - Window 1: Change price to $100, click Save
   - **Expected**: Success toast
   - Window 2: Change price to $200, click Save
   - **Expected**: ⚠️ Conflict Modal appears!

3. **Resolve Conflict**:
   - See side-by-side comparison:
     - Server Version: $100 (from Window 1)
     - Your Version: $200 (current)
   - Choose strategy:
     - Option 1: "Keep Server Version" → Product stays $100
     - Option 2: "Keep My Changes" → Product becomes $200
   - Click "Resolve Conflict"
   - **Expected**: Modal closes, product updated

4. **Verify**:
   - Refresh both windows
   - Both should show the resolved price

### What to verify:
- [ ] Conflict detected on save
- [ ] Modal shows both versions
- [ ] Field differences highlighted
- [ ] Can choose resolution strategy
- [ ] Resolved data persists
- [ ] No data loss

---

## Test 4: Real-Time Sync (WebSocket) 🔄

### Steps:
1. **Setup**: Two browser windows side-by-side
   - Window 1: Inventory page
   - Window 2: Inventory page (same store)

2. **Test Product Creation**:
   - Window 1: Click "Add Product"
   - Fill in: Name="Test Product", Price=$50
   - Click "Create"
   - **Expected**: Window 2 instantly shows new product (no refresh!)

3. **Test Product Update**:
   - Window 1: Edit "Test Product", change price to $75
   - Click "Save"
   - **Expected**: Window 2 price updates instantly

4. **Test Product Delete**:
   - Window 1: Delete "Test Product"
   - **Expected**: Window 2 removes it instantly

### What to verify:
- [ ] New products appear in real-time
- [ ] Updates propagate instantly
- [ ] Deletes remove items immediately
- [ ] No page refresh needed
- [ ] Works across multiple tabs

---

## Test 5: Audit Logs 📝

### Steps:
1. Go to Audit Logs page (if not visible, go to http://localhost:5173/audit-logs)
2. Perform actions:
   - Create a product
   - Update a customer
   - Delete a category
3. Refresh Audit Logs page
4. **Expected**: See all actions logged with:
   - Timestamp
   - User who performed action
   - Action type (CREATE/UPDATE/DELETE)
   - Entity type and ID
   - Before/After states

### Filters to test:
- [ ] Filter by Action (CREATE, UPDATE, DELETE)
- [ ] Filter by Entity Type (Product, Customer, etc.)
- [ ] Filter by User
- [ ] Search functionality

### What to verify:
- [ ] All operations are logged
- [ ] Timestamp is accurate
- [ ] Before/After states are captured
- [ ] User information is correct
- [ ] Filters work correctly

---

## Test 6: Error Handling & Retry 🔄

### Test 6.1: Network Timeout
1. **Setup**: DevTools (F12) → Network tab
2. Set throttling to "Slow 3G"
3. Try to load products list
4. **Expected**:
   - Request takes longer
   - Automatic retry if timeout
   - "Retrying..." toast on first retry
   - Success after retry

### Test 6.2: Validation Errors
1. Try to create product with empty name
2. **Expected**:
   - Error toast: "Validation failed"
   - NO retry (400 errors don't retry)
   - Form shows validation error

### Test 6.3: Server Error Recovery
1. Stop the backend server temporarily
2. Try to create a product
3. **Expected**:
   - "Connection issue. Retrying..." toast
   - Automatic retry (3 attempts)
   - "Unable to connect to server" after exhausted
   - Operations queued for later sync

### What to verify:
- [ ] Transient errors retry automatically
- [ ] Client errors (400s) don't retry
- [ ] Server errors (500s) retry with backoff
- [ ] User sees retry progress
- [ ] Exponential backoff timing (1s, 2s, 4s)

---

## Test 7: Caching (Redis Optional) 💾

### Without Redis (Current State):
1. Load products page
2. Check Network tab
3. **Expected**: API call to `/api/products`
4. Reload page
5. **Expected**: Another API call (no cache without Redis)

### With Redis (If installed):
1. Install Redis and start it
2. Restart backend server
3. Load products page → API call
4. Reload within 5 minutes → No API call (cached!)
5. Update a product
6. **Expected**: Cache invalidated
7. Reload page → Fresh API call

### Cache API Testing:
```bash
# Login first, get token
curl http://localhost:3001/api/cache/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Cache statistics or "available: false"
```

### What to verify:
- [ ] System works without Redis
- [ ] With Redis: Responses are faster
- [ ] Cache invalidates on updates
- [ ] TTL respected (5min for products)

---

## Test 8: Database Indexes 📊

### Manual Testing:
1. Create 1000+ products (use test script)
2. Search by name → Should be instant
3. Filter by category → Fast
4. Date range queries → Optimized

### API Testing:
```bash
# Get index statistics
curl http://localhost:3001/api/indexes/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get product indexes
curl http://localhost:3001/api/indexes/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### What to verify:
- [ ] Text search is instant (even with 1000s of products)
- [ ] Queries use proper indexes (check MongoDB logs)
- [ ] Index statistics API returns data
- [ ] All collections have indexes

---

## Test 9: Offline Queue & Sync 📲

### Steps:
1. Login and go to Products page
2. Go offline (DevTools → Network → Offline)
3. **Create** a new product
4. **Update** an existing product
5. **Delete** a product
6. **Expected**:
   - All operations succeed locally
   - "Working offline" message
   - Changes visible in UI
7. Go back online
8. **Expected**:
   - "Connection restored" toast
   - "Syncing data..." toast
   - All queued operations sync
   - "Data synced successfully" toast

### What to verify:
- [ ] Can work completely offline
- [ ] Changes stored locally (IndexedDB)
- [ ] Queue persists across page refresh
- [ ] Sync happens automatically on reconnect
- [ ] Conflicts handled properly
- [ ] No data loss

---

## Test 10: Multi-Tab Sync 🔄

### Steps:
1. Open 3 tabs with the app
2. Tab 1: Create a product
3. **Expected**: Tabs 2 & 3 show it instantly
4. Tab 2: Update the product
5. **Expected**: Tabs 1 & 3 see update instantly
6. Tab 3: Delete the product
7. **Expected**: Tabs 1 & 2 remove it instantly

### What to verify:
- [ ] Real-time sync across all tabs
- [ ] No polling (uses WebSocket)
- [ ] Instant updates (< 100ms)
- [ ] Handles many concurrent users

---

## Performance Benchmarks 📈

### Expected Performance:

| Operation | Without Cache | With Cache | Target |
|-----------|---------------|------------|--------|
| Load 100 products | ~200ms | ~5ms | ✅ |
| Search products | ~50ms | ~50ms* | ✅ |
| Create product | ~100ms | ~100ms** | ✅ |
| Real-time update | ~50ms | ~50ms | ✅ |

*Text search doesn't cache (always fresh)
**Writes invalidate cache

### Load Testing:
```bash
# Install Apache Bench
# Windows: Download from https://www.apachelounge.com/download/

# Test 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3001/health

# Target: > 500 req/sec
```

---

## Known Issues / Limitations ⚠️

1. **Redis**: Optional but recommended for production
   - Without Redis: No caching (slower but works fine)
   - Solution: Install Redis for production

2. **Conflict Resolution**: Currently only on Products
   - Other entities coming in future phases
   - Solution: Manually implemented per entity

3. **File Uploads**: Not tested in this phase
   - Product images may need special handling
   - Test in Phase 2

4. **Large Datasets**:
   - IndexedDB limited to ~50MB in some browsers
   - Solution: Implement pagination for large datasets

---

## Troubleshooting 🔧

### Server won't start:
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill process if needed
taskkill //F //PID <PID>
```

### Frontend won't connect:
1. Check CORS settings in server
2. Verify API_URL in .env
3. Check browser console for errors

### WebSocket not working:
1. Check Socket.io connection in DevTools
2. Verify port 3001 is accessible
3. Check firewall settings

### Redis warnings:
- Not critical! System works without Redis
- Install Redis to enable caching
- See installation guide in summary doc

---

## Success Criteria ✅

Phase 1 is successful if:

- [ ] **Toast Notifications**: All operations show feedback
- [ ] **Connection Monitoring**: Offline detection works
- [ ] **Conflict Resolution**: Modal appears and resolves conflicts
- [ ] **Real-Time Sync**: Changes propagate instantly
- [ ] **Audit Logs**: All operations are tracked
- [ ] **Error Handling**: Retries work, errors shown properly
- [ ] **Caching**: System works (faster with Redis)
- [ ] **Database Indexes**: Queries are fast
- [ ] **Offline Mode**: Can work without network
- [ ] **Multi-Tab**: Sync works across tabs

---

## Test Results Template 📋

Copy and fill this out:

```
## Phase 1 Test Results

Date: ____________
Tester: ____________

### Test Summary
- [ ] Test 1: Toast Notifications - Pass/Fail
- [ ] Test 2: Connection Monitoring - Pass/Fail
- [ ] Test 3: Conflict Resolution - Pass/Fail
- [ ] Test 4: Real-Time Sync - Pass/Fail
- [ ] Test 5: Audit Logs - Pass/Fail
- [ ] Test 6: Error Handling - Pass/Fail
- [ ] Test 7: Caching - Pass/Fail
- [ ] Test 8: Database Indexes - Pass/Fail
- [ ] Test 9: Offline Queue - Pass/Fail
- [ ] Test 10: Multi-Tab Sync - Pass/Fail

### Issues Found:
1. _______________
2. _______________

### Notes:
_______________
```

---

## Next Steps After Testing

Once testing is complete:
1. Document any issues found
2. Fix critical bugs
3. Optimize performance bottlenecks
4. Proceed to Phase 2 (Advanced Features)

---

**Happy Testing! 🚀**
