'use client';

import { useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCompany, type Company } from '../../context/CompanyContext';
import { uploadLogoFile, updateLogo, fetchLogo } from '../../../livraison/services/configService';

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface CompanyMeta {
  label: string;
  color: string;
  icon: string;
  bg: string;
}

const getCompanyMeta = (c: { slug?: string; type?: string } | null | undefined): CompanyMeta => {
  if (!c) return { label: 'Gestion', color: 'var(--blue)', icon: '📦', bg: 'var(--blue-dim)' };
  if (c.slug === 'pomanay') return { label: 'Boutique', color: 'var(--purple)', icon: '📱', bg: 'var(--purple-dim)' };
  if (c.slug === 'zazatiana') return { label: 'Bébé', color: 'var(--pink)', icon: '👶', bg: 'rgba(244,114,182,0.12)' };
  return { label: 'Livraison', color: 'var(--blue)', icon: '🚚', bg: 'var(--blue-dim)' };
};

const getLogoSrc = (logoUrl: string | null | undefined, c: { slug?: string; type?: string } | null | undefined): string => {
  if (logoUrl) return logoUrl;
  if (!c) return '/logos/aterinay/logo.png';
  if (c.slug === 'pomanay') return '/logos/pomanay/logo.png';
  if (c.slug === 'zazatiana') return '/logos/zazatiana/logo.png';
  if (c.type === 'service') return '/logos/aterinay/logo.png';
  return '/logos/aterinay/logo.png';
};

interface CompanySheetProps {
  companies: Company[];
  currentCompany: Company | null;
  onSelect: (company: Company) => void;
  onClose: () => void;
}

function CompanySheet({ companies, currentCompany, onSelect, onClose }: CompanySheetProps) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', width: '100%', maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 4, margin: '12px auto 0' }} />

        <div style={{ padding: '16px 20px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Choisir une société
        </div>

        {companies.map(company => {
          const meta = getCompanyMeta(company);
          const isActive = currentCompany?.id === company.id;
          return (
            <button key={company.id} onClick={() => { onSelect(company); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '14px 20px',
                background: isActive ? 'var(--blue-dim)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, background: meta.bg, border: `1.5px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: isActive ? 700 : 600, color: 'var(--text)' }}>{company.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{meta.label}</div>
              </div>
              {isActive && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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

interface HeaderProps {
  logoUrl?: string | null;
  setLogoUrl?: (url: string | null) => void;
  onLogout: () => void;
}

export const Header = ({ logoUrl, setLogoUrl, onLogout }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { currentCompany, companies, switchCompany } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    try {
      const url = await uploadLogoFile(file);
      await updateLogo(url);
      const newLogo = await fetchLogo();
      if (setLogoUrl) setLogoUrl(newLogo || url);
    } catch (_) {}
  };

  const meta = getCompanyMeta(currentCompany);
  const logoSrc = getLogoSrc(logoUrl, currentCompany);

  const iconBtn: React.CSSProperties = {
    width: 36, height: 36, border: '1px solid var(--border2)', borderRadius: 10,
    background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.2s ease',
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 12, paddingLeft: 14, paddingRight: 14,
        background: 'var(--glass)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        gap: 10,
        minHeight: 'var(--header-h)',
      }}>
        {/* Logo + Société + Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {/* Avatar */}
          <div
            style={{ width: 38, height: 38, borderRadius: 11, overflow: 'hidden', border: '1.5px solid var(--border2)', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {!imgError
              ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={() => setImgError(true)} />
              : <span style={{ fontSize: 20 }}>{meta.icon}</span>
            }
          </div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*"
            onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />

          {/* Nom + badge */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                {currentCompany?.name || 'HT-GesCom'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '2px 7px', borderRadius: 20, border: `1px solid ${meta.color}30`, flexShrink: 0 }}>
                {meta.label}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>Aterinay Services</div>
          </div>

          {/* Bouton changement société — visible seulement si >1 société */}
          {companies && companies.length > 1 && (
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 11px', borderRadius: 10,
                background: meta.bg, border: `1px solid ${meta.color}30`,
                color: meta.color, cursor: 'pointer',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Changer
              <ChevronIcon />
            </button>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={toggleTheme} style={iconBtn} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={onLogout} style={{ ...iconBtn, background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)' }} title="Déconnexion">
            <LogoutIcon />
          </button>
        </div>
      </div>

      {/* Bottom sheet société (Dynamic Island safe — s'ouvre depuis le bas) */}
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
