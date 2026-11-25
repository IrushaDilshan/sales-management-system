import React, { useState, useEffect } from 'react';
import StoreKeeperSidebar from './StoreKeeperSidebar';
import Topbar from './Topbar';

const StorekeeperShell = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('nldb_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('nldb_sidebar_collapsed') === 'true';
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nldb_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nldb_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const toggleSidebarCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('nldb_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] dark:bg-[#09090B] text-zinc-950 dark:text-zinc-50 transition-colors duration-200 antialiased">
      <StoreKeeperSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div
        id="main-shell"
        className={`min-h-screen flex flex-col transition-all duration-200 ease-out ${
          isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        <Topbar
          onOpenMobile={() => setIsMobileOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main
          id="page-root"
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto pb-20"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default StorekeeperShell;
