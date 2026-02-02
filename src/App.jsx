import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { syncPendingChanges } from './services/sync';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Shifts from './pages/Shifts';
import Admin from './pages/Admin';
import Permissions from './pages/Permissions';
import Analytics from './pages/Analytics';
import StoreManagement from './pages/StoreManagement';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import AuditLogs from './pages/AuditLogs';
import LoyaltyDashboard from './pages/LoyaltyDashboard';
import LoyaltySettings from './pages/LoyaltySettings';
import InventoryForecasting from './pages/InventoryForecasting';
import PurchaseOrders from './pages/PurchaseOrders';
import InventoryAlerts from './pages/InventoryAlerts';
import StockOptimization from './pages/StockOptimization';
import NotificationCenter from './pages/NotificationCenter';
import NotificationPreferences from './pages/NotificationPreferences';
import StoreComparison from './pages/StoreComparison';
import InventoryTransfer from './pages/InventoryTransfer';
import OrganizationDashboard from './pages/OrganizationDashboard';
import CentralDashboard from './pages/CentralDashboard';
import ConsolidatedReports from './pages/ConsolidatedReports';
import ReportBuilder from './pages/ReportBuilder';
import Plugins from './pages/Plugins';
import WorkflowBuilder from './pages/WorkflowBuilder';
import PortalLogin from './portal/pages/PortalLogin';
import PortalDashboard from './portal/pages/PortalDashboard';
import PortalOrders from './portal/pages/PortalOrders';
import PortalCredits from './portal/pages/PortalCredits';
import PortalProfile from './portal/pages/PortalProfile';
import TwoFactorSetup from './pages/TwoFactorSetup';
import PermissionsManager from './pages/PermissionsManager';
import IPWhitelistSettings from './pages/IPWhitelistSettings';
import ToastContainer from './components/Toast';
import ConnectionIndicator from './components/ConnectionIndicator';
import './index.css';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route wrapper (redirect if logged in)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const initializeTheme = useSettingsStore(state => state.initializeTheme);
  const { isAuthenticated, store } = useAuthStore();

  useEffect(() => {
    // Initialize theme on app load
    initializeTheme();
  }, [initializeTheme]);

  // Auto-sync every 60 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated || !store) return;

    console.log('🔄 Auto-sync enabled - syncing every 60 seconds');

    // Initial sync after 5 seconds
    const initialTimeout = setTimeout(() => {
      syncPendingChanges().catch(err => {
        console.error('Auto-sync failed:', err);
      });
    }, 5000);

    // Then sync every 60 seconds
    const syncInterval = setInterval(() => {
      console.log('🔄 Auto-sync: Syncing pending changes...');
      syncPendingChanges().then(result => {
        if (result.success) {
          console.log(`✅ Auto-sync: Synced ${result.syncedCount} records`);
        } else {
          console.warn('⚠️ Auto-sync failed:', result.error);
        }
      }).catch(err => {
        console.error('❌ Auto-sync error:', err);
      });
    }, 60000); // 60 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated, store]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/employee" element={<EmployeeLoginPage />} />

          {/* Customer Portal routes */}
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal/dashboard" element={<PortalDashboard />} />
          <Route path="/portal/orders" element={<PortalOrders />} />
          <Route path="/portal/credits" element={<PortalCredits />} />
          <Route path="/portal/profile" element={<PortalProfile />} />

          {/* Protected routes with layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/forecasting" element={<InventoryForecasting />} />
            <Route path="inventory/purchase-orders" element={<PurchaseOrders />} />
            <Route path="inventory/alerts" element={<InventoryAlerts />} />
            <Route path="inventory/optimization" element={<StockOptimization />} />
            <Route path="pos" element={<POS />} />
            <Route path="orders" element={<Orders />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/builder" element={<ReportBuilder />} />
            <Route path="customers" element={<Customers />} />
            <Route path="employees" element={<Employees />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="stores" element={<StoreManagement />} />
            <Route path="stores/comparison" element={<StoreComparison />} />
            <Route path="stores/transfer" element={<InventoryTransfer />} />
            <Route path="organization" element={<OrganizationDashboard />} />
            <Route path="central" element={<CentralDashboard />} />
            <Route path="central/reports" element={<ConsolidatedReports />} />
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="notifications/preferences" element={<NotificationPreferences />} />
            <Route path="loyalty" element={<LoyaltyDashboard />} />
            <Route path="loyalty/settings" element={<LoyaltySettings />} />
            <Route path="plugins" element={<Plugins />} />
            <Route path="workflows" element={<WorkflowBuilder />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/2fa" element={<TwoFactorSetup />} />
            <Route path="settings/ip-whitelist" element={<IPWhitelistSettings />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="permissions/manager" element={<PermissionsManager />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Global Connection Status */}
      <ConnectionIndicator />
    </>
  );
}

export default App;
