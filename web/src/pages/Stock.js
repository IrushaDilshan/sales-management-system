import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';

const Stock = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch All Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .order('name');

            if (itemsError) throw itemsError;

            // 2. Fetch All Stock Records
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select('*');

            if (stockError && stockError.code !== 'PGRST116') {
                // Ignore 406/PGRST116 (JSON return type) errors if table is empty/weird
                console.error('Stock fetch error:', stockError);
            }

            // 3. Merge Data (Left Join: Show all items, attach stock if exists)
            const formattedData = (itemsData || []).map(item => {
                const stockEntry = (stockData || []).find(s => s.item_id === item.id);
                return {
                    ...item,
                    qty: stockEntry ? stockEntry.qty : 0
                };
            });

            setStocks(formattedData);

        } catch (err) {
            console.error('Error fetching stocks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (stockItem) => {
        setSelectedItem(stockItem);
        setQuantity(stockItem.qty);
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        setQuantity('');
    };

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        try {
            const newQuantity = parseInt(quantity, 10);
            if (isNaN(newQuantity) || newQuantity < 0) {
                throw new Error('Please enter a valid non-negative quantity');
            }

            // Schema: stock(item_id, qty)
            // We need to upsert (insert or update) based on item_id

            const { error: upsertError } = await supabase
                .from('stock')
                .upsert(
                    { item_id: selectedItem.id, qty: newQuantity },
                    { onConflict: 'item_id' }
                );

            if (upsertError) throw upsertError;

            fetchData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Stock Management</h1>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {stocks.length === 0 ? (
                        <div className="empty-state">
                            <h3>No items found</h3>
                            <p>Add items in the Items page first.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Current Stock (Qty)</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: item.qty < 10 ? 'var(--danger-color)' : 'var(--success-color)'
                                            }}>
                                                {item.qty}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="action-btn btn-edit" onClick={() => handleOpenModal(item)}>
                                                Update Stock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {isModalOpen && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            Update Stock: {selectedItem.name}
                        </h2>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleUpdateStock}>
                            <div className="form-group">
                                <label className="form-label">Quantity</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                    min="0"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Update Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stock;
