// @ts-nocheck
// helpers.ts — v3 design système professionnel unifié

// ==================== FORMULAIRES ====================

export const inp = () => ({
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border2)',
  background: 'var(--card)',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'var(--font)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
});

export const inpSm = () => ({
  ...inp(),
  fontSize: 13,
  padding: '8px 12px',
  borderRadius: 6,
});

export const inpLg = () => ({
  ...inp(),
  fontSize: 15,
  padding: '12px 16px',
});

export const inpSearch = () => ({
  ...inp(),
  paddingLeft: 38,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238891a5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '12px center',
});

export const sel = () => ({
  ...inp(),
  appearance: 'none' as const,
  cursor: 'pointer' as const,
  paddingRight: 36,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238891a5' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
});

// ==================== BOUTONS ====================

export const btn = (variant = 'primary') => {
  const variants: Record<string, object> = {
    primary: {
      padding: '10px 18px',
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid transparent',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      boxShadow: 'var(--shadow-sm)',
    },
    success: {
      padding: '10px 18px',
      background: 'var(--green)',
      color: '#fff',
      border: '1px solid transparent',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    danger: {
      padding: '10px 18px',
      background: 'var(--red)',
      color: '#fff',
      border: '1px solid transparent',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    warning: {
      padding: '10px 18px',
      background: 'var(--orange)',
      color: '#fff',
      border: '1px solid transparent',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    secondary: {
      padding: '10px 18px',
      background: 'var(--card)',
      color: 'var(--text)',
      border: '1px solid var(--border2)',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    ghost: {
      padding: '9px 16px',
      background: 'transparent',
      color: 'var(--text2)',
      border: '1px solid transparent',
      borderRadius: 8,
      fontWeight: 500,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    outline: {
      padding: '9px 16px',
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid var(--accent)',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'var(--font)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    icon: {
      width: 36,
      height: 36,
      padding: 0,
      background: 'var(--card)',
      color: 'var(--text2)',
      border: '1px solid var(--border2)',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      flexShrink: 0,
    },
    iconGhost: {
      width: 34,
      height: 34,
      padding: 0,
      background: 'transparent',
      color: 'var(--muted)',
      border: 'none',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
  };
  return variants[variant] || variants.primary;
};

export const btnSm = (variant = 'primary') => ({
  ...btn(variant),
  padding: variant === 'icon' ? '0' : variant === 'iconGhost' ? '0' : '7px 12px',
  fontSize: 13,
  borderRadius: 6,
  ...(variant === 'icon' ? { width: 30, height: 30 } : {}),
  ...(variant === 'iconGhost' ? { width: 28, height: 28 } : {}),
});

export const btnLg = (variant = 'primary') => ({
  ...btn(variant),
  padding: variant === 'icon' ? '0' : '14px 24px',
  fontSize: 15,
  borderRadius: 10,
  ...(variant === 'icon' ? { width: 44, height: 44 } : {}),
});

// ==================== LABELS ====================

export const lbl = () => ({
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  display: 'block',
  marginBottom: 6,
});

// ==================== CARDS ====================

export const card = () => ({
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 18,
  boxShadow: 'var(--shadow-sm)',
});

export const cardHeader = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
  paddingBottom: 12,
  borderBottom: '1px solid var(--border)',
});

// ==================== TAG / BADGE ====================

export const tag = (bg: string, color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  background: bg,
  color: color,
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
});

export const badge = (variant = 'default') => {
  const variants: Record<string, object> = {
    default: { background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid transparent' },
    success: { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid transparent' },
    danger:  { background: 'var(--red-dim)',   color: 'var(--red)',   border: '1px solid transparent' },
    warning: { background: 'var(--orange-dim)',color: 'var(--orange)',border: '1px solid transparent' },
    info:    { background: 'var(--blue-dim)',  color: 'var(--blue)',  border: '1px solid transparent' },
    purple:  { background: 'var(--purple-dim)',color: 'var(--purple)',border: '1px solid transparent' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    ...(variants[variant] || variants.default),
  };
};

// ==================== SECTIONS ====================

export const section = () => ({
  marginBottom: 24,
});

// ==================== MODAL STYLES ====================

export const modalStyles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end' as const,
    justifyContent: 'center' as const,
    animation: 'fadeIn 0.2s ease',
    paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))',
  },
  sheet: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '18px 18px 0 0',
    width: '100%',
    maxWidth: 520,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'fadeUp 0.25s ease',
    boxShadow: 'var(--shadow-lg)',
  },
  sheetDesktop: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    width: '100%',
    maxWidth: 560,
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'fadeUp 0.2s ease',
    boxShadow: 'var(--shadow-lg)',
  },
  fullscreen: {
    background: 'var(--card)',
    border: 'none',
    borderRadius: 0,
    padding: 'max(20px, env(safe-area-inset-top)) 16px 0',
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'fadeUp 0.2s ease',
  },
  handle: {
    width: 36,
    height: 4,
    background: 'var(--border2)',
    borderRadius: 4,
    margin: '12px auto 16px',
    flexShrink: 0,
  },
  header: {
    padding: '0 20px 14px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '0 20px',
    WebkitOverflowScrolling: 'touch',
  },
  footer: {
    flexShrink: 0,
    padding: '14px 20px',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    borderTop: '1px solid var(--border)',
    background: 'var(--card)',
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
};
