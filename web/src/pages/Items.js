import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Items = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        category_id: '',
        sku: '',
        barcode: '',
        wholesale_price: '',
        retail_price: '',
        unit_of_measure: 'piece',
        is_perishable: false,
        shelf_life_days: '',
        image_url: ''
    });
    const [error, setError] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        categories: 0,
        perishables: 0,
        avgPrice: 0
    });

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [items]);

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

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (
                        id,
                        name
                    )
                `)
                .order('name');

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Error fetching items:', err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const s = {
            total: items.length,
            categories: new Set(items.map(i => i.category_id).filter(Boolean)).size,
            perishables: items.filter(i => i.is_perishable).length,
            avgPrice: items.length > 0 ? items.reduce((sum, i) => sum + (parseFloat(i.retail_price) || 0), 0) / items.length : 0
        };
        setStats(s);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setFormData({
                id: item.id,
                name: item.name || '',
                description: item.description || '',
                category_id: item.category_id || '',
                sku: item.sku || '',
                barcode: item.barcode || '',
                wholesale_price: item.wholesale_price || '',
                retail_price: item.retail_price || '',
                unit_of_measure: item.unit_of_measure || 'piece',
                is_perishable: item.is_perishable || false,
                shelf_life_days: item.shelf_life_days || '',
                image_url: item.image_url || ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                description: '',
                category_id: '',
                sku: '',
                barcode: '',
                wholesale_price: '',
                retail_price: '',
                unit_of_measure: 'piece',
                is_perishable: false,
                shelf_life_days: '',
                image_url: ''
            });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            id: null,
            name: '',
            description: '',
            category_id: '',
            sku: '',
            barcode: '',
            wholesale_price: '',
            retail_price: '',
            unit_of_measure: 'piece',
            is_perishable: false,
            shelf_life_days: '',
            image_url: ''
        });
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updates = {
                name: formData.name,
                description: formData.description || null,
                category_id: formData.category_id || null,
                sku: formData.sku || null,
                barcode: formData.barcode || null,
                wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
                retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
                unit_of_measure: formData.unit_of_measure,
                is_perishable: formData.is_perishable,
                shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : null,
                image_url: formData.image_url || null
            };

            let submitError;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('items')
                    .update(updates)
                    .eq('id', formData.id);
                submitError = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('items')
                    .insert([updates]);
                submitError = insertError;
            }

            if (submitError) throw submitError;

            fetchItems();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                const { error } = await supabase
                    .from('items')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchItems();
            } catch (err) {
                console.error('Error deleting item:', err);
                alert('Failed to delete item');
            }
        }
    };

    const filteredItems = items.filter(item => {
        const matchesCategory = filterCategory === 'all' || item.category_id?.toString() === filterCategory;
        const matchesSearch = searchTerm === '' ||
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const StatCard = ({ icon, label, value, color, suffix }) => (
        <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            borderLeft: `6px solid ${color}`
        }}>
            <div style={{
                fontSize: '2rem',
                background: `${color}10`,
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px'
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                    {value} {suffix}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Master Catalog</h1>
                    <p className="page-subtitle">National Livestock Development Board - Product SKU Management</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span>+</span> Register New SKU
                </button>
            </div>

            {/* Stats Dashboard */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard icon="🏷️" label="Total Products" value={stats.total} color="#6366f1" />
                <StatCard icon="📂" label="Active Categories" value={stats.categories} color="#10b981" />
                <StatCard icon="🍎" label="Perishables" value={stats.perishables} color="#f59e0b" />
                <StatCard icon="📈" label="Avg Retail Price" value={stats.avgPrice.toFixed(2)} suffix="Rs." color="#ec4899" />
            </div>

            {/* Advanced Filters */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end'
            }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Search Catalog</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by product name, SKU code, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ width: '250px' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Product Category</label>
                    <select
                        className="form-control"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Product Lines</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1.5rem', color: '#64748b' }}>Awaiting cloud catalog synchronization...</p>
                </div>
            ) : (
                <div className="modern-table-container">
                    {filteredItems.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                            <h3 style={{ color: '#1e293b' }}>No products found in catalog</h3>
                            <p style={{ color: '#64748b' }}>Try adjusting filters or register a new SKU.</p>
                        </div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Product Identity</th>
                                    <th>Category</th>
                                    <th>Identifier (SKU)</th>
                                    <th style={{ textAlign: 'right' }}>Wholesale (Rs.)</th>
                                    <th style={{ textAlign: 'right' }}>Retail (Rs.)</th>
                                    <th style={{ textAlign: 'center' }}>Unit</th>
                                    <th style={{ textAlign: 'center' }}>Perishability</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.image_url && (
                                                <img
                                                    src={item.image_url}
                                                    alt="Preview"
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', float: 'left', marginRight: '10px' }}
                                                />
                                            )}
                                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                                            {item.description && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {item.product_categories ? (
                                                <span style={{ padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                    {item.product_categories.name}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#334155' }}>
                                                {item.sku || '-'}
                                            </code>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                            {item.wholesale_price ? parseFloat(item.wholesale_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>
                                            {item.retail_price ? parseFloat(item.retail_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>{item.unit_of_measure}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.is_perishable ? (
                                                <span style={{ padding: '2px 8px', background: '#fffbeb', color: '#92400e', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>⚠️ PERISHABLE</span>
                                            ) : (
                                                <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#94a3b8', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>STABLE</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(item)}>Edit</button>
                                                <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#fee2e2', color: '#ef4444' }} onClick={() => handleDelete(item.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )
            }

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '750px', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                                    {formData.id ? 'Modify Product Specifications' : 'Initialize New SKU'}
                                </h2>
                                <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                            </div>

                            {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: '600' }}>{error}</div>}

                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Commercial Product Name *</label>
                                        <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Official NLDB Product Name" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Classification Category</label>
                                        <select className="form-control" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                                            <option value="">Select Category</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Operational Description</label>
                                    <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="Brief details for reports..." />
                                </div>

                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Product Image URL</label>
                                    <input type="text" className="form-control" name="image_url" value={formData.image_url} onChange={handleInputChange} placeholder="https://example.com/image.jpg" />
                                    <small style={{ color: '#64748b' }}>Provide a direct link to the product image.</small>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">SKU / Item Code</label>
                                        <input type="text" className="form-control" name="sku" value={formData.sku} onChange={handleInputChange} placeholder="STOCK-ID" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">GS1 / Barcode String</label>
                                        <input type="text" className="form-control" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Universal ID" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Unit of Measure</label>
                                        <select className="form-control" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange}>
                                            <option value="piece">Piece / Unit</option>
                                            <option value="kg">Kilogram (kg)</option>
                                            <option value="liter">Liter (l)</option>
                                            <option value="dozen">Dozen</option>
                                            <option value="pack">Commercial Pack</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Architecture</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Ex-Factory / Wholesale Price (Rs.)</label>
                                            <input type="number" className="form-control" name="wholesale_price" value={formData.wholesale_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">MSRP / Retail Price (Rs.)</label>
                                            <input type="number" className="form-control" name="retail_price" value={formData.retail_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '700', color: formData.is_perishable ? '#f59e0b' : '#64748b' }}>
                                            <input type="checkbox" name="is_perishable" checked={formData.is_perishable} onChange={handleInputChange} style={{ marginRight: '0.8rem', width: '20px', height: '20px' }} />
                                            <span>TRACK SHELF LIFE (Perishable)</span>
                                        </label>
                                    </div>
                                    {formData.is_perishable && (
                                        <div className="form-group">
                                            <label className="form-label">Standard Shelf Life (Days)</label>
                                            <input type="number" className="form-control" name="shelf_life_days" value={formData.shelf_life_days} onChange={handleInputChange} min="1" placeholder="Days from production" />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={handleCloseModal}>Discard Changes</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                                        {formData.id ? 'Execute SKU Update' : 'Initialize Product Recording'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Items;
