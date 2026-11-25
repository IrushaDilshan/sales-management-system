import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuPackage,
  LuTrendingDown,
  LuTriangleAlert,
  LuBuilding2,
  LuRefreshCw,
  LuPlus,
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuArrowRightLeft,
  LuTrash2,
  LuCircleCheck,
} from 'react-icons/lu';

const Stock = () => {
  const { showToast } = useToast();

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
    notes: '',
  });
  const [error, setError] = useState(null);

  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

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
    const qty = Number(quantity ?? 0);
    const min = Number(minLevel ?? 10);
    return qty <= 0 || (min > 0 && qty < min);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stock table + items + shops + categories in parallel
      const [stockRes, itemsRes, shopsRes, catRes] = await Promise.all([
        supabase.from('stock').select('*'),
        supabase
          .from('items')
          .select('*, product_categories ( id, name )')
          .order('name'),
        supabase.from('shops').select('*').order('name'),
        supabase
          .from('product_categories')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ]);

      const itemsList = itemsRes.data || [];
      const shopsList = shopsRes.data || [];
      const catList = catRes.data || [];

      setAllItems(itemsList);
      setOutlets(shopsList);
      setCategories(catList);

      const rawStock = stockRes.data || [];

      const stitched = rawStock.map((s) => {
        const matchedItem = itemsList.find((i) => i.id === s.item_id);
        const matchedShop = shopsList.find((o) => o.id === s.outlet_id);
        const qtyVal = s.quantity ?? s.qty ?? 0;
        return {
          ...s,
          quantity: qtyVal,
          minimum_stock_level: s.minimum_stock_level ?? matchedItem?.minimum_level ?? 10,
          items: matchedItem || { name: 'Item Unavailable' },
          shops: matchedShop || null,
          isFallback: false,
        };
      });

      // Always include Central Depot rows from `items` for any item without a central `stock` row
      const centralFallbackRows = itemsList
        .filter((item) => !stitched.some((s) => !s.outlet_id && s.item_id === item.id))
        .map((item) => ({
          id: `item-${item.id}`,
          item_id: item.id,
          outlet_id: null,
          quantity: item.quantity ?? 0,
          minimum_stock_level: item.minimum_level || 10,
          batch_number: item.sku || null,
          expiry_date: null,
          items: item,
          shops: null,
          isFallback: true,
        }));

      setStocks([...centralFallbackRows, ...stitched]);
    } catch (err) {
      console.error('Error fetching stock surveillance:', err);
      setError('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Stats
  const stockStats = {
    totalItems: stocks.reduce((sum, s) => sum + (Number(s.quantity ?? s.qty) || 0), 0),
    lowStockItems: stocks.filter((s) =>
      isLowStock(s.quantity ?? s.qty, s.minimum_stock_level)
    ).length,
    expiringSoon: stocks.filter((s) => isExpiringSoon(s.expiry_date)).length,
    totalLocations: Math.max(
      new Set(stocks.map((s) => s.outlet_id).filter(Boolean)).size,
      stocks.length > 0 ? 1 : 0
    ),
  };

  const handleOpenModal = (type, stock = null) => {
    setModalType(type);
    if (stock) {
      setFormData({
        id: stock.id,
        isFallback: Boolean(stock.isFallback),
        item_id: stock.item_id,
        outlet_id: stock.outlet_id || '',
        quantity: stock.quantity ?? 0,
        batch_number: stock.batch_number || '',
        manufacture_date: stock.manufacture_date || '',
        expiry_date: stock.expiry_date || '',
        minimum_stock_level: stock.minimum_stock_level ?? 10,
        to_outlet_id: '',
        notes: '',
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
        notes: '',
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType('');
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (modalType === 'add') {
        await handleAddStock();
      } else if (modalType === 'adjust') {
        await handleAdjustStock();
      } else if (modalType === 'transfer') {
        await handleTransferStock();
      }
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleAddStock = async () => {
    const qty = parseInt(formData.quantity, 10) || 0;
    const stockData = {
      item_id: formData.item_id,
      outlet_id: formData.outlet_id || null,
      quantity: qty,
      batch_number: formData.batch_number || null,
      manufacture_date: formData.manufacture_date || null,
      expiry_date: formData.expiry_date || null,
      minimum_stock_level: parseInt(formData.minimum_stock_level, 10) || 0,
    };

    const { error: insertError } = await supabase.from('stock').insert([stockData]);
    if (insertError) throw insertError;

    // Keep items.quantity in sync when adding to Central Warehouse
    if (!stockData.outlet_id) {
      const targetItem = allItems.find((i) => i.id === stockData.item_id);
      const nextQty = (targetItem?.quantity ?? 0) + qty;
      await supabase
        .from('items')
        .update({ quantity: nextQty })
        .eq('id', stockData.item_id);
    }

    await supabase.from('stock_movements').insert([
      {
        product_id: stockData.item_id,
        to_outlet_id: stockData.outlet_id,
        quantity: qty,
        movement_type: 'purchase',
        batch_number: stockData.batch_number,
        notes: formData.notes || 'Initial stock entry',
      },
    ]);

    showToast('Stock reference added.', 'success');
    await fetchData();
    handleCloseModal();
  };

  const handleAdjustStock = async () => {
    const newQuantity = parseInt(formData.quantity, 10) || 0;

    if (formData.isFallback) {
      const { error: itemErr } = await supabase
        .from('items')
        .update({ quantity: newQuantity })
        .eq('id', formData.item_id);
      if (itemErr) throw itemErr;
    } else {
      const { error: updErr } = await supabase
        .from('stock')
        .update({
          quantity: newQuantity,
          batch_number: formData.batch_number || null,
          manufacture_date: formData.manufacture_date || null,
          expiry_date: formData.expiry_date || null,
          minimum_stock_level: parseInt(formData.minimum_stock_level, 10) || 0,
        })
        .eq('id', formData.id);
      if (updErr) throw updErr;
    }

    await supabase.from('stock_movements').insert([
      {
        product_id: formData.item_id,
        to_outlet_id: formData.outlet_id || null,
        quantity: newQuantity,
        movement_type: 'adjustment',
        batch_number: formData.batch_number || null,
        notes: formData.notes || 'Stock adjustment',
      },
    ]);

    showToast('Stock level updated.', 'success');
    await fetchData();
    handleCloseModal();
  };

  const handleTransferStock = async () => {
    const transferQty = parseInt(formData.quantity, 10) || 0;
    if (transferQty <= 0) throw new Error('Enter a valid transfer quantity.');

    if (formData.isFallback) {
      const currentItem = allItems.find((i) => i.id === formData.item_id);
      const currentQty = currentItem?.quantity ?? 0;
      if (currentQty < transferQty) {
        throw new Error(`Insufficient stock for transfer. Available: ${currentQty}`);
      }
      await supabase
        .from('items')
        .update({ quantity: currentQty - transferQty })
        .eq('id', formData.item_id);

      await supabase.from('stock').insert([
        {
          item_id: formData.item_id,
          outlet_id: formData.to_outlet_id,
          quantity: transferQty,
          batch_number: formData.batch_number || null,
        },
      ]);
    } else {
      const { data: sourceStock } = await supabase
        .from('stock')
        .select('quantity')
        .eq('id', formData.id)
        .single();

      if (!sourceStock || sourceStock.quantity < transferQty) {
        throw new Error('Insufficient stock for transfer.');
      }

      await supabase
        .from('stock')
        .update({ quantity: sourceStock.quantity - transferQty })
        .eq('id', formData.id);

      const { data: destStock } = await supabase
        .from('stock')
        .select('*')
        .eq('item_id', formData.item_id)
        .eq('outlet_id', formData.to_outlet_id)
        .maybeSingle();

      if (destStock) {
        await supabase
          .from('stock')
          .update({ quantity: destStock.quantity + transferQty })
          .eq('id', destStock.id);
      } else {
        await supabase.from('stock').insert([
          {
            item_id: formData.item_id,
            outlet_id: formData.to_outlet_id,
            quantity: transferQty,
            batch_number: formData.batch_number || null,
          },
        ]);
      }
    }

    await supabase.from('stock_movements').insert([
      {
        product_id: formData.item_id,
        from_outlet_id: formData.outlet_id || null,
        to_outlet_id: formData.to_outlet_id,
        quantity: transferQty,
        movement_type: 'transfer',
        batch_number: formData.batch_number || null,
        notes: formData.notes || 'Stock transfer',
      },
    ]);

    showToast('Stock transferred successfully.', 'success');
    await fetchData();
    handleCloseModal();
  };

  const handleDelete = async (stock) => {
    if (stock.isFallback) {
      showToast('Central item rows can be edited or adjusted directly.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete stock entry?',
      text: 'This removes the batch stock reference.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      try {
        const { error: delErr } = await supabase.from('stock').delete().eq('id', stock.id);
        if (delErr) throw delErr;
        showToast('Stock entry deleted.', 'info');
        fetchData();
      } catch (err) {
        console.error('Error deleting stock:', err);
        showToast('Failed to delete stock entry.', 'error');
      }
    }
  };

  const filteredStocks = stocks.filter((stock) => {
    if (!stock.items) return false;

    const matchesOutlet =
      filterOutlet === 'all' ||
      (filterOutlet === 'central' && !stock.outlet_id) ||
      stock.outlet_id?.toString() === filterOutlet;
    const matchesCategory =
      filterCategory === 'all' || stock.items.category_id?.toString() === filterCategory;
    const matchesSearch =
      searchTerm === '' ||
      stock.items.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExpiring = !showExpiring || isExpiringSoon(stock.expiry_date);
    const matchesLowStock =
      !showLowStock || isLowStock(stock.quantity, stock.minimum_stock_level);

    return (
      matchesOutlet &&
      matchesCategory &&
      matchesSearch &&
      matchesExpiring &&
      matchesLowStock
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>National Livestock Development Board · Centralized Stock Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Inventory Control
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monitor batch quantities, expiry windows, safety thresholds, and branch transfers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-card transition-colors"
          >
            <LuRefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal('add')}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LuPlus className="w-3.5 h-3.5" />
            <span>Add Stock Reference</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Units</span>
            <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <LuPackage className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stockStats.totalItems.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Across {stocks.length} active records</div>
          </div>
        </div>

        <div
          onClick={() => setShowLowStock((v) => !v)}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Low Stock Alerts
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <LuTrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {stockStats.lowStockItems}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Click to filter critical levels</div>
          </div>
        </div>

        <div
          onClick={() => setShowExpiring((v) => !v)}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Expiring Soon
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <LuTriangleAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stockStats.expiringSoon}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Within next 7 days</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Active Locations
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <LuBuilding2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stockStats.totalLocations}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Depots & retail outlets</div>
          </div>
        </div>
      </div>

      {/* Unified Data Surface Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find by product name, SKU, or batch..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filterOutlet}
                onChange={(e) => setFilterOutlet(e.target.value)}
                className="h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Everywhere</option>
                <option value="central">Central Depot</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Divisions</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showExpiring}
                onChange={(e) => setShowExpiring(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500"
              />
              <span>Show Only Expiring Items (7 days)</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500"
              />
              <span>Critical Stock Levels Only</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              Synchronizing inventory surveillance...
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <LuSearch className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No matching inventory records
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Refine your search parameters or add a new stock reference.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Product Identity
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Service Center
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Batch / SKU
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                    Stock Level
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-center">
                    Trigger Limit
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-center">
                    Safety Audit
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
                {filteredStocks.map((stock) => {
                  const low = isLowStock(stock.quantity, stock.minimum_stock_level);
                  const expired = isExpired(stock.expiry_date);
                  const expiring = !expired && isExpiringSoon(stock.expiry_date);

                  return (
                    <tr
                      key={stock.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {stock.items?.name}
                        </div>
                        {stock.items?.product_categories && (
                          <div className="text-[11px] font-medium text-zinc-400 mt-0.5">
                            {stock.items.product_categories.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {stock.shops ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400">
                            <LuBuilding2 className="w-3 h-3" />
                            {stock.shops.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Central Depot
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {stock.batch_number ? (
                          <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {stock.batch_number}
                          </code>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={low ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {stock.quantity}
                        </span>{' '}
                        <span className="text-xs font-sans font-normal text-zinc-400">
                          {stock.items?.unit_of_measure || 'units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-500">
                        {stock.minimum_stock_level || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          {expired && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              Expired
                            </span>
                          )}
                          {expiring && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              Expiring
                            </span>
                          )}
                          {low && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              Low Stock
                            </span>
                          )}
                          {!expired && !expiring && !low && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              <LuCircleCheck className="w-3 h-3" />
                              Secure
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal('adjust', stock)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
                          >
                            <LuSlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => handleOpenModal('transfer', stock)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors"
                          >
                            <LuArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transfer</span>
                          </button>
                          {!stock.isFallback && (
                            <button
                              onClick={() => handleDelete(stock)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Delete entry"
                            >
                              <LuTrash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Adjust / Transfer Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 !mt-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                {modalType === 'add' && 'Register New Inventory Record'}
                {modalType === 'adjust' && 'Inventory Correction'}
                {modalType === 'transfer' && 'Inter-Branch Transfer'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              {modalType === 'add' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Product Portfolio
                    </label>
                    <select
                      name="item_id"
                      value={formData.item_id}
                      onChange={handleInputChange}
                      required
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    >
                      <option value="">Select Item</option>
                      {allItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Deployment Center
                    </label>
                    <select
                      name="outlet_id"
                      value={formData.outlet_id}
                      onChange={handleInputChange}
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    >
                      <option value="">Central Warehouse</option>
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {modalType === 'transfer' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Target Destination Center
                  </label>
                  <select
                    name="to_outlet_id"
                    value={formData.to_outlet_id}
                    onChange={handleInputChange}
                    required
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  >
                    <option value="">Select Target Depot</option>
                    {outlets
                      .filter((o) => o.id !== formData.outlet_id)
                      .map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                {modalType !== 'transfer' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Batch Identifier
                    </label>
                    <input
                      type="text"
                      name="batch_number"
                      value={formData.batch_number}
                      onChange={handleInputChange}
                      placeholder="BN-XXXX-XXXX"
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {modalType !== 'transfer' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Production Date
                      </label>
                      <input
                        type="date"
                        name="manufacture_date"
                        value={formData.manufacture_date}
                        onChange={handleInputChange}
                        className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Expiry Deadline
                      </label>
                      <input
                        type="date"
                        name="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleInputChange}
                        className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Safety Stock Trigger (Min level)
                    </label>
                    <input
                      type="number"
                      name="minimum_stock_level"
                      value={formData.minimum_stock_level}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Audit Remarks
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional operational notes..."
                  className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {modalType === 'add' && 'Save Stock Entry'}
                  {modalType === 'adjust' && 'Save Adjustment'}
                  {modalType === 'transfer' && 'Execute Transfer'}
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
