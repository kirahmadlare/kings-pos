# Database Indexes Documentation

This document describes all database indexes in the King's POS system and their purposes.

## Overview

Database indexes improve query performance by creating efficient lookup structures. Each index below is designed for specific query patterns used in the application.

## Index Strategy

- **Compound Indexes**: Multiple fields combined for complex queries
- **Text Indexes**: Full-text search on name fields
- **Unique Indexes**: Ensure data integrity
- **Sparse Indexes**: Only index documents with the field present

---

## Products Collection

### 1. Barcode Lookup
```javascript
{ storeId: 1, barcode: 1 }
```
**Purpose**: Fast product lookup by barcode during POS transactions
**Query**: Finding product by scanning barcode

### 2. Category Filter
```javascript
{ storeId: 1, categoryId: 1 }
```
**Purpose**: Filter products by category
**Query**: Product list filtered by category

### 3. Active Products
```javascript
{ storeId: 1, isActive: 1, name: 1 }
```
**Purpose**: List all active products sorted by name (most common query)
**Query**: Inventory page, POS product selection

### 4. Low Stock Alerts
```javascript
{ storeId: 1, isActive: 1, quantity: 1 }
```
**Purpose**: Find products below stock threshold
**Query**: Low stock report, inventory alerts

### 5. Price Range
```javascript
{ storeId: 1, price: 1 }
```
**Purpose**: Filter products by price range
**Query**: Price analysis, product filtering

### 6. Text Search
```javascript
{ storeId: 1, name: 'text', sku: 'text' }
```
**Purpose**: Search products by name or SKU
**Query**: Product search bar

### 7. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection and sync operations
**Query**: Data synchronization

---

## Sales Collection

### 1. Store Sales by Date
```javascript
{ storeId: 1, createdAt: -1 }
```
**Purpose**: Daily sales reports (most common)
**Query**: Today's sales, sales history

### 2. Employee Performance
```javascript
{ storeId: 1, employeeId: 1, createdAt: -1 }
```
**Purpose**: Track employee sales performance
**Query**: Employee reports, commission calculations

### 3. Customer Purchase History
```javascript
{ storeId: 1, customerId: 1, createdAt: -1 }
```
**Purpose**: View customer's order history
**Query**: Customer profile page

### 4. Payment Method Analytics
```javascript
{ storeId: 1, paymentMethod: 1, createdAt: -1 }
```
**Purpose**: Analyze payment methods (cash vs card vs credit)
**Query**: Payment method reports

### 5. Payment Status Tracking
```javascript
{ storeId: 1, paymentStatus: 1, createdAt: -1 }
```
**Purpose**: Track pending/partial payments
**Query**: Outstanding payments report

### 6. Sales Status
```javascript
{ storeId: 1, status: 1, createdAt: -1 }
```
**Purpose**: Filter by completed/voided/refunded
**Query**: Refund reports, voided transactions

### 7. Shift Sales
```javascript
{ storeId: 1, shiftId: 1, createdAt: -1 }
```
**Purpose**: Sales during specific shift
**Query**: Shift closing report

### 8. Total Amount Range
```javascript
{ storeId: 1, total: -1, createdAt: -1 }
```
**Purpose**: High-value transaction reports
**Query**: Large transaction analysis

### 9. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection and sync
**Query**: Data synchronization

---

## Customers Collection

### 1. Text Search
```javascript
{ storeId: 1, name: 'text', phone: 'text', email: 'text' }
```
**Purpose**: Search customers by name, phone, or email
**Query**: Customer search

### 2. Phone Lookup
```javascript
{ storeId: 1, phone: 1 }
```
**Purpose**: Fast exact match phone lookup
**Query**: Quick customer lookup at POS

### 3. Email Lookup
```javascript
{ storeId: 1, email: 1 }
```
**Purpose**: Find customer by email
**Query**: Email-based customer search

### 4. Top Customers by Spending
```javascript
{ storeId: 1, totalSpent: -1 }
```
**Purpose**: Identify VIP customers
**Query**: Top customers report

### 5. Top Customers by Orders
```javascript
{ storeId: 1, totalOrders: -1 }
```
**Purpose**: Most frequent customers
**Query**: Loyalty program insights

### 6. Recent Customers
```javascript
{ storeId: 1, lastOrderDate: -1 }
```
**Purpose**: Recently active customers
**Query**: Customer engagement analysis

### 7. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection
**Query**: Data synchronization

---

## Employees Collection

### 1. Active Employees
```javascript
{ storeId: 1, isActive: 1, name: 1 }
```
**Purpose**: List active employees
**Query**: Employee selection, shift assignment

### 2. Email Lookup (Unique)
```javascript
{ storeId: 1, email: 1 }
```
**Purpose**: Unique email per store, fast lookup
**Query**: Employee authentication

### 3. PIN Authentication
```javascript
{ storeId: 1, pin: 1 }
```
**Purpose**: Fast PIN-based login
**Query**: POS employee login

### 4. Role-Based Queries
```javascript
{ storeId: 1, role: 1 }
```
**Purpose**: Filter employees by role
**Query**: Manager list, cashier list

### 5. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection
**Query**: Data synchronization

---

## Credits Collection

### 1. Overdue Credits
```javascript
{ storeId: 1, status: 1, dueDate: 1 }
```
**Purpose**: Find overdue payments (critical)
**Query**: Overdue credit report

### 2. Customer Credit History
```javascript
{ storeId: 1, customerId: 1, createdAt: -1 }
```
**Purpose**: Customer's credit history
**Query**: Customer credit profile

### 3. Sale Reference
```javascript
{ storeId: 1, saleId: 1 }
```
**Purpose**: Link credit to original sale
**Query**: Sale details with credit info

### 4. Pending Credits by Amount
```javascript
{ storeId: 1, status: 1, amount: -1 }
```
**Purpose**: Large pending credits
**Query**: Outstanding credit analysis

### 5. Recently Paid
```javascript
{ storeId: 1, paidAt: -1 }
```
**Purpose**: Recent credit payments
**Query**: Payment history

### 6. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection
**Query**: Data synchronization

---

## Categories Collection

### 1. Sort Order
```javascript
{ storeId: 1, sortOrder: 1 }
```
**Purpose**: Display categories in order
**Query**: Category list

### 2. Name Lookup
```javascript
{ storeId: 1, name: 1 }
```
**Purpose**: Find category by name
**Query**: Category management

### 3. Sync Version
```javascript
{ storeId: 1, syncVersion: 1, lastSyncedAt: -1 }
```
**Purpose**: Conflict detection
**Query**: Data synchronization

---

## ClockEvents Collection

### 1. Active Clock Events
```javascript
{ storeId: 1, clockOut: 1 }
```
**Purpose**: Find employees currently clocked in
**Query**: Who's working now

### 2. Employee's Active Shift
```javascript
{ storeId: 1, employeeId: 1, clockOut: 1 }
```
**Purpose**: Check if employee is clocked in
**Query**: Clock in/out validation

### 3. Clock Events by Date
```javascript
{ storeId: 1, clockIn: -1 }
```
**Purpose**: View shifts by date
**Query**: Daily attendance report

### 4. Shift Reference
```javascript
{ storeId: 1, shiftId: 1 }
```
**Purpose**: Link to scheduled shift
**Query**: Shift vs actual time comparison

### 5. Employee Performance
```javascript
{ storeId: 1, employeeId: 1, clockIn: -1 }
```
**Purpose**: Employee work history
**Query**: Timesheet, payroll

### 6. High Sales Shifts
```javascript
{ storeId: 1, salesTotal: -1, clockIn: -1 }
```
**Purpose**: Best performing shifts
**Query**: Performance analysis

---

## Shifts Collection

### 1. Shifts by Date
```javascript
{ storeId: 1, date: 1, startTime: 1 }
```
**Purpose**: Daily schedule view
**Query**: Today's schedule

### 2. Employee's Shifts
```javascript
{ storeId: 1, employeeId: 1, date: -1 }
```
**Purpose**: Employee schedule
**Query**: My shifts page

### 3. Shift Status
```javascript
{ storeId: 1, status: 1, date: 1 }
```
**Purpose**: Filter by status (scheduled/completed/missed)
**Query**: Missed shifts report

### 4. Upcoming Shifts
```javascript
{ storeId: 1, status: 1, date: 1, startTime: 1 }
```
**Purpose**: Next shifts to start
**Query**: Schedule reminders

---

## Monitoring Index Performance

Use the Index Monitoring API to track index usage:

```bash
# Get all index statistics
GET /api/indexes/stats

# Get indexes for specific collection
GET /api/indexes/products

# Rebuild indexes (use with caution)
POST /api/indexes/rebuild/products

# Analyze slow queries
GET /api/indexes/slow-queries/analysis
```

---

## Best Practices

1. **Always filter by storeId first** - Multi-tenant data isolation
2. **Use compound indexes** - Match your query patterns exactly
3. **Monitor index usage** - Remove unused indexes
4. **Avoid over-indexing** - Each index has write overhead
5. **Test query performance** - Use MongoDB explain() to verify

---

## Maintenance

### Index Rebuild
Indexes are automatically maintained by MongoDB. Rebuild only if:
- Indexes become fragmented after many updates
- Corruption suspected
- Performance degrades unexpectedly

### Index Size Monitoring
Monitor index size to ensure they fit in RAM:
```bash
db.collection.stats().indexSizes
```

Large indexes impact performance. Consider:
- Archiving old data
- Reducing index count
- Using partial indexes

---

## Future Improvements

1. **Partial Indexes**: Index only active records
2. **Covered Queries**: Include projected fields in index
3. **Wildcard Indexes**: Flexible schema support
4. **Geospatial Indexes**: Location-based queries (future stores)

---

**Last Updated**: 2026-01-31
**Version**: 1.0
