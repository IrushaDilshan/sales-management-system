import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

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

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
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

                // Calculate stock: IN + RETURN - OUT
                const currentQty = itemTrans.reduce((acc, t) => {
                    if (t.type === 'IN' || t.type === 'RETURN') return acc + t.qty;
                    if (t.type === 'OUT') return acc - t.qty;
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

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(`Failed to load dashboard data: ${err.message || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
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
            if (type === 'ADD' || type === 'RETURN') {
                newQty += qty;
            } else if (type === 'ISSUE') {
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
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Storekeeper Dashboard</h1>
                <button
                    className="btn-primary"
                    onClick={() => window.location.href = '/items'}
                >
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> New Item
                </button>
            </div>

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
                    <div className="dashboard-grid">
                        <div className="card overview-card">
                            <h3>Total Items</h3>
                            <div className="card-value">{stats.totalItems}</div>
                        </div>
                        <div className="card overview-card warning">
                            <h3>Low Stock</h3>
                            <div className="card-value">{stats.lowStock}</div>
                        </div>
                        <div className="card overview-card">
                            <h3>Issued Today</h3>
                            <div className="card-value">{stats.todayIssued}</div>
                        </div>
                        <div className="card overview-card success">
                            <h3>Returned Today</h3>
                            <div className="card-value">{stats.todayReturned}</div>
                        </div>
                    </div>

                    {/* STOCK LIST */}
                    <div className="table-container header-margin">
                        <h2 className="section-title">Inventory Status</h2>
                        <table className="data-table">
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
                        <div className="modal-header">
                            <h2>Stock History: {historyModal.item?.name}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <div className="table-container">
                            <table className="data-table small-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Qty</th>
                                        <th>Reference</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getItemHistory().length === 0 ? (
                                        <tr><td colSpan="5" className="text-center">No transactions found</td></tr>
                                    ) : (
                                        getItemHistory().map(t => (
                                            <tr key={t.id}>
                                                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`badge ${t.type}`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td>{t.qty}</td>
                                                <td>{t.reference || '-'}</td>
                                                <td>{t.remarks || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={handleCloseModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Storekeeper;
