'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutWrapperProps {
  children: ReactNode;
  page: string;
  onNavigate: (key: string) => void;
  enCours: number;
  logoUrl?: string | null;
  setLogoUrl?: (url: string | null) => void;
  onLogout: () => void;
}

export const LayoutWrapper = ({
  children,
  page,
  onNavigate,
  enCours,
  logoUrl = null,
  setLogoUrl,
  onLogout,
}: LayoutWrapperProps) => {
  const { currentCompany } = useCompany();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header logoUrl={logoUrl} setLogoUrl={setLogoUrl} onLogout={onLogout} />

      <div style={{ display: 'flex' }}>
        {!isMobile && (
          <Sidebar
            page={page}
            onNavigate={onNavigate}
            enCours={enCours}
          />
        )}

        <main
          className={isMobile ? 'mobile-main' : ''}
          style={{
            flex: 1,
            padding: isMobile ? '16px 14px' : '20px',
            marginBottom: isMobile ? 'var(--nav-h, 60px)' : 0,
            marginLeft: !isMobile ? 240 : 0,
            paddingBottom: isMobile
              ? 'calc(var(--nav-h, 60px) + env(safe-area-inset-bottom) + 20px)'
              : '20px',
          }}
        >
          {children}
        </main>
      </div>

      {isMobile && (
        <BottomNav
          page={page}
          onNavigate={onNavigate}
          enCours={enCours}
          currentCompany={currentCompany}
        />
      )}
    </div>
  );
};
