import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';
import './DailyIncome.css';

export default function DailyIncome() {
    const [incomeData, setIncomeData] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShop, setSelectedShop] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        setDateTo(today.toISOString().split('T')[0]);
        setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);

        fetchShops();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (dateFrom && dateTo) {
            fetchIncomeData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShop, dateFrom, dateTo]);

    const fetchShops = async () => {
        const { data, error } = await supabase
            .from('shops')
            .select('id, name')
            .order('name');

        if (data) setShops(data);
        if (error) console.error('Error fetching shops:', error);
    };

    const fetchIncomeData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('daily_income')
                .select(`
                    *,
                    shops (name)
                `)
                .gte('date', dateFrom)
                .lte('date', dateTo)
                .order('date', { ascending: false });

            if (selectedShop !== 'all') {
                query = query.eq('shop_id', selectedShop);
            }

            const { data, error } = await query;

            if (error) throw error;
            setIncomeData(data || []);
        } catch (error) {
            console.error('Error fetching income data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTotalSales = () => {
        return incomeData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    };

    const getTotalCash = () => {
        return incomeData.reduce((sum, item) => sum + (item.cash_sales || 0), 0);
    };

    const getTotalCredit = () => {
        return incomeData.reduce((sum, item) => sum + (item.credit_sales || 0), 0);
    };

    const formatCurrency = (amount) => {
        return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Financial Reports</h1>
                    <p className="page-subtitle">National Livestock Development Board - Daily Revenue Analysis</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => window.print()} className="btn-secondary">
                        <span>🖨️</span> Print Report
                    </button>
                    <button onClick={fetchIncomeData} className="btn-primary">
                        <span>🔄</span> Refresh
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="filters-container" style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                alignItems: 'end'
            }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Filter by Retail Center</label>
                    <select
                        value={selectedShop}
                        onChange={(e) => setSelectedShop(e.target.value)}
                        className="form-control"
                    >
                        <option value="all">All Service Centers</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>
                                {shop.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Period From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="form-control"
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Period To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="form-control"
                    />
                </div>
            </div>

            {/* Summary Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <div className="summary-stat-card" style={{ borderLeft: '6px solid #6366f1' }}>
                    <div className="stat-icon-mini">💰</div>
                    <div className="stat-details">
                        <span className="stat-label">Total Revenue</span>
                        <h2 className="stat-value-text">{formatCurrency(getTotalSales())}</h2>
                    </div>
                </div>

                <div className="summary-stat-card" style={{ borderLeft: '6px solid #10b981' }}>
                    <div className="stat-icon-mini">💵</div>
                    <div className="stat-details">
                        <span className="stat-label">Cash Collected</span>
                        <h2 className="stat-value-text" style={{ color: '#10b981' }}>{formatCurrency(getTotalCash())}</h2>
                    </div>
                </div>

                <div className="summary-stat-card" style={{ borderLeft: '6px solid #f59e0b' }}>
                    <div className="stat-icon-mini">💳</div>
                    <div className="stat-details">
                        <span className="stat-label">Credit Sales</span>
                        <h2 className="stat-value-text" style={{ color: '#f59e0b' }}>{formatCurrency(getTotalCredit())}</h2>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="modern-table-container">
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '1.5rem', color: '#64748b' }}>Generating financial insights...</p>
                    </div>
                ) : (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Billing Date</th>
                                <th>Retail Center</th>
                                <th style={{ textAlign: 'right' }}>Total Income</th>
                                <th style={{ textAlign: 'right' }}>Cash Partition</th>
                                <th style={{ textAlign: 'right' }}>Credit Partition</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomeData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                        No financial records found for the selected period
                                    </td>
                                </tr>
                            ) : (
                                incomeData.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: '600' }}>{new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                background: '#f1f5f9',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                color: '#475569'
                                            }}>
                                                {item.shops?.name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.total_sales)}</td>
                                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: '600' }}>{formatCurrency(item.cash_sales)}</td>
                                        <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: '600' }}>{formatCurrency(item.credit_sales)}</td>
                                        <td style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>{item.notes || 'No remarks'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .summary-stat-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                    transition: transform 0.2s;
                }
                .summary-stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.06);
                }
                .stat-icon-mini {
                    font-size: 2rem;
                    background: #f8fafc;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                }
                .stat-details {
                    display: flex;
                    flex-direction: column;
                }
                .stat-label {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .stat-value-text {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin: 0;
                    color: #1e293b;
                }
                @media print {
                    .page-header button, .filters-container {
                        display: none;
                    }
                    .page-container {
                        padding: 0;
                    }
                    .summary-stat-card {
                        box-shadow: none;
                        border: 1px solid #e2e8f0;
                    }
                }
            `}</style>
        </div>
    );
}
