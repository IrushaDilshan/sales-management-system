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
            // Fetch all categories to ensure we get data
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .order('name');

            if (error) throw error;

            if (data && data.length > 0) {
                setCategories(data);
            } else {
                // strict fallback
                setCategories([
                    { id: 1, name: 'Milk & Dairy' },
                    { id: 2, name: 'Poultry & Meat' },
                    { id: 3, name: 'Agro Products' }
                ]);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            // strict fallback on error
            setCategories([
                { id: 1, name: 'Milk & Dairy' },
                { id: 2, name: 'Poultry & Meat' },
                { id: 3, name: 'Agro Products' }
            ]);
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
                category_id: formData.category_id || null, // Ensure ID is saved
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
        <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="stat-icon" style={{ color: color }}>{icon}</div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
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
                <div className="registry-filter-hub" style={{
                    marginBottom: '2rem',
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
                            <div className="empty-state">
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                                <h3 style={{ color: '#f8fafc' }}>No products found in catalog</h3>
                                <p style={{ color: '#94a3b8' }}>Try adjusting filters or register a new SKU.</p>
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt="Preview"
                                                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: '700', color: '#f8fafc' }}>{item.name}</div>
                                                        {item.description && (
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {item.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {item.product_categories ? (
                                                    <span style={{ padding: '4px 10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                        {item.product_categories.name}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                <code style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#cbd5e1', border: '1px solid #334155' }}>
                                                    {item.sku || 'N/A'}
                                                </code>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '600', color: '#94a3b8' }}>
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
                                                    <span style={{ padding: '2px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(245, 158, 11, 0.2)' }}>⚠️ PERISHABLE</span>
                                                ) : (
                                                    <span style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.2)' }}>STABLE</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleOpenModal(item)}>Edit</button>
                                                    <button className="btn-cancel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleDelete(item.id)}>Delete</button>
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
            </div>

            {/* Premium Dark Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade" style={{ maxWidth: '850px', width: '90%', borderRadius: '24px', padding: '0', background: '#0f172a', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        {/* Header */}
                        <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
                                    {formData.id ? 'Edit Product Details' : 'Register New Product'}
                                </h2>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Fill in the SKU details below to update the master catalog.</p>
                            </div>
                            <button onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>×</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '2.5rem' }}>
                            {error && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '3rem' }}>

                                    {/* Left: Image */}
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '0.8rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>PRODUCT IMAGE</label>
                                        <div
                                            style={{
                                                width: '100%',
                                                aspectRatio: '1/1',
                                                borderRadius: '16px',
                                                background: formData.image_url ? `url(${formData.image_url}) center/cover` : '#1e293b',
                                                border: '2px dashed #475569',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => document.getElementById('file-upload').click()}
                                        >
                                            {!formData.image_url && (
                                                <>
                                                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📷</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Upload Photo</span>
                                                </>
                                            )}
                                            {formData.image_url && (
                                                <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '0.7rem', textAlign: 'center' }}>Click to Change</div>
                                            )}
                                            <input id="file-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                // Local Blob Preview to show instantly
                                                const previewUrl = URL.createObjectURL(file);
                                                setFormData(prev => ({ ...prev, image_url: previewUrl }));
                                                // Real upload would go here...
                                            }} />
                                        </div>
                                        <input
                                            type="text"
                                            name="image_url"
                                            value={formData.image_url}
                                            onChange={handleInputChange}
                                            placeholder="Or paste URL..."
                                            style={{ marginTop: '1rem', width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', padding: '0.8rem', borderRadius: '8px', fontSize: '0.8rem' }}
                                        />
                                    </div>

                                    {/* Right: Inputs */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>PRODUCT NAME</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="e.g. Full Cream Milk Powder"
                                                style={{
                                                    width: '100%',
                                                    background: '#1e293b',
                                                    border: '1px solid #334155',
                                                    color: '#f8fafc',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    fontSize: '1.1rem',
                                                    fontWeight: '600',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>CATEGORY</label>
                                                <select
                                                    name="category_id"
                                                    value={formData.category_id}
                                                    onChange={handleInputChange}
                                                    required
                                                    style={{
                                                        width: '100%',
                                                        background: '#1e293b',
                                                        border: '1px solid #334155',
                                                        color: '#f8fafc',
                                                        padding: '0.8rem',
                                                        borderRadius: '8px',
                                                        height: '50px',
                                                        fontSize: '1rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="" style={{ color: '#94a3b8' }}>Select Category...</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id} style={{ color: '#000', backgroundColor: '#fff' }}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" style={{ marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>UNIT</label>
                                                <select
                                                    name="unit_of_measure"
                                                    value={formData.unit_of_measure}
                                                    onChange={handleInputChange}
                                                    style={{
                                                        width: '100%',
                                                        background: '#1e293b',
                                                        border: '1px solid #334155',
                                                        color: '#f8fafc',
                                                        padding: '0.8rem',
                                                        borderRadius: '8px',
                                                        height: '50px',
                                                        fontSize: '1rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="piece">Piece</option>
                                                    <option value="kg">Kg</option>
                                                    <option value="liter">Liter</option>
                                                    <option value="pack">Pack</option>
                                                    <option value="bottle">Bottle</option>
                                                    <option value="pot">Pot</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Price Box */}
                                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '2rem' }}>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>RETAIL PRICE (Rs.)</label>
                                                <input
                                                    type="number"
                                                    name="retail_price"
                                                    value={formData.retail_price}
                                                    onChange={handleInputChange}
                                                    placeholder="0.00"
                                                    style={{
                                                        width: '100%',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        fontSize: '2rem',
                                                        fontWeight: '800',
                                                        color: '#6366f1',
                                                        height: '50px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ width: '1px', background: '#334155', alignSelf: 'stretch' }}></div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>WHOLESALE PRICE (Rs.)</label>
                                                <input
                                                    type="number"
                                                    name="wholesale_price"
                                                    value={formData.wholesale_price}
                                                    onChange={handleInputChange}
                                                    placeholder="0.00"
                                                    style={{
                                                        width: '100%',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        fontSize: '2rem',
                                                        fontWeight: '800',
                                                        color: '#cbd5e1',
                                                        height: '50px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: '#1e293b', padding: '1rem', borderRadius: '8px', border: formData.is_perishable ? '1px solid #f59e0b' : '1px solid #334155', transition: 'all 0.2s', userSelect: 'none' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: formData.is_perishable ? '#f59e0b' : 'transparent', borderColor: formData.is_perishable ? '#f59e0b' : '#475569' }}>
                                                    {formData.is_perishable && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                                                </div>
                                                <input type="checkbox" name="is_perishable" checked={formData.is_perishable} onChange={handleInputChange} style={{ display: 'none' }} />
                                                <span style={{ color: formData.is_perishable ? '#f59e0b' : '#cbd5e1', fontWeight: '600' }}>Perishable Item (Short Shelf Life)</span>
                                            </label>
                                        </div>

                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div style={{ borderTop: '1px solid #1e293b', marginTop: '2.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn-cancel" onClick={handleCloseModal} style={{ padding: '1rem 2rem', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1rem', background: '#f59e0b', color: '#1e293b', fontWeight: '800', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', cursor: 'pointer' }}>
                                        {formData.id ? 'SAVE CHANGES' : 'CREATE PRODUCT'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Items;
