import React, { createContext, useContext, useState, useCallback } from 'react';
import { LuCircleCheck, LuTriangleAlert, LuInfo, LuCircleAlert, LuX } from 'react-icons/lu';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <LuCircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'error':
        return <LuCircleAlert className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <LuTriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <LuInfo className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getToastBorder = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30';
      case 'error':
        return 'border-rose-500/30';
      case 'warning':
        return 'border-amber-500/30';
      case 'info':
      default:
        return 'border-blue-500/30';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Fixed Toast Stack */}
      <div
        id="toast-stack"
        className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border ${getToastBorder(
              toast.type
            )} shadow-float animate-toast`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getToastIcon(toast.type)}
              <span className="text-xs font-medium leading-relaxed truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors shrink-0"
              title="Dismiss"
            >
              <LuX className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback so any component calling useToast without provider doesn't crash
    return {
      showToast: (msg) => console.log('[Toast fallback]:', msg),
      dismissToast: () => {},
    };
  }
  return context;
};

export default ToastContext;
