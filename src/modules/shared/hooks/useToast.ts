'use client';

// src/modules/shared/hooks/useToast.ts
import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warn' | 'info';

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

let toastId = 0;

interface UseToastReturn {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType, duration?: number) => number;
  hideToast: (id: number) => void;
  clearAll: () => void;
  success: (msg: string) => number;
  error: (msg: string) => number;
  warn: (msg: string) => number;
  info: (msg: string) => number;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((msg: string, type: ToastType = 'success', duration = 3000) => {
    const id = ++toastId;
    const newToast: Toast = { id, msg, type };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    clearAll,
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warn: (msg: string) => showToast(msg, 'warn'),
    info: (msg: string) => showToast(msg, 'info')
  };
};
