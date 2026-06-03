// @ts-nocheck
// src/modules/shared/hooks/useToast.js
import { useState, useCallback } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'success', duration = 3000) => {
    const id = ++toastId;
    const newToast = { id, msg, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    
    return id;
  }, []);

  const hideToast = useCallback((id) => {
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
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    warn: (msg) => showToast(msg, 'warn'),
    info: (msg) => showToast(msg, 'info')
  };
};