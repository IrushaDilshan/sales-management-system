import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import './Sidebar.css';

const StoreKeeperSidebar = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path) => {
        return location.pathname === path ? 'sidebar-link active' : 'sidebar-link';
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <aside className={`modern-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Branding Section */}
            <div className="sidebar-header">
                <div className="brand-wrapper">
                    <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <span className="logo-icon">📦</span>
                    </div>
                    {!isCollapsed && (
                        <div className="brand-info">
                            <h2 className="brand-name">NLDB</h2>
                            <span className="brand-tagline">Logistics Portal</span>
                        </div>
                    )}
                </div>
                <button className="toggle-trigger" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="sidebar-menu">


                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Asset Management</span>}


                    <Link to="/storekeeper/inventory" className={isActive('/storekeeper/inventory')}>
                        <div className="link-icon">📋</div>
                        {!isCollapsed && <span className="link-text">Stock Ledger</span>}
                    </Link>
                </div>

                <div className="menu-group settings-group">
                    <Link to="/storekeeper/settings" className={isActive('/storekeeper/settings')}>
                        <div className="link-icon">⚙️</div>
                        {!isCollapsed && <span className="link-text">Logistics Config</span>}
                    </Link>
                </div>
            </nav>

            {/* User Account / Footer */}
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar-modern" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                        S
                    </div>
                    {!isCollapsed && (
                        <div className="user-details">
                            <span className="u-name">Storekeeper</span>
                            <span className="u-role">Inventory Staff</span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button className="logout-pill" onClick={handleLogout}>
                        <span className="logout-icon">🚪</span>
                        <span>Sign Out</span>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default StoreKeeperSidebar;
