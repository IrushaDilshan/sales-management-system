import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';

const MainShell = ({ children }) => {
  // Theme state persisted in localStorage
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('nldb_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('nldb_sidebar_collapsed') === 'true';
  });

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Command palette state
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  // Sync dark class on document.documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nldb_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nldb_theme', 'light');
    }
  }, [isDark]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onOpenCommandPalette={() => setIsCmdOpen(true)}
      />

      {/* Main Content Area */}
      <div
        id="main-shell"
        className={`min-h-screen flex flex-col transition-all duration-200 ease-out ${
          isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* Sticky Frosted Topbar */}
        <Topbar
          onOpenMobile={() => setIsMobileOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {/* Dynamic Page Container */}
        <main
          id="page-root"
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto pb-20"
        >
          {children}
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />
    </div>
  );
};

export default MainShell;
