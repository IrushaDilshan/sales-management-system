import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import {
  LuLayoutDashboard,
  LuBoxes,
  LuClipboardList,
  LuPackage,
  LuSlidersHorizontal,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuLogOut,
  LuX,
} from 'react-icons/lu';
import './Sidebar.css';

const StoreKeeperSidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userData, setUserData] = useState({ name: 'Storekeeper', role: 'Inventory Staff' });

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
              name: data.name || user.email?.split('@')[0] || 'Storekeeper',
              role: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Inventory Staff',
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch user profile:', err);
      }
    };

    fetchUserData();
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
    if (!name) return 'SK';
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
        {/* Top Brand + Collapse Trigger */}
        <div
          className={`h-16 flex items-center border-b border-zinc-200/70 dark:border-zinc-800/70 shrink-0 relative ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div
            onClick={() => navigate('/storekeeper/dashboard')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3C7.5 3 4 6.5 4 11c0 3.2 1.8 5.9 4.5 7.2L7 21h10l-1.5-2.8C18.2 16.9 20 14.2 20 11c0-4.5-3.5-8-8-8Z"
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
                  Logistics Portal
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
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Group: General */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                General
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/storekeeper/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                {({ isActive }) => (
                  <>
                    <LuLayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span className="sb-hide truncate">Command Center</span>}
                    {isActive && !isCollapsed && (
                      <span className="sb-hide ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* Group: Asset Management */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                Asset Management
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/storekeeper/stock" className={navLinkClass} onClick={onCloseMobile}>
                {({ isActive }) => (
                  <>
                    <LuBoxes className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span className="sb-hide truncate">Stock Surveillance</span>}
                    {isActive && !isCollapsed && (
                      <span className="sb-hide ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </NavLink>

              <NavLink to="/storekeeper/inventory" className={navLinkClass} onClick={onCloseMobile}>
                {({ isActive }) => (
                  <>
                    <LuClipboardList className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span className="sb-hide truncate">Stock Ledger</span>}
                    {isActive && !isCollapsed && (
                      <span className="sb-hide ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </NavLink>

              <NavLink to="/storekeeper/items" className={navLinkClass} onClick={onCloseMobile}>
                {({ isActive }) => (
                  <>
                    <LuPackage className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span className="sb-hide truncate">Product Catalog</span>}
                    {isActive && !isCollapsed && (
                      <span className="sb-hide ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* Group: System */}
          <div>
            {!isCollapsed && (
              <div className="sb-hide px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
                System
              </div>
            )}
            <div className="space-y-0.5">
              <NavLink to="/storekeeper/settings" className={navLinkClass} onClick={onCloseMobile}>
                {({ isActive }) => (
                  <>
                    <LuSlidersHorizontal className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span className="sb-hide truncate">Logistics Config</span>}
                    {isActive && !isCollapsed && (
                      <span className="sb-hide ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-zinc-200/70 dark:border-zinc-800/70 shrink-0">
          <div className="sb-profile flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-900 transition-colors">
            <div
              onClick={() => navigate('/storekeeper/settings')}
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
                    {userData.role} · Logistics
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                title="Sign out"
                className="sb-hide p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
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

export default StoreKeeperSidebar;
