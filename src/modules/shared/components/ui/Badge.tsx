// ui/Badge.tsx — Badge/Tag professionnel
import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple';
type BadgeSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default: { bg: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)' },
  primary: { bg: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid transparent' },
  success: { bg: 'var(--green-dim)', color: 'var(--green)', border: '1px solid transparent' },
  danger:  { bg: 'var(--red-dim)', color: 'var(--red)', border: '1px solid transparent' },
  warning: { bg: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid transparent' },
  info:    { bg: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid transparent' },
  purple:  { bg: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid transparent' },
};

const sizeStyles: Record<BadgeSize, { padding: string; fontSize: number }> = {
  sm: { padding: '1px 7px', fontSize: 10 },
  md: { padding: '3px 9px', fontSize: 11 },
  lg: { padding: '4px 12px', fontSize: 12 },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  style = {},
  className,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

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
