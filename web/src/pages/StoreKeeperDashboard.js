import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import { FiBox, FiAlertTriangle, FiXCircle, FiTrendingUp, FiArrowRight, FiActivity, FiArchive, FiTruck, FiFileText } from 'react-icons/fi';
import '../shared/ModernPage.css';
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
            const { data: items } = await supabase.from('items').select('*');
            if (!items) return;

            setStats({
                totalItems: items.length || 0,
                lowStock: items.filter(i => i.quantity > 0 && i.quantity <= 10).length || 0,
                outOfStock: items.filter(i => i.quantity === 0).length || 0,
                totalValue: items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.retail_price || 0)), 0) || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="loading-spinner" style={{ borderTopColor: '#6366f1' }}></div>
            <p style={{ marginTop: '1.5rem', color: '#64748b', fontWeight: '600' }}>Synchronizing Vault Records...</p>
        </div>
    );

    return (
        <div className="storekeeper-dashboard-wrapper">
            {/* Header */}
            <div className="sk-header-container">
                <div className="sk-header-text">
                    <h1>Inventory Command Center</h1>
                    <p>National Livestock Development Board - Central Logistics & Storage</p>
                </div>
                <div className="sk-date-badge">
                    <div className="pulse-dot"></div>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="sk-kpi-grid">
                <div className="sk-kpi-card blue">
                    <div className="sk-kpi-icon"><FiBox /></div>
                    <div className="sk-kpi-content">
                        <div className="sk-kpi-label">Catalog Breadth</div>
                        <h3 className="sk-kpi-value">{stats.totalItems}</h3>
                    </div>
                </div>
                <div className="sk-kpi-card amber">
                    <div className="sk-kpi-icon"><FiAlertTriangle /></div>
                    <div className="sk-kpi-content">
                        <div className="sk-kpi-label">Low Stock Warnings</div>
                        <h3 className="sk-kpi-value">{stats.lowStock}</h3>
                    </div>
                </div>
                <div className="sk-kpi-card red">
                    <div className="sk-kpi-icon"><FiXCircle /></div>
                    <div className="sk-kpi-content">
                        <div className="sk-kpi-label">Depleted Reserves</div>
                        <h3 className="sk-kpi-value">{stats.outOfStock}</h3>
                    </div>
                </div>
                <div className="sk-kpi-card emerald">
                    <div className="sk-kpi-icon"><FiTrendingUp /></div>
                    <div className="sk-kpi-content">
                        <div className="sk-kpi-label">Inventory Valuation</div>
                        <h3 className="sk-kpi-value" style={{ fontSize: '1.5rem' }}>Rs. {stats.totalValue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="sk-content-grid">
                {/* Operations Links */}
                <div>
                    <h2 className="sk-section-title">
                        <FiActivity /> Operations & Quick-Link Registry
                    </h2>
                    <div className="sk-actions-grid">
                        <Link to="/storekeeper/items" className="sk-action-card blue">
                            <div className="sk-action-icon-wrapper"><FiArchive /></div>
                            <div className="sk-action-content">
                                <h3>Catalog Management</h3>
                                <p>Initialize or modify biological/product SKU registry.</p>
                            </div>
                            <div className="sk-action-arrow"><FiArrowRight /></div>
                        </Link>
                        
                        <Link to="/storekeeper/stock" className="sk-action-card emerald">
                            <div className="sk-action-icon-wrapper"><FiTrendingUp /></div>
                            <div className="sk-action-content">
                                <h3>Stock Surveillance</h3>
                                <p>Monitor real-time inventory levels across sectors.</p>
                            </div>
                            <div className="sk-action-arrow"><FiArrowRight /></div>
                        </Link>

                        <Link to="/storekeeper/inventory" className="sk-action-card purple">
                            <div className="sk-action-icon-wrapper"><FiTruck /></div>
                            <div className="sk-action-content">
                                <h3>Internal Logistics</h3>
                                <p>Issue, receive, or authorize inter-depot transfers.</p>
                            </div>
                            <div className="sk-action-arrow"><FiArrowRight /></div>
                        </Link>

                        <Link to="/daily-income" className="sk-action-card cyan">
                            <div className="sk-action-icon-wrapper"><FiFileText /></div>
                            <div className="sk-action-content">
                                <h3>Archival Reports</h3>
                                <p>Generate historical movement and movement audits.</p>
                            </div>
                            <div className="sk-action-arrow"><FiArrowRight /></div>
                        </Link>
                    </div>
                </div>

                {/* Critical Alerts */}
                <div>
                    <h2 className="sk-section-title" style={{ color: '#0f172a' }}>
                        <span style={{ color: '#ef4444' }}><FiAlertTriangle /></span> Critical Oversight
                    </h2>
                    <div className="sk-alerts-panel">
                        {stats.outOfStock > 0 && (
                            <Link to="/storekeeper/stock" className="sk-alert-item critical">
                                <div className="sk-alert-icon"><FiXCircle /></div>
                                <div className="sk-alert-text">
                                    <h4>Depleted Reserves ({stats.outOfStock})</h4>
                                    <p>Immediate requisition required.</p>
                                </div>
                                <div className="sk-alert-arrow"><FiArrowRight /></div>
                            </Link>
                        )}

                        {stats.lowStock > 0 && (
                            <Link to="/storekeeper/stock" className="sk-alert-item warning">
                                <div className="sk-alert-icon"><FiAlertTriangle /></div>
                                <div className="sk-alert-text">
                                    <h4>Low Visibility ({stats.lowStock})</h4>
                                    <p>Restock protocols recommended.</p>
                                </div>
                                <div className="sk-alert-arrow"><FiArrowRight /></div>
                            </Link>
                        )}

                        {stats.outOfStock === 0 && stats.lowStock === 0 && (
                            <div className="sk-optimal-state">
                                <div className="sk-optimal-icon"><FiBox /></div>
                                <h3>Stock Optimized</h3>
                                <p>All biological and retail assets are at optimal levels.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreKeeperDashboard;
