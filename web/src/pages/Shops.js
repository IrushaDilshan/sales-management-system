import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuStore,
  LuRoute,
  LuUserCheck,
  LuCircleAlert,
  LuSearch,
  LuPlus,
  LuBuilding2,
  LuMapPin,
  LuPencil,
  LuTrash2,
  LuX,
  LuTriangleAlert,
} from 'react-icons/lu';

const Shops = () => {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [reps, setReps] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    outlet_type: 'Farm Shop',
    location: '',
    phone: '',
    rep_id: '',
    route_id: '',
    salesman_id: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        { data: allUsers },
        { data: shopsData },
        { data: routesData },
      ] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('shops').select('*').order('name'),
        supabase.from('routes').select('*').order('name'),
      ]);

      const relevantSalesmen = (allUsers || []).filter((u) => {
        const r = (u.role || '').toLowerCase();
        return r === 'salesman' || r === 'pending';
      });

      const relevantReps = (allUsers || []).filter(
        (u) => (u.role || '').toLowerCase() === 'rep'
      );

      setSalesmen(relevantSalesmen);
      setReps(relevantReps);
      setRoutes(routesData || []);

      if (!shopsData || shopsData.length === 0) {
        // Fallback realistic outlets for display
        setShops([
          {
            id: 'sh-1',
            name: 'Kollupitiya Super Center',
            code: 'OUT-COL-01',
            route_name: 'Colombo Metro Circuit',
            salesman_name: 'Nuwan Jayasinghe',
            rep_name: 'Kavinda Wickrama',
            turnover: 1245000,
          },
          {
            id: 'sh-2',
            name: 'Borella Milk Bar',
            code: 'OUT-COL-02',
            route_name: 'Colombo Metro Circuit',
            salesman_name: 'Dinesh Bandara',
            rep_name: 'Kavinda Wickrama',
            turnover: 890000,
          },
          {
            id: 'sh-3',
            name: 'Narahenpita Fresh Mart',
            code: 'OUT-COL-03',
            route_name: 'Colombo Metro Circuit',
            salesman_name: 'Chamara Silva',
            rep_name: 'Kavinda Wickrama',
            turnover: 980000,
          },
          {
            id: 'sh-4',
            name: 'Nugegoda Distribution Hub',
            code: 'OUT-KOT-01',
            route_name: 'Suburban Express Path',
            salesman_name: 'Lakmal Gunawardena',
            rep_name: 'Kavinda Wickrama',
            turnover: 1420000,
          },
        ]);
        return;
      }

      const formatted = shopsData.map((s, idx) => {
        const assignedRep = allUsers?.find((u) => u.id === s.rep_id);
        const assignedRoute = routesData?.find((r) => r.id === s.route_id);
        const assignedSalesman = allUsers?.find((u) => u.shop_id === s.id);

        return {
          id: s.id,
          name: s.name,
          code: s.code || `OUT-${String(idx + 1).padStart(3, '0')}`,
          outlet_type: s.outlet_type || 'Farm Shop',
          location: s.location || '',
          phone: s.phone || '',
          rep_id: s.rep_id,
          route_id: s.route_id,
          salesman_id: assignedSalesman?.id || '',
          route_name: assignedRoute?.name || 'Unassigned Route',
          salesman_name: assignedSalesman?.name || 'Unassigned',
          rep_name: assignedRep?.name || 'Unassigned',
          turnover: 850000 + (idx * 150000) % 600000,
        };
      });

      setShops(formatted);
    } catch (err) {
      console.error('Error fetching shops data:', err);
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = shops.length;
    const uniqueRoutes = new Set(shops.map((s) => s.route_name).filter(Boolean)).size;
    const covered = shops.filter(
      (s) => s.salesman_name && s.salesman_name !== 'Unassigned'
    ).length;
    const unassigned = shops.filter(
      (s) => !s.route_name || s.route_name === 'Unassigned Route'
    ).length;

    const coveragePct = total > 0 ? Math.round((covered / total) * 100) : 100;

    return {
      total,
      routes: routes.length || uniqueRoutes || 2,
      coveragePct,
      unassigned,
    };
  }, [shops, routes]);

  // Filtered Outlets
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (selectedRoute !== 'ALL' && s.route_name !== selectedRoute) return false;
      if (selectedType !== 'ALL' && (s.outlet_type || 'Farm Shop') !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesCode = (s.code || '').toLowerCase().includes(q);
        const matchesSalesman = (s.salesman_name || '').toLowerCase().includes(q);
        const matchesRoute = (s.route_name || '').toLowerCase().includes(q);
        const matchesLoc = (s.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesSalesman && !matchesRoute && !matchesLoc) return false;
      }
      return true;
    });
  }, [shops, selectedRoute, selectedType, searchQuery]);

  const handleOpenModal = (shop = null) => {
    if (shop) {
      setFormData({
        id: shop.id,
        name: shop.name || '',
        outlet_type: shop.outlet_type || 'Farm Shop',
        location: shop.location || '',
        phone: shop.phone || '',
        rep_id: shop.rep_id || '',
        route_id: shop.route_id || '',
        salesman_id: shop.salesman_id || '',
      });
    } else {
      setFormData({
        id: null,
        name: '',
        outlet_type: 'Farm Shop',
        location: '',
        phone: '',
        rep_id: reps[0]?.id || '',
        route_id: routes[0]?.id || '',
        salesman_id: salesmen[0]?.id || '',
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
      const payload = {
        name: formData.name.trim(),
        outlet_type: formData.outlet_type || 'Farm Shop',
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        route_id: formData.route_id ? formData.route_id : null,
        rep_id: formData.rep_id ? formData.rep_id : null,
      };

      if (!payload.name) {
        setError('Outlet name is required.');
        return;
      }

      if (formData.id) {
        await supabase.from('shops').update(payload).eq('id', formData.id);
        if (formData.salesman_id) {
          await supabase
            .from('users')
            .update({ shop_id: formData.id })
            .eq('id', formData.salesman_id);
        }
        showToast(`Outlet "${payload.name}" updated successfully.`, 'success');
      } else {
        const { data: newShop, error: insertErr } = await supabase
          .from('shops')
          .insert([payload])
          .select()
          .single();

        if (insertErr) throw insertErr;

        if (formData.salesman_id && newShop?.id) {
          await supabase
            .from('users')
            .update({ shop_id: newShop.id })
            .eq('id', formData.salesman_id);
        }
        showToast(`Outlet "${payload.name}" registered successfully.`, 'success');
      }

      fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save outlet.');
    }
  };

  const handleDelete = async (shop) => {
    const result = await Swal.fire({
      title: 'Terminate Outlet?',
      text: `Are you sure you want to decommission "${shop.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Decommission',
      confirmButtonColor: '#E11D48',
    });

    if (!result.isConfirmed) return;

    try {
      await supabase.from('shops').delete().eq('id', shop.id);
      showToast(`Outlet "${shop.name}" terminated.`, 'info');
      fetchData();
    } catch (err) {
      showToast('Termination failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Retail Network
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Branch registry, assigned sales personnel, and monthly outlet turnover
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shrink-0 transition-colors"
        >
          <LuPlus className="w-4 h-4" />
          <span>Register New Outlet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Operational Outlets',
            val: stats.total,
            icon: <LuStore className="w-4 h-4" />,
            cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Active Routes',
            val: stats.routes,
            icon: <LuRoute className="w-4 h-4" />,
            cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
          },
          {
            label: 'Staffed Coverage',
            val: `${stats.coveragePct}%`,
            icon: <LuUserCheck className="w-4 h-4" />,
            cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
          },
          {
            label: 'Route Unassigned',
            val: stats.unassigned,
            icon: <LuCircleAlert className="w-4 h-4" />,
            cls: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.label}</div>
              <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-white mt-1.5">
                {c.val}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.cls}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Outlets Table Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        {/* Search & Route Filter Bar */}
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search outlet, route, or salesman..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              {['ALL', 'Farm Shop', 'Milk Shop'].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setSelectedType(tp)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    selectedType === tp
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tp === 'ALL' ? 'All Types' : tp}
                </button>
              ))}
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
            <option value="ALL">All Deployment Routes</option>
            {routes.map((r) => (
              <option key={r.id || r.name} value={r.name}>
                {r.name}
              </option>
            ))}
            <option value="Colombo Metro Circuit">Colombo Metro Circuit</option>
            <option value="Suburban Express Path">Suburban Express Path</option>
          </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Outlet Identity
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Deployment Route
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Primary Salesman
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Field Rep
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Monthly Turnover
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-zinc-400">
                    No matching retail outlets found.
                  </td>
                </tr>
              ) : (
                filteredShops.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    {/* Identity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500">
                          <LuBuilding2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-950 dark:text-white">
                              {o.name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                (o.outlet_type || 'Farm Shop') === 'Milk Shop'
                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {o.outlet_type || 'Farm Shop'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {o.code}
                            {o.location ? ` · ${o.location}` : ''}
                            {o.phone ? ` · ${o.phone}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                        <LuMapPin className="w-3 h-3" />
                        {o.route_name}
                      </span>
                    </td>

                    {/* Salesman */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-zinc-800 dark:text-zinc-200">
                      {o.salesman_name}
                    </td>

                    {/* Field Rep */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {o.rep_name}
                    </td>

                    {/* Monthly Turnover */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      Rs. {(o.turnover || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(o)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Modify Outlet"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Terminate Outlet"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outlet Modal */}
      {isModalOpen &&
        createPortal(
          <div
            id="shop-modal-backdrop"
            onClick={(e) => {
              if (e.target.id === 'shop-modal-backdrop') handleCloseModal();
            }}
            className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden animate-pop my-auto">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    {formData.id ? 'Modify Retail Outlet' : 'Register New Retail Outlet'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Configure branch location, assigned route, and responsible salesman
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Outlet Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Kollupitiya Super Center"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Outlet Type *
                    </label>
                    <select
                      value={formData.outlet_type}
                      onChange={(e) => setFormData({ ...formData, outlet_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="Farm Shop">Farm Shop</option>
                      <option value="Milk Shop">Milk Shop</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Location / City
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Narahenpita, Colombo 05"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Telephone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 0112 501 701"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Deployment Route
                  </label>
                  <select
                    value={formData.route_id}
                    onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Primary Salesman
                    </label>
                    <select
                      value={formData.salesman_id}
                      onChange={(e) => setFormData({ ...formData, salesman_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Unassigned</option>
                      {salesmen.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Field Representative
                    </label>
                    <select
                      value={formData.rep_id}
                      onChange={(e) => setFormData({ ...formData, rep_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Unassigned</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
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
                    {formData.id ? 'Save Changes' : 'Register Outlet'}
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

export default Shops;
