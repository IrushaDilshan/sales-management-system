import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import './Sidebar.css';

const SalesSidebar = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userData, setUserData] = useState({ name: 'User', role: 'Staff' });

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
                        role: data.role === 'ma' ? 'Management Assistant' :
                            data.role === 'admin' ? 'Admin' : 'Sales Staff'
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
                    <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <span className="logo-icon">🛒</span>
                    </div>
                    {!isCollapsed && (
                        <div className="brand-info">
                            <h2 className="brand-name">NLDB</h2>
                            <span className="brand-tagline">Sales Portal</span>
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
                    {!isCollapsed && <span className="group-label">Overview</span>}
                    <Link to="/sales-dashboard" className={isActive('/sales-dashboard')}>
                        <div className="link-icon">📊</div>
                        {!isCollapsed && <span className="link-text">Sales Hub</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Inventory</span>}

                    <Link to="/stock" className={isActive('/stock')}>
                        <div className="link-icon">📈</div>
                        {!isCollapsed && <span className="link-text">Live Stock</span>}
                    </Link>
                </div>

                <div className="menu-group">
                    {!isCollapsed && <span className="group-label">Trading</span>}
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
            </nav>

            {/* User Account / Footer */}
            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar-modern" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
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
                        <span>Log Out</span>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default SalesSidebar;
