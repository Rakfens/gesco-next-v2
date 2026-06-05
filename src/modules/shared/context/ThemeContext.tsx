'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

// ── Context ────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'aterinay_theme';

// ── Hook ───────────────────────────────────────────────────────────────
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ── Provider ───────────────────────────────────────────────────────────
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);

      if (theme === 'dark') {
        document.documentElement.style.setProperty('--bg', '#0f172a');
        document.documentElement.style.setProperty('--card', '#1e293b');
        document.documentElement.style.setProperty('--text', '#f1f5f9');
        document.documentElement.style.setProperty('--text2', '#e2e8f0');
        document.documentElement.style.setProperty('--border', '#334155');
        document.documentElement.style.setProperty('--border2', '#475569');
        document.documentElement.style.setProperty('--muted', '#94a3b8');
        document.documentElement.style.setProperty('--subtle', '#cbd5e1');
        document.documentElement.style.setProperty('--blue', '#3b82f6');
        document.documentElement.style.setProperty('--green', '#10b981');
        document.documentElement.style.setProperty('--red', '#ef4444');
        document.documentElement.style.setProperty('--red2', '#f87171');
        document.documentElement.style.setProperty('--orange', '#f59e0b');
        document.documentElement.style.setProperty('--yellow', '#eab308');
        document.documentElement.style.setProperty('--teal', '#14b8a6');
        document.documentElement.style.setProperty('--purple', '#8b5cf6');
        document.documentElement.style.setProperty('--pink', '#ec4899');
      } else {
        document.documentElement.style.setProperty('--bg', '#f8fafc');
        document.documentElement.style.setProperty('--card', '#ffffff');
        document.documentElement.style.setProperty('--text', '#0f172a');
        document.documentElement.style.setProperty('--text2', '#1e293b');
        document.documentElement.style.setProperty('--border', '#e2e8f0');
        document.documentElement.style.setProperty('--border2', '#cbd5e1');
        document.documentElement.style.setProperty('--muted', '#64748b');
        document.documentElement.style.setProperty('--subtle', '#334155');
        document.documentElement.style.setProperty('--blue', '#2563eb');
        document.documentElement.style.setProperty('--green', '#059669');
        document.documentElement.style.setProperty('--red', '#dc2626');
        document.documentElement.style.setProperty('--red2', '#ef4444');
        document.documentElement.style.setProperty('--orange', '#d97706');
        document.documentElement.style.setProperty('--yellow', '#ca8a04');
        document.documentElement.style.setProperty('--teal', '#0d9488');
        document.documentElement.style.setProperty('--purple', '#7c3aed');
        document.documentElement.style.setProperty('--pink', '#db2777');
      }
    } catch (e) {
      console.error('Erreur application thème:', e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
