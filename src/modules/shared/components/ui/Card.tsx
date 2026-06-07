// ui/Card.tsx — Carte professionnelle avec sous-composants
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, padding = 18, style = {}, onClick, className }) => (
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
    onMouseEnter={onClick ? (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.boxShadow = 'var(--shadow)'; } : undefined}
    onMouseLeave={onClick ? (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } : undefined}
  >
    {children}
  </div>
);

export interface CardSubComponentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardSubComponentProps> = ({ children, className, style }) => (
  <div className={className} style={{ marginBottom: 12, ...style }}>{children}</div>
);

export const CardTitle: React.FC<CardSubComponentProps> = ({ children, className, style }) => (
  <div className={className} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', ...style }}>{children}</div>
);

export const CardContent: React.FC<CardSubComponentProps> = ({ children, className, style }) => (
  <div className={className} style={style}>{children}</div>
);

export const CardFooter: React.FC<CardSubComponentProps> = ({ children, className, style }) => (
  <div className={className} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', ...style }}>{children}</div>
);

export default Card;
