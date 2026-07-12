import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';
import './StoreKeeperDashboard.css';

const Storekeeper = () => {
    // State
    const [stocks, setStocks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [actionModal, setActionModal] = useState({ open: false, type: null, item: null });
    const [historyModal, setHistoryModal] = useState({ open: false, item: null });

    // Form State
    const [formData, setFormData] = useState({
        qty: '',
        reference: '',
        reason: '',
        remarks: '',
        rep_id: ''
    });
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Auto-refresh every 30 seconds (only when no modals are open)
    useEffect(() => {
        const interval = setInterval(() => {
            // Don't refresh if a modal is open
            if (!actionModal.open && !historyModal.open) {
                fetchData(true); // true = silent refresh (no loading spinner)
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [actionModal.open, historyModal.open]);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);

            // 1. Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name');
            if (itemsError) throw itemsError;

            // 2. Fetch Transactions (Fetch ALL for client-side aggregation)
            const { data: transData, error: transError } = await supabase
                .from('stock_transactions')
                .select('*');
            if (transError && transError.code !== 'PGRST116') throw transError;

            // 3. Fetch Reps (for Issue Stock)
            const { data: repsData, error: repsError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'rep');
            if (repsError && repsError.code !== 'PGRST116') console.error('Error fetching reps:', repsError);
            if (repsData) setReps(repsData);

            const transactionsList = transData || [];

            // 4. Calculate Stock & Merge
            const mergedStocks = (itemsData || []).map(item => {
                const itemTrans = transactionsList.filter(t => t.item_id === item.id);

                // Calculate stock: IN adds, OUT and RETURN subtract
                // (RETURN removes damaged/expired items from inventory)
                const currentQty = itemTrans.reduce((acc, t) => {
                    if (t.type === 'IN') return acc + t.qty;
                    if (t.type === 'OUT' || t.type === 'RETURN') return acc - t.qty;
                    return acc;
                }, 0);

                return {
                    ...item,
                    qty: currentQty,
                    status: calculateStatus(currentQty, item.minimum_level || 5)
                };
            });

            setStocks(mergedStocks);
            setTransactions(transactionsList);
            setLastUpdated(new Date());

        } catch (err) {
            console.error('Error fetching data:', err);
            if (!silent) {
                setError(`Failed to load dashboard data: ${err.message || JSON.stringify(err)}`);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const calculateStatus = (qty, minLevel) => {
        if (qty === 0) return 'OUT';
        if (qty < minLevel) return 'LOW';
        return 'OK';
    };

    // Dashboard Stats
    const getStats = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayTrans = transactions.filter(t => t.created_at && t.created_at.startsWith(today));

        const totalItems = stocks.length;
        const lowStock = stocks.filter(s => s.status === 'LOW' || s.status === 'OUT').length;
        const todayIssued = todayTrans.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (t.qty || 0), 0);
        const todayReturned = todayTrans.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + (t.qty || 0), 0);

        return { totalItems, lowStock, todayIssued, todayReturned };
    };

    const stats = getStats();

    // Handlers
    const handleOpenAction = (type, item) => {
        setActionModal({ open: true, type, item });
        setFormData({
            qty: '',
            reference: '',
            reason: '',
            remarks: type === 'ADD' ? 'Added by storekeeper' : '',
            rep_id: ''
        });
        setError(null);
        setSuccessMsg(null);
    };

    const handleCloseModal = () => {
        setActionModal({ open: false, type: null, item: null });
        setHistoryModal({ open: false, item: null });
    };

    const handleSubmitStock = async (e) => {
        e.preventDefault();
        const { type, item } = actionModal;
        const qty = parseInt(formData.qty, 10);

        if (!qty || qty <= 0) {
            setError('Please enter a valid quantity.');
            return;
        }

        try {
            setLoading(true);

            // Logic Types
            let typeDb = 'IN';
            let remarks = formData.remarks;
            let repId = null;

            if (type === 'ADD') {
                typeDb = 'IN';
                remarks = remarks || 'Added by storekeeper';
            } else if (type === 'RETURN') {
                typeDb = 'RETURN';
                remarks = `${formData.reason} - ${remarks}`;
            } else if (type === 'ISSUE') {
                typeDb = 'OUT';
                // Validate stock for issue
                if (item.qty < qty) {
                    throw new Error(`Insufficient stock. Available: ${item.qty}`);
                }
                if (!formData.rep_id) {
                    throw new Error('Please select a Representative.');
                }
                const repName = reps.find(r => r.id === formData.rep_id)?.name || 'Unknown Rep';
                remarks = `Issued to ${repName} - ${remarks}`;
                repId = formData.rep_id;
            }

            const transactionRecord = {
                item_id: item.id,
                type: typeDb,
                qty: qty,
                reference: formData.reference,
                remarks: remarks,
                rep_id: repId,
                created_at: new Date().toISOString()
            };

            const { error: transError } = await supabase
                .from('stock_transactions')
                .insert([transactionRecord]);

            if (transError) throw transError;

            // Update Stock Cache Table
            let newQty = item.qty;
            if (type === 'ADD') {
                // Add stock increases inventory
                newQty += qty;
            } else if (type === 'ISSUE' || type === 'RETURN') {
                // Issue and Return both decrease inventory
                // (RETURN removes damaged/expired items)
                newQty -= qty;
            }

            const { error: stockError } = await supabase
                .from('stock')
                .upsert(
                    { item_id: item.id, qty: newQty },
                    { onConflict: 'item_id' }
                );

            if (stockError) {
                console.error('Failed to update stock cache:', stockError);
            }

            await fetchData(); // Refresh UI
            setSuccessMsg(`Successfully ${type === 'ADD' ? 'added' : (type === 'ISSUE' ? 'issued' : 'returned')} stock for ${item.name}`);
            handleCloseModal();

        } catch (err) {
            console.error('Transaction error:', err);
            setError(err.message || 'Transaction failed.');
        } finally {
            setLoading(false);
        }
    };

    const getItemHistory = () => {
        if (!historyModal.item) return [];
        return transactions
            .filter(t => t.item_id === historyModal.item.id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    return (
        <div className="page-container storekeeper-dashboard-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Storekeeper Dashboard</h1>
                    {lastUpdated && (
                        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>

            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {/* ERROR / SUCCESS MESSAGES */}
                {error && <div className="alert error">{error}</div>}
                {successMsg && <div className="alert success">{successMsg}</div>}

                {loading && !actionModal.open && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* OVERVIEW CARDS */}
                        <div className="stats-grid" style={{ marginBottom: '3rem' }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
                                <div className="stat-icon" style={{ color: '#6366f1' }}>📦</div>
                                <div>
                                    <div className="stat-label">Total Items</div>
                                    <div className="stat-value">{stats.totalItems}</div>
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <div className="stat-icon" style={{ color: '#f59e0b' }}>⚠️</div>
                                <div>
                                    <div className="stat-label">Low Stock</div>
                                    <div className="stat-value">{stats.lowStock}</div>
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                                <div className="stat-icon" style={{ color: '#3b82f6' }}>📤</div>
                                <div>
                                    <div className="stat-label">Issued Today</div>
                                    <div className="stat-value">{stats.todayIssued}</div>
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                                <div className="stat-icon" style={{ color: '#8b5cf6' }}>↩️</div>
                                <div>
                                    <div className="stat-label">Returned Today</div>
                                    <div className="stat-value">{stats.todayReturned}</div>
                                </div>
                            </div>
                        </div>

                        {/* STOCK LIST */}
                        <h2 className="section-title" style={{ paddingLeft: '0.5rem' }}>Inventory Status</h2>
                        <div className="modern-table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Current Stock</th>
                                        <th>Min Level</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocks.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td className="font-bold">{item.qty}</td>
                                            <td className="text-muted">{item.minimum_level || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${item.status.toLowerCase()}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    className="btn-text"
                                                    onClick={() => setHistoryModal({ open: true, item })}
                                                >
                                                    History
                                                </button>
                                                <button
                                                    className="btn-text primary"
                                                    onClick={() => handleOpenAction('ADD', item)}
                                                >
                                                    Add (IN)
                                                </button>
                                                <button
                                                    className="btn-text secondary"
                                                    onClick={() => handleOpenAction('ISSUE', item)}
                                                >
                                                    Issue (OUT)
                                                </button>
                                                <button
                                                    className="btn-text warning"
                                                    onClick={() => handleOpenAction('RETURN', item)}
                                                >
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* ACTION MODAL (ADD / RETURN / ISSUE) */}
            {actionModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>
                            {actionModal.type === 'ADD' && 'Add New Stock'}
                            {actionModal.type === 'RETURN' && 'Return Stock'}
                            {actionModal.type === 'ISSUE' && 'Issue Stock to Rep'}
                        </h2>
                        <p className="modal-subtitle">Item: <strong>{actionModal.item?.name}</strong></p>

                        <form onSubmit={handleSubmitStock}>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="form-input"
                                    value={formData.qty}
                                    onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                />
                            </div>

                            {actionModal.type === 'ADD' && (
                                <div className="form-group">
                                    <label>Reference (Invoice / GRN)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.reference}
                                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                    />
                                </div>
                            )}

                            {actionModal.type === 'ISSUE' && (
                                <div className="form-group">
                                    <label>Select Representative</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={formData.rep_id}
                                        onChange={e => setFormData({ ...formData, rep_id: e.target.value })}
                                    >
                                        <option value="">-- Select Rep --</option>
                                        {reps.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {actionModal.type === 'RETURN' && (
                                <div className="form-group">
                                    <label>Reason</label>
                                    <select
                                        className="form-input"
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    >
                                        <option value="">Select Reason</option>
                                        <option value="Damaged">Damaged</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Error">Order Error</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={formData.remarks}
                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-primary">Submit Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content wide-modal">
                        <div className="modal-header" style={{ borderBottom: '2px solid #F3F4F6', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0 }}>Transaction History</h2>
                                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem', marginBottom: 0 }}>
                                    {historyModal.item?.name}
                                </p>
                            </div>
                            <button className="close-btn" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <div className="modern-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {getItemHistory().length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem 1rem',
                                    color: '#9CA3AF'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                                    <h3 style={{ color: '#6B7280', marginBottom: '0.5rem' }}>No Transactions Yet</h3>
                                    <p style={{ fontSize: '0.875rem' }}>
                                        Transaction history will appear here once you add, issue, or return stock
                                    </p>
                                </div>
                            ) : (
                                <table className="modern-table small-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '140px' }}>Date & Time</th>
                                            <th style={{ width: '140px' }}>Type</th>
                                            <th style={{ width: '100px', textAlign: 'center' }}>Quantity</th>
                                            <th>Reference</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getItemHistory().map(t => {
                                            const date = new Date(t.created_at);
                                            const dateStr = date.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            });
                                            const timeStr = date.toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });

                                            // Type-specific styling
                                            let typeColor, typeIcon, typeLabel, qtySign, qtyColor;
                                            if (t.type === 'IN') {
                                                typeColor = '#4CAF50';
                                                typeIcon = '➕';
                                                typeLabel = 'Stock Added';
                                                qtySign = '+';
                                                qtyColor = '#4CAF50';
                                            } else if (t.type === 'OUT') {
                                                typeColor = '#2196F3';
                                                typeIcon = '⬆️';
                                                typeLabel = 'Stock Issued';
                                                qtySign = '-';
                                                qtyColor = '#2196F3';
                                            } else {
                                                typeColor = '#FF9800';
                                                typeIcon = '⬇️';
                                                typeLabel = 'Stock Returned';
                                                qtySign = '-';
                                                qtyColor = '#FF9800';
                                            }

                                            return (
                                                <tr key={t.id}>
                                                    <td>
                                                        <div style={{ fontSize: '0.875rem' }}>
                                                            <div style={{ fontWeight: '600', color: '#F8FAFC' }}>{dateStr}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>{timeStr}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            backgroundColor: `${typeColor}15`,
                                                            border: `1px solid ${typeColor}40`
                                                        }}>
                                                            <span style={{ fontSize: '1rem' }}>{typeIcon}</span>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                color: typeColor,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                {t.type}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            fontSize: '0.875rem',
                                                            fontWeight: '800',
                                                            color: qtyColor
                                                        }}>
                                                            {qtySign}{t.qty}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        fontSize: '0.875rem',
                                                        color: t.reference ? '#E2E8F0' : '#64748b',
                                                        fontWeight: t.reference ? '500' : '400'
                                                    }}>
                                                        {t.reference || '—'}
                                                    </td>
                                                    <td style={{
                                                        fontSize: '0.875rem',
                                                        color: t.remarks ? '#E2E8F0' : '#64748b',
                                                        maxWidth: '300px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {t.remarks || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-actions" style={{ borderTop: '2px solid #F3F4F6', paddingTop: '1rem' }}>
                            <button type="button" className="btn-secondary" onClick={handleCloseModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Storekeeper;
