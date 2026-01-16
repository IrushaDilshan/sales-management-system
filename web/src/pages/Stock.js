import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Stock = () => {
    const [stocks, setStocks] = useState([]);
    const [allItems, setAllItems] = useState([]);
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

    // Stats for the top of the page
    const [stockStats, setStockStats] = useState({
        totalItems: 0,
        lowStockItems: 0,
        expiringSoon: 0,
        totalLocations: 0
    });

    useEffect(() => {
        fetchData();
        fetchOutlets();
        fetchCategories();
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setAllItems(data || []);
        } catch (err) {
            console.error('Error fetching items:', err);
        }
    };

    useEffect(() => {
        calculateStats();
    }, [stocks]);

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

    // Debug
    const [debugInfo, setDebugInfo] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            setDebugInfo('Fetching stock data...');

            // Attempt 1: Full Relational Fetch (Preferred)
            // We use maybeSingle() style check implicitly by catching the error
            const { data: stockData, error: stockError } = await supabase
                .from('stock')
                .select(`
                    *,
                    items ( id, name, unit_of_measure, is_perishable, category_id ),
                    shops ( id, name )
                `);

            if (!stockError && stockData) {
                console.log('Stock Data Loaded (Relational):', stockData);
                setDebugInfo(`Success! Loaded ${stockData.length} records (Linked Mode).`);
                setStocks(stockData);
                return;
            }

            // Attempt 2: Switch to Fallback Mode (Raw Fetch + Manual Stitch)
            console.warn('Relational fetch failed (Likely Schema Cache issue). Switching to Fallback Mode.', stockError?.message);
            setDebugInfo(`Relation Error: ${stockError?.message}. Switching to Manual Stitch mode...`);

            const { data: rawData, error: rawError } = await supabase
                .from('stock')
                .select('*');

            if (rawError) throw rawError;

            // Manual "Join" in React
            if (rawData && rawData.length > 0) {
                const itemIds = [...new Set(rawData.map(s => s.item_id).filter(Boolean))];
                const shopIds = [...new Set(rawData.map(s => s.outlet_id).filter(Boolean))];

                // Fetch related data in parallel
                const [itemsRes, shopsRes] = await Promise.all([
                    supabase.from('items').select('id, name, unit_of_measure, category_id').in('id', itemIds),
                    supabase.from('shops').select('id, name').in('id', shopIds)
                ]);

                const allItems = itemsRes.data || [];
                const allShops = shopsRes.data || [];

                const stitchedData = rawData.map(s => ({
                    ...s,
                    // Use 'Item Unavailable' / 'Shop Unavailable' instead of 'Unknown' to be cleaner
                    items: allItems.find(i => i.id === s.item_id) || { name: 'Item Unavailable' },
                    shops: allShops.find(o => o.id === s.outlet_id) || { name: 'Shop Unavailable' }
                }));

                setStocks(stitchedData);
                setDebugInfo(`Loaded ${stitchedData.length} records (Manual Mode).`);
            } else {
                setStocks([]);
                setDebugInfo('Loaded 0 records (Table is empty).');
            }

        } catch (err) {
            console.error('Final Fetch Error:', err);
            setDebugInfo('Critical Error: ' + err.message);
            setError('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (!stocks) return;
        const stats = {
            totalItems: stocks.reduce((sum, s) => sum + (parseInt(s.quantity || s.qty) || 0), 0),
            lowStockItems: stocks.filter(s => isLowStock(s.quantity || s.qty, s.minimum_stock_level)).length,
            expiringSoon: stocks.filter(s => isExpiringSoon(s.expiry_date)).length,
            totalLocations: new Set(stocks.map(s => s.outlet_id).filter(Boolean)).size
        };
        setStockStats(stats);
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

    const isExpiringSoon = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    };

    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    const isLowStock = (quantity, minLevel) => {
        return minLevel > 0 && quantity < minLevel;
    };

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

    const StatCard = ({ icon, label, value, color }) => (
        <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ color: color }}>{icon}</div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    );

    return (
        <div className="page-container storekeeper-dashboard-page" style={{ height: '100vh', overflow: 'hidden' }}> {/* Forced styles to fix white screen */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory Control</h1>
                    <p className="page-subtitle">National Livestock Development Board - Centralized Stock Tracking</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={() => fetchData()}>
                        <span>🔄</span> Refresh
                    </button>
                    <button className="btn-primary" onClick={() => handleOpenModal('add')}>
                        <span>+</span> Add Stock Reference
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '4px' }}>
                {/* Stats Dashboard */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                    flexShrink: 0
                }}>
                    <StatCard icon="📦" label="Total Units" value={stockStats.totalItems.toLocaleString()} color="#6366f1" />
                    <StatCard icon="📉" label="Low Stock Alerts" value={stockStats.lowStockItems} color="#ef4444" />
                    <StatCard icon="⚠️" label="Expiring Soon" value={stockStats.expiringSoon} color="#f59e0b" />
                    <StatCard icon="🏢" label="Active Locations" value={stockStats.totalLocations} color="#10b981" />
                </div>

                {/* Advanced Filters */}
                <div className="registry-filter-hub" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1', minWidth: '300px' }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Search Inventory</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Find by product name, SKU, or batch..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ width: '200px' }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Retail Center</label>
                            <select
                                className="form-control"
                                value={filterOutlet}
                                onChange={(e) => setFilterOutlet(e.target.value)}
                            >
                                <option value="all">Everywhere</option>
                                {outlets.map(outlet => (
                                    <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ width: '200px' }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Project Category</label>
                            <select
                                className="form-control"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">All Divisions</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '600', color: showExpiring ? '#f59e0b' : '#64748b' }}>
                            <input
                                type="checkbox"
                                checked={showExpiring}
                                onChange={(e) => setShowExpiring(e.target.checked)}
                                style={{ marginRight: '0.8rem', width: '20px', height: '20px' }}
                            />
                            <span>Show Only Expiring items (7 days)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '600', color: showLowStock ? '#ef4444' : '#64748b' }}>
                            <input
                                type="checkbox"
                                checked={showLowStock}
                                onChange={(e) => setShowLowStock(e.target.checked)}
                                style={{ marginRight: '0.8rem', width: '20px', height: '20px' }}
                            />
                            <span>Critical Stock Levels Only</span>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', flex: 1 }}>
                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '1.5rem', color: '#64748b' }}>Awaiting cloud synchronization...</p>
                    </div>
                ) : (
                    <div className="modern-table-container" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                        {filteredStocks.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                                <h3 style={{ color: '#f8fafc' }}>No matching inventory records</h3>
                                <p style={{ color: '#94a3b8' }}>Refine your search parameters or add new stock entry.</p>
                            </div>
                        ) : (
                            <table className="modern-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>Product Identity</th>
                                        <th>Service Center</th>
                                        <th>Batch Ref</th>
                                        <th style={{ textAlign: 'right' }}>Stock Level</th>
                                        <th style={{ textAlign: 'center' }}>Trigger Limit</th>
                                        <th style={{ textAlign: 'center' }}>Safety Audit</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStocks.map((stock) => (
                                        <tr key={stock.id}>
                                            <td>
                                                <div style={{ fontWeight: '700', color: '#f8fafc' }}>{stock.items?.name}</div>
                                                {stock.items?.product_categories && (
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {stock.items.product_categories.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {stock.shops ? (
                                                    <span style={{ padding: '4px 10px', background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                                                        {stock.shops.name}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Central Depot</span>
                                                )}
                                            </td>
                                            <td>
                                                {stock.batch_number ? (
                                                    <code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
                                                        {stock.batch_number}
                                                    </code>
                                                ) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: isLowStock(stock.quantity, stock.minimum_stock_level) ? '#f87171' : '#34d399' }}>
                                                    {stock.quantity}
                                                    <span style={{ fontSize: '0.75rem', marginLeft: '4px', fontWeight: '600', color: '#94a3b8' }}>{stock.items?.unit_of_measure}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                                {stock.minimum_stock_level || '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                    {isExpired(stock.expiry_date) && <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>⚠️ EXPIRED</span>}
                                                    {!isExpired(stock.expiry_date) && isExpiringSoon(stock.expiry_date) && <span style={{ padding: '2px 8px', background: '#fffbeb', color: '#92400e', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>⌛ EXPIRING</span>}
                                                    {isLowStock(stock.quantity, stock.minimum_stock_level) && <span style={{ padding: '2px 8px', background: '#fff1f2', color: '#be123c', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>📉 LOW STOCK</span>}
                                                    {!isExpired(stock.expiry_date) && !isExpiringSoon(stock.expiry_date) && !isLowStock(stock.quantity, stock.minimum_stock_level) && <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#15803d', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>✅ SECURE</span>}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal('adjust', stock)}>Adjust</button>
                                                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal('transfer', stock)}>Transfer</button>
                                                    <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#fee2e2', color: '#ef4444' }} onClick={() => handleDelete(stock.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Debug Footer */}
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.7rem', color: '#64748b', flexShrink: 0 }}>
                <strong>System diagnostics:</strong> {debugInfo} {stocks.length === 0 && ' (Check RLS policies if 0)'}
            </div>

            {/* Modal Handling */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                                {modalType === 'add' && 'Register New Inventory Record'}
                                {modalType === 'adjust' && 'Inventory Correction'}
                                {modalType === 'transfer' && 'Inter-Branch Transfer'}
                            </h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>

                        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            {modalType === 'add' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Product Portfolio</label>
                                        <select className="form-control" name="item_id" value={formData.item_id} onChange={handleInputChange} required>
                                            <option value="">Select Item</option>
                                            {allItems.map(item => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Deployment Center</label>
                                        <select className="form-control" name="outlet_id" value={formData.outlet_id} onChange={handleInputChange}>
                                            <option value="">Central Warehouse</option>
                                            {outlets.map(outlet => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {modalType === 'transfer' && (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Target Destination Center</label>
                                    <select className="form-control" name="to_outlet_id" value={formData.to_outlet_id} onChange={handleInputChange} required>
                                        <option value="">Select Target Depot</option>
                                        {outlets.filter(o => o.id !== formData.outlet_id).map(outlet => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Quantum (Quantity)</label>
                                    <input type="number" className="form-control" name="quantity" value={formData.quantity} onChange={handleInputChange} required min="0" />
                                </div>
                                {modalType !== 'transfer' && (
                                    <div className="form-group">
                                        <label className="form-label">Batch Identifier</label>
                                        <input type="text" className="form-control" name="batch_number" value={formData.batch_number} onChange={handleInputChange} placeholder="BN-XXXX-XXXX" />
                                    </div>
                                )}
                            </div>

                            {modalType !== 'transfer' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Production Date</label>
                                        <input type="date" className="form-control" name="manufacture_date" value={formData.manufacture_date} onChange={handleInputChange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expiry Deadline</label>
                                        <input type="date" className="form-control" name="expiry_date" value={formData.expiry_date} onChange={handleInputChange} />
                                    </div>
                                </div>
                            )}

                            {modalType !== 'transfer' && (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Safety Stock Trigger (Min level)</label>
                                    <input type="number" className="form-control" name="minimum_stock_level" value={formData.minimum_stock_level} onChange={handleInputChange} min="0" />
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label className="form-label">Official Audit Remarks</label>
                                <textarea className="form-control" name="notes" value={formData.notes} onChange={handleInputChange} rows="3" placeholder="Additional operational notes..." />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Discard</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                                    {modalType === 'add' && 'Initialize Stock Entry'}
                                    {modalType === 'adjust' && 'Commence Adjustment'}
                                    {modalType === 'transfer' && 'Execute Distribution'}
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
