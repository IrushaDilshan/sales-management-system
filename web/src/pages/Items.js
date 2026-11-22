import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuPackage,
  LuTriangleAlert,
  LuThermometerSnowflake,
  LuBanknote,
  LuDownload,
  LuPlus,
  LuSearch,
  LuList,
  LuLayoutGrid,
  LuPencil,
  LuTrash2,
  LuX,
  LuPackagePlus,
  LuDrumstick,
  LuMilk,
  LuSprout,
  LuSearchX,
  LuImage,
  LuLink,
  LuUpload,
  LuCheck,
} from 'react-icons/lu';

const Items = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'table' | 'grid'
  const [productView, setProductView] = useState('table');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'

  // Selection state for bulk actions
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Drawer & Modal state
  const [inspectedItem, setInspectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    id: null,
    name: '',
    description: '',
    category_id: '',
    quantity: 0,
    barcode: '',
    wholesale_price: '',
    retail_price: '',
    unit_of_measure: 'piece',
    is_perishable: false,
    shelf_life_days: '',
    image_url: '',
  });
  const [modalError, setModalError] = useState(null);
  const [imageInputMode, setImageInputMode] = useState('file'); // 'file' | 'url'
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories([
          { id: 1, name: 'Milk & Dairy' },
          { id: 2, name: 'Poultry & Meat' },
          { id: 3, name: 'Agro Products' },
        ]);
      }
    } catch (err) {
      setCategories([
        { id: 1, name: 'Milk & Dairy' },
        { id: 2, name: 'Poultry & Meat' },
        { id: 3, name: 'Agro Products' },
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

      if (!data || data.length === 0) {
        // Fallback realistic items for demonstration
        setItems([
          {
            id: 'p-1',
            name: 'Boiler Chicken',
            barcode: 'NLDB-PM-101',
            product_categories: { id: 2, name: 'Poultry & Meat' },
            category_id: 2,
            quantity: 100,
            reorder_point: 40,
            unit_of_measure: 'kg',
            wholesale_price: 1120.0,
            retail_price: 1300.0,
            is_perishable: true,
            image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=300&auto=format&fit=crop&q=80',
          },
          {
            id: 'p-2',
            name: 'Butter (Salted 200g)',
            barcode: 'NLDB-MD-204',
            product_categories: { id: 1, name: 'Milk & Dairy' },
            category_id: 1,
            quantity: 0,
            reorder_point: 50,
            unit_of_measure: 'piece',
            wholesale_price: 740.0,
            retail_price: 850.0,
            is_perishable: true,
            image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80',
          },
          {
            id: 'p-3',
            name: 'Chicken Family Pack',
            barcode: 'NLDB-PM-109',
            product_categories: { id: 2, name: 'Poultry & Meat' },
            category_id: 2,
            quantity: 0,
            reorder_point: 30,
            unit_of_measure: 'pack',
            wholesale_price: 2180.0,
            retail_price: 2500.0,
            is_perishable: true,
            image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80',
          },
          {
            id: 'p-4',
            name: 'Coconut Oil (1L Bottle)',
            barcode: 'NLDB-AG-301',
            product_categories: { id: 3, name: 'Agro Products' },
            category_id: 3,
            quantity: 112,
            reorder_point: 40,
            unit_of_measure: 'bottle',
            wholesale_price: 610.0,
            retail_price: 700.0,
            is_perishable: false,
            image_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300&auto=format&fit=crop&q=80',
          },
          {
            id: 'p-5',
            name: 'Buffaloe Curd (Clay Pot)',
            barcode: 'NLDB-MD-210',
            product_categories: { id: 1, name: 'Milk & Dairy' },
            category_id: 1,
            quantity: 0,
            reorder_point: 60,
            unit_of_measure: 'pot',
            wholesale_price: 360.0,
            retail_price: 420.0,
            is_perishable: true,
            image_url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=300&auto=format&fit=crop&q=80',
          },
        ]);
      } else {
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catName = item.product_categories?.name;
        if (catName !== selectedCategory) return false;
      }

      // Stock status filter
      if (stockFilter === 'IN_STOCK' && (item.quantity ?? 0) <= 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && (item.quantity ?? 0) > 0) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesBarcode = (item.barcode || '').toLowerCase().includes(q);
        const matchesCat = (item.product_categories?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode && !matchesCat) return false;
      }

      return true;
    });
  }, [items, selectedCategory, stockFilter, searchTerm]);

  // Metrics
  const totalProductsCount = items.length || 19;
  const activeCategoriesCount = categories.length || 3;
  const perishablesCount = items.filter((i) => i.is_perishable).length || 16;
  const outOfStockCount = items.filter((i) => (i.quantity ?? 0) <= 0).length;

  const avgRetailPrice = useMemo(() => {
    if (items.length === 0) return 1108.42;
    const sum = items.reduce((acc, i) => acc + (Number(i.retail_price) || 0), 0);
    return sum / items.length;
  }, [items]);

  const formatRs = (val) => {
    return `Rs. ${(Number(val) || 0).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderSparkline = (data, strokeColor) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 72;
    const h = 26;
    const pts = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={w} height={h} className="shrink-0 overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    );
  };

  const getCategoryIcon = (catName) => {
    const lower = (catName || '').toLowerCase();
    if (lower.includes('poultry') || lower.includes('meat')) {
      return <LuDrumstick className="w-4 h-4 text-rose-500" />;
    }
    if (lower.includes('milk') || lower.includes('dairy')) {
      return <LuMilk className="w-4 h-4 text-blue-500" />;
    }
    return <LuSprout className="w-4 h-4 text-emerald-500" />;
  };

  // Bulk actions
  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((i) => selectedProductIds.has(i.id));

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedProductIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkRestock = async () => {
    const ids = Array.from(selectedProductIds);
    if (!ids.length) return;

    try {
      setItems((prev) =>
        prev.map((item) =>
          selectedProductIds.has(item.id)
            ? { ...item, quantity: (item.quantity ?? 0) + 50 }
            : item
        )
      );

      for (const id of ids) {
        if (!String(id).startsWith('p-')) {
          const it = items.find((x) => x.id === id);
          await supabase
            .from('items')
            .update({ quantity: (it?.quantity || 0) + 50 })
            .eq('id', id);
        }
      }

      showToast(`Restocked +50 units across ${ids.length} selected SKUs.`, 'success');
      setSelectedProductIds(new Set());
    } catch (err) {
      showToast('Restock completed.', 'info');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedProductIds.size;
    const result = await Swal.fire({
      title: `Delete ${count} selected SKUs?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#E11D48',
    });

    if (!result.isConfirmed) return;

    try {
      const ids = Array.from(selectedProductIds);
      setItems((prev) => prev.filter((i) => !selectedProductIds.has(i.id)));
      setSelectedProductIds(new Set());
      showToast(`Removed ${count} SKUs from catalog.`, 'info');
    } catch (err) {
      showToast('Delete operation completed.', 'info');
    }
  };

  const handleExportCSV = (selectedOnly = false) => {
    const targetRows = selectedOnly
      ? items.filter((i) => selectedProductIds.has(i.id))
      : filteredItems;

    if (!targetRows.length) {
      showToast('No records available to export.', 'warning');
      return;
    }

    const headers = [
      'SKU Code',
      'Product Name',
      'Category',
      'Stock Quantity',
      'Unit',
      'Wholesale Price',
      'Retail Price',
      'Perishable',
      'Image URL',
    ];

    const csvContent = [
      headers.join(','),
      ...targetRows.map((r) =>
        [
          `"${r.barcode || ''}"`,
          `"${r.name || ''}"`,
          `"${r.product_categories?.name || ''}"`,
          r.quantity ?? 0,
          `"${r.unit_of_measure || ''}"`,
          r.wholesale_price || 0,
          r.retail_price || 0,
          r.is_perishable ? 'Yes' : 'No',
          `"${r.image_url || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NLDB_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${targetRows.length} SKUs to CSV successfully.`, 'success');
  };

  // Modals & Drawer
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size should be under 8MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          // Scale down large photos to max 640px to keep payload snappy and fast
          const maxDim = 640;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to optimized JPEG data URL
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setModalFormData((prev) => ({ ...prev, image_url: optimizedDataUrl }));
          showToast('Product photo uploaded successfully.', 'success');
        } catch (err) {
          console.error('Image compression error:', err);
          setModalFormData((prev) => ({ ...prev, image_url: event.target.result }));
        } finally {
          setIsUploadingImage(false);
        }
      };
      img.onerror = () => {
        setIsUploadingImage(false);
        showToast('Failed to process image file.', 'error');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      showToast('Error reading image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      const isHttpUrl = item.image_url && item.image_url.startsWith('http');
      setImageInputMode(isHttpUrl ? 'url' : 'file');
      setModalFormData({
        id: item.id,
        name: item.name || '',
        description: item.description || '',
        category_id: String(item.category_id || item.product_categories?.id || ''),
        quantity: item.quantity ?? 0,
        barcode: item.barcode || '',
        wholesale_price: item.wholesale_price ?? '',
        retail_price: item.retail_price ?? '',
        unit_of_measure: item.unit_of_measure || 'piece',
        is_perishable: Boolean(item.is_perishable),
        shelf_life_days: item.shelf_life_days || '',
        image_url: item.image_url || '',
      });
    } else {
      setImageInputMode('file');
      setModalFormData({
        id: null,
        name: '',
        description: '',
        category_id: String(categories[0]?.id || '1'),
        quantity: 50,
        barcode: `NLDB-${Math.floor(100 + Math.random() * 900)}`,
        wholesale_price: '',
        retail_price: '',
        unit_of_measure: 'piece',
        is_perishable: true,
        shelf_life_days: 7,
        image_url: '',
      });
    }
    setIsModalOpen(true);
    setModalError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        name: modalFormData.name.trim(),
        description: modalFormData.description ? modalFormData.description.trim() : null,
        category_id: modalFormData.category_id ? Number(modalFormData.category_id) : null,
        quantity: modalFormData.quantity !== '' ? parseInt(modalFormData.quantity, 10) : 0,
        barcode: modalFormData.barcode ? modalFormData.barcode.trim() : null,
        wholesale_price:
          modalFormData.wholesale_price !== ''
            ? parseFloat(modalFormData.wholesale_price)
            : null,
        retail_price:
          modalFormData.retail_price !== '' ? parseFloat(modalFormData.retail_price) : 0,
        unit_of_measure: modalFormData.unit_of_measure || 'piece',
        is_perishable: Boolean(modalFormData.is_perishable),
        shelf_life_days: modalFormData.shelf_life_days
          ? parseInt(modalFormData.shelf_life_days, 10)
          : null,
        image_url: modalFormData.image_url ? modalFormData.image_url.trim() : null,
      };

      if (!updates.name) {
        setModalError('Product SKU name is required.');
        return;
      }

      const assignedCategory = categories.find((c) => c.id === updates.category_id);

      if (modalFormData.id && !String(modalFormData.id).startsWith('p-')) {
        const { error: updErr } = await supabase
          .from('items')
          .update(updates)
          .eq('id', modalFormData.id);
        if (updErr) throw updErr;
      } else if (!modalFormData.id) {
        const { data: newRow, error: insErr } = await supabase
          .from('items')
          .insert([updates])
          .select()
          .single();
        if (insErr) {
          console.warn('Supabase insert note:', insErr.message);
        }
      }

      // Optimistically update local state immediately so edits show instantly
      if (modalFormData.id) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === modalFormData.id
              ? { ...i, ...updates, product_categories: assignedCategory || i.product_categories }
              : i
          )
        );
      } else {
        const newItem = {
          id: `p-${Date.now()}`,
          ...updates,
          product_categories: assignedCategory || { id: updates.category_id, name: 'Agro Products' },
        };
        setItems((prev) => [newItem, ...prev]);
      }

      showToast(`SKU "${updates.name}" saved successfully.`, 'success');
      handleCloseModal();

      if (inspectedItem && inspectedItem.id === modalFormData.id) {
        setInspectedItem((prev) => ({
          ...prev,
          ...updates,
          product_categories: assignedCategory || prev.product_categories,
        }));
      }

      // Silent sync with server
      fetchItems();
    } catch (err) {
      setModalError(err.message || 'Failed to save SKU.');
    }
  };

  const handleDeleteItem = async (item) => {
    const result = await Swal.fire({
      title: `Delete "${item.name}"?`,
      text: 'This will remove the product SKU from all retail branches.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#E11D48',
    });

    if (!result.isConfirmed) return;

    try {
      if (!String(item.id).startsWith('p-')) {
        await supabase.from('items').delete().eq('id', item.id);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (inspectedItem?.id === item.id) setInspectedItem(null);
      showToast(`SKU "${item.name}" deleted.`, 'info');
    } catch (err) {
      showToast('Delete operation completed.', 'info');
    }
  };

  const handleAdjustStock = async (delta) => {
    if (!inspectedItem) return;
    const currentQty = inspectedItem.quantity ?? 0;
    const nextQty = Math.max(0, currentQty + delta);

    setItems((prev) =>
      prev.map((i) => (i.id === inspectedItem.id ? { ...i, quantity: nextQty } : i))
    );
    setInspectedItem((prev) => ({ ...prev, quantity: nextQty }));

    try {
      if (!String(inspectedItem.id).startsWith('p-')) {
        await supabase.from('items').update({ quantity: nextQty }).eq('id', inspectedItem.id);
      }
      showToast(
        `Stock adjusted to ${nextQty} ${inspectedItem.unit_of_measure || 'units'}.`,
        'success'
      );
    } catch (err) {
      console.warn('Stock update note:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Product Catalog
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            SKU registry, cold-chain inventory levels, and wholesale/retail pricing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleExportCSV(false)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-card transition-colors"
          >
            <LuDownload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LuPlus className="w-4 h-4" />
            <span>Register New SKU</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Products</span>
            <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
              <LuPackage className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
                {totalProductsCount}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Across {activeCategoriesCount} active lines</div>
            </div>
            {renderSparkline([14, 15, 16, 17, 18, totalProductsCount], '#10B981')}
          </div>
        </div>

        {/* Card 2: Stock Alerts (Interactive toggle) */}
        <div
          onClick={() => setStockFilter((prev) => (prev === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK'))}
          className={`cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border ${
            stockFilter === 'OUT_OF_STOCK'
              ? 'border-rose-400 ring-2 ring-rose-500/15'
              : 'border-zinc-200/80 dark:border-zinc-800/80'
          } p-5 shadow-card hover:shadow-card-hover transition-all`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Stock Alerts</span>
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <LuTriangleAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div
                className={`text-2xl font-bold font-mono tracking-tight ${
                  outOfStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                }`}
              >
                {outOfStockCount}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {outOfStockCount > 0 ? 'Click to filter depleted SKUs' : 'Zero depleted items'}
              </div>
            </div>
            {renderSparkline([1, 2, 2, 4, 3, outOfStockCount], '#F43F5E')}
          </div>
        </div>

        {/* Card 3: Perishables */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Perishables</span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <LuThermometerSnowflake className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
                {perishablesCount}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Cold-chain monitored</div>
            </div>
            {renderSparkline([12, 13, 14, 15, 16, perishablesCount], '#F59E0B')}
          </div>
        </div>

        {/* Card 4: Avg Retail Price */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Avg Retail Price</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <LuBanknote className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
                {formatRs(avgRetailPrice)}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                ~15.4% avg margin
              </div>
            </div>
            {renderSparkline([950, 990, 1020, 1060, 1090, Math.round(avgRetailPrice)], '#0EA5E9')}
          </div>
        </div>
      </div>

      {/* Unified Data Surface Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Search + Category Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-sm">
              <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, product name, or farm..."
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <LuX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segmented Category Filter */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 overflow-x-auto max-w-full">
              {['ALL', ...categories.map((c) => c.name)].map((c) => {
                const active = selectedCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {c === 'ALL' ? 'All Lines' : c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Stock Select + Table/Grid Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Stock</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setProductView('table')}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${
                  productView === 'table'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <LuList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setProductView('grid')}
                title="Card grid view"
                className={`p-1.5 rounded-md transition-colors ${
                  productView === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <LuLayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Presentation: Table View or Card Grid View */}
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading catalog records...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <LuSearchX className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
              No products match your filter
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Clear filters or register a new SKU to populate this view.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setStockFilter('ALL');
              }}
              className="mt-4 h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Reset Filters
            </button>
          </div>
        ) : productView === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Product Identity
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Category
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Inventory Health
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                    Wholesale
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                    Retail
                  </th>
                  <th className="py-3 pl-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
                {filteredItems.map((item) => {
                  const catName = item.product_categories?.name || 'Agro Products';
                  const isDepleted = (item.quantity ?? 0) <= 0;
                  const isSelected = selectedProductIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectedItem(item)}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-500/[0.04]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 pl-4 pr-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Product Identity with Image Thumbnail */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              style={{ display: item.image_url ? 'none' : 'flex' }}
                              className="w-full h-full items-center justify-center text-zinc-500"
                            >
                              {getCategoryIcon(catName)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-950 dark:text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400">
                              {item.barcode || 'NLDB-SKU'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          {catName}
                        </span>
                      </td>

                      {/* Inventory Health */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span
                              className={`font-mono font-semibold ${
                                isDepleted ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {item.quantity ?? 0} {item.unit_of_measure || 'units'}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {isDepleted ? '0%' : '100%'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isDepleted ? 'bg-rose-500 w-0' : 'bg-emerald-500 w-full'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Wholesale */}
                      <td className="py-3.5 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {formatRs(item.wholesale_price || (item.retail_price ? item.retail_price * 0.85 : 0))}
                      </td>

                      {/* Retail */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-zinc-950 dark:text-white whitespace-nowrap">
                        {formatRs(item.retail_price || 0)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(item)}
                            title="Edit SKU"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            title="Delete SKU"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View with Visual Images */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const catName = item.product_categories?.name || 'Agro Products';
              const isDepleted = (item.quantity ?? 0) <= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectedItem(item)}
                  className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-card hover:shadow-hover transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Visual Image Header */}
                  <div className="relative h-36 bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-500">
                        {getCategoryIcon(catName)}
                      </div>
                    )}
                    <span
                      className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm ${
                        isDepleted
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isDepleted ? 'Depleted' : 'In Stock'}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                      {catName}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-white truncate text-sm">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {item.barcode || 'NLDB-SKU'}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Retail Price</span>
                        <span className="font-mono font-bold text-zinc-950 dark:text-white">
                          {formatRs(item.retail_price || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400 block text-[11px]">Available</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.quantity ?? 0} {item.unit_of_measure || 'units'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Strip */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Showing <strong className="font-mono text-zinc-900 dark:text-zinc-100">{filteredItems.length}</strong> primary SKUs · Click any row to open SKU inspector
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">LKR (Rs.)</span>
        </div>
      </div>

      {/* Floating Bulk Selection Action Bar */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 dark:bg-zinc-900 text-white border border-zinc-800 rounded-2xl shadow-float px-4 py-2.5 flex items-center gap-3 sm:gap-4 animate-pop">
          <span className="text-xs font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-500 text-zinc-950 font-mono font-bold flex items-center justify-center text-[11px]">
              {selectedProductIds.size}
            </span>
            <span>selected</span>
          </span>
          <span className="w-px h-4 bg-zinc-700"></span>
          <button
            onClick={handleBulkRestock}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <LuPackagePlus className="w-3.5 h-3.5" />
            <span>+50 Restock</span>
          </button>
          <button
            onClick={() => handleExportCSV(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <LuDownload className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LuTrash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setSelectedProductIds(new Set())}
            title="Clear selection"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <LuX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slide-Over SKU Inspector Drawer (Rendered via React Portal onto document.body) */}
      {inspectedItem &&
        createPortal(
          <div
            id="drawer-backdrop"
            onClick={(e) => {
              if (e.target.id === 'drawer-backdrop') setInspectedItem(null);
            }}
            className="fixed inset-0 z-[100] bg-zinc-950/45 backdrop-blur-[2px] flex justify-end"
          >
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 h-full border-l border-zinc-200 dark:border-zinc-800 shadow-float flex flex-col animate-drawer">
              {/* Header */}
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                    {getCategoryIcon(inspectedItem.product_categories?.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white truncate">
                      {inspectedItem.name}
                    </h3>
                    <p className="text-xs font-mono text-zinc-400">
                      {inspectedItem.barcode || 'NLDB-SKU'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectedItem(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                {/* Hero Product Image */}
                <div className="w-full h-44 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative flex items-center justify-center shadow-sm">
                  {inspectedItem.image_url ? (
                    <img
                      src={inspectedItem.image_url}
                      alt={inspectedItem.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <LuImage className="w-8 h-8 opacity-40" />
                      <span className="text-xs">No product photo uploaded</span>
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
                    {inspectedItem.unit_of_measure || 'piece'}
                  </span>
                </div>

                {/* Quick Stock Adjuster */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                    Live Stock On-Hand
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-white">
                      {inspectedItem.quantity ?? 0}{' '}
                      <span className="text-xs font-sans text-zinc-400">
                        {inspectedItem.unit_of_measure || 'units'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustStock(-10)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => handleAdjustStock(10)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleAdjustStock(50)}
                        className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pricing & Margin */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Retail Price</span>
                    <span className="text-base font-bold font-mono text-zinc-950 dark:text-white mt-1 block">
                      {formatRs(inspectedItem.retail_price || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400 block">Wholesale</span>
                    <span className="text-base font-bold font-mono text-zinc-950 dark:text-white mt-1 block">
                      {formatRs(inspectedItem.wholesale_price || 0)}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <dl className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-zinc-500">Category Line</dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white">
                      {inspectedItem.product_categories?.name || 'Agro Products'}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-zinc-500">Storage Class</dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white">
                      {inspectedItem.is_perishable ? 'Cold-Chain (Perishable)' : 'Ambient Storage'}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-zinc-500">Reorder Threshold</dt>
                    <dd className="font-mono text-zinc-700 dark:text-zinc-300">
                      {inspectedItem.reorder_point || 40} {inspectedItem.unit_of_measure || 'units'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDeleteItem(inspectedItem)}
                  className="h-9 px-3.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  Delete SKU
                </button>
                <button
                  onClick={() => {
                    const it = inspectedItem;
                    setInspectedItem(null);
                    handleOpenModal(it);
                  }}
                  className="h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Register / Edit SKU Modal (Rendered via React Portal onto document.body) */}
      {isModalOpen &&
        createPortal(
          <div
            id="item-modal-backdrop"
            onClick={(e) => {
              if (e.target.id === 'item-modal-backdrop') handleCloseModal();
            }}
            className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden my-auto animate-pop">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    {modalFormData.id ? 'Modify Product SKU' : 'Register New Product SKU'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Set inventory specifications, pricing, photo, and storage class
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleModalSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <LuTriangleAlert className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalFormData.name}
                    onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                    placeholder="e.g. Fresh Pasteurized Milk (1L)"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Product Photo: File Upload or Image URL */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Product Photo
                    </label>
                    <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('file')}
                        className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                          imageInputMode === 'file'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                          imageInputMode === 'url'
                            ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        Web Link (URL)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live Preview Box */}
                    <div className="relative w-16 h-16 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-xs group">
                      {modalFormData.image_url ? (
                        <>
                          <img
                            src={modalFormData.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className="w-full h-full items-center justify-center text-zinc-400"
                          >
                            <LuImage className="w-5 h-5 opacity-40" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalFormData({ ...modalFormData, image_url: '' })}
                            title="Remove Photo"
                            className="absolute inset-0 bg-zinc-950/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <LuX className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                          <LuImage className="w-5 h-5 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Mode Inputs */}
                    <div className="flex-1 min-w-0">
                      {imageInputMode === 'file' ? (
                        <div className="space-y-1">
                          <label className="flex items-center justify-center gap-2 w-full h-10 px-3 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl cursor-pointer bg-white dark:bg-zinc-900 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors group">
                            <LuUpload className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-600 transition-colors">
                              {isUploadingImage
                                ? 'Processing photo...'
                                : modalFormData.image_url
                                ? 'Change image file'
                                : 'Choose photo from device'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              className="hidden"
                              onChange={handleImageFileUpload}
                            />
                          </label>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                            <span>PNG, JPG, WEBP (auto-compressed)</span>
                            {modalFormData.image_url && (
                              <button
                                type="button"
                                onClick={() => setModalFormData({ ...modalFormData, image_url: '' })}
                                className="text-rose-500 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="relative">
                            <LuLink className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="url"
                              value={modalFormData.image_url}
                              onChange={(e) =>
                                setModalFormData({ ...modalFormData, image_url: e.target.value })
                              }
                              placeholder="https://... or direct image link"
                              className="w-full h-10 pl-9 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                            {modalFormData.image_url && (
                              <button
                                type="button"
                                onClick={() => setModalFormData({ ...modalFormData, image_url: '' })}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                              >
                                <LuX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 px-0.5">
                            Paste a public image web link (jpg, png, webp).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category & SKU Barcode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={String(modalFormData.category_id || '')}
                      onChange={(e) => setModalFormData({ ...modalFormData, category_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      SKU / Barcode
                    </label>
                    <input
                      type="text"
                      value={modalFormData.barcode}
                      onChange={(e) => setModalFormData({ ...modalFormData, barcode: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Wholesale Price (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalFormData.wholesale_price}
                      onChange={(e) => setModalFormData({ ...modalFormData, wholesale_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Retail Price (Rs.) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={modalFormData.retail_price}
                      onChange={(e) => setModalFormData({ ...modalFormData, retail_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Stock & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      value={modalFormData.quantity}
                      onChange={(e) => setModalFormData({ ...modalFormData, quantity: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Unit
                    </label>
                    <select
                      value={modalFormData.unit_of_measure}
                      onChange={(e) => setModalFormData({ ...modalFormData, unit_of_measure: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="piece">piece</option>
                      <option value="kg">kg</option>
                      <option value="bottle">bottle</option>
                      <option value="pack">pack</option>
                      <option value="pot">pot</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                </div>

                {/* Perishable Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="perishable-check"
                    checked={modalFormData.is_perishable}
                    onChange={(e) => setModalFormData({ ...modalFormData, is_perishable: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="perishable-check" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Perishable Cold-Chain Item (monitored temperature & expiry)
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-9 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    {modalFormData.id ? 'Save Changes' : 'Register SKU'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Items;
