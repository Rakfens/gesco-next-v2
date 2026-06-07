import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = 'var(--accent)', sub }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 16,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 18,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
