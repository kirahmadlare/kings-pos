import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSettingsStore } from '../stores/settingsStore';
import './Layout.css';

function Layout() {
    const { sidebarCollapsed } = useSettingsStore();
    const location = useLocation();

    // POS page uses full screen layout
    const isFullScreen = location.pathname === '/pos';

    if (isFullScreen) {
        return (
            <div className="layout-fullscreen">
                <Outlet />
            </div>
        );
    }

    return (
        <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar />
            <div className="layout-main">
                <Header />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
