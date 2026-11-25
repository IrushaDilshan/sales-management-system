import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import {
  LuLayoutDashboard,
  LuFolderKanban,
  LuPackage,
  LuUsers,
  LuStore,
  LuMapPinned,
  LuChartLine,
  LuSlidersHorizontal,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSearch,
  LuLogOut,
  LuX,
} from 'react-icons/lu';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile, onOpenCommandPalette }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userData, setUserData] = useState({ name: 'Admin', role: 'Administrator' });
  const [counts, setCounts] = useState({ categories: 3, lowStock: 0, pendingStaff: 0 });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single();

          if (data) {
            setUserData({
              name: data.name || user.email?.split('@')[0] || 'Admin',
              role: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Administrator'
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch user profile:', err);
      }
    };

    const fetchSummaryCounts = async () => {
      try {
        // Fetch active categories count
        const { count: catCount } = await supabase
          .from('product_categories')
          .select('*', { count: 'exact', head: true });
        
        // Fetch low/out of stock items
        const { data: lowItems } = await supabase
          .from('items')
          .select('quantity, reorder_point')
          .or('quantity.lte.10,quantity.is.null');

        setCounts({
          categories: catCount || 3,
          lowStock: lowItems?.length || 0,
          pendingStaff: 0,
        });
      } catch (err) {
        // Silently fallback
      }
    };

    fetchUserData();
    fetchSummaryCounts();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast('Signed out successfully.', 'info');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navLinkClass = ({ isActive }) =>
    `sb-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
      isActive
        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white font-semibold'
        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
    }`;

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          id="mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-zinc-950/50 backdrop-blur-[2px] z-40 lg:hidden"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white dark:bg-[#0C0C0E] border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col transition-all duration-200 ease-out ${
          isCollapsed ? 'w-[72px] sidebar-collapsed' : 'w-[260px]'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Workspace Header */}
        <div
          className={`h-16 flex items-center border-b border-zinc-200/70 dark:border-zinc-800/70 shrink-0 relative ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Custom Geometric Leaf/Brand Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-inset ring-white/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20V11" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M12 12.5C12 8 15.5 4.5 20 4.5C20 9 16.5 12.5 12 12.5Z"
                  fill="#D1FAE5"
                  fillOpacity="0.9"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 15C12 11.2 9.2 8 5 8C5 11.8 7.8 15 12 15Z"
                  fill="#FFFFFF"
                  fillOpacity="0.95"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="sb-hide min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-[15px] tracking-tight text-zinc-950 dark:text-white truncate">
                    <span className="text-emerald-600 dark:text-emerald-400">NLDB</span>Sales
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  Livestock Board HQ
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={
              isCollapsed
                ? 'hidden lg:flex items-center justify-center absolute -right-3 top-5 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors z-50'
                : 'hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shrink-0'
            }
          >
            {isCollapsed ? (
              <LuPanelLeftOpen className="w-3.5 h-3.5" />
            ) : (
              <LuPanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Toggle */}
          <button
            onClick={onCloseMobile}
            title="Close menu"
            className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Command Trigger Inside Sidebar */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 sb-hide">
            <button
              onClick={onOpenCommandPalette}
              className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <span className="flex items-center gap-2">
                <LuSearch className="w-3.5 h-3.5 text-zinc-400" />
                <span>Jump to anything...</span>
              </span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* GENERAL */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                General
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/dashboard" className={navLinkClass} title="Control Center">
                <LuLayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="sb-hide truncate flex-1 text-left">Control Center</span>
                    <span className="sb-hide w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* PRODUCT CATALOG */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                Product Catalog
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/categories" className={navLinkClass} title="Categories">
                <LuFolderKanban className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="sb-hide truncate flex-1 text-left">Categories</span>
                    <span className="sb-hide font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                      {counts.categories}
                    </span>
                  </>
                )}
              </NavLink>
              <NavLink to="/items" className={navLinkClass} title="Products">
                <LuPackage className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="sb-hide truncate flex-1 text-left">Products</span>
                    {counts.lowStock > 0 && (
                      <span className="sb-hide font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        {counts.lowStock} low
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* ADMINISTRATION */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                Administration
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/users" className={navLinkClass} title="Force Management">
                <LuUsers className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="sb-hide truncate flex-1 text-left">Force Management</span>
                )}
              </NavLink>
              <NavLink to="/shops" className={navLinkClass} title="Retail Outlets">
                <LuStore className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="sb-hide truncate flex-1 text-left">Retail Outlets</span>
                )}
              </NavLink>
              <NavLink to="/routes" className={navLinkClass} title="Map & Routes">
                <LuMapPinned className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="sb-hide truncate flex-1 text-left">Map & Routes</span>
                )}
              </NavLink>
            </div>
          </div>

          {/* INTELLIGENCE & SYSTEM */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                Intelligence & System
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/daily-income" className={navLinkClass} title="Revenue Stream">
                <LuChartLine className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="sb-hide truncate flex-1 text-left">Revenue Stream</span>
                )}
              </NavLink>
              <NavLink to="/settings" className={navLinkClass} title="System Config">
                <LuSlidersHorizontal className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="sb-hide truncate flex-1 text-left">System Config</span>
                )}
              </NavLink>
            </div>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-zinc-200/70 dark:border-zinc-800/70 shrink-0">
          <div className="sb-profile flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-900 transition-colors">
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-emerald-500/20 text-white dark:text-emerald-300 border border-zinc-800 dark:border-emerald-500/30 flex items-center justify-center text-xs font-semibold shrink-0">
                {getInitials(userData.name)}
              </div>
              {!isCollapsed && (
                <div className="sb-hide min-w-0 leading-tight">
                  <div className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {userData.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {userData.role} · Colombo
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="sb-hide p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LuLogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
