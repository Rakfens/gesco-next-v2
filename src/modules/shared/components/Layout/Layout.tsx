// @ts-nocheck
// modules/shared/components/Layout/Layout.jsx
import { useState, useEffect } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout = ({ children, page, onNavigate, enCours }) => {
  const { currentCompany } = useCompany();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      
      <div style={{ display: 'flex' }}>
        {!isMobile && <Sidebar currentCompany={currentCompany} page={page} onNavigate={onNavigate} />}
        
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