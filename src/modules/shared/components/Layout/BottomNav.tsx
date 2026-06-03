// @ts-nocheck
// BottomNav.tsx — Professional Mobile Navigation
import { useState, useEffect } from 'react';

const Icons = {
  grid: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  truck: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    </svg>
  ),
  clock: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  user: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  chart: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  users: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  refresh: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.74"/>
    </svg>
  ),
  cash: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  cart: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  box: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  list: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  wallet: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  document: (active) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

const NAV_CONFIG = {
  service: [
    { key: 'dashboard',    label: 'Accueil' },
    { key: 'livraison',    label: 'Livraison' },
    { key: 'historique',   label: 'Historique' },
    { key: 'gerant',       label: 'Gérant' },
    { key: 'recap',        label: 'Récap' },
    { key: 'agents',       label: 'Agents' },
    { key: 'recuperation', label: 'Récup.' },
  ],
  commerce: [
    { key: 'dashboard',  label: 'Accueil' },
    { key: 'ventes',     label: 'Ventes' },
    { key: 'achats',     label: 'Achats' },
    { key: 'stock',      label: 'Stock' },
    { key: 'inventaire', label: 'Inv.' },
    { key: 'depenses',   label: 'Dépenses' },
    { key: 'rapports',   label: 'Rapports' },
  ],
};

const STORAGE_KEY = 'bottomNav_lastPages';

export const BottomNav = ({ page, onNavigate, enCours, currentCompany }) => {
  const [lastPages, setLastPages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  });

  const getConfig = () => {
    if (!currentCompany) return [];
    if (currentCompany.type === 'service') return NAV_CONFIG.service;
    return NAV_CONFIG.commerce;
  };

  const navItems = getConfig();

  useEffect(() => {
    if (currentCompany && page && navItems.some(i => i.key === page)) {
      const next = { ...lastPages, [currentCompany.id]: page };
      setLastPages(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, [currentCompany, page]);

  const isValidPage = navItems.some(i => i.key === page);
  const activePage = isValidPage ? page : (lastPages[currentCompany?.id] || 'dashboard');

  useEffect(() => {
    if (activePage !== page && page) onNavigate(activePage);
  }, [activePage]);

  if (!currentCompany || navItems.length === 0) return null;

  const count = navItems.length;
  const labelSize = count >= 7 ? 9 : count >= 6 ? 10 : 11;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 98,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--card)',
      borderTop: '1px solid var(--border)',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          const IconComp = Icons[item.icon];
          const isBadge = item.key === 'historique' && enCours > 0;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                flex: 1,
                padding: '8px 2px 6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, background: 'var(--accent)',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}

              <div style={{
                position: 'relative',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                transition: 'color 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 24,
              }}>
                {IconComp ? <IconComp active={isActive} /> : null}
                {isBadge && (
                  <div style={{
                    position: 'absolute', top: -2, right: -8,
                    background: 'var(--red)', color: '#fff',
                    borderRadius: 8, fontSize: 8, fontWeight: 700,
                    padding: '0 4px', minWidth: 14, textAlign: 'center',
                  }}>
                    {enCours > 9 ? '9+' : enCours}
                  </div>
                )}
              </div>

              <span style={{
                fontSize: labelSize,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                transition: 'color 0.15s ease',
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
