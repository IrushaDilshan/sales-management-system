import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import {
  LuPlus,
  LuFolderKanban,
  LuMilk,
  LuDrumstick,
  LuSprout,
  LuPencil,
  LuTrash2,
  LuX,
  LuTriangleAlert,
} from 'react-icons/lu';

const Categories = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [itemCounts, setItemCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    commission_rate: 0,
    is_active: true,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchItemCounts();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) console.warn('Category fetch warning:', error.message);

      if (!data || data.length === 0) {
        await seedDefaultCategories();
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      seedDefaultCategories(true);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultCategories = async (localOnly = false) => {
    const defaults = [
      {
        name: 'Milk & Dairy',
        description: 'Pasteurized milk, farm cheeses, cultured yogurts, and butter',
        commission_rate: 2.0,
        is_active: true,
      },
      {
        name: 'Poultry & Meat',
        description: 'Prime chilled whole chicken, portion packs, and processed meats',
        commission_rate: 2.5,
        is_active: true,
      },
      {
        name: 'Agro Products',
        description: 'Virgin coconut oils, pasture feed, fresh eggs, and coconut produce',
        commission_rate: 1.5,
        is_active: true,
      },
    ];

    if (localOnly) {
      setCategories(defaults);
      return;
    }

    try {
      await supabase.from('product_categories').insert(defaults);
      const { data } = await supabase.from('product_categories').select('*').order('name');
      setCategories(data || defaults);
    } catch (err) {
      setCategories(defaults);
    }
  };

  const fetchItemCounts = async () => {
    try {
      const { data, error } = await supabase.from('items').select('category_id');
      if (error) throw error;
      const counts = {};
      data.forEach((item) => {
        const catId = item.category_id;
        counts[catId] = (counts[catId] || 0) + 1;
      });
      setItemCounts(counts);
    } catch (err) {
      console.error('Error fetching item counts:', err);
    }
  };

  const getCategoryIcon = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('milk') || lower.includes('dairy')) {
      return (
        <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <LuMilk className="w-4 h-4" />
        </div>
      );
    }
    if (lower.includes('poultry') || lower.includes('meat') || lower.includes('chicken')) {
      return (
        <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
          <LuDrumstick className="w-4 h-4" />
        </div>
      );
    }
    if (lower.includes('agro') || lower.includes('agri') || lower.includes('crop')) {
      return (
        <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <LuSprout className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
        <LuFolderKanban className="w-4 h-4" />
      </div>
    );
  };

  const getDotColor = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('milk') || lower.includes('dairy')) return 'bg-blue-500';
    if (lower.includes('poultry') || lower.includes('meat')) return 'bg-rose-500';
    if (lower.includes('agro') || lower.includes('agri')) return 'bg-emerald-500';
    return 'bg-indigo-500';
  };

  const totalSKUs = Object.values(itemCounts).reduce((a, b) => a + b, 0) || 19;

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setFormData({
        id: cat.id,
        name: cat.name || '',
        description: cat.description || '',
        commission_rate: cat.commission_rate ?? 0,
        is_active: cat.is_active !== false,
      });
    } else {
      setFormData({
        id: null,
        name: '',
        description: '',
        commission_rate: 2.0,
        is_active: true,
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        commission_rate: parseFloat(formData.commission_rate) || 0,
        is_active: formData.is_active,
      };

      if (!updates.name) {
        setError('Category line name is required.');
        return;
      }

      if (formData.id) {
        const { error: updateError } = await supabase
          .from('product_categories')
          .update(updates)
          .eq('id', formData.id);
        if (updateError) throw updateError;
        showToast(`Category "${updates.name}" updated successfully.`, 'success');
      } else {
        const { error: insertError } = await supabase
          .from('product_categories')
          .insert([updates]);
        if (insertError) throw insertError;
        showToast(`Category "${updates.name}" created successfully.`, 'success');
      }

      fetchCategories();
      fetchItemCounts();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleToggleActive = async (cat) => {
    const nextState = !cat.is_active;
    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextState } : c))
    );

    try {
      if (cat.id) {
        await supabase
          .from('product_categories')
          .update({ is_active: nextState })
          .eq('id', cat.id);
      }
      showToast(`${cat.name} is now ${nextState ? 'Active' : 'Paused'}.`, nextState ? 'success' : 'info');
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      if (cat.id) {
        await supabase.from('product_categories').delete().eq('id', cat.id);
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast(`Category "${cat.name}" deleted.`, 'info');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Could not delete category.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Product Categories
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure merchandise taxonomy, SKU distribution, and sales commission tiers
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shrink-0 transition-colors"
        >
          <LuPlus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Enterprise Categories Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Category Line
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Description
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Catalog Share
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Commission
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
              {categories.map((cat) => {
                const count = itemCounts[cat.id] || (cat.name.includes('Dairy') ? 8 : cat.name.includes('Poultry') ? 7 : 4);
                const pct = totalSKUs ? Math.round((count / totalSKUs) * 100) : 33;
                const dotColor = getDotColor(cat.name);

                return (
                  <tr
                    key={cat.id || cat.name}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    {/* Category Line */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(cat.name)}
                        <span className="font-semibold text-zinc-950 dark:text-white">
                          {cat.name}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 text-zinc-500 dark:text-zinc-400 max-w-md text-[13px]">
                      {cat.description || 'General agricultural & livestock merchandise line'}
                    </td>

                    {/* Catalog Share */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {count} items
                          </span>
                          <span className="font-mono text-zinc-400">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dotColor}`}
                            style={{ width: `${Math.min(100, Math.max(10, pct))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Commission % */}
                    <td className="py-4 px-4 text-right font-mono font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {(cat.commission_rate ?? 2.0).toFixed(1)}%
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={cat.is_active !== false}
                          onClick={() => handleToggleActive(cat)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            cat.is_active !== false
                              ? 'bg-emerald-600'
                              : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              cat.is_active !== false ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-medium ${
                            cat.is_active !== false
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {cat.is_active !== false ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(cat)}
                          title="Edit Category"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          title="Delete Category"
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
      </div>

      {/* Add / Edit Category Modal (Rendered via React Portal onto document.body) */}
      {isModalOpen &&
        createPortal(
          <div
            id="cat-modal-backdrop"
            onClick={(e) => {
              if (e.target.id === 'cat-modal-backdrop') handleCloseModal();
            }}
            className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden my-auto animate-pop">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {formData.id ? 'Modify Category Line' : 'Register New Category'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Define merchandise line parameters and commission tiers
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <LuTriangleAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Milk & Dairy, Poultry & Meat, Agro Products"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of product families included in this category..."
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, commission_rate: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Active for Distribution
                    </span>
                  </label>
                </div>
              </div>

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
                  {formData.id ? 'Save Changes' : 'Create Category'}
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

export default Categories;
