import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import {
  LuPackage,
  LuTriangleAlert,
  LuCircleAlert,
  LuTrendingUp,
  LuArrowRight,
  LuBoxes,
  LuClipboardList,
  LuFileSpreadsheet,
  LuCheck,
  LuRefreshCw,
} from 'react-icons/lu';

const StoreKeeperDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });
  const [alertItems, setAlertItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: items } = await supabase.from('items').select('*').order('quantity', { ascending: true });
      if (!items) return;

      const lowItems = items.filter((i) => (i.quantity ?? 0) <= 10);
      setAlertItems(lowItems.slice(0, 5));

      setStats({
        totalItems: items.length || 0,
        lowStock: items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 10).length || 0,
        outOfStock: items.filter((i) => (i.quantity ?? 0) === 0).length || 0,
        totalValue:
          items.reduce((sum, i) => sum + (i.quantity || 0) * (i.retail_price || 0), 0) || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSparkline = (data, strokeColor) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 72;
    const h = 26;
    const points = data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d - min) / range) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-72 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>National Livestock Development Board · Central Logistics & Storage</span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Inventory Command Center
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time overview of central warehouse stock, cold-chain reserves, and depot movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-card transition-colors"
          >
            <LuRefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sync Vault</span>
          </button>
          <button
            onClick={() => navigate('/storekeeper/inventory')}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LuClipboardList className="w-3.5 h-3.5" />
            <span>Open Stock Ledger</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Catalog Breadth */}
        <div
          onClick={() => navigate('/storekeeper/items')}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Catalog Breadth
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Active
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-zinc-950 dark:text-white">
                {stats.totalItems}{' '}
                <span className="text-sm font-sans font-medium text-zinc-400">SKUs</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">Tracked in central depot</div>
            </div>
            {renderSparkline([14, 15, 16, 18, 19, stats.totalItems || 20], '#6366F1')}
          </div>
        </div>

        {/* 2. Low Stock Warnings */}
        <div
          onClick={() => navigate('/storekeeper/stock')}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Low Stock Warnings
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
              &le; 10 units
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-zinc-950 dark:text-white">
                {stats.lowStock}{' '}
                <span className="text-sm font-sans font-medium text-zinc-400">Items</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">Reorder recommended</div>
            </div>
            {renderSparkline([2, 3, 2, 4, 3, stats.lowStock], '#F59E0B')}
          </div>
        </div>

        {/* 3. Depleted Reserves */}
        <div
          onClick={() => navigate('/storekeeper/stock')}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Depleted Reserves
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                stats.outOfStock > 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {stats.outOfStock > 0 ? 'Critical' : 'Healthy'}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-bold tracking-tight font-mono text-zinc-950 dark:text-white">
                {stats.outOfStock}{' '}
                <span className="text-sm font-sans font-medium text-zinc-400">Out</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">Zero balance SKUs</div>
            </div>
            {renderSparkline([1, 2, 1, 3, 2, stats.outOfStock], '#EF4444')}
          </div>
        </div>

        {/* 4. Inventory Valuation */}
        <div
          onClick={() => navigate('/storekeeper/inventory')}
          className="cursor-pointer bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Inventory Valuation
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Retail Est.
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-zinc-950 dark:text-white truncate">
                Rs. {stats.totalValue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-zinc-400 mt-1">On-hand asset value</div>
            </div>
            {renderSparkline([42, 48, 46, 54, 58, 64], '#10B981')}
          </div>
        </div>
      </div>

      {/* Bento Main Grid: Operations Registry + Critical Oversight */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Operations & Quick-Link Registry */}
        <div className="xl:col-span-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Operations & Quick-Link Registry
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Direct access to central storage workflows and stock movement controls
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link
                to="/storekeeper/items"
                className="group p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <LuPackage className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Product Catalog
                    </h3>
                    <LuArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Inspect SKU details, wholesale/retail pricing, and cold-chain status.
                  </p>
                </div>
              </Link>

              <Link
                to="/storekeeper/stock"
                className="group p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <LuBoxes className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Stock Surveillance
                    </h3>
                    <LuArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Monitor real-time inventory levels and stock thresholds across sectors.
                  </p>
                </div>
              </Link>

              <Link
                to="/storekeeper/inventory"
                className="group p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <LuClipboardList className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Stock Ledger
                    </h3>
                    <LuArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Receive inward stock, issue to sales reps, and log returns.
                  </p>
                </div>
              </Link>

              <Link
                to="/storekeeper/settings"
                className="group p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <LuFileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Logistics Config
                    </h3>
                    <LuArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Manage account preferences and warehouse portal settings.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Critical Oversight Panel */}
        <div className="xl:col-span-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Critical Oversight
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  SKUs requiring immediate attention
                </p>
              </div>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {stats.outOfStock + stats.lowStock}
              </span>
            </div>

            <div className="space-y-2.5">
              {alertItems.length === 0 ? (
                <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <LuCheck className="w-7 h-7 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Stock Optimized
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    All biological and retail assets are at optimal levels.
                  </p>
                </div>
              ) : (
                alertItems.map((item) => {
                  const isOut = (item.quantity ?? 0) === 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate('/storekeeper/inventory')}
                      className="cursor-pointer p-3 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>
                            {item.quantity ?? 0} {item.unit_of_measure || 'units'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isOut
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {isOut ? <LuCircleAlert className="w-3 h-3" /> : <LuTriangleAlert className="w-3 h-3" />}
                        {isOut ? 'Out' : 'Low'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/storekeeper/stock')}
            className="mt-4 w-full h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Open Stock Surveillance &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreKeeperDashboard;
