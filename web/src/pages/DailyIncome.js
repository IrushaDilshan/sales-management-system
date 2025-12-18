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
        // Set default dates (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        setDateTo(today.toISOString().split('T')[0]);
        setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);

        fetchShops();
    }, []);

    useEffect(() => {
        if (dateFrom && dateTo) {
            fetchIncomeData();
        }
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
        <div className="daily-income-container">
            <div className="page-header">
                <h1>Daily Income Reports</h1>
                <p>View and analyze daily sales by shop</p>
            </div>

            {/* Filters */}
            <div className="filters-card">
                <div className="filter-group">
                    <label>Shop</label>
                    <select
                        value={selectedShop}
                        onChange={(e) => setSelectedShop(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Shops</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>
                                {shop.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>From Date</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="filter-group">
                    <label>To Date</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="filter-group">
                    <label>&nbsp;</label>
                    <button onClick={fetchIncomeData} className="refresh-btn">
                        <span className="icon">🔄</span>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card total">
                    <div className="summary-icon">💰</div>
                    <div className="summary-content">
                        <p className="summary-label">Total Sales</p>
                        <p className="summary-value">{formatCurrency(getTotalSales())}</p>
                    </div>
                </div>

                <div className="summary-card cash">
                    <div className="summary-icon">💵</div>
                    <div className="summary-content">
                        <p className="summary-label">Cash Sales</p>
                        <p className="summary-value">{formatCurrency(getTotalCash())}</p>
                    </div>
                </div>

                <div className="summary-card credit">
                    <div className="summary-icon">💳</div>
                    <div className="summary-content">
                        <p className="summary-label">Credit Sales</p>
                        <p className="summary-value">{formatCurrency(getTotalCredit())}</p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="income-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Shop</th>
                                <th>Total Sales</th>
                                <th>Cash</th>
                                <th>Credit</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomeData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-data">
                                        No income data found for the selected period
                                    </td>
                                </tr>
                            ) : (
                                incomeData.map((item) => (
                                    <tr key={item.id}>
                                        <td>{new Date(item.date).toLocaleDateString()}</td>
                                        <td>
                                            <span className="shop-badge">
                                                {item.shops?.name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="amount">{formatCurrency(item.total_sales)}</td>
                                        <td className="amount cash">{formatCurrency(item.cash_sales)}</td>
                                        <td className="amount credit">{formatCurrency(item.credit_sales)}</td>
                                        <td className="notes">{item.notes || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
