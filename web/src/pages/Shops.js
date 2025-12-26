import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Shops = () => {
    const [shops, setShops] = useState([]);
    const [reps, setReps] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '' });
    const [error, setError] = useState(null);

    // Simple filter states - just search and route
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: shopsData, error: shopsError } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (shopsError) throw shopsError;

            const { data: repsData, error: repsError } = await supabase
                .from('users')
                .select('id, name')
                .eq('role', 'rep');

            if (repsError) throw repsError;

            const { data: routesData, error: routesError } = await supabase
                .from('routes')
                .select('id, name')
                .order('name');

            if (routesError && routesError.code !== 'PGRST116') throw routesError;

            const { data: salesmenData, error: salesmenError } = await supabase
                .from('users')
                .select('id, name, shop_id')
                .eq('role', 'salesman')
                .order('name');

            if (salesmenError && salesmenError.code !== 'PGRST116') throw salesmenError;

            setReps(repsData || []);
            setRoutes(routesData || []);
            setSalesmen(salesmenData || []);

            const formattedShops = (shopsData || []).map(shop => {
                const assignedRep = repsData?.find(r => r.id === shop.rep_id);
                const assignedRoute = routesData?.find(r => r.id === shop.route_id);
                // Find salesman by checking which user has this shop assigned
                const assignedSalesman = salesmenData?.find(s => s.shop_id === shop.id);

                return {
                    ...shop,
                    rep: assignedRep || null,
                    route: assignedRoute || null,
                    salesman: assignedSalesman || null
                };
            });

            setShops(formattedShops);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (shop = null) => {
        if (shop) {
            setFormData({
                id: shop.id,
                name: shop.name || '',
                rep_id: shop.rep_id || '',
                route_id: shop.route_id || '',
                salesman_id: shop.salesman?.id || ''
            });
        } else {
            setFormData({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '' });
        }
        setIsModalOpen(true);
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, name: '', rep_id: '', route_id: '', salesman_id: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const shopUpdates = {
                name: formData.name,
                rep_id: formData.rep_id || null,
                route_id: formData.route_id || null
            };

            let shopId;
            let error;

            // First, create or update the shop
            if (formData.id) {
                // Update existing shop
                const { error: updateError } = await supabase
                    .from('shops')
                    .update(shopUpdates)
                    .eq('id', formData.id);
                error = updateError;
                shopId = formData.id;
            } else {
                // Create new shop
                const { data: newShop, error: insertError } = await supabase
                    .from('shops')
                    .insert([shopUpdates])
                    .select()
                    .single();
                error = insertError;
                shopId = newShop?.id;
            }

            if (error) throw error;

            // Second, if a salesman was selected, update that user's shop_id
            if (formData.salesman_id) {
                // First, clear the shop_id for any other user assigned to this shop
                await supabase
                    .from('users')
                    .update({ shop_id: null })
                    .eq('shop_id', shopId)
                    .neq('id', formData.salesman_id);

                // Then assign the selected salesman to this shop
                const { error: userUpdateError } = await supabase
                    .from('users')
                    .update({ shop_id: shopId })
                    .eq('id', formData.salesman_id);

                if (userUpdateError) throw userUpdateError;
            }

            fetchData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shop?\n\nNote: Any salesmen assigned to this shop will be unassigned.')) {
            try {
                // First, clear shop_id from any users assigned to this shop
                await supabase
                    .from('users')
                    .update({ shop_id: null })
                    .eq('shop_id', id);

                // Then delete the shop
                const { error } = await supabase
                    .from('shops')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                alert('Shop deleted successfully!');
                fetchData();
            } catch (err) {
                console.error('Error deleting shop:', err);
                alert('Failed to delete shop: ' + err.message);
            }
        }
    };

    // Simple filtering: search + route
    const filteredShops = shops.filter(shop => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchName = shop.name?.toLowerCase().includes(query);
            const matchRoute = shop.route?.name?.toLowerCase().includes(query);
            const matchSalesman = shop.salesman?.name?.toLowerCase().includes(query);
            const matchRep = shop.rep?.name?.toLowerCase().includes(query);

            if (!matchName && !matchRoute && !matchSalesman && !matchRep) {
                return false;
            }
        }

        // Route filter
        if (selectedRoute !== 'all' && shop.route_id !== selectedRoute) {
            return false;
        }

        return true;
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Shop Management</h1>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Shop
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : (
                <>
                    {/* SIMPLE FILTERS */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '3fr 2fr auto',
                            gap: '1rem',
                            alignItems: 'end'
                        }}>
                            {/* Search */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Search Shops
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by shop, route, salesman, or rep..."
                                    className="form-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Route Filter */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Filter by Route
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedRoute}
                                    onChange={(e) => setSelectedRoute(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="all">All Routes</option>
                                    {routes.map(route => (
                                        <option key={route.id} value={route.id}>{route.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Clear Button */}
                            <div>
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedRoute('all');
                                    }}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div style={{
                            marginTop: '1rem',
                            fontSize: '0.9rem',
                            color: '#6B7280',
                            fontWeight: '500'
                        }}>
                            Showing {filteredShops.length} of {shops.length} shops
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="table-container">
                        {filteredShops.length === 0 ? (
                            <div className="empty-state">
                                <h3>No shops found</h3>
                                <p>{searchQuery || selectedRoute !== 'all' ? 'No shops match your filters. Try clearing filters.' : 'Click "Add Shop" to create your first shop.'}</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Shop Name</th>
                                        <th>Route</th>
                                        <th>Salesman</th>
                                        <th>Assigned Rep</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredShops.map((shop) => (
                                        <tr key={shop.id || Math.random()}>
                                            <td>{shop.name}</td>
                                            <td>
                                                {shop.route ? (
                                                    <span style={{ color: '#2196F3', fontWeight: '600' }}>{shop.route.name}</span>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>No route</span>
                                                )}
                                            </td>
                                            <td>
                                                {shop.salesman ? (
                                                    <span style={{ color: '#4CAF50', fontWeight: '600' }}>{shop.salesman.name}</span>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>No salesman</span>
                                                )}
                                            </td>
                                            <td>{shop.rep ? shop.rep.name : <span style={{ color: '#9ca3af' }}>Unassigned</span>}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-btn btn-edit" onClick={() => handleOpenModal(shop)}>
                                                    Edit
                                                </button>
                                                <button className="action-btn btn-delete" onClick={() => handleDelete(shop.id)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {formData.id ? 'Edit Shop' : 'Add New Shop'}
                        </h2>

                        {error && (
                            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Shop Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Super Mart"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Route</label>
                                <select
                                    className="form-select"
                                    name="route_id"
                                    value={formData.route_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- No Route --</option>
                                    {routes.map(route => (
                                        <option key={route.id} value={route.id}>{route.name}</option>
                                    ))}
                                </select>
                                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    Assign this shop to a route for territory organization
                                </small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Salesman</label>
                                <select
                                    className="form-select"
                                    name="salesman_id"
                                    value={formData.salesman_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- No Salesman --</option>
                                    {salesmen.map(salesman => (
                                        <option key={salesman.id} value={salesman.id}>{salesman.name}</option>
                                    ))}
                                </select>
                                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    The salesman who manages this shop
                                </small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assign Representative (Optional)</label>
                                <select
                                    className="form-select"
                                    name="rep_id"
                                    value={formData.rep_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">-- Select Representative --</option>
                                    {reps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    Individual rep assignment (overrides route assignment)
                                </small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {formData.id ? 'Save Changes' : 'Create Shop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shops;
