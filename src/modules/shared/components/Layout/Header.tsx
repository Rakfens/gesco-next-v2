// @ts-nocheck
// Header.tsx — v4 Professional Design
import { useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCompany } from '../../context/CompanyContext';
import { uploadLogoFile, updateLogo, fetchLogo } from '../../../livraison/services/configService';

const Moon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const Sun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const getCompanyMeta = (c) => {
  if (!c) return { label: 'Gestion', color: 'var(--accent)', icon: 'HT', bg: 'var(--accent-dim)' };
  if (c.slug === 'pomanay')  return { label: 'Boutique', color: 'var(--purple)', icon: 'PM', bg: 'var(--purple-dim)' };
  if (c.slug === 'zazatiana') return { label: 'Bébé', color: 'var(--pink)', icon: 'ZT', bg: 'rgba(236,72,153,0.08)' };
  return { label: 'Livraison', color: 'var(--accent)', icon: 'AT', bg: 'var(--accent-dim)' };
};

const getLogoSrc = (logoUrl, c) => {
  if (logoUrl) return logoUrl;
  if (!c) return '/logos/aterinay/logo.png';
  if (c.slug === 'pomanay')  return '/logos/pomanay/logo.png';
  if (c.slug === 'zazatiana') return '/logos/zazatiana/logo.png';
  if (c.type === 'service')  return '/logos/aterinay/logo.png';
  return '/logos/aterinay/logo.png';
};

function CompanySheet({ companies, currentCompany, onSelect, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', width: '100%', maxWidth: 480,
        borderRadius: '18px 18px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp 0.25s ease',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 4, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
          Choisir une société
        </div>
        {companies.map(company => {
          const meta = getCompanyMeta(company);
          const isActive = currentCompany?.id === company.id;
          return (
            <button key={company.id} onClick={() => { onSelect(company); onClose(); }} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 20px',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              border: 'none', cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.15s ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: meta.bg,
                border: `1px solid ${meta.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: meta.color, flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: 'var(--text)' }}>{company.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{meta.label}</div>
              </div>
              {isActive && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

export const Header = ({ logoUrl, setLogoUrl, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { currentCompany, companies, switchCompany } = useCompany();
  const fileInputRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      const url = await uploadLogoFile(file);
      await updateLogo(url);
      const newLogo = await fetchLogo();
      setLogoUrl(newLogo || url);
    } catch (_) {}
  };

  const meta = getCompanyMeta(currentCompany);
  const logoSrc = getLogoSrc(logoUrl, currentCompany);

  return (
    <>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 'var(--header-h)',
        padding: '0 16px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        gap: 12,
      }}>
        {/* Left: Logo + Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--border)', background: 'var(--card2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {!imgError
              ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={() => setImgError(true)} />
              : <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.icon}</span>
            }
          </div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*"
            onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentCompany?.name || 'HT-GesCom'}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: meta.color,
                background: meta.bg, padding: '2px 8px', borderRadius: 100,
                border: `1px solid ${meta.color}20`, flexShrink: 0,
              }}>
                {meta.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Aterinay Services</div>
          </div>

          {companies?.length > 1 && (
            <button onClick={() => setSheetOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 8,
              background: meta.bg, border: `1px solid ${meta.color}20`,
              color: meta.color, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
              <ChevronDown />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} style={{
            width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          <button data-testid="header-logout" onClick={onLogout} title="Déconnexion" style={{
            width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--card)', color: 'var(--muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      {sheetOpen && (
        <CompanySheet
          companies={companies}
          currentCompany={currentCompany}
          onSelect={switchCompany}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
};
