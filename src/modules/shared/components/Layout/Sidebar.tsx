// @ts-nocheck
// Sidebar.tsx — Professional Design
import { useCompany } from '../../context/CompanyContext';
import { badge } from '../../utils/helpers';

const serviceNavItems = [
  { key: 'dashboard',    label: 'Tableau de bord', icon: 'grid' },
  { key: 'livraison',    label: 'Livraison',       icon: 'truck' },
  { key: 'historique',   label: 'Historique',      icon: 'clock' },
  { key: 'gerant',       label: 'Gérant',          icon: 'user' },
  { key: 'recap',        label: 'Récap',           icon: 'chart' },
  { key: 'agents',       label: 'Agents',          icon: 'users' },
  { key: 'recuperation', label: 'Récupération',    icon: 'refresh' },
];

const pomanayNavItems = [
  { key: 'dashboard',  label: 'Tableau de bord', icon: 'grid' },
  { key: 'ventes',     label: 'Ventes',           icon: 'cash' },
  { key: 'achats',     label: 'Achats',           icon: 'cart' },
  { key: 'stock',      label: 'Stock',            icon: 'box' },
  { key: 'inventaire', label: 'Inventaire',       icon: 'list' },
  { key: 'depenses',   label: 'Dépenses',         icon: 'wallet' },
  { key: 'rapports',   label: 'Rapports',         icon: 'document' },
];

const zazatianaNavItems = pomanayNavItems;

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
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
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
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
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

export const Sidebar = ({ page, onNavigate, enCours }) => {
  const { currentCompany } = useCompany();

  const getNavItems = () => {
    if (!currentCompany) return [];
    if (currentCompany.type === 'service') return serviceNavItems;
    if (currentCompany.slug === 'pomanay') return pomanayNavItems;
    if (currentCompany.slug === 'zazatiana') return zazatianaNavItems;
    return [];
  };

  const navItems = getNavItems();

  const getTypeLabel = () => {
    if (currentCompany?.type === 'service') return 'Livraison';
    if (currentCompany?.slug === 'pomanay') return 'Boutique';
    if (currentCompany?.slug === 'zazatiana') return 'Boutique';
    return '';
  };

  if (!currentCompany || navItems.length === 0) return null;

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 'var(--header-h)',
      height: 'calc(100vh - var(--header-h))',
      overflowY: 'auto',
    }}>
      {/* Company header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          {getTypeLabel()}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: 'var(--accent)',
          }}>
            {currentCompany.name.charAt(0)}
          </div>
          {currentCompany.name}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', flex: 1 }}>
        {navItems.map(item => {
          const isActive = page === item.key;
          const IconComp = Icons[item.icon];
          const hasBadge = item.key === 'historique' && enCours > 0;

          return (
            <button
              key={item.key}
              data-testid={`nav-${item.key}`}
              onClick={() => onNavigate(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {IconComp ? <IconComp active={isActive} /> : null}
              </span>
              <span>{item.label}</span>
              {hasBadge && (
                <span style={{
                  marginLeft: 'auto', minWidth: 18, height: 18,
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>
                  {enCours > 9 ? '9+' : enCours}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Données sécurisées
      </div>
    </aside>
  );
};
