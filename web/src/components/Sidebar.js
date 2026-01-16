import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import './Sidebar.css';

const Sidebar = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userData, setUserData] = useState({ name: 'Admin', role: 'Administrator' });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('name, role')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setUserData({
                        name: data.name,
                        role: data.role.charAt(0).toUpperCase() + data.role.slice(1)
                    });
                }
            }
        };
        fetchUser();
    }, []);

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
                    <div className="brand-logo">
                        <span className="logo-icon">🌿</span>
                    </div>
                    {!isCollapsed && (
                        <div className="brand-info">
                            <h2 className="brand-name">NLDB</h2>
                            <span className="brand-tagline">Manager Pro</span>
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
                    {!isCollapsed && <span className="group-label">General</span>}
                    <Link to="/dashboard" className={isActive('/dashboard')}>
                        <div className="link-icon">📊</div>
                        {!isCollapsed && <span className="link-text">Control Center</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Product Catalog</span>}
                    <Link to="/categories" className={isActive('/categories')}>
                        <div className="link-icon">📦</div>
                        {!isCollapsed && <span className="link-text">Categories</span>}
                    </Link>
                    <Link to="/items" className={isActive('/items')}>
                        <div className="link-icon">🏷️</div>
                        {!isCollapsed && <span className="link-text">Products</span>}
                    </Link>
                    <Link to="/stock" className={isActive('/stock')}>
                        <div className="link-icon">📈</div>
                        {!isCollapsed && <span className="link-text">Live Stock</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Sales Operations</span>}
                    <Link to="/customers" className={isActive('/customers')}>
                        <div className="link-icon">👥</div>
                        {!isCollapsed && <span className="link-text">Customers</span>}
                    </Link>
                    <Link to="/sales" className={isActive('/sales')}>
                        <div className="link-icon">💵</div>
                        {!isCollapsed && <span className="link-text">Sales Entry</span>}
                    </Link>
                    <Link to="/sales-history" className={isActive('/sales-history')}>
                        <div className="link-icon">📋</div>
                        {!isCollapsed && <span className="link-text">History</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Administration</span>}
                    <Link to="/users" className={isActive('/users')}>
                        <div className="link-icon">👮</div>
                        {!isCollapsed && <span className="link-text">Force Management</span>}
                    </Link>
                    <Link to="/shops" className={isActive('/shops')}>
                        <div className="link-icon">🏢</div>
                        {!isCollapsed && <span className="link-text">Retail Outlets</span>}
                    </Link>
                    <Link to="/routes" className={isActive('/routes')}>
                        <div className="link-icon">🗺️</div>
                        {!isCollapsed && <span className="link-text">Map & Routes</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Reports</span>}
                    <Link to="/daily-income" className={isActive('/daily-income')}>
                        <div className="link-icon">💰</div>
                        {!isCollapsed && <span className="link-text">Revenue Stream</span>}
                    </Link>
                </div>

                <div className="menu-group settings-group">
                    <Link to="/settings" className={isActive('/settings')}>
                        <div className="link-icon">⚙️</div>
                        {!isCollapsed && <span className="link-text">System Config</span>}
                    </Link>
                </div>
            </nav>

            {/* User Account / Footer */}
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar-modern">
                        {userData.name.charAt(0)}
                    </div>
                    {!isCollapsed && (
                        <div className="user-details">
                            <span className="u-name">{userData.name}</span>
                            <span className="u-role">{userData.role}</span>
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

export default Sidebar;
