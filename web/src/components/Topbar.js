import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LuMenu,
  LuChevronRight,
  LuCalendar,
  LuSun,
  LuMoon,
  LuBell,
  LuPlus,
  LuPackageX,
  LuUserPlus,
} from 'react-icons/lu';
import './Topbar.css';

const Topbar = ({ onOpenMobile, isDark, onToggleTheme, onOpenNewSku }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

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
      case '/stock':
        return { section: 'Product Catalog', page: 'Stock Ledger' };
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
            onClick={() => navigate('/dashboard')}
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

      {/* Right: Actions, Live Clock, Theme, Notifications, Primary Action */}
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
            onClick={() => setShowNotifications(!showNotifications)}
            title="Activity & Alerts"
            className="relative w-9 h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <LuBell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float z-50 overflow-hidden animate-pop">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Operational Alerts
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  2 Active
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70 max-h-80 overflow-y-auto">
                <div
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/users');
                  }}
                  className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <LuUserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Staff Onboarding Queue
                        </p>
                        <span className="text-[10px] text-zinc-400">Active</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Review pending salesmen and storekeeper assignments.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/items');
                  }}
                  className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <LuPackageX className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Stock Depletion Notice
                        </p>
                        <span className="text-[10px] text-zinc-400">Today</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Check perishable SKUs approaching reorder threshold.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Quick Action Button */}
        <button
          onClick={() => {
            if (onOpenNewSku) {
              onOpenNewSku();
            } else {
              navigate('/items?action=new-sku');
            }
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <LuPlus className="w-3.5 h-3.5" />
          <span>New SKU</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
