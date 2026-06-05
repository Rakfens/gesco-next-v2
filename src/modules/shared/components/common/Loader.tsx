// @ts-nocheck
// Loader.tsx — Professional Design
import { useState, useEffect } from 'react';
import { getSupabase, clearCurrentCompany } from '@/lib/supabase';

export const Loader = ({ message = 'Chargement...', fullScreen = true, timeout = 10000 }) => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowRetry(true), timeout);
    return () => clearTimeout(t);
  }, [timeout]);

  const handleForceLogout = async () => {
    try {
      clearCurrentCompany();
      await getSupabase().auth.signOut();
    } catch (_) {}
    window.location.reload();
  };

  const handleReload = () => window.location.reload();

  const containerStyle = fullScreen ? {
    background: 'var(--bg)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        {/* Logo spinner */}
        <div style={{
          width: 48, height: 48, margin: '0 auto 20px',
          borderRadius: 14,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />

        <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{message}</div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--border2)',
              opacity: 0.6,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>

        {showRetry && (
          <div style={{ marginTop: 28, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Le chargement prend plus de temps que prévu.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handleReload} style={{
                padding: '10px 20px', background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent-bg)', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                Réessayer
              </button>
              <button onClick={handleForceLogout} style={{
                padding: '10px 20px', background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ButtonLoader = ({ size = 16 }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    marginRight: 8, verticalAlign: 'middle', flexShrink: 0,
  }} />
);

export const CardSkeleton = () => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, overflow: 'hidden' }}>
    {[40, 80, 60].map((w, i) => (
      <div key={i} style={{
        width: `${w}%`, height: i === 1 ? 28 : 14,
        background: 'var(--bg2)', borderRadius: 6,
        marginBottom: i < 2 ? 12 : 0,
        backgroundImage: 'linear-gradient(90deg, var(--bg) 0%, var(--border) 50%, var(--bg) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 4, columns = 3 }) => (
  <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} style={{
        padding: '12px 14px',
        borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none',
        display: 'flex', gap: 12,
      }}>
        {Array(columns).fill(0).map((_, j) => (
          <div key={j} style={{
            flex: j === 0 ? 2 : 1, height: 14,
            background: 'var(--bg2)', borderRadius: 6,
            backgroundImage: 'linear-gradient(90deg, var(--bg) 0%, var(--border) 50%, var(--bg) 100%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.5s ${j * 0.1}s infinite`,
          }} />
        ))}
      </div>
    ))}
  </div>
);
