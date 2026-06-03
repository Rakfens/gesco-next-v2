// @ts-nocheck
// ui/Button.tsx — Bouton professionnel réutilisable
import React from 'react';

const variants = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
  },
  success: {
    background: 'var(--green)',
    color: '#fff',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--red)',
    color: '#fff',
    border: '1px solid transparent',
  },
  warning: {
    background: 'var(--orange)',
    color: '#fff',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--card)',
    color: 'var(--text)',
    border: '1px solid var(--border2)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
  },
};

const sizes = {
  sm: { padding: '6px 12px', fontSize: 12, borderRadius: 6 },
  md: { padding: '9px 16px', fontSize: 13, borderRadius: 8 },
  lg: { padding: '12px 22px', fontSize: 14, borderRadius: 10 },
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconRight = null,
  fullWidth = false,
  onClick,
  type = 'button',
  style = {},
  className,
  ...props
}) => {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...v,
        ...s,
        fontWeight: 600,
        fontFamily: 'var(--font)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.15s ease',
        width: fullWidth ? '100%' : 'auto',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      ) : icon}
      {children}
      {iconRight}
    </button>
  );
};

export default Button;
