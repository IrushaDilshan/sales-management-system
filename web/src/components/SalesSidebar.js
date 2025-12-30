import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const SalesSidebar = () => {
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
                <div className="brand-icon">🛒</div>
                {!isCollapsed && (
                    <div className="brand-text">
                        <div className="brand-title">NLDB</div>
                        <div className="brand-subtitle">Sales</div>
                    </div>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <Link to="/sales-dashboard" className={isActive('/sales-dashboard')} title="Dashboard">
                    <span className="nav-icon">📊</span>
                    {!isCollapsed && <span className="nav-text">Dashboard</span>}
                </Link>

                {/* Products & Inventory Section */}
                {!isCollapsed && (
                    <div style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginTop: '1rem'
                    }}>
                        Products & Inventory
                    </div>
                )}

                <Link to="/categories" className={isActive('/categories')} title="Categories">
                    <span className="nav-icon">📦</span>
                    {!isCollapsed && <span className="nav-text">Categories</span>}
                </Link>

                <Link to="/items" className={isActive('/items')} title="Products">
                    <span className="nav-icon">🏷️</span>
                    {!isCollapsed && <span className="nav-text">Products</span>}
                </Link>

                <Link to="/stock" className={isActive('/stock')} title="Stock">
                    <span className="nav-icon">📊</span>
                    {!isCollapsed && <span className="nav-text">Stock</span>}
                </Link>

                {/* Sales & Customers Section */}
                {!isCollapsed && (
                    <div style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginTop: '1rem'
                    }}>
                        Sales & Customers
                    </div>
                )}

                <Link to="/customers" className={isActive('/customers')} title="Customers">
                    <span className="nav-icon">👥</span>
                    {!isCollapsed && <span className="nav-text">Customers</span>}
                </Link>

                <Link to="/sales" className={isActive('/sales')} title="Sales Entry">
                    <span className="nav-icon">💵</span>
                    {!isCollapsed && <span className="nav-text">Sales Entry</span>}
                </Link>

                <Link to="/sales-history" className={isActive('/sales-history')} title="Sales History">
                    <span className="nav-icon">📋</span>
                    {!isCollapsed && <span className="nav-text">Sales History</span>}
                </Link>

                {/* Quick Links */}
                {!isCollapsed && (
                    <div style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginTop: '1rem'
                    }}>
                        Other
                    </div>
                )}

                <Link to="/dashboard" className={isActive('/dashboard')} title="Admin Portal">
                    <span className="nav-icon">⚙️</span>
                    {!isCollapsed && <span className="nav-text">Admin Portal</span>}
                </Link>
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">S</div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <div className="user-name">Sales</div>
                            <div className="user-role">Manager</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesSidebar;
