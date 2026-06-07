'use client';

// useAgents.ts — v2 : companyId passé au service, plus de race condition
import { useState, useEffect, useCallback } from 'react';
import { fetchAgents, addAgent, updateAgent, deleteAgent } from '../../livraison/services/agentService';
import { useCompany } from '../context/CompanyContext';
import type { Agent } from '@/modules/shared/types';

interface UseAgentsReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  addAgent: (nom: string, salaire: number) => Promise<Agent>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  reloadAgents: () => Promise<void>;
}

export const useAgents = (): UseAgentsReturn => {
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const loadAgents = useCallback(async () => {
    if (!currentCompany?.id) { setAgents([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchAgents(currentCompany.id);
      setAgents(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail?.table === 'agents') loadAgents(); };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadAgents]);

  const handleAddAgent = async (nom: string, salaire: number) => {
    const companyId = currentCompany?.id;
    if (!companyId) throw new Error('Société non sélectionnée');
    const a = await addAgent(nom, salaire, companyId);
    setAgents(prev => [...prev, a]);
    return a;
  };

  const handleUpdateAgent = async (id: string, updates: Partial<Agent>) => {
    const companyId = currentCompany?.id;
    if (!companyId) throw new Error('Société non sélectionnée');
    await updateAgent(id, updates, companyId);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDeleteAgent = async (id: string) => {
    const companyId = currentCompany?.id;
    if (!companyId) throw new Error('Société non sélectionnée');
    await deleteAgent(id, companyId);
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
