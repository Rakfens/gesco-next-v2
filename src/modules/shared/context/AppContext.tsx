// @ts-nocheck
// AppContext.jsx — v6 : auth et company séparés, logout toujours cliquable
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAgents } from '../hooks/useAgents';
import { useLivraisons } from '../hooks/useLivraisons';
import { useAvances } from '../hooks/useAvances';
import { useRecuperations } from '../hooks/useRecuperations';
import { useToast } from '../hooks/useToast';
import { useCompany } from './CompanyContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Auth — indépendant
  const { user, loading: authLoading, login, logout, authError } = useAuth();

  // Company — indépendant
  const { currentCompany, companies, loading: companyLoading, switchCompany } = useCompany();

  // Données — chargées uniquement si connecté
  const { agents,        loading: la, addAgent,        updateAgent,        deleteAgent,        reloadAgents        } = useAgents();
  const { livraisons,    loading: ll, addLivraison,    updateLivraison,    deleteLivraison,    reloadLivraisons    } = useLivraisons();
  const { avances,       loading: lv, addAvance,       annulerAvance,      deleteAvance,       reloadAvances       } = useAvances();
  const { recuperations, loading: lr, addRecuperation, updateRecuperation, deleteRecuperation, reloadRecuperations } = useRecuperations();

  // Toast
  const { toasts, showToast, hideToast, clearAll, success, error, warn, info } = useToast();

  const value = useMemo(() => ({
    // ─ Auth ─
    user, authLoading, companyLoading, login, logout, authError,
    // ─ Company ─
    currentCompany, companies, switchCompany,
    // ─ Données ─
    agents,        addAgent,        updateAgent,        deleteAgent,        reloadAgents,
    livraisons,    addLivraison,    updateLivraison,    deleteLivraison,    reloadLivraisons,
    avances,       addAvance,       annulerAvance,      deleteAvance,       reloadAvances,
    recuperations, addRecuperation, updateRecuperation, deleteRecuperation, reloadRecuperations,
    // ─ Toast ─
    toasts, showToast, hideToast, clearAll, success, error, warn, info,
  }), [
    user, authLoading, companyLoading, login, logout, authError,
    currentCompany, companies, switchCompany,
    agents, addAgent, updateAgent, deleteAgent, reloadAgents,
    livraisons, addLivraison, updateLivraison, deleteLivraison, reloadLivraisons,
    avances, addAvance, annulerAvance, deleteAvance, reloadAvances,
    recuperations, addRecuperation, updateRecuperation, deleteRecuperation, reloadRecuperations,
    toasts, showToast, hideToast, clearAll, success, error, warn, info,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être dans AppProvider');
  return ctx;
};
