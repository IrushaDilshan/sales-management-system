import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    FiDollarSign, FiUsers, FiTruck, FiAlertTriangle,
    FiTrendingUp, FiMoreVertical, FiActivity,
    FiPackage, FiCheckCircle
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: 0,
        activeRoutes: 0,
        totalShops: 0,
        lowStockItems: 0
    });
    const [revenueData, setRevenueData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [topEntities, setTopEntities] = useState([]); // Shops or Reps
    const [alerts, setAlerts] = useState([]);
    const [dateRange, setDateRange] = useState('7'); // days

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Sales Data (filtered by date range)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - parseInt(dateRange));

            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select(`
                    id,
                    total_amount,
                    sale_date,
                    outlet_id,
                    shops (name)
                `)
                .gte('sale_date', startDate.toISOString());

            if (salesError) throw salesError;

            // 2. Fetch Stock Data (for alerts)
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select(`
                    id, quantity, minimum_stock_level, 
                    items (name, unit_of_measure)
                `);
            if (stockError) throw stockError;

            // 3. Fetch Counts
            const { count: routesCount } = await supabase.from('routes').select('*', { count: 'exact', head: true });
            const { count: shopsCount } = await supabase.from('shops').select('*', { count: 'exact', head: true });

            // --- Process Data ---

            // A. Revenue Stats
            const totalRev = salesData.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);

            // B. Low Stock Count
            const lowStockList = stockData.filter(s => s.minimum_stock_level > 0 && s.quantity < s.minimum_stock_level);

            setStats({
                revenue: totalRev,
                activeRoutes: routesCount || 0,
                totalShops: shopsCount || 0,
                lowStockItems: lowStockList.length
            });

            // C. Revenue Chart Data
            const chartMap = {};
            salesData.forEach(sale => {
                const dateKey = new Date(sale.sale_date).toLocaleDateString('en-US', { weekday: 'short' });
                chartMap[dateKey] = (chartMap[dateKey] || 0) + (parseFloat(sale.total_amount) || 0);
            });
            // Ensure last 7 days are represented even if 0
            const chartArr = [];
            for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = d.toLocaleDateString('en-US', { weekday: 'short' });
                chartArr.push({ day: k, revenue: chartMap[k] || 0 });
            }
            setRevenueData(chartArr);

            // D. Top Entities (Shops by Revenue)
            const shopRevMap = {};
            salesData.forEach(sale => {
                const name = sale.shops?.name || 'Unknown Outlet';
                shopRevMap[name] = (shopRevMap[name] || 0) + (parseFloat(sale.total_amount) || 0);
            });
            const sortedShops = Object.entries(shopRevMap)
                .map(([name, val]) => ({ name, revenue: val }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            setTopEntities(sortedShops);

            // E. Alerts Generation
            const newAlerts = [];
            // Low stock alerts
            lowStockList.slice(0, 3).forEach(s => {
                newAlerts.push({
                    id: `stock-${s.id}`,
                    type: 'stock',
                    msg: `Low Stock: ${s.items?.name} (${s.quantity} ${s.items?.unit_of_measure})`,
                    time: 'Verified now'
                });
            });
            // Revenue alert (dummy logic for demo)
            if (totalRev > 100000) {
                newAlerts.push({ id: 'rev-1', type: 'system', msg: 'High Revenue Volume Detected', time: 'Today' });
            }
            if (newAlerts.length === 0) {
                newAlerts.push({ id: 'sys-1', type: 'route', msg: 'System operating normally', time: 'Just now' });
            }
            setAlerts(newAlerts);

            // F. Category Data (Mock for specific pie chart as joining 3 tables is heavy for this step, 
            // but we can try basic shop distribution instead if category is hard)
            // Let's do "Sales by Shop" for the Pie Chart since we have shop data.
            const pieData = sortedShops.slice(0, 4).map((s, i) => ({
                name: s.name,
                value: s.revenue,
                color: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'][i]
            }));
            setCategoryData(pieData);


        } catch (err) {
            console.error("Dashboard Error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-dashboard">
            {/* Toolbar */}
            <div className="dashboard-toolbar">
                <div>
                    <h1 className="dash-heading">Executive Command Center</h1>
                    <p className="dash-subheading"> realtime operational overview</p>
                </div>
                <div className="toolbar-actions">
                    <button className="action-btn primary" onClick={() => window.print()}>
                        Generate PDF Report
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {/* KPI Grid */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper blue">
                            <FiDollarSign />
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Total Revenue ({dateRange} Days)</span>
                            <h3 className="kpi-value">{loading ? '...' : `LKR ${stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</h3>
                            <span className="kpi-trend positive"><FiTrendingUp /> Real-time Data</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper purple">
                            <FiTruck />
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Active Routes</span>
                            <h3 className="kpi-value">{stats.activeRoutes}</h3>
                            <span className="kpi-trend neutral"><FiActivity /> Operational</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper green">
                            <FiUsers />
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Registered Outlets</span>
                            <h3 className="kpi-value">{stats.totalShops}</h3>
                            <span className="kpi-trend positive"><FiCheckCircle /> Active Network</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper red">
                            <FiAlertTriangle />
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Stock Warnings</span>
                            <h3 className="kpi-value">{stats.lowStockItems} Items</h3>
                            <span className="kpi-trend negative">{stats.lowStockItems > 0 ? 'Action Required' : 'Optimal Levels'}</span>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="charts-row">
                    <div className="chart-card wide">
                        <div className="card-header">
                            <h3>Revenue Analytics</h3>
                            <select
                                className="chart-filter"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="7">Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                                <option value="30">Last 30 Days</option>
                            </select>
                        </div>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer>
                                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            borderRadius: '12px',
                                            border: '1px solid #334155',
                                            color: '#f8fafc',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                        }}
                                        itemStyle={{ color: '#38bdf8' }}
                                        formatter={(value) => `LKR ${value.toLocaleString()}`}
                                    />
                                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
                                    <Area type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-card narrow">
                        <div className="card-header">
                            <h3>Top Outlets</h3>
                            <FiMoreVertical className="more-opt" />
                        </div>
                        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][index % 5]} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            color: '#fff'
                                        }}
                                        formatter={(value) => `LKR ${value.toLocaleString()}`}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-stat">
                                <span className="donut-num" style={{ color: '#f8fafc' }}>{categoryData.length}</span>
                                <span className="donut-label" style={{ color: '#94a3b8' }}>Leaders</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="info-row">
                    <div className="info-card">
                        <div className="card-header">
                            <h3>Top Performing Outlets</h3>
                        </div>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Outlet Name</th>
                                    <th>Performance</th>
                                    <th className="text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topEntities.map((shop, index) => (
                                    <tr key={index}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                                                    {shop.name.charAt(0)}
                                                </div>
                                                <span className="user-name" style={{ color: '#f8fafc' }}>{shop.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ width: '100px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(shop.revenue / (topEntities[0]?.revenue || 1)) * 100}%`,
                                                    background: '#3b82f6',
                                                    height: '100%'
                                                }}></div>
                                            </div>
                                        </td>
                                        <td className="text-right font-bold">
                                            LKR {shop.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                                {topEntities.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No sales data found for this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="info-card">
                        <div className="card-header">
                            <h3>Live System Activity</h3>
                            <FiActivity />
                        </div>
                        <div className="alerts-list">
                            {alerts.map(alert => (
                                <div key={alert.id} className={`alert-item ${alert.type}`}>
                                    <div className="alert-icon">
                                        {alert.type === 'stock' ? <FiPackage /> :
                                            alert.type === 'route' ? <FiCheckCircle /> : <FiAlertTriangle />}
                                    </div>
                                    <div className="alert-content">
                                        <p className="alert-msg">{alert.msg}</p>
                                        <span className="alert-time">{alert.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
