import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path) => {
        return location.pathname === path ? 'sidebar-link active' : 'sidebar-link';
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Toggle Button */}
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                <span className="toggle-icon">{isCollapsed ? '→' : '←'}</span>
            </button>

            {/* Logo/Brand */}
            <div className="sidebar-brand">
                <div className="brand-icon">🐄</div>
                {!isCollapsed && (
                    <div className="brand-text">
                        <div className="brand-title">NLDB</div>
                        <div className="brand-subtitle">Manager</div>
                    </div>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <Link to="/dashboard" className={isActive('/dashboard')} title="Dashboard">
                    <span className="nav-icon">📊</span>
                    {!isCollapsed && <span className="nav-text">Dashboard</span>}
                </Link>

                <Link to="/users" className={isActive('/users')} title="Users">
                    <span className="nav-icon">👥</span>
                    {!isCollapsed && <span className="nav-text">Users</span>}
                </Link>

                <Link to="/shops" className={isActive('/shops')} title="Shops">
                    <span className="nav-icon">🏪</span>
                    {!isCollapsed && <span className="nav-text">Shops</span>}
                </Link>

                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '1rem 0' }}></div>

                <Link to="/sales-dashboard" className={isActive('/sales-dashboard')} title="Sales Portal" style={{ backgroundColor: '#f3f4f6' }}>
                    <span className="nav-icon">🛒</span>
                    {!isCollapsed && <span className="nav-text" style={{ fontWeight: 'bold' }}>Sales Portal</span>}
                </Link>

                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '1rem 0' }}></div>

                <Link to="/routes" className={isActive('/routes')} title="Routes">
                    <span className="nav-icon">🗺️</span>
                    {!isCollapsed && <span className="nav-text">Routes</span>}
                </Link>

                <Link to="/daily-income" className={isActive('/daily-income')} title="Daily Income">
                    <span className="nav-icon">💰</span>
                    {!isCollapsed && <span className="nav-text">Daily Income</span>}
                </Link>

                <Link to="/settings" className={isActive('/settings')} title="Settings">
                    <span className="nav-icon">⚙️</span>
                    {!isCollapsed && <span className="nav-text">Settings</span>}
                </Link>
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">A</div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <div className="user-name">Admin</div>
                            <div className="user-role">Manager</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
