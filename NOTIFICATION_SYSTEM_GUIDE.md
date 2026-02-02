# Notification System - Complete Guide

## ✅ What Has Been Implemented

The notification system is now **fully functional** with the following features:

### Backend (Complete)
- ✅ **Notification Model** - MongoDB schema for storing notifications
- ✅ **Notification Service** - Functions for creating and managing notifications
- ✅ **Notification Routes** - REST API endpoints
- ✅ **Socket.io Integration** - Real-time notification broadcasting
- ✅ **Auto Triggers** - Notifications created automatically for events

### Frontend (Complete)
- ✅ **Notification Bell** - Shows unread count in header
- ✅ **Dropdown Menu** - Quick view of last 5 notifications
- ✅ **Real-time Updates** - Socket.io integration for instant notifications
- ✅ **Sound Notifications** - Plays sound when new notification arrives
- ✅ **Mark as Read/Unread** - Individual and bulk actions
- ✅ **Notification Center** - Full page at `/notifications`
- ✅ **Notification Preferences** - Configure notification settings

---

## 🎯 How the Notification System Works

### Architecture

```
Event Happens (e.g., low stock)
    ↓
Backend creates notification in MongoDB
    ↓
Backend broadcasts via Socket.io to all connected clients
    ↓
Frontend receives notification instantly
    ↓
Bell icon shows badge, plays sound, animates
    ↓
User clicks bell to view notification
    ↓
User marks as read (syncs to database)
```

---

## 📋 Notification Types

The system supports these notification types:

### 1. **Inventory Notifications** 🔴
- **Low Stock Alert** - When product quantity ≤ reorder level
- **Out of Stock** - When product quantity = 0
- **Priority**: High/Urgent

### 2. **Sales Notifications** 💰
- **New Sale** - Every time a sale is completed
- **Large Sale** - When sale total > $100
- **Credit Payment Due** - When credit payment is created
- **Priority**: Normal/High

### 3. **System Notifications** ⚙️
- **Test Notification** - Manual test from settings
- **System Updates** - Admin notifications
- **Priority**: Normal

### 4. **Report Notifications** 📊 (Future)
- Daily sales reports
- Weekly summaries

---

## 🚀 How to Test It

### Test 1: Low Stock Notification

1. **Go to Inventory page**
2. **Find a product** or create a new one
3. **Set reorder level** to 10
4. **Set quantity** to 10 or below
5. **Click Save**
6. **Watch the notification bell** - it should:
   - Show a red badge with "1"
   - Pulse/animate
   - Play a sound (if notification.mp3 exists)
7. **Click the bell** to see:
   - ⚠️ Low Stock Alert
   - Message: "Product Name is running low. Only X units remaining"

### Test 2: Out of Stock Notification

1. **Go to Inventory page**
2. **Find a product**
3. **Set quantity to 0**
4. **Click Save**
5. **Watch the notification bell**:
   - Badge shows "1" (or +1 if you have unread)
   - Animates
6. **Click the bell**:
   - 🚨 Out of Stock
   - Message: "Product Name is out of stock! Reorder immediately."

### Test 3: New Sale Notification

1. **Go to POS page**
2. **Add products to cart**
3. **Complete a sale** (cash/card/credit)
4. **Watch the notification bell**:
   - Badge increases
   - Animates
5. **Click the bell**:
   - 💰 New Sale
   - Message: "Sale completed for $X.XX with Y items"

### Test 4: Large Sale Notification

1. **Go to POS page**
2. **Add products totaling more than $100**
3. **Complete the sale**
4. **Check notifications**:
   - You'll see TWO notifications:
     - 💰 New Sale
     - 🌟 Large Sale (for sales > $100)

### Test 5: Manual Test Notification

1. **Go to Notification Center** (`/notifications`)
2. **Click "Send Test Notification"** button
3. **Watch the bell**:
   - Badge increases
   - Animates
4. **Click the bell**:
   - 🧪 Test Notification
   - Message: "This is a test notification..."

### Test 6: Real-time Sync (Multiple Devices)

1. **Open the app in two browser tabs**
2. **In Tab 1**: Create a low stock product
3. **In Tab 2**: The notification should appear **instantly** without refresh!
4. **In Tab 1**: Mark notification as read
5. **In Tab 2**: The badge count should update immediately

---

## 🔍 Where to Find Notifications

### 1. Notification Bell (Header)
- **Location**: Top right corner, next to profile
- **Shows**: Unread count badge
- **Click**: Opens dropdown with last 5 notifications
- **Features**:
  - Mark individual as read
  - Mark all as read
  - View all notifications link

### 2. Notification Center (Full Page)
- **Location**: `/notifications` route
- **Access**: Click "View all notifications" in dropdown
- **Features**:
  - All notifications (paginated)
  - Filter by type (sales, inventory, system)
  - Filter by read/unread
  - Search notifications
  - Delete notifications
  - Bulk actions

### 3. Notification Preferences
- **Location**: `/notifications/preferences` or Settings
- **Features**:
  - Enable/disable notification types
  - Configure channels (app, email, SMS, push)
  - Test notification button

---

## 📡 API Endpoints

### Get Notifications
```http
GET /api/notifications?page=1&limit=20&type=inventory&read=false
```

**Response:**
```json
{
  "notifications": [...],
  "totalCount": 42,
  "currentPage": 1,
  "totalPages": 3
}
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "count": 5
}
```

### Mark as Read
```http
PATCH /api/notifications/:id/read
```

### Mark All as Read
```http
PATCH /api/notifications/read-all
```

### Send Test Notification
```http
POST /api/notifications/test
```

### Delete Notification
```http
DELETE /api/notifications/:id
```

### Delete Old Notifications
```http
DELETE /api/notifications/cleanup?daysOld=30
```

---

## 🎨 Notification Structure

Each notification has:

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  userId: ObjectId (optional),
  type: 'sales' | 'inventory' | 'system' | 'customer' | 'employee' | 'report',
  title: 'Low Stock Alert',
  message: 'Product X is running low...',
  read: false,
  priority: 'normal' | 'low' | 'high' | 'urgent',
  metadata: { productId, currentQuantity, ... },
  relatedEntity: { type: 'product', id: ObjectId },
  action: { label: 'View Product', url: '/inventory' },
  createdAt: Date,
  readAt: Date
}
```

---

## 🔄 Real-time Events (Socket.io)

### Events Emitted by Server

#### `notification:new`
Sent when a new notification is created.
```javascript
{
  id: '...',
  type: 'inventory',
  title: 'Low Stock Alert',
  message: '...',
  priority: 'high',
  read: false,
  metadata: {},
  action: { label: '...', url: '...' },
  createdAt: '2024-01-01T12:00:00.000Z'
}
```

#### `notification:updated`
Sent when a notification is marked as read/unread.
```javascript
{
  id: '...',
  read: true
}
```

#### `notification:all-read`
Sent when all notifications are marked as read.
```javascript
{}
```

#### `notification:deleted`
Sent when a notification is deleted.
```javascript
{
  id: '...'
}
```

---

## 🎵 Sound Notifications

The system tries to play a notification sound when new notifications arrive.

### Add Custom Sound

1. Place your notification sound file in the public folder:
   ```
   C:\Users\kingm\Downloads\POS\public\notification.mp3
   ```

2. The system will automatically play it when notifications arrive.

3. If the file doesn't exist, it fails silently (no error).

---

## 📊 Notification Triggers

### Current Triggers

| Event | Trigger Location | Notification Type |
|-------|-----------------|-------------------|
| Product stock ≤ reorder level | `products.js:166-179` | Low Stock Alert |
| Product stock = 0 | `products.js:166-179` | Out of Stock |
| Product stock update (PATCH /stock) | `products.js:249-268` | Low Stock/Out of Stock |
| New sale created | `sales.js:178-202` | New Sale |
| Large sale (> $100) | `sales.js:178-202` | Large Sale |
| Credit payment created | `sales.js:178-202` | Credit Payment Due |
| Manual test | `/notifications/test` | Test Notification |

### Future Triggers (To Add)

- **Customer-related**: VIP customer detection, birthday reminders
- **Employee-related**: Shift reminders, performance alerts
- **Reports**: Daily/weekly report generation
- **System**: Backup status, plugin updates

---

## 🔧 Advanced Configuration

### Customize Large Sale Threshold

Edit `server/routes/sales.js` line 195:

```javascript
// Change from $100 to $500
if (sale.total > 500) {
    const largeSaleNotification = await notificationService.createLargeSaleNotification(
        req.storeId,
        sale,
        500  // New threshold
    );
    // ...
}
```

### Add Custom Notification Type

1. **Add to Notification model** (`server/models/Notification.js`):
```javascript
type: {
    type: String,
    enum: ['sales', 'inventory', 'system', 'customer', 'employee', 'report', 'custom'],
    //      ↑ Add your type here
}
```

2. **Create service function** (`server/services/notificationService.js`):
```javascript
export async function createCustomNotification(storeId, data) {
    return await createNotification({
        storeId,
        type: 'custom',
        title: 'Custom Alert',
        message: data.message,
        priority: 'normal',
        metadata: data
    });
}
```

3. **Trigger from route**:
```javascript
import * as notificationService from '../services/notificationService.js';

// In your route handler
const notification = await notificationService.createCustomNotification(storeId, {
    message: 'Something happened!'
});

const io = req.app.get('io');
if (io) {
    notificationService.broadcastNotification(io, storeId, notification);
}
```

---

## 🧹 Maintenance

### Clean Old Notifications

Run this periodically (e.g., via cron job):

```http
DELETE /api/notifications/cleanup?daysOld=30
```

This deletes notifications older than 30 days.

### Manual Cleanup

Or clean via MongoDB shell:

```javascript
db.notifications.deleteMany({
    createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});
```

---

## 🐛 Troubleshooting

### Notifications not appearing?

1. **Check server is running**: Look for Socket.io enabled in server logs
2. **Check Socket.io connection**: Open browser console, should see "Socket connected: [id]"
3. **Check MongoDB**: Ensure notifications are being saved
   ```bash
   mongosh
   use kings-pos
   db.notifications.find().limit(5)
   ```

### Badge count not updating?

1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check browser console** for errors
3. **Verify Socket.io events**: Check Network tab → WS (WebSocket)

### Sound not playing?

1. Check if `public/notification.mp3` exists
2. Browser may block autoplay - user must interact with page first
3. Check browser console for audio errors

### Notifications coming from other stores?

This shouldn't happen due to storeId filtering, but if it does:
- Check Socket.io room joining in `server/socket/index.js`
- Verify authentication middleware

---

## 📝 Database Schema

```javascript
// Notification collection in MongoDB
{
  _id: ObjectId("..."),
  storeId: ObjectId("..."),
  userId: null,
  organizationId: null,
  type: "inventory",
  title: "⚠️ Low Stock Alert",
  message: "Coca Cola is running low. Only 5 units remaining (reorder level: 10)",
  read: false,
  priority: "high",
  metadata: {
    productId: ObjectId("..."),
    productName: "Coca Cola",
    currentQuantity: 5,
    reorderLevel: 10
  },
  relatedEntity: {
    type: "product",
    id: ObjectId("...")
  },
  action: {
    label: "View Product",
    url: "/inventory"
  },
  expiresAt: null,
  readAt: null,
  createdAt: ISODate("2024-01-01T12:00:00.000Z"),
  updatedAt: ISODate("2024-01-01T12:00:00.000Z")
}
```

---

## 🎉 Summary

Your notification system is **now fully operational**!

### What works right now:
✅ Low stock alerts when products run low
✅ Out of stock alerts when products hit 0
✅ New sale notifications
✅ Large sale notifications (> $100)
✅ Credit payment due notifications
✅ Real-time updates via Socket.io
✅ Sound and visual notifications
✅ Mark as read/unread
✅ Notification center page
✅ Test notifications

### To test immediately:
1. Go to Inventory
2. Set a product quantity to 0
3. Watch the notification bell light up! 🔔

---

## 📚 Files Modified/Created

### Backend
- ✅ `server/models/Notification.js` - New model
- ✅ `server/models/index.js` - Export Notification
- ✅ `server/services/notificationService.js` - New service
- ✅ `server/routes/notifications.js` - Updated routes
- ✅ `server/routes/products.js` - Added notification triggers
- ✅ `server/routes/sales.js` - Added notification triggers

### Frontend
- ✅ `src/components/NotificationBell.jsx` - Added Socket.io listeners

---

Need help? The notification system is ready to use! 🚀
