'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { CompanyProvider, useCompany } from '@/modules/shared/context/CompanyContext';
import { ThemeProvider, useTheme } from '@/modules/shared/context/ThemeContext';
import { AppProvider } from '@/modules/shared/context/AppContext';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import { NAV_CONFIG } from '@/modules/shared/components/layout/navConfig';
import { getCompanyMeta, getLogoSrc } from '@/modules/shared/components/layout/company';
import { CompanySheet } from '@/modules/shared/components/layout/CompanySheet';
import {
  MoonIcon, SunIcon, LogoutIcon, ChevronDownIcon, MenuIcon, LockIcon,
  NavIcons, type NavIconKey,
} from '@/modules/shared/components/ui/Icons';

export const dynamic = 'force-dynamic';

// ─── Main Layout ────────────────────────────────────────────────
function LayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  console.log('[LAYOUT] currentCompany:', currentCompany?.name, 'companies:', companies?.length);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [logoError, setLogoError] = useState(false);

  const handleLogout = useCallback(async () => {
    await getSupabase().auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  const navItems = currentCompany?.type === 'service'
    ? NAV_CONFIG.service
    : (currentCompany?.type === 'commerce' ? NAV_CONFIG.commerce : []);

  const meta = getCompanyMeta(currentCompany);
  const logoSrc = getLogoSrc(currentCompany);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Avoid hydration mismatch: don't render full layout until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: 14, color: '#64748b' }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)' }}
          className="lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', inset: '0 auto 0 0', zIndex: 40,
        display: 'flex', flexDirection: 'column', width: 256,
        background: 'var(--card)', borderRight: '1px solid var(--border)',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s',
      }} className="lg:static lg:translate-x-0">
        {/* Sidebar header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, padding: '0 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: meta.bg, color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800,
            }}>
              {meta.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentCompany?.name || 'HT-GesCom'}
              </div>
              <div style={{ fontSize: 10, color: meta.color }}>{meta.label}</div>
            </div>
          </div>
          {companies?.length > 1 && (
            <button onClick={() => setSheetOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: meta.bg, border: 'none', cursor: 'pointer',
              color: meta.color, fontSize: 11, fontWeight: 500,
            }}>
              <ChevronDownIcon />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8,
                fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                marginBottom: 4,
                transition: 'background 0.15s',
                ...(isActive(item.href)
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text2)' }),
              }}>
              {NavIcons[item.icon as NavIconKey]?.()}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '12px 16px',
          fontSize: 10, color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <LockIcon />
          Donnees securisees - v3.0
        </div>
      </aside>

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 'var(--header-h)', padding: '0 16px',
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button type="button" onClick={() => setSidebarOpen(true)} style={{
                background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4,
              }}>
                <MenuIcon />
              </button>
            )}
            <div style={{
              width: 38, height: 38, borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--border)', background: 'var(--card2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {!logoError
                ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={() => setLogoError(true)} />
                : <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.icon}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentCompany?.name || 'HT-GesCom'}
                </span>
                {companies?.length > 0 && (
                  <button onClick={() => setSheetOpen(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 100,
                    background: meta.bg, border: `1px solid ${meta.color}20`,
                    color: meta.color, cursor: 'pointer',
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>
                    {meta.label}
                    {companies.length > 1 && <ChevronDownIcon />}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Aterinay Services</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} style={{
              width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--card)', color: 'var(--text2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={handleLogout} title="Deconnexion" style={{
              width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--card)', color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoutIcon />
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1, overflow: 'auto',
          padding: isMobile ? undefined : 24,
          background: 'var(--bg)',
        }} className={isMobile ? 'mobile-main' : ''}>
          {children}
        </main>
      </div>

      {sheetOpen && (
        <CompanySheet companies={companies} currentCompany={currentCompany} onSelect={switchCompany} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CompanyProvider>
        <AppProvider>
          <LayoutContent>{children}</LayoutContent>
        </AppProvider>
      </CompanyProvider>
    </ThemeProvider>
  );
}
