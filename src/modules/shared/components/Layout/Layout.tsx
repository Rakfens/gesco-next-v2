'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  page: string;
  onNavigate: (key: string) => void;
  enCours: number;
  onLogout: () => void;
}

export const Layout = ({ children, page, onNavigate, enCours, onLogout }: LayoutProps) => {
  const { currentCompany } = useCompany();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header onLogout={onLogout} />

      <div style={{ display: 'flex' }}>
        {!isMobile && <Sidebar page={page} onNavigate={onNavigate} enCours={enCours} />}

        <main
          className={isMobile ? 'mobile-main' : ''}
          style={{
            flex: 1,
            padding: isMobile ? '16px 14px' : '20px',
            marginBottom: isMobile ? 'var(--nav-h)' : 0,
            marginLeft: !isMobile ? '260px' : 0,
            paddingBottom: isMobile ? 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 20px)' : '20px',
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
