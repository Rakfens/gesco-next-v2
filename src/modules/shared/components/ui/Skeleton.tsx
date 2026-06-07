export function Skeleton({ width = '100%', height = 14, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width, height,
      background: 'var(--bg2)',
      borderRadius: 6,
      backgroundImage: 'linear-gradient(90deg, var(--bg) 0%, var(--border) 50%, var(--bg) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={28} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={14} />
    </div>
  );
}

export function SkeletonGrid({ cols = 4, rows = 1 }: { cols?: number; rows?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {Array(cols * rows).fill(0).map((_, i) => (
        <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--border)', opacity: 0.5 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} style={{ padding: '12px 14px', borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12 }}>
          {Array(columns).fill(0).map((_, j) => (
            <Skeleton key={j} width={j === 0 ? '40%' : '20%'} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}
