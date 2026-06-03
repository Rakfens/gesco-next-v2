// @ts-nocheck
// ui/Card.tsx — Carte professionnelle
import React from 'react';

export const Card = ({
  children,
  padding = 18,
  style = {},
  onClick,
  className,
}) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding,
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.15s ease',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
    onMouseEnter={onClick ? e => e.currentTarget.style.boxShadow = 'var(--shadow)' : undefined}
    onMouseLeave={onClick ? e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)' : undefined}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, style = {} }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: '1px solid var(--border)',
    ...style,
  }}>
    {children}
  </div>
);

export const CardTitle = ({ children, style = {} }) => (
  <div style={{
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    ...style,
  }}>
    {children}
  </div>
);

export const StatCard = ({ label, value, icon, color, sub, style = {} }) => (
  <div className="stat-card" style={{ borderLeft: `3px solid ${color || 'var(--accent)'}`, padding: 20, ...style }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color || 'var(--accent)'}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color || 'var(--accent)', fontSize: 18,
        }}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

export default Card;
