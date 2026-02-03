/**
 * @fileoverview Sidebar Navigation Component
 * 
 * Provides main navigation for the application including:
 * - App logo and store name
 * - Navigation links to all main sections
 * - Admin link for admin users
 * - Collapsible functionality for tablet/desktop
 * - Mobile overlay support
 */

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    ClipboardList,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Users,
    UserCog,
    Calendar,
    FileText,
    Award,
    Bell,
    Building2,
    TrendingUp,
    Briefcase,
    PieChart,
    Puzzle,
    Zap,
    Truck,
    Store
} from 'lucide-react';
import './Sidebar.css';

/**
 * Navigation items configuration.
 * Each item has a path, label, and icon component.
 */
const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/inventory/purchase-orders', label: 'Purchase Orders', icon: Truck },
    { path: '/pos', label: 'Point of Sale', icon: ShoppingCart },
    // { path: '/orders', label: 'Orders', icon: ClipboardList }, // Hidden - duplicate of Purchase Orders
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/loyalty', label: 'Loyalty Program', icon: Award },
    { path: '/employees', label: 'Employees', icon: UserCog },
    { path: '/shifts', label: 'Shifts', icon: Calendar },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/central', label: 'Central Console', icon: TrendingUp, ownerOnly: true },
    // { path: '/organization', label: 'Organization', icon: Briefcase, ownerOnly: true }, // Hidden - not working
    // Items below moved to Settings page:
    // { path: '/reports', label: 'Reports', icon: BarChart3 },
    // { path: '/reports/builder', label: 'Report Builder', icon: PieChart, ownerOnly: true },
    // { path: '/stores', label: 'Multi-Store', icon: Building2, ownerOnly: true },
    // { path: '/plugins', label: 'Plugins', icon: Puzzle, ownerOnly: true },
    // { path: '/workflows', label: 'Workflows', icon: Zap, ownerOnly: true },
    // { path: '/audit-logs', label: 'Audit Logs', icon: FileText, ownerOnly: true },
    // { path: '/permissions', label: 'Permissions', icon: Shield, ownerOnly: true },
    { path: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Sidebar Component - Main navigation sidebar
 * 
 * Features:
 * - Collapsible with animated transitions
 * - Mobile overlay for touch devices
 * - Active state for current route
 * - Role-based admin link visibility
 */
function Sidebar() {
    const { user, store, logout } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Check if user is admin
    const isAdmin = user?.role === 'admin';
    // Check if user is owner
    const isOwner = user?.role === 'owner';

    return (
        <>
            {/* Mobile Overlay - Closes sidebar when clicked */}
            <div
                className={`sidebar-overlay ${!sidebarCollapsed ? 'active' : ''}`}
                onClick={toggleSidebar}
            />

            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Header with Logo */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {/* Custom Logo or Shop Name */}
                        {store?.logo ? (
                            <>
                                <img
                                    src={`http://localhost:3001${store.logo}`}
                                    alt={store?.name || 'Store Logo'}
                                    className="logo-icon-custom"
                                    onError={(e) => {
                                        // Fallback to default logo if custom logo fails to load
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="logo-fallback hidden">
                                    <Store size={32} />
                                </div>
                            </>
                        ) : (
                            <div className="logo-name-as-logo">
                                <span>{store?.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="logo-text">
                                <span className="logo-name" style={{ fontSize: store?.logo ? '14px' : '18px' }}>
                                    {store?.name || 'My Store'}
                                </span>
                                {!store?.logo && (
                                    <span className="logo-store-subtitle">Point of Sale</span>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Collapse Toggle Button */}
                    <button
                        className="btn btn-ghost btn-icon sidebar-toggle"
                        onClick={toggleSidebar}
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="sidebar-nav">
                    {navItems
                        .filter(item => !item.ownerOnly || isOwner)
                        .map(({ path, label, icon: Icon }) => (
                            <NavLink
                                key={path}
                                to={path}
                                end={path === '/inventory' || path === '/reports'}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'active' : ''}`
                                }
                                title={sidebarCollapsed ? label : undefined}
                                onClick={(e) => {
                                    console.log('🔗 Navigation clicked:', label, 'to', path);
                                    console.log('👤 User role:', user?.role, 'isOwner:', isOwner);

                                    // Fallback navigation for organization page
                                    if (path === '/organization') {
                                        console.log('🔄 Using fallback navigation for organization');
                                        e.preventDefault();
                                        navigate('/organization');
                                    }
                                }}
                            >
                                <Icon size={20} />
                                {!sidebarCollapsed && <span>{label}</span>}
                            </NavLink>
                        ))}

                    {/* Admin Link - Only visible to admin users */}
                    {isAdmin && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                                `sidebar-link admin-link ${isActive ? 'active' : ''}`
                            }
                            title={sidebarCollapsed ? 'Admin' : undefined}
                        >
                            <Shield size={20} />
                            {!sidebarCollapsed && <span>Admin</span>}
                        </NavLink>
                    )}
                </nav>

                {/* Footer with Logout */}
                <div className="sidebar-footer">
                    <button
                        className="sidebar-link logout-btn"
                        onClick={logout}
                        title={sidebarCollapsed ? 'Logout' : undefined}
                    >
                        <LogOut size={20} />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
