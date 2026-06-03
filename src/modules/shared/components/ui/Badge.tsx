// @ts-nocheck
// ui/Badge.tsx — Badge/Tag professionnel
import React from 'react';

const variants = {
  default:   { bg: 'var(--bg2)',     color: 'var(--text2)', border: '1px solid var(--border)' },
  primary:   { bg: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid transparent' },
  success:   { bg: 'var(--green-dim)',  color: 'var(--green)',  border: '1px solid transparent' },
  danger:    { bg: 'var(--red-dim)',    color: 'var(--red)',    border: '1px solid transparent' },
  warning:   { bg: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid transparent' },
  info:      { bg: 'var(--blue-dim)',   color: 'var(--blue)',   border: '1px solid transparent' },
  purple:    { bg: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid transparent' },
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  style = {},
  className,
}) => {
  const v = variants[variant] || variants.default;
  const sizeStyles = {
    sm: { padding: '1px 7px', fontSize: 10 },
    md: { padding: '3px 9px', fontSize: 11 },
    lg: { padding: '4px 12px', fontSize: 12 },
  };
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...s,
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: 100,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
};

export default Badge;
