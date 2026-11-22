import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuSearch,
  LuLayoutDashboard,
  LuFolderKanban,
  LuPackage,
  LuUsers,
  LuStore,
  LuMapPinned,
  LuChartLine,
  LuSlidersHorizontal,
  LuSun,
  LuMoon,
  LuPlus,
  LuCornerDownLeft,
} from 'react-icons/lu';

const CommandPalette = ({ isOpen, onClose, onToggleTheme, isDark }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = [
    {
      id: 'nav-overview',
      group: 'Navigation',
      label: 'Control Center (Overview)',
      icon: <LuLayoutDashboard className="w-4 h-4 text-emerald-500" />,
      action: () => {
        navigate('/dashboard');
        onClose();
      },
    },
    {
      id: 'nav-categories',
      group: 'Navigation',
      label: 'Product Categories',
      icon: <LuFolderKanban className="w-4 h-4 text-blue-500" />,
      action: () => {
        navigate('/categories');
        onClose();
      },
    },
    {
      id: 'nav-products',
      group: 'Navigation',
      label: 'Product Catalog (SKU Management)',
      icon: <LuPackage className="w-4 h-4 text-indigo-500" />,
      action: () => {
        navigate('/items');
        onClose();
      },
    },
    {
      id: 'nav-force',
      group: 'Navigation',
      label: 'Force Management (Personnel)',
      icon: <LuUsers className="w-4 h-4 text-amber-500" />,
      action: () => {
        navigate('/users');
        onClose();
      },
    },
    {
      id: 'nav-outlets',
      group: 'Navigation',
      label: 'Retail Network (Outlets)',
      icon: <LuStore className="w-4 h-4 text-cyan-500" />,
      action: () => {
        navigate('/shops');
        onClose();
      },
    },
    {
      id: 'nav-routes',
      group: 'Navigation',
      label: 'Map & Distribution Routes',
      icon: <LuMapPinned className="w-4 h-4 text-purple-500" />,
      action: () => {
        navigate('/routes');
        onClose();
      },
    },
    {
      id: 'nav-revenue',
      group: 'Navigation',
      label: 'Revenue Stream (Daily Income Ledger)',
      icon: <LuChartLine className="w-4 h-4 text-emerald-500" />,
      action: () => {
        navigate('/daily-income');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      group: 'Navigation',
      label: 'System Config (Settings & Security)',
      icon: <LuSlidersHorizontal className="w-4 h-4 text-zinc-500" />,
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
    {
      id: 'act-theme',
      group: 'Quick Actions',
      label: isDark ? 'Switch to Light Appearance' : 'Switch to Obsidian Dark Mode',
      icon: isDark ? (
        <LuSun className="w-4 h-4 text-amber-400" />
      ) : (
        <LuMoon className="w-4 h-4 text-indigo-400" />
      ),
      action: () => {
        if (onToggleTheme) onToggleTheme();
        onClose();
      },
    },
    {
      id: 'act-new-sku',
      group: 'Quick Actions',
      label: 'Register New Product SKU',
      icon: <LuPlus className="w-4 h-4 text-emerald-500" />,
      action: () => {
        navigate('/items?action=new-sku');
        onClose();
      },
    },
  ];

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.group.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="cmd-backdrop"
      className="fixed inset-0 z-[55] bg-zinc-950/55 backdrop-blur-sm flex items-start justify-center pt-[12vh] p-4"
      onClick={(e) => {
        if (e.target.id === 'cmd-backdrop') onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden animate-pop">
        {/* Search Input Bar */}
        <div className="px-4 h-13 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 py-3">
          <LuSearch className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages, products, outlets, or run actions..."
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
          <kbd
            onClick={onClose}
            className="cursor-pointer font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No matching pages or actions found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{item.group}</span>
                  {idx === selectedIndex && (
                    <LuCornerDownLeft className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Use &uarr; &darr; to navigate, Enter to select</span>
          <span className="font-mono">NLDB Command</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
