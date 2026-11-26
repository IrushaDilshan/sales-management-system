import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import {
  LuMenu,
  LuChevronRight,
  LuCalendar,
  LuSun,
  LuMoon,
  LuBell,
  LuPackageX,
  LuUserPlus,
  LuTriangleAlert,
  LuCheckCheck,
  LuRefreshCw,
  LuClipboardList,
} from 'react-icons/lu';
import './Topbar.css';

const Topbar = ({ onOpenMobile, isDark, onToggleTheme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('nldb_dismissed_alerts') || '[]'));
    } catch {
      return new Set();
    }
  });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const notifRef = useRef(null);

  const isStorekeeper = location.pathname.startsWith('/storekeeper');

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const nextAlerts = [];

      // 1. Fetch items for Out-of-Stock & Low-Stock alerts (Admin + Storekeeper)
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, name, quantity, unit_of_measure, minimum_level, is_perishable')
        .order('quantity', { ascending: true });

      if (itemsData && itemsData.length > 0) {
        const outItems = itemsData.filter((i) => (i.quantity ?? 0) <= 0);
        const lowItems = itemsData.filter((i) => {
          const qty = i.quantity ?? 0;
          const min = i.minimum_level || 10;
          return qty > 0 && qty < min;
        });

        if (outItems.length > 0) {
          const previewNames = outItems
            .slice(0, 3)
            .map((i) => i.name)
            .join(', ');
          const extra = outItems.length > 3 ? ` +${outItems.length - 3} more` : '';
          nextAlerts.push({
            id: `out-of-stock-${outItems.length}`,
            title: `${outItems.length} Depleted SKU${outItems.length > 1 ? 's' : ''}`,
            description: `${previewNames}${extra} — zero balance on hand.`,
            time: 'Critical',
            tone: 'rose',
            icon: 'package',
            target: isStorekeeper ? '/storekeeper/inventory' : '/items',
          });
        }

        if (lowItems.length > 0) {
          const previewNames = lowItems
            .slice(0, 3)
            .map((i) => i.name)
            .join(', ');
          const extra = lowItems.length > 3 ? ` +${lowItems.length - 3} more` : '';
          nextAlerts.push({
            id: `low-stock-${lowItems.length}`,
            title: `${lowItems.length} Low Stock Warning${lowItems.length > 1 ? 's' : ''}`,
            description: `${previewNames}${extra} below reorder threshold.`,
            time: 'Low',
            tone: 'amber',
            icon: 'warning',
            target: isStorekeeper ? '/storekeeper/stock' : '/stock',
          });
        }
      }

      // 2. Fetch Expiring / Expired Stock Batches (Admin + Storekeeper)
      const { data: stockBatches } = await supabase
        .from('stock')
        .select('id, expiry_date')
        .not('expiry_date', 'is', null);

      if (stockBatches && stockBatches.length > 0) {
        const now = new Date();
        const expiringCount = stockBatches.filter((s) => {
          const days = Math.ceil((new Date(s.expiry_date) - now) / (1000 * 60 * 60 * 24));
          return days <= 7;
        }).length;

        if (expiringCount > 0) {
          nextAlerts.push({
            id: `expiring-${expiringCount}`,
            title: `${expiringCount} Expiring Batch${expiringCount > 1 ? 'es' : ''}`,
            description: 'Cold-chain batches expiring within 7 days or already expired.',
            time: '7d Window',
            tone: 'amber',
            icon: 'warning',
            target: isStorekeeper ? '/storekeeper/stock' : '/stock',
          });
        }
      }

      // 3. Pending Mobile Restock Requests (Storekeeper + Admin live alert)
      const { data: pendingReqs } = await supabase
        .from('requests')
        .select('id, required_date, created_at, shops(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingReqs && pendingReqs.length > 0) {
        const shopPreview = pendingReqs
          .slice(0, 2)
          .map((r) => r.shops?.name || 'Outlet')
          .join(', ');
        const extra = pendingReqs.length > 2 ? ` +${pendingReqs.length - 2} more` : '';
        nextAlerts.push({
          id: `pending-requests-${pendingReqs.length}`,
          title: `${pendingReqs.length} Pending Restock Request${pendingReqs.length > 1 ? 's' : ''}`,
          description: `From ${shopPreview}${extra} — awaiting storekeeper dispatch.`,
          time: 'Restock',
          tone: 'amber',
          icon: 'ledger',
          target: '/storekeeper',
        });
      }

      // 4. Role-specific alerts
      if (!isStorekeeper) {
        // Admin: check inactive / pending staff accounts
        const { data: usersData } = await supabase
          .from('users')
          .select('id, is_active');

        if (usersData) {
          const inactiveCount = usersData.filter((u) => u.is_active === false).length;
          if (inactiveCount > 0) {
            nextAlerts.push({
              id: `staff-inactive-${inactiveCount}`,
              title: 'Staff Onboarding / Review',
              description: `${inactiveCount} staff account${inactiveCount > 1 ? 's' : ''} currently inactive or pending review.`,
              time: 'Admin',
              tone: 'amber',
              icon: 'user',
              target: '/users',
            });
          }
        }
      } else {
        // Storekeeper: today's ledger activity summary
        const todayPrefix = new Date().toISOString().split('T')[0];
        const { data: todayTrans } = await supabase
          .from('stock_transactions')
          .select('id, type, qty')
          .gte('created_at', `${todayPrefix}T00:00:00`);

        if (todayTrans && todayTrans.length > 0) {
          nextAlerts.push({
            id: `sk-today-${todayTrans.length}`,
            title: `${todayTrans.length} Ledger Movement${todayTrans.length > 1 ? 's' : ''} Today`,
            description: 'Review today’s inward receipts, rep issues, and returns.',
            time: 'Today',
            tone: 'emerald',
            icon: 'ledger',
            target: '/storekeeper/inventory',
          });
        }
      }

      setAlerts(nextAlerts);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [isStorekeeper]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    const channel = supabase
      .channel('topbar-requests-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => fetchAlerts()
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  const dismissAlert = (e, id) => {
    e.stopPropagation();
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    sessionStorage.setItem('nldb_dismissed_alerts', JSON.stringify(Array.from(next)));
  };

  const clearAllAlerts = () => {
    const next = new Set(dismissedIds);
    alerts.forEach((a) => next.add(a.id));
    setDismissedIds(next);
    sessionStorage.setItem('nldb_dismissed_alerts', JSON.stringify(Array.from(next)));
  };

  // Compute breadcrumbs from path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return { section: 'General', page: 'Control Center' };
      case '/categories':
        return { section: 'Product Catalog', page: 'Categories' };
      case '/items':
        return { section: 'Product Catalog', page: 'Products' };
      case '/users':
        return { section: 'Administration', page: 'Force Management' };
      case '/shops':
        return { section: 'Administration', page: 'Retail Outlets' };
      case '/routes':
        return { section: 'Administration', page: 'Map & Routes' };
      case '/daily-income':
        return { section: 'Intelligence & System', page: 'Revenue Stream' };
      case '/settings':
        return { section: 'Intelligence & System', page: 'System Config' };
      case '/website-content':
        return { section: 'Intelligence & System', page: 'Website Content' };
      case '/stock':
        return { section: 'Product Catalog', page: 'Stock Ledger' };
      case '/storekeeper':
      case '/storekeeper/':
      case '/storekeeper/dashboard':
        return { section: 'General', page: 'Command Center' };
      case '/storekeeper/stock':
        return { section: 'Asset Management', page: 'Stock Surveillance' };
      case '/storekeeper/inventory':
        return { section: 'Asset Management', page: 'Stock Ledger' };
      case '/storekeeper/items':
        return { section: 'Asset Management', page: 'Product Catalog' };
      case '/storekeeper/settings':
        return { section: 'System', page: 'Logistics Config' };
      default:
        return { section: 'Workspace', page: 'Overview' };
    }
  };

  const { section, page } = getBreadcrumbs();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const renderAlertIcon = (iconType, tone) => {
    const toneClass =
      tone === 'rose'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : tone === 'emerald'
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${toneClass}`}>
        {iconType === 'user' && <LuUserPlus className="w-4 h-4" />}
        {iconType === 'package' && <LuPackageX className="w-4 h-4" />}
        {iconType === 'warning' && <LuTriangleAlert className="w-4 h-4" />}
        {iconType === 'ledger' && <LuClipboardList className="w-4 h-4" />}
      </div>
    );
  };

  return (
    <header
      id="topbar"
      className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-colors"
    >
      {/* Left: Mobile Trigger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 -ml-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Open menu"
        >
          <LuMenu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-2 text-sm min-w-0" aria-label="Breadcrumb">
          <button
            onClick={() => navigate(isStorekeeper ? '/storekeeper/dashboard' : '/dashboard')}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors hidden sm:inline font-medium"
          >
            NLDB
          </button>
          <LuChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 hidden sm:inline shrink-0" />
          <span className="text-zinc-500 dark:text-zinc-400 font-medium hidden md:inline truncate">
            {section}
          </span>
          <LuChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 hidden md:inline shrink-0" />
          <span className="font-semibold text-zinc-950 dark:text-white truncate">{page}</span>
        </nav>
      </div>

      {/* Right: Date, Theme, Notifications */}
      <div className="flex items-center gap-2">
        {/* Date / Live Clock Pill */}
        <div className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          <LuCalendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>{formattedDate}</span>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Obsidian Dark Mode'}
          className="w-9 h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          {isDark ? <LuSun className="w-4 h-4 text-amber-400" /> : <LuMoon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              const nextOpen = !showNotifications;
              setShowNotifications(nextOpen);
              if (nextOpen) fetchAlerts();
            }}
            title="Operational Alerts"
            className="relative w-9 h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <LuBell className="w-4 h-4" />
            {visibleAlerts.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float z-50 overflow-hidden animate-pop">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Operational Alerts
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      visibleAlerts.length > 0
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {visibleAlerts.length > 0 ? `${visibleAlerts.length} Active` : 'All Clear'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchAlerts}
                    title="Refresh alerts"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <LuRefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? 'animate-spin' : ''}`} />
                  </button>
                  {visibleAlerts.length > 0 && (
                    <button
                      onClick={clearAllAlerts}
                      title="Mark all as read"
                      className="text-[11px] font-semibold text-zinc-500 hover:text-emerald-600 px-1.5 py-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70 max-h-80 overflow-y-auto">
                {visibleAlerts.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <LuCheckCheck className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      All Systems Nominal
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      No unread operational alerts at this time.
                    </p>
                  </div>
                ) : (
                  visibleAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(alert.target);
                      }}
                      className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        {renderAlertIcon(alert.icon, alert.tone)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {alert.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-400">{alert.time}</span>
                              <button
                                onClick={(e) => dismissAlert(e, alert.id)}
                                title="Dismiss"
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
