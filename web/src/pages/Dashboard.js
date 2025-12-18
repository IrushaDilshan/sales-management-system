import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalShops: 0,
        totalRoutes: 0,
        totalItems: 0,
        salesmen: 0,
        reps: 0,
        storekeepers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch counts
            const [usersRes, shopsRes, routesRes, itemsRes] = await Promise.all([
                supabase.from('users').select('role', { count: 'exact' }),
                supabase.from('shops').select('id', { count: 'exact' }),
                supabase.from('routes').select('id', { count: 'exact' }),
                supabase.from('items').select('id', { count: 'exact' })
            ]);

            // Count users by role
            const salesmen = usersRes.data?.filter(u => u.role === 'salesman').length || 0;
            const reps = usersRes.data?.filter(u => u.role === 'rep').length || 0;
            const storekeepers = usersRes.data?.filter(u => u.role === 'storekeeper').length || 0;

            setStats({
                totalUsers: usersRes.count || 0,
                totalShops: shopsRes.count || 0,
                totalRoutes: routesRes.count || 0,
                totalItems: itemsRes.count || 0,
                salesmen,
                reps,
                storekeepers
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
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Manager Dashboard</h1>
                    <p className="dashboard-subtitle">National LiveStock Development Board</p>
                </div>
                <div className="dashboard-date">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {loading ? (
                <div className="dashboard-loading">
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
                                icon="👥"
                                title="Total Users"
                                value={stats.totalUsers}
                                color="#2196F3"
                                link="/users"
                                subtitle="Manage team"
                            />
                            <StatCard
                                icon="🏪"
                                title="Shops"
                                value={stats.totalShops}
                                color="#4CAF50"
                                link="/shops"
                                subtitle="Active locations"
                            />
                            <StatCard
                                icon="🗺️"
                                title="Routes"
                                value={stats.totalRoutes}
                                color="#FF9800"
                                link="/routes"
                                subtitle="Delivery zones"
                            />
                            <StatCard
                                icon="📦"
                                title="Items"
                                value={stats.totalItems}
                                color="#9C27B0"
                                link="/storekeeper/items"
                                subtitle="Product catalog"
                            />
                        </div>
                    </div>

                    {/* Team Stats */}
                    <div className="team-section">
                        <h2 className="section-title">Team Members</h2>
                        <div className="team-grid">
                            <div className="team-card">
                                <div className="team-icon">👨‍💼</div>
                                <div className="team-number">{stats.salesmen}</div>
                                <div className="team-label">Salesmen</div>
                            </div>
                            <div className="team-card">
                                <div className="team-icon">🚚</div>
                                <div className="team-number">{stats.reps}</div>
                                <div className="team-label">Representatives</div>
                            </div>
                            <div className="team-card">
                                <div className="team-icon">📋</div>
                                <div className="team-number">{stats.storekeepers}</div>
                                <div className="team-label">Storekeepers</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="actions-section">
                        <h2 className="section-title">Quick Actions</h2>
                        <div className="actions-grid">
                            <QuickActionCard
                                icon="➕"
                                title="Add New User"
                                description="Create user accounts for team members"
                                link="/users"
                                color="#2196F3"
                            />
                            <QuickActionCard
                                icon="🏪"
                                title="Add New Shop"
                                description="Register a new shop location"
                                link="/shops"
                                color="#4CAF50"
                            />
                            <QuickActionCard
                                icon="🗺️"
                                title="Create Route"
                                description="Set up delivery routes and assignments"
                                link="/routes"
                                color="#FF9800"
                            />
                            <QuickActionCard
                                icon="💰"
                                title="View Daily Income"
                                description="Check today's sales and revenue"
                                link="/daily-income"
                                color="#E91E63"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
