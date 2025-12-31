import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import '../shared/ModernPage.css';

const Sales = () => {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Sale form
    const [saleData, setSaleData] = useState({
        outlet_id: '',
        customer_id: '',
        payment_method: 'cash',
        discount: 0,
        tax: 0,
        notes: '',
        credit_days: 0
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch products with stock info
            const { data: productsData, error: productsError } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (name),
                    stock (quantity, outlet_id)
                `)
                .order('name');

            if (productsError) throw productsError;

            // Fetch customers
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (customersError) throw customersError;

            // Fetch outlets
            const { data: outletsData, error: outletsError } = await supabase
                .from('shops')
                .select('*')
                .order('name');

            if (outletsError) throw outletsError;

            setProducts(productsData || []);
            setCustomers(customersData || []);
            setOutlets(outletsData || []);

            // Auto-select first outlet if available
            if (outletsData && outletsData.length > 0) {
                setSaleData(prev => ({ ...prev, outlet_id: outletsData[0].id.toString() }));
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const getAvailableStock = (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product || !product.stock) return 0;

        if (saleData.outlet_id) {
            const outletStock = product.stock.find(s => s.outlet_id.toString() === saleData.outlet_id.toString());
            return outletStock ? outletStock.quantity : 0;
        } else {
            return product.stock.reduce((sum, s) => sum + (s.quantity || 0), 0);
        }
    };

    const addToCart = (product) => {
        const availableStock = getAvailableStock(product.id);

        if (availableStock <= 0) {
            setError(`${product.name} is currently out of stock`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        const existingItem = cart.find(item => item.product_id === product.id);

        if (existingItem) {
            if (existingItem.quantity >= availableStock) {
                setError(`Only ${availableStock} units available in stock`);
                setTimeout(() => setError(null), 3000);
                return;
            }
            updateCartQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem = {
                product_id: product.id,
                product_name: product.name,
                sku: product.sku,
                quantity: 1,
                unit_price: product.retail_price || 0,
                discount: 0,
                tax: 0,
                line_total: product.retail_price || 0,
                unit_of_measure: product.unit_of_measure || 'pcs'
            };
            setCart([...cart, newItem]);
        }
    };

    const updateCartQuantity = (productId, newQuantity) => {
        const availableStock = getAvailableStock(productId);

        if (newQuantity > availableStock) {
            setError(`Cannot exceed available stock (${availableStock})`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const lineTotal = (newQuantity * item.unit_price) - item.discount + item.tax;
                return { ...item, quantity: newQuantity, line_total: lineTotal };
            }
            return item;
        }));
    };

    const updateCartPrice = (productId, newPrice) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const lineTotal = (item.quantity * newPrice) - item.discount + item.tax;
                return { ...item, unit_price: newPrice, line_total: lineTotal };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const calculateTotals = () => {
        const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
        const discount = parseFloat(saleData.discount) || 0;
        const tax = parseFloat(saleData.tax) || 0;
        const total = subtotal - discount + tax;

        return { subtotal, discount, tax, total };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            setError('Please add items to your cart first.');
            return;
        }

        if (!saleData.outlet_id) {
            setError('Please select a retail outlet for this transaction.');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const totals = calculateTotals();
            const isDue = saleData.payment_method === 'credit';

            let dueDate = null;
            if (isDue) {
                const days = parseInt(saleData.credit_days) || 30;
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + days);
            }

            let customerName = null;
            if (saleData.customer_id) {
                const customer = customers.find(c => c.id.toString() === saleData.customer_id.toString());
                customerName = customer ? customer.name : null;
            }

            const { data: saleRecord, error: saleError } = await supabase
                .from('sales')
                .insert([{
                    outlet_id: parseInt(saleData.outlet_id) || null,
                    customer_id: parseInt(saleData.customer_id) || null,
                    customer_name: customerName,
                    subtotal: totals.subtotal,
                    discount: totals.discount,
                    tax: totals.tax,
                    total_amount: totals.total,
                    payment_method: saleData.payment_method,
                    payment_status: isDue ? 'pending' : 'paid',
                    amount_paid: isDue ? 0 : totals.total,
                    amount_due: isDue ? totals.total : 0,
                    due_date: dueDate,
                    notes: saleData.notes || null
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            const saleItems = cart.map(item => ({
                sale_id: saleRecord.id,
                product_id: item.product_id,
                product_name: item.product_name,
                sku: item.sku,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                tax: item.tax,
                line_total: item.line_total
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            setSuccess(`Transaction successful! Invoice: ${saleRecord.invoice_number}`);

            setCart([]);
            setSaleData(prev => ({
                ...prev,
                customer_id: '',
                payment_method: 'cash',
                discount: 0,
                tax: 0,
                notes: '',
                credit_days: 0
            }));

            fetchInitialData();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            console.error('Error creating sale:', err);
            setError(err.message || 'Transaction failed. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const totals = calculateTotals();

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || p.category_id?.toString() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...new Set(products.map(p => p.product_categories?.name).filter(Boolean))];

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="loading-spinner" style={{ borderTopColor: '#6366f1' }}></div>
            <p style={{ marginTop: '1.5rem', color: '#64748b', fontWeight: '500' }}>Initializing POS Terminal...</p>
        </div>
    );

    return (
        <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Digital Checkout</h1>
                    <p className="page-subtitle">NLDB Retail & Distribution Point of Sale</p>
                </div>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #fee2e2', fontWeight: '600' }}>
                    ⚠️ {error}
                </div>
            )}

            {success && (
                <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #dcfce7', fontWeight: '600' }}>
                    ✅ {success}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '2rem', alignItems: 'start' }}>
                {/* Product Catalog */}
                <div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by Product name or SKU code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '3rem', height: '50px' }}
                                />
                                <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                            </div>
                            <div style={{ width: '250px' }}>
                                <select className="form-control" style={{ height: '50px' }} value={saleData.outlet_id} onChange={(e) => setSaleData({ ...saleData, outlet_id: e.target.value })}>
                                    <option value="">Select Depot</option>
                                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat === 'all' ? 'all' : products.find(p => p.product_categories?.name === cat)?.category_id?.toString())}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '30px',
                                        border: '1px solid #e2e8f0',
                                        background: (selectedCategory === 'all' && cat === 'all') || (products.find(p => p.category_id?.toString() === selectedCategory)?.product_categories?.name === cat) ? '#6366f1' : 'white',
                                        color: (selectedCategory === 'all' && cat === 'all') || (products.find(p => p.category_id?.toString() === selectedCategory)?.product_categories?.name === cat) ? 'white' : '#64748b',
                                        whiteSpace: 'nowrap',
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: '0.2s'
                                    }}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {filteredProducts.map(product => {
                            const stock = getAvailableStock(product.id);
                            const inCart = cart.find(item => item.product_id === product.id);

                            return (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    style={{
                                        background: 'white',
                                        padding: '1.25rem',
                                        borderRadius: '20px',
                                        border: inCart ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                        cursor: stock > 0 ? 'pointer' : 'not-allowed',
                                        opacity: stock > 0 ? 1 : 0.6,
                                        transition: '0.2s',
                                        position: 'relative',
                                        boxShadow: inCart ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                        <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '800', color: '#64748b' }}>
                                            {product.unit_of_measure}
                                        </span>
                                    </div>
                                    <div style={{ height: '50px', width: '50px', background: '#6366f110', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.5rem' }}>
                                        {product.product_categories?.name === 'Dairy' ? '🥛' : product.product_categories?.name === 'Poultry' ? '🍗' : '📦'}
                                    </div>
                                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b', marginBottom: '4px' }}>{product.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>SKU: {product.sku || 'N/A'}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: '800', color: '#6366f1', fontSize: '1.1rem' }}>Rs. {product.retail_price?.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: stock > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                            Stock: {stock}
                                        </div>
                                    </div>
                                    {inCart && (
                                        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>
                                            {inCart.quantity} in cart
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Cart & Summary */}
                <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', position: 'sticky', top: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Order Summary
                            <span style={{ fontSize: '0.85rem', padding: '4px 12px', background: '#6366f120', color: '#6366f1', borderRadius: '20px' }}>{cart.length} ITEMS</span>
                        </h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
                                <h4 style={{ color: '#64748b' }}>Cart is Empty</h4>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Select products on the left to start a transaction.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px', marginBottom: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rs. {item.unit_price} / {item.unit_of_measure}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>-</button>
                                            <span style={{ fontWeight: '800', width: '30px', textAlign: 'center' }}>{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>+</button>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <button onClick={() => removeFromCart(item.product_id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                                        <div style={{ fontWeight: '800', color: '#1e293b' }}>Rs. {item.line_total.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Customer Profile</label>
                                <select className="form-control" style={{ fontSize: '0.85rem' }} value={saleData.customer_id} onChange={(e) => setSaleData({ ...saleData, customer_id: e.target.value })}>
                                    <option value="">General Walk-in Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Strategy</label>
                                <select className="form-control" style={{ fontSize: '0.85rem' }} value={saleData.payment_method} onChange={(e) => setSaleData({ ...saleData, payment_method: e.target.value })}>
                                    <option value="cash">💵 Cash Payment</option>
                                    <option value="card">💳 Card Terminal</option>
                                    <option value="bank_transfer">🏦 Bank Transfer</option>
                                    <option value="credit">🗓️ Credit Agreement</option>
                                </select>
                            </div>
                            {saleData.payment_method === 'credit' && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Settlement Term (Days)</label>
                                    <input type="number" className="form-control" value={saleData.credit_days} onChange={(e) => setSaleData({ ...saleData, credit_days: e.target.value })} min="0" placeholder="30" />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
                                <span>Subtotal</span>
                                <span>Rs. {totals.subtotal.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '0.9rem', fontWeight: '600' }}>
                                <span>Discounts</span>
                                <div>
                                    <input type="number" style={{ width: '80px', textAlign: 'right', border: 'none', background: 'none', borderBottom: '1px dashed #10b981', color: '#10b981', fontWeight: '700' }} value={saleData.discount} onChange={(e) => setSaleData({ ...saleData, discount: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Payable Amount</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>Rs. {totals.total.toLocaleString()}</div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0 || saving}
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                background: '#6366f1',
                                color: 'white',
                                border: 'none',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                cursor: (cart.length === 0 || saving) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                                transition: '0.2s',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Processing Transaction...' : 'Complete Transaction'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sales;
