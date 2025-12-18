import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import StoreKeeperSidebar from '../components/StoreKeeperSidebar';
import './StoreKeeperDashboard.css';

const StoreKeeperDashboard = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch items
            const { data: items, error } = await supabase
                .from('items')
                .select('*');

            if (error) throw error;

            // Calculate stats
            const totalItems = items?.length || 0;
            const lowStock = items?.filter(item => item.quantity > 0 && item.quantity <= 10).length || 0;
            const outOfStock = items?.filter(item => item.quantity === 0).length || 0;
            const totalValue = items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;

            setStats({
                totalItems,
                lowStock,
                outOfStock,
                totalValue
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon, title, value, color, link, subtitle }) => (
        <Link to={link} className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
            </div>
            <div className="stat-content">
                <div className="stat-value">{value}</div>
                <div className="stat-title">{title}</div>
                {subtitle && <div className="stat-subtitle">{subtitle}</div>}
            </div>
        </Link>
    );

    const QuickActionCard = ({ icon, title, description, link, color }) => (
        <Link to={link} className="quick-action-card">
            <div className="action-icon" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
            </div>
            <div className="action-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div className="action-arrow" style={{ color }}>→</div>
        </Link>
    );

    return (
        <div className="storekeeper-layout">
            <StoreKeeperSidebar />

            <div className="storekeeper-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Inventory Dashboard</h1>
                        <p className="page-subtitle">Manage your stock and inventory</p>
                    </div>
                    <div className="header-date">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="stats-section">
                            <h2 className="section-title">Overview</h2>
                            <div className="stats-grid">
                                <StatCard
                                    icon="📦"
                                    title="Total Items"
                                    value={stats.totalItems}
                                    color="#3b82f6"
                                    link="/storekeeper/items"
                                    subtitle="Products in catalog"
                                />
                                <StatCard
                                    icon="⚠️"
                                    title="Low Stock"
                                    value={stats.lowStock}
                                    color="#f59e0b"
                                    link="/storekeeper/stock"
                                    subtitle="Items need restock"
                                />
                                <StatCard
                                    icon="❌"
                                    title="Out of Stock"
                                    value={stats.outOfStock}
                                    color="#ef4444"
                                    link="/storekeeper/stock"
                                    subtitle="Urgent attention"
                                />
                                <StatCard
                                    icon="💰"
                                    title="Total Value"
                                    value={`Rs. ${stats.totalValue.toLocaleString()}`}
                                    color="#10b981"
                                    link="/storekeeper/inventory"
                                    subtitle="Inventory worth"
                                />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="actions-section">
                            <h2 className="section-title">Quick Actions</h2>
                            <div className="actions-grid">
                                <QuickActionCard
                                    icon="➕"
                                    title="Add New Item"
                                    description="Create a new product in the catalog"
                                    link="/storekeeper/items"
                                    color="#3b82f6"
                                />
                                <QuickActionCard
                                    icon="📈"
                                    title="Check Stock Levels"
                                    description="View current stock status"
                                    link="/storekeeper/stock"
                                    color="#10b981"
                                />
                                <QuickActionCard
                                    icon="📋"
                                    title="Manage Inventory"
                                    description="Issue, receive, or return items"
                                    link="/storekeeper/inventory"
                                    color="#8b5cf6"
                                />
                            </div>
                        </div>

                        {/* Alerts Section */}
                        {(stats.lowStock > 0 || stats.outOfStock > 0) && (
                            <div className="alerts-section">
                                <h2 className="section-title">Alerts</h2>
                                <div className="alerts-grid">
                                    {stats.outOfStock > 0 && (
                                        <div className="alert-card urgent">
                                            <div className="alert-icon">❌</div>
                                            <div className="alert-content">
                                                <h3>Out of Stock Items</h3>
                                                <p>{stats.outOfStock} items are completely out of stock</p>
                                            </div>
                                            <Link to="/storekeeper/stock" className="alert-action">View →</Link>
                                        </div>
                                    )}
                                    {stats.lowStock > 0 && (
                                        <div className="alert-card warning">
                                            <div className="alert-icon">⚠️</div>
                                            <div className="alert-content">
                                                <h3>Low Stock Warning</h3>
                                                <p>{stats.lowStock} items have low stock levels</p>
                                            </div>
                                            <Link to="/storekeeper/stock" className="alert-action">View →</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StoreKeeperDashboard;
