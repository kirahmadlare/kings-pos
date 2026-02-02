# API Endpoints Documentation

## Backend Routes Available

All routes are prefixed with `/api`

### ✅ Authentication & Authorization
- **Route File:** `auth.js`, `auth2fa.js`
- **Base Path:** `/api/auth`
- **Endpoints:**
  - POST `/auth/register` - User registration
  - POST `/auth/login` - User login
  - POST `/auth/logout` - User logout
  - POST `/auth/refresh` - Refresh JWT token
  - POST `/auth/2fa/*` - 2FA endpoints

### ✅ Employees Management
- **Route File:** `employees.js`
- **Base Path:** `/api/employees`
- **Endpoints:**
  - GET `/employees` - List all employees
  - POST `/employees` - Create employee
  - GET `/employees/:id` - Get employee details
  - PUT `/employees/:id` - Update employee
  - DELETE `/employees/:id` - Delete employee

### ✅ Shifts Management
- **Route File:** `shifts.js`
- **Base Path:** `/api/shifts`
- **Endpoints:**
  - GET `/shifts` - List shifts
  - POST `/shifts` - Create shift
  - GET `/shifts/:id` - Get shift details
  - PUT `/shifts/:id` - Update shift
  - DELETE `/shifts/:id` - Delete shift

### ✅ Products Management
- **Route File:** `products.js`
- **Base Path:** `/api/products`
- **Endpoints:**
  - GET `/products` - List products
  - POST `/products` - Create product
  - GET `/products/:id` - Get product details
  - PUT `/products/:id` - Update product
  - DELETE `/products/:id` - Delete product

### ✅ Sales & Orders
- **Route File:** `sales.js`
- **Base Path:** `/api/sales`
- **Endpoints:**
  - GET `/sales` - List sales
  - POST `/sales` - Create sale
  - GET `/sales/:id` - Get sale details
  - PUT `/sales/:id` - Update sale
  - DELETE `/sales/:id` - Delete sale

### ✅ Customers Management
- **Route File:** `customers.js`
- **Base Path:** `/api/customers`
- **Endpoints:**
  - GET `/customers` - List customers
  - POST `/customers` - Create customer
  - GET `/customers/:id` - Get customer details
  - PUT `/customers/:id` - Update customer
  - DELETE `/customers/:id` - Delete customer

### ✅ Credits & Loyalty
- **Route File:** `credits.js`, `loyalty.js`
- **Base Path:** `/api/credits`, `/api/loyalty`
- **Endpoints:**
  - Credits management
  - Loyalty programs
  - Points and rewards

### ✅ Inventory Management
- **Route File:** `inventory.js`
- **Base Path:** `/api/inventory`
- **Endpoints:**
  - GET `/inventory` - List inventory
  - POST `/inventory` - Add inventory
  - PUT `/inventory/:id` - Update inventory
  - Stock level management

### ✅ Analytics & Reports
- **Route File:** `analytics.js`, `reports.js`
- **Base Path:** `/api/analytics`, `/api/reports`
- **Endpoints:**
  - GET `/analytics` - Dashboard analytics
  - GET `/analytics/sales` - Sales analytics
  - GET `/analytics/inventory` - Inventory analytics
  - GET `/reports/*` - Various report types

### ✅ Stores Management
- **Route File:** `stores.js`
- **Base Path:** `/api/stores`
- **Endpoints:**
  - GET `/stores` - List stores
  - POST `/stores` - Create store
  - GET `/stores/:id` - Get store details
  - PUT `/stores/:id` - Update store
  - DELETE `/stores/:id` - Delete store

### ✅ Organizations
- **Route File:** `organizations.js`
- **Base Path:** `/api/organizations`
- **Endpoints:**
  - GET `/organizations` - List organizations
  - POST `/organizations` - Create organization
  - GET `/organizations/:id` - Get organization details
  - PUT `/organizations/:id` - Update organization
  - GET `/organizations/:id/stats` - Organization statistics
  - GET `/organizations/:id/groups` - Store groups

### ✅ Plugins System
- **Route File:** `plugins.js`
- **Base Path:** `/api/plugins`
- **Endpoints:**
  - GET `/plugins` - List installed plugins
  - GET `/plugins/marketplace` - Available plugins ⚡ **FIXED**
  - GET `/plugins/ui-components/:injectionPoint` - UI components
  - GET `/plugins/:id` - Plugin details
  - POST `/plugins/install` - Install plugin
  - POST `/plugins/:id/activate` - Activate plugin
  - POST `/plugins/:id/deactivate` - Deactivate plugin
  - DELETE `/plugins/:id` - Uninstall plugin
  - PUT `/plugins/:id/config` - Update plugin config

### ✅ Workflows
- **Route File:** `workflows.js`
- **Base Path:** `/api/workflows`
- **Endpoints:**
  - GET `/workflows` - List workflows
  - POST `/workflows` - Create workflow
  - GET `/workflows/:id` - Get workflow details
  - PUT `/workflows/:id` - Update workflow
  - DELETE `/workflows/:id` - Delete workflow

### ✅ Notifications **NEW**
- **Route File:** `notifications.js`
- **Base Path:** `/api/notifications`
- **Endpoints:**
  - GET `/notifications` - List notifications
  - GET `/notifications/preferences` - Get user preferences
  - PUT `/notifications/preferences` - Update preferences
  - POST `/notifications/test` - Send test notification
  - PATCH `/notifications/:id/read` - Mark as read
  - PATCH `/notifications/:id/unread` - Mark as unread
  - PATCH `/notifications/read-all` - Mark all as read
  - DELETE `/notifications/:id` - Delete notification

### ✅ Customer Portal
- **Route File:** `customerPortal.js`
- **Base Path:** `/api/customer-portal`
- **Endpoints:**
  - Customer-facing portal endpoints
  - Order tracking
  - Profile management

### ✅ Data Management
- **Route File:** `sync.js`, `export.js`, `cache.js`, `conflicts.js`, `indexes.js`
- **Base Paths:** Various
- **Endpoints:**
  - Data synchronization
  - Export/import functionality
  - Cache management
  - Conflict resolution
  - Database indexes

### ✅ Audit Logging
- **Route File:** `audit.js`
- **Base Path:** `/api/audit`
- **Endpoints:**
  - GET `/audit` - List audit logs
  - Audit trail for compliance

## Production Readiness Status

### ✅ Completed
1. **Notifications** - All mock data removed, real API connected
2. **Authentication** - Development features disabled in production
3. **Plugins** - Route order fixed for marketplace endpoint
4. **Environment Configuration** - Production config files created
5. **All Core Routes** - Backend routes implemented and registered

### ⚠️ Requires Data Models
Some endpoints return empty arrays/default data until models are fully implemented:
- Notification storage (currently in-memory)
- User preferences storage
- Some advanced analytics queries

### 🔒 Security Features
- ✅ JWT authentication on all routes
- ✅ Rate limiting configured
- ✅ CORS configured
- ✅ Audit logging enabled
- ✅ 2FA support
- ✅ Role-based access control

## Frontend-Backend Connection Status

### ✅ Fully Connected (Real API)
- Authentication (login, register, 2FA)
- Products management
- Sales/orders
- Customers
- Employees
- Inventory
- Analytics
- Plugins
- Workflows
- Notifications ⚡ **NEW**
- Stores
- Organizations

### ✅ Offline-First with Sync
Most pages use IndexedDB for offline capability and sync with backend when online:
- Dashboard
- POS
- Orders
- Inventory (local + sync)
- Customers (local + sync)
- Employees (local + sync)

## Testing Checklist

Before production deployment, test:
- [ ] All authentication flows
- [ ] CRUD operations for each entity
- [ ] Real-time updates (Socket.io)
- [ ] Offline mode functionality
- [ ] Data synchronization
- [ ] Notification system
- [ ] Plugin installation
- [ ] Report generation
- [ ] Export/import functionality
- [ ] Customer portal access

## Notes

1. **Offline-First Architecture**: The application is designed for offline-first operation, so many features work locally and sync when online.

2. **Socket.io**: Real-time features use Socket.io for instant updates across clients.

3. **IndexedDB**: Local database for offline storage using Dexie.js

4. **No Mock Data**: All mock data has been removed from production code.

5. **Environment-Based Features**: Development features (test OTP codes, skip OTP, etc.) are automatically disabled in production builds.

## API Documentation

For detailed API documentation with request/response examples, run the backend server and visit:
- Development: http://localhost:3001/api/health
- Production: {YOUR_DOMAIN}/api/health

Last Updated: 2026-02-01
