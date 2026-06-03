// @ts-nocheck
// CompanyContext.jsx — v7 : restauration société depuis sessionStorage après réduction iOS
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { supabase, setCurrentCompany, clearCurrentCompany, getCurrentCompany as getStoredCompany } from '@/lib/supabase';
import { loadSavedCompanyId, clearAppState } from '../hooks/useAppState';

const CompanyContext = createContext();
export { setCurrentCompany };
export const getCurrentCompany = () => getStoredCompany?.() ?? null;

export function CompanyProvider({ children }) {
  const [currentCompany, _setActive] = useState(null);
  const [companies,       setList]   = useState([]);
  const [loading,         setLoading] = useState(false);
  const rtChannels = useRef([]);
  const mounted    = useRef(true);

  const applyActive = useCallback((list, preferredId = null) => {
    // Priorité : société préférée (sessionStorage) → première de la liste
    const id = preferredId || loadSavedCompanyId();
    const found = id ? list.find(c => c.id === id) : null;
    const active = found || list[0] || null;
    _setActive(active);
    setCurrentCompany(active);
    setupRealtime(active?.id);
    return active;
  }, []);

  const loadCompanies = useCallback(async (userId) => {
    if (!userId || !mounted.current) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('company:companies(*)')
        .eq('user_id', userId);
      if (!mounted.current) return;
      if (error) throw error;
      const list = (data || []).map(r => r.company).filter(Boolean);
      setList(list);
      applyActive(list);
    } catch (_) {
      if (mounted.current) { setList([]); _setActive(null); }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyActive]);

  const setupRealtime = (companyId) => {
    rtChannels.current.forEach(ch => { try { supabase.removeChannel(ch); } catch (_) {} });
    rtChannels.current = [];
    if (!companyId) return;
    ['livraisons','agents','avances','recuperations','ventes','achats','produits'].forEach(table => {
      try {
        const ch = supabase.channel(`rt_${table}_${companyId}`)
          .on('postgres_changes', { event:'*', schema:'public', table, filter:`company_id=eq.${companyId}` },
            p => window.dispatchEvent(new CustomEvent('supabase_realtime', { detail:{ table, payload:p } })))
          .subscribe();
        rtChannels.current.push(ch);
      } catch (_) {}
    });
  };

  useEffect(() => {
    mounted.current = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      if (!session || event === 'SIGNED_OUT') {
        clearCurrentCompany(); clearAppState();
        setList([]); _setActive(null); setLoading(false);
        rtChannels.current.forEach(ch => { try { supabase.removeChannel(ch); } catch (_) {} });
        rtChannels.current = [];
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        loadCompanies(session.user.id);
      }
    });
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      rtChannels.current.forEach(ch => { try { supabase.removeChannel(ch); } catch (_) {} });
    };
  }, [loadCompanies]);

  const switchCompany = useCallback((company) => {
    _setActive(company);
    setCurrentCompany(company);
    setupRealtime(company?.id);
    // Sauvegarder dans sessionStorage pour survivre à la réduction iOS
    try { if (company?.id) sessionStorage.setItem('ht_company_id', company.id); } catch (_) {}
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: company }));
  }, []);

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, loading, switchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany doit être dans CompanyProvider');
  return ctx;
};
