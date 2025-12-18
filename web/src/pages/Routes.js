import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import './Routes.css';
import '../shared/ModernPage.css';

export default function Routes() {
    const [routes, setRoutes] = useState([]);
    const [shops, setShops] = useState([]);
    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        rep_id: '',
        selectedShops: []
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch routes
            const { data: routesData, error: routesError } = await supabase
                .from('routes')
                .select('*')
                .order('name');

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            // Fetch shops
            const { data: shopsData, error: shopsError } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (shopsError) throw shopsError;

            // Fetch reps (users with role = rep)
            const { data: repsData, error: repsError } = await supabase
                .from('users')
                .select('id, name')
                .eq('role', 'rep')
                .order('name');

            if (repsError) throw repsError;

            // Enrich routes with rep names and shop counts
            const enrichedRoutes = await Promise.all(
                (routesData || []).map(async (route) => {
                    // Get rep name
                    const rep = repsData?.find(r => r.id === route.rep_id);

                    // Get shops in this route
                    const routeShops = shopsData?.filter(s => s.route_id === route.id) || [];

                    return {
                        ...route,
                        repName: rep?.name || 'No rep assigned',
                        shopCount: routeShops.length,
                        shops: routeShops
                    };
                })
            );

            setRoutes(enrichedRoutes);
            setShops(shopsData || []);
            setReps(repsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (route = null) => {
        if (route) {
            setFormData({
                id: route.id,
                name: route.name,
                rep_id: route.rep_id || '',
                selectedShops: route.shops.map(s => s.id)
            });
        } else {
            setFormData({
                id: null,
                name: '',
                rep_id: '',
                selectedShops: []
            });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', rep_id: '', selectedShops: [] });
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShopToggle = (shopId) => {
        setFormData(prev => ({
            ...prev,
            selectedShops: prev.selectedShops.includes(shopId)
                ? prev.selectedShops.filter(id => id !== shopId)
                : [...prev.selectedShops, shopId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let routeId = formData.id;

            // Step 1: Save/Update route
            if (formData.id) {
                // Update existing route
                const { error: updateError } = await supabase
                    .from('routes')
                    .update({
                        name: formData.name,
                        rep_id: formData.rep_id || null
                    })
                    .eq('id', formData.id);

                if (updateError) throw updateError;
            } else {
                // Create new route
                const { data: newRoute, error: insertError } = await supabase
                    .from('routes')
                    .insert([{
                        name: formData.name,
                        rep_id: formData.rep_id || null
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                routeId = newRoute.id;
            }

            // Step 2: Update shops to assign to this route
            // First, unassign all shops from this route
            await supabase
                .from('shops')
                .update({ route_id: null })
                .eq('route_id', routeId);

            // Then assign selected shops to this route
            if (formData.selectedShops.length > 0) {
                const { error: shopsError } = await supabase
                    .from('shops')
                    .update({ route_id: routeId })
                    .in('id', formData.selectedShops);

                if (shopsError) throw shopsError;
            }

            fetchData();
            handleCloseModal();
            alert(formData.id ? 'Route updated successfully!' : 'Route created successfully!');
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this route? Shops will be unassigned.')) {
            try {
                // Unassign shops first
                await supabase
                    .from('shops')
                    .update({ route_id: null })
                    .eq('route_id', id);

                // Delete route
                const { error } = await supabase
                    .from('routes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchData();
                alert('Route deleted successfully!');
            } catch (err) {
                console.error('Error deleting route:', err);
                alert('Failed to delete route: ' + err.message);
            }
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading">Loading routes...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Route Management</h1>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Route
                </button>
            </div>

            <div className="routes-container">
                {routes.length === 0 ? (
                    <div className="empty-state">
                        <h3>No routes found</h3>
                        <p>Click "Add Route" to create your first route.</p>
                    </div>
                ) : (
                    <div className="routes-grid">
                        {routes.map((route) => (
                            <div key={route.id} className="route-card">
                                <div className="route-header">
                                    <h3 className="route-name">{route.name}</h3>
                                    <div className="route-actions">
                                        <button
                                            className="action-btn btn-edit"
                                            onClick={() => handleOpenModal(route)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="action-btn btn-delete"
                                            onClick={() => handleDelete(route.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="route-info">
                                    <div className="info-item">
                                        <span className="info-label">👤 Rep:</span>
                                        <span className="info-value">{route.repName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">🏪 Shops:</span>
                                        <span className="info-value">{route.shopCount}</span>
                                    </div>
                                </div>

                                {route.shops.length > 0 && (
                                    <div className="route-shops">
                                        <h4 className="shops-title">Shops in this route:</h4>
                                        <ul className="shops-list">
                                            {route.shops.map((shop) => (
                                                <li key={shop.id}>{shop.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Route' : 'Add New Route'}
                        </h2>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Route Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., Route A, Downtown Area"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Rep</label>
                                <select
                                    className="form-select"
                                    name="rep_id"
                                    value={formData.rep_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">No Rep Assigned</option>
                                    {reps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    The rep assigned to manage this route
                                </small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Shops</label>
                                <div className="shops-checklist">
                                    {shops.length === 0 ? (
                                        <p style={{ color: '#999' }}>No shops available</p>
                                    ) : (
                                        shops.map(shop => (
                                            <label key={shop.id} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selectedShops.includes(shop.id)}
                                                    onChange={() => handleShopToggle(shop.id)}
                                                />
                                                <span>{shop.name}</span>
                                                {shop.route_id && shop.route_id !== formData.id && (
                                                    <span className="shop-warning">
                                                        (Currently in another route)
                                                    </span>
                                                )}
                                            </label>
                                        ))
                                    )}
                                </div>
                                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    Select all shops that belong to this route
                                </small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Route'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
