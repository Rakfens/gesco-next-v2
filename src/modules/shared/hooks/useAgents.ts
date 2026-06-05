'use client';

// useAgents.ts — v2 : companyId passé au service, plus de race condition
import { useState, useEffect, useCallback } from 'react';
import { fetchAgents, addAgent, updateAgent, deleteAgent } from '../../livraison/services/agentService';
import { useCompany } from '../context/CompanyContext';

interface Agent {
  id: number;
  nom: string;
  salaire: number;
  [key: string]: unknown;
}

interface UseAgentsReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  addAgent: (nom: string, salaire: number) => Promise<Agent>;
  updateAgent: (id: number, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: number) => Promise<void>;
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
      // Passer companyId directement — plus de getCurrentCompany() dans le service
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
    window.addEventListener('getSupabase()_realtime', handler);
    return () => window.removeEventListener('getSupabase()_realtime', handler);
  }, [loadAgents]);

  const handleAddAgent = async (nom: string, salaire: number) => {
    const a = await addAgent(nom, salaire, currentCompany?.id);
    setAgents(prev => [...prev, a]);
    return a;
  };

  const handleUpdateAgent = async (id: number, updates: Partial<Agent>) => {
    await updateAgent(id, updates, currentCompany?.id);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDeleteAgent = async (id: number) => {
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
