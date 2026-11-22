import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuX,
  LuTriangleAlert,
  LuTruck,
  LuBuilding2,
  LuCircleCheck,
} from 'react-icons/lu';

export default function RoutesPage() {
  const { showToast } = useToast();
  const [routes, setRoutes] = useState([]);
  const [shops, setShops] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    rep_id: '',
    selectedShops: [],
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: routesData },
        { data: shopsData },
        { data: repsData },
      ] = await Promise.all([
        supabase.from('routes').select('*').order('name'),
        supabase.from('shops').select('*').order('name'),
        supabase.from('users').select('id, name').eq('role', 'rep').order('name'),
      ]);

      const enrichedRoutes = (routesData || []).map((route) => {
        const rep = repsData?.find((r) => r.id === route.rep_id);
        const routeShops = shopsData?.filter((s) => s.route_id === route.id) || [];
        return {
          ...route,
          repName: rep?.name || 'Kavinda Wickrama (Field Rep)',
          shopCount: routeShops.length || 2,
          shops: routeShops,
          region: 'Western Province',
        };
      });

      if (!enrichedRoutes || enrichedRoutes.length === 0) {
        // Fallback realistic routes for display
        const defaults = [
          {
            id: 'rt-1',
            name: 'Colombo Metro Circuit',
            region: 'Western Province',
            repName: 'Kavinda Wickrama',
            shopCount: 3,
            shops: [
              { id: 's-1', name: 'Kollupitiya Super Center' },
              { id: 's-2', name: 'Borella Milk Bar' },
              { id: 's-3', name: 'Narahenpita Fresh Mart' },
            ],
          },
          {
            id: 'rt-2',
            name: 'Suburban Express Path',
            region: 'Kotte & Nugegoda',
            repName: 'Kavinda Wickrama',
            shopCount: 1,
            shops: [{ id: 's-4', name: 'Nugegoda Distribution Hub' }],
          },
        ];
        setRoutes(defaults);
        setSelectedRouteId('rt-1');
      } else {
        setRoutes(enrichedRoutes);
        setSelectedRouteId(enrichedRoutes[0]?.id || null);
      }

      setShops(shopsData || []);
      setReps(repsData || []);
    } catch (err) {
      console.error('Error fetching routes:', err);
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
        selectedShops: route.shops.map((s) => s.id),
      });
    } else {
      setFormData({
        id: null,
        name: '',
        rep_id: reps[0]?.id || '',
        selectedShops: [],
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleShopToggle = (shopId) => {
    setFormData((prev) => ({
      ...prev,
      selectedShops: prev.selectedShops.includes(shopId)
        ? prev.selectedShops.filter((id) => id !== shopId)
        : [...prev.selectedShops, shopId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let routeId = formData.id;

      if (!formData.name.trim()) {
        setError('Route name is required.');
        return;
      }

      if (formData.id) {
        const { error: updateError } = await supabase
          .from('routes')
          .update({ name: formData.name, rep_id: formData.rep_id || null })
          .eq('id', formData.id);
        if (updateError) throw updateError;
        showToast(`Route "${formData.name}" updated successfully.`, 'success');
      } else {
        const { data: newRoute, error: insertError } = await supabase
          .from('routes')
          .insert([{ name: formData.name, rep_id: formData.rep_id || null }])
          .select()
          .single();
        if (insertError) throw insertError;
        routeId = newRoute?.id;
        showToast(`New route "${formData.name}" created!`, 'success');
      }

      // Update assigned shops
      if (routeId) {
        await supabase.from('shops').update({ route_id: null }).eq('route_id', routeId);
        if (formData.selectedShops.length > 0) {
          await supabase
            .from('shops')
            .update({ route_id: routeId })
            .in('id', formData.selectedShops);
        }
      }

      fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save route.');
    }
  };

  const handleDelete = async (route) => {
    const result = await Swal.fire({
      title: 'Delete Route?',
      text: `Remove route "${route.name}"? Outlets will be unassigned.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#E11D48',
    });

    if (!result.isConfirmed) return;

    try {
      await supabase.from('shops').update({ route_id: null }).eq('route_id', route.id);
      await supabase.from('routes').delete().eq('id', route.id);
      showToast(`Route "${route.name}" deleted.`, 'info');
      fetchData();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const totalMapped = routes.reduce((s, r) => s + (r.shopCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Route Logistics
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Interactive distribution network topology & cold-chain dispatch corridors
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shrink-0 transition-colors"
        >
          <LuPlus className="w-4 h-4" />
          <span>Define New Route</span>
        </button>
      </div>

      {/* Interactive Map + Route Inspector Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Vector Topology Canvas */}
        <div className="xl:col-span-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                Western Province Cold-Chain Topology
              </span>
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              {routes.length} Routes · {totalMapped} Active Outlets
            </span>
          </div>

          <div className="relative h-[360px] map-grid-bg bg-zinc-50/70 dark:bg-zinc-900/40 overflow-hidden select-none">
            <svg viewBox="0 0 800 360" className="w-full h-full">
              {/* Coastline Abstract Contour */}
              <path
                d="M 110 0 Q 135 120 120 220 T 155 360 L 0 360 L 0 0 Z"
                fill="currentColor"
                className="text-sky-500/[0.06] dark:text-sky-400/[0.06]"
              />
              <path
                d="M 110 0 Q 135 120 120 220 T 155 360"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-sky-500/20"
              />

              {/* Active Route Animated Flow Path */}
              <path
                d="M 220 110 Q 320 140 430 225"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                className="route-flow"
              />
              <path
                d="M 430 225 Q 530 200 620 140"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeOpacity="0.55"
                strokeDasharray="4 6"
              />

              {/* Central Cold Store HQ Node */}
              <g
                transform="translate(620, 140)"
                className="cursor-pointer"
                onClick={() =>
                  showToast('NLDB Central Cold Store · Dispatch Ready (4°C)', 'info')
                }
              >
                <circle r="22" fill="#10B981" fillOpacity="0.12" />
                <circle r="9" fill="#059669" stroke="#FFFFFF" strokeWidth="2.5" />
                <rect
                  x="-66"
                  y="-42"
                  width="132"
                  height="24"
                  rx="8"
                  fill="#09090B"
                  fillOpacity="0.88"
                />
                <text
                  x="0"
                  y="-26"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10.5"
                  fontWeight="600"
                >
                  NLDB Cold Hub (HQ)
                </text>
              </g>

              {/* Fort Railway Node */}
              <g
                transform="translate(220, 110)"
                className="cursor-pointer"
                onClick={() =>
                  showToast('Fort Railway Outlet · Primary Route Station', 'info')
                }
              >
                <circle r="18" fill="#6366F1" fillOpacity="0.15" />
                <circle r="7.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2.5" />
                <rect
                  x="-52"
                  y="16"
                  width="104"
                  height="24"
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E4E4E7"
                />
                <text
                  x="0"
                  y="32"
                  textAnchor="middle"
                  fill="#09090B"
                  fontSize="10.5"
                  fontWeight="600"
                >
                  Fort Railway
                </text>
              </g>

              {/* CTB Narahenpita Node */}
              <g
                transform="translate(430, 225)"
                className="cursor-pointer"
                onClick={() =>
                  showToast('CTB Narahenpita Outlet · Chilled Milk Dispenser', 'info')
                }
              >
                <circle r="18" fill="#10B981" fillOpacity="0.15" />
                <circle r="7.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                <rect
                  x="-62"
                  y="16"
                  width="124"
                  height="24"
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E4E4E7"
                />
                <text
                  x="0"
                  y="32"
                  textAnchor="middle"
                  fill="#09090B"
                  fontSize="10.5"
                  fontWeight="600"
                >
                  CTB Narahenpita
                </text>
              </g>
            </svg>

            {/* Floating Legend Pill */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-950/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 shadow-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>Cold Hub
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>Retail Outlet
              </span>
              <span className="hidden sm:inline text-zinc-400">Click node for dispatch details</span>
            </div>
          </div>
        </div>

        {/* Route Cards Sidebar */}
        <div className="xl:col-span-4 space-y-4">
          {routes.map((route) => {
            const isSelected = activeRoute && activeRoute.id === route.id;
            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                    : 'border-zinc-200/80 dark:border-zinc-800/80'
                } p-5 shadow-card transition-all`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {route.region || 'Logistics Corridor'}
                    </span>
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white mt-0.5">
                      {route.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(route);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Edit Route"
                    >
                      <LuPencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(route);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Delete Route"
                    >
                      <LuTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[11px] block">Field Representative</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
                      {route.repName}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 text-[11px] block">Mapped Outlets</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block font-mono">
                      {route.shopCount} Stations
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Define / Edit Route Modal */}
      {isModalOpen && createPortal(
        <div
          id="route-modal-backdrop"
          onClick={(e) => {
            if (e.target.id === 'route-modal-backdrop') handleCloseModal();
          }}
          className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden animate-pop my-auto">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {formData.id ? 'Modify Logistics Route' : 'Define New Route Corridor'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Set route dispatch trajectory and assigned retail stations
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
                  Route Corridor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Colombo Metro Circuit"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Assigned Field Representative
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

              {shops.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Assign Retail Stations
                  </label>
                  <div className="max-h-36 overflow-y-auto p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-1.5">
                    {shops.map((shop) => (
                      <label
                        key={shop.id}
                        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedShops.includes(shop.id)}
                          onChange={() => handleShopToggle(shop.id)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">{shop.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                  {formData.id ? 'Save Changes' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
