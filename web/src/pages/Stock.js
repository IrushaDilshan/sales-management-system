import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Stock = () => {
    const [stocks, setStocks] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add', 'adjust', 'transfer'
    const [formData, setFormData] = useState({
        item_id: '',
        outlet_id: '',
        quantity: '',
        batch_number: '',
        manufacture_date: '',
        expiry_date: '',
        minimum_stock_level: '',
        to_outlet_id: '',
        notes: ''
    });
    const [error, setError] = useState(null);
    const [filterOutlet, setFilterOutlet] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpiring, setShowExpiring] = useState(false);
    const [showLowStock, setShowLowStock] = useState(false);

    useEffect(() => {
        fetchData();
        fetchOutlets();
        fetchCategories();
    }, []);

    const fetchOutlets = async () => {
        try {
            const { data, error } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (error) throw error;
            setOutlets(data || []);
        } catch (err) {
            console.error('Error fetching outlets:', err);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select(`
                    *,
                    items (
                        id,
                        name,
                        category_id,
                        unit_of_measure,
                        is_perishable,
                        product_categories (
                            name
                        )
                    ),
                    shops:outlet_id (
                        id,
                        name
                    )
                `)
                .order('last_updated', { ascending: false });

            if (stockError) throw stockError;
            setStocks(stockData || []);

        } catch (err) {
            console.error('Error fetching stock:', err);
            setError('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (type, stock = null) => {
        setModalType(type);
        if (stock) {
            setFormData({
                id: stock.id,
                item_id: stock.item_id,
                outlet_id: stock.outlet_id,
                quantity: stock.quantity || 0,
                batch_number: stock.batch_number || '',
                manufacture_date: stock.manufacture_date || '',
                expiry_date: stock.expiry_date || '',
                minimum_stock_level: stock.minimum_stock_level || 0,
                to_outlet_id: '',
                notes: ''
            });
        } else {
            setFormData({
                item_id: '',
                outlet_id: '',
                quantity: '',
                batch_number: '',
                manufacture_date: '',
                expiry_date: '',
                minimum_stock_level: 10,
                to_outlet_id: '',
                notes: ''
            });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setFormData({
            item_id: '',
            outlet_id: '',
            quantity: '',
            batch_number: '',
            manufacture_date: '',
            expiry_date: '',
            minimum_stock_level: '',
            to_outlet_id: '',
            notes: ''
        });
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'add') {
                await handleAddStock();
            } else if (modalType === 'adjust') {
                await handleAdjustStock();
            } else if (modalType === 'transfer') {
                await handleTransferStock();
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddStock = async () => {
        const stockData = {
            item_id: parseInt(formData.item_id),
            outlet_id: formData.outlet_id ? parseInt(formData.outlet_id) : null,
            quantity: parseInt(formData.quantity),
            batch_number: formData.batch_number || null,
            manufacture_date: formData.manufacture_date || null,
            expiry_date: formData.expiry_date || null,
            minimum_stock_level: parseInt(formData.minimum_stock_level) || 0
        };

        const { error } = await supabase
            .from('stock')
            .insert([stockData]);

        if (error) throw error;

        // Record movement
        await supabase.from('stock_movements').insert([{
            product_id: stockData.item_id,
            to_outlet_id: stockData.outlet_id,
            quantity: stockData.quantity,
            movement_type: 'purchase',
            batch_number: stockData.batch_number,
            notes: formData.notes || 'Initial stock entry'
        }]);

        fetchData();
        handleCloseModal();
    };

    const handleAdjustStock = async () => {
        const newQuantity = parseInt(formData.quantity);

        const { error } = await supabase
            .from('stock')
            .update({
                quantity: newQuantity,
                batch_number: formData.batch_number || null,
                manufacture_date: formData.manufacture_date || null,
                expiry_date: formData.expiry_date || null,
                minimum_stock_level: parseInt(formData.minimum_stock_level) || 0
            })
            .eq('id', formData.id);

        if (error) throw error;

        // Record adjustment
        await supabase.from('stock_movements').insert([{
            product_id: formData.item_id,
            to_outlet_id: formData.outlet_id,
            quantity: newQuantity,
            movement_type: 'adjustment',
            batch_number: formData.batch_number,
            notes: formData.notes || 'Stock adjustment'
        }]);

        fetchData();
        handleCloseModal();
    };

    const handleTransferStock = async () => {
        const transferQty = parseInt(formData.quantity);

        // Decrease from source outlet
        const { data: sourceStock } = await supabase
            .from('stock')
            .select('quantity')
            .eq('id', formData.id)
            .single();

        if (sourceStock.quantity < transferQty) {
            throw new Error('Insufficient stock for transfer');
        }

        // Update source
        await supabase
            .from('stock')
            .update({ quantity: sourceStock.quantity - transferQty })
            .eq('id', formData.id);

        // Check if destination has this item
        const { data: destStock } = await supabase
            .from('stock')
            .select('*')
            .eq('item_id', formData.item_id)
            .eq('outlet_id', formData.to_outlet_id)
            .maybeSingle();

        if (destStock) {
            // Update destination
            await supabase
                .from('stock')
                .update({ quantity: destStock.quantity + transferQty })
                .eq('id', destStock.id);
        } else {
            // Create new entry at destination
            await supabase
                .from('stock')
                .insert([{
                    item_id: formData.item_id,
                    outlet_id: parseInt(formData.to_outlet_id),
                    quantity: transferQty,
                    batch_number: formData.batch_number
                }]);
        }

        // Record movement
        await supabase.from('stock_movements').insert([{
            product_id: formData.item_id,
            from_outlet_id: formData.outlet_id,
            to_outlet_id: parseInt(formData.to_outlet_id),
            quantity: transferQty,
            movement_type: 'transfer',
            batch_number: formData.batch_number,
            notes: formData.notes || 'Stock transfer'
        }]);

        fetchData();
        handleCloseModal();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this stock entry?')) {
            try {
                const { error } = await supabase
                    .from('stock')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchData();
            } catch (err) {
                console.error('Error deleting stock:', err);
                alert('Failed to delete stock entry');
            }
        }
    };

    // Check if product is expiring soon (within 7 days)
    const isExpiringSoon = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    };

    // Check if expired
    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    // Check if low stock
    const isLowStock = (quantity, minLevel) => {
        return minLevel > 0 && quantity < minLevel;
    };

    // Filter stocks
    const filteredStocks = stocks.filter(stock => {
        if (!stock.items) return false;

        const matchesOutlet = filterOutlet === 'all' || stock.outlet_id?.toString() === filterOutlet;
        const matchesCategory = filterCategory === 'all' || stock.items.category_id?.toString() === filterCategory;
        const matchesSearch = searchTerm === '' ||
            stock.items.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesExpiring = !showExpiring || isExpiringSoon(stock.expiry_date);
        const matchesLowStock = !showLowStock || isLowStock(stock.quantity, stock.minimum_stock_level);

        return matchesOutlet && matchesCategory && matchesSearch && matchesExpiring && matchesLowStock;
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Multi-Location Inventory</h1>
                    <p className="page-subtitle">Track stock across all NLDB outlets and farms</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal('add')}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Stock
                </button>
            </div>

            {/* Filters and Quick Toggles */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by product name or batch number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: '1', minWidth: '200px' }}
                    />
                    <select
                        className="form-input"
                        value={filterOutlet}
                        onChange={(e) => setFilterOutlet(e.target.value)}
                        style={{ minWidth: '150px' }}
                    >
                        <option value="all">All Outlets</option>
                        {outlets.map(outlet => (
                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                        ))}
                    </select>
                    <select
                        className="form-input"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ minWidth: '150px' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showExpiring}
                            onChange={(e) => setShowExpiring(e.target.checked)}
                            style={{ marginRight: '0.5rem' }}
                        />
                        <span>🟡 Expiring Soon (7 days)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showLowStock}
                            onChange={(e) => setShowLowStock(e.target.checked)}
                            style={{ marginRight: '0.5rem' }}
                        />
                        <span>🔴 Low Stock Alerts</span>
                    </label>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <div className="table-container">
                    {filteredStocks.length === 0 ? (
                        <div className="empty-state">
                            <h3>No stock entries found</h3>
                            <p>{searchTerm || filterOutlet !== 'all' || filterCategory !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Click "Add Stock" to create your first stock entry.'}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Outlet</th>
                                    <th>Batch</th>
                                    <th style={{ textAlign: 'right' }}>Quantity</th>
                                    <th style={{ textAlign: 'center' }}>Min Level</th>
                                    <th style={{ textAlign: 'center' }}>Expiry</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStocks.map((stock) => (
                                    <tr key={stock.id}>
                                        <td>
                                            <strong>{stock.items?.name}</strong>
                                            {stock.items?.product_categories && (
                                                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                                                    {stock.items.product_categories.name}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {stock.shops ? (
                                                <span className="badge badge-info">{stock.shops.name}</span>
                                            ) : (
                                                <span style={{ color: '#999' }}>Central</span>
                                            )}
                                        </td>
                                        <td>
                                            {stock.batch_number ? (
                                                <code style={{
                                                    backgroundColor: '#f3f4f6',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {stock.batch_number}
                                                </code>
                                            ) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <strong style={{
                                                color: isLowStock(stock.quantity, stock.minimum_stock_level)
                                                    ? 'var(--danger-color)'
                                                    : 'var(--success-color)'
                                            }}>
                                                {stock.quantity}
                                            </strong>
                                            <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                                                {stock.items?.unit_of_measure || 'units'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {stock.minimum_stock_level || '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {stock.expiry_date ? (
                                                <div>
                                                    <div style={{ fontSize: '0.875rem' }}>
                                                        {new Date(stock.expiry_date).toLocaleDateString()}
                                                    </div>
                                                    {isExpired(stock.expiry_date) && (
                                                        <span className="badge badge-danger">Expired</span>
                                                    )}
                                                    {!isExpired(stock.expiry_date) && isExpiringSoon(stock.expiry_date) && (
                                                        <span className="badge badge-warning">
                                                            {Math.ceil((new Date(stock.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                                                        </span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isExpired(stock.expiry_date) && (
                                                <span className="badge badge-danger">⚠️ Expired</span>
                                            )}
                                            {!isExpired(stock.expiry_date) && isExpiringSoon(stock.expiry_date) && (
                                                <span className="badge badge-warning">🟡 Expiring</span>
                                            )}
                                            {isLowStock(stock.quantity, stock.minimum_stock_level) && (
                                                <span className="badge badge-danger">📉 Low</span>
                                            )}
                                            {!isExpired(stock.expiry_date) && !isExpiringSoon(stock.expiry_date) && !isLowStock(stock.quantity, stock.minimum_stock_level) && (
                                                <span className="badge badge-success">✓ OK</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="action-btn btn-edit"
                                                onClick={() => handleOpenModal('adjust', stock)}
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                Adjust
                                            </button>
                                            <button
                                                className="action-btn btn-secondary"
                                                onClick={() => handleOpenModal('transfer', stock)}
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                Transfer
                                            </button>
                                            <button
                                                className="action-btn btn-delete"
                                                onClick={() => handleDelete(stock.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal for Add/Adjust/Transfer */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {modalType === 'add' && 'Add New Stock'}
                            {modalType === 'adjust' && 'Adjust Stock Levels'}
                            {modalType === 'transfer' && 'Transfer Stock Between Outlets'}
                        </h2>

                        {error && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {modalType === 'add' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Product *</label>
                                        <select
                                            className="form-input"
                                            name="item_id"
                                            value={formData.item_id}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select a product</option>
                                            {stocks.map(s => s.items && (
                                                <option key={s.items.id} value={s.items.id}>
                                                    {s.items.name}
                                                </option>
                                            )).filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Outlet</label>
                                        <select
                                            className="form-input"
                                            name="outlet_id"
                                            value={formData.outlet_id}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Central Warehouse</option>
                                            {outlets.map(outlet => (
                                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {modalType === 'transfer' && (
                                <div className="form-group">
                                    <label className="form-label">Transfer To *</label>
                                    <select
                                        className="form-input"
                                        name="to_outlet_id"
                                        value={formData.to_outlet_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select destination outlet</option
                                        >
                                        {outlets.filter(o => o.id !== formData.outlet_id).map(outlet => (
                                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                />
                            </div>

                            {modalType !== 'transfer' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Batch Number</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="batch_number"
                                            value={formData.batch_number}
                                            onChange={handleInputChange}
                                            placeholder="e.g., BATCH-2025-001"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Manufacture Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                name="manufacture_date"
                                                value={formData.manufacture_date}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Expiry Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                name="expiry_date"
                                                value={formData.expiry_date}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Minimum Stock Level</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            name="minimum_stock_level"
                                            value={formData.minimum_stock_level}
                                            onChange={handleInputChange}
                                            min="0"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea
                                    className="form-input"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="Optional notes about this transaction"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {modalType === 'add' && 'Add Stock'}
                                    {modalType === 'adjust' && 'Save Changes'}
                                    {modalType === 'transfer' && 'Transfer Stock'}
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
