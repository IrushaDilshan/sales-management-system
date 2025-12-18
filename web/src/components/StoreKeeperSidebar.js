import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './StoreKeeperSidebar.css';

const StoreKeeperSidebar = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path) => {
        return location.pathname === path ? 'sidebar-link active' : 'sidebar-link';
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`storekeeper-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Toggle Button */}
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                <span className="toggle-icon">{isCollapsed ? '→' : '←'}</span>
            </button>

            {/* Logo/Brand */}
            <div className="sidebar-brand">
                <div className="brand-icon">📦</div>
                {!isCollapsed && (
                    <div className="brand-text">
                        <div className="brand-title">NLDB</div>
                        <div className="brand-subtitle">Storekeeper</div>
                    </div>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <Link to="/storekeeper/dashboard" className={isActive('/storekeeper/dashboard')} title="Dashboard">
                    <span className="nav-icon">📊</span>
                    {!isCollapsed && <span className="nav-text">Dashboard</span>}
                </Link>

                <Link to="/storekeeper/items" className={isActive('/storekeeper/items')} title="Items">
                    <span className="nav-icon">📦</span>
                    {!isCollapsed && <span className="nav-text">Items</span>}
                </Link>

                <Link to="/storekeeper/stock" className={isActive('/storekeeper/stock')} title="Stock">
                    <span className="nav-icon">📊</span>
                    {!isCollapsed && <span className="nav-text">Stock</span>}
                </Link>

                <Link to="/storekeeper/inventory" className={isActive('/storekeeper/inventory')} title="Inventory">
                    <span className="nav-icon">📋</span>
                    {!isCollapsed && <span className="nav-text">Inventory</span>}
                </Link>
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">S</div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <div className="user-name">Storekeeper</div>
                            <div className="user-role">Inventory</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreKeeperSidebar;
