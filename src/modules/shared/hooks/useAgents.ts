// @ts-nocheck
// useAgents.js — v2 : companyId passé au service, plus de race condition
import { useState, useEffect, useCallback } from 'react';
import { fetchAgents, addAgent, updateAgent, deleteAgent } from '../../livraison/services/agentService';
import { useCompany } from '../context/CompanyContext';

export const useAgents = () => {
  const [agents,  setAgents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const { currentCompany } = useCompany();

  const loadAgents = useCallback(async () => {
    if (!currentCompany?.id) { setAgents([]); setLoading(false); return; }
    try {
      setError(null);
      // Passer companyId directement — plus de getCurrentCompany() dans le service
      const data = await fetchAgents(currentCompany.id);
      setAgents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  useEffect(() => {
    const handler = (e) => { if (e.detail?.table === 'agents') loadAgents(); };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadAgents]);

  const handleAddAgent = async (nom, salaire) => {
    const a = await addAgent(nom, salaire, currentCompany?.id);
    setAgents(prev => [...prev, a]);
    return a;
  };

  const handleUpdateAgent = async (id, updates) => {
    await updateAgent(id, updates, currentCompany?.id);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDeleteAgent = async (id) => {
    await deleteAgent(id, currentCompany?.id);
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  return {
    agents, loading, error,
    addAgent:    handleAddAgent,
    updateAgent: handleUpdateAgent,
    deleteAgent: handleDeleteAgent,
    reloadAgents: loadAgents,
  };
};
