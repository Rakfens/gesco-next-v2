'use client';

// useRecuperations.ts — avec Realtime sync
import { useState, useEffect, useCallback } from 'react';
import { fetchRecuperations, addRecuperation, updateRecuperation, deleteRecuperation } from '../../livraison/services/recuperationService';
import { useCompany } from '../context/CompanyContext';
import type { Recuperation } from '@/modules/shared/types';

interface UseRecuperationsReturn {
  recuperations: Recuperation[];
  loading: boolean;
  error: string | null;
  addRecuperation: (rec: Record<string, unknown>) => Promise<Recuperation>;
  updateRecuperation: (id: string, updates: Partial<Recuperation>) => Promise<void>;
  deleteRecuperation: (id: string) => Promise<void>;
  reloadRecuperations: () => Promise<void>;
}

export const useRecuperations = (): UseRecuperationsReturn => {
  const [recuperations, setRecuperations] = useState<Recuperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const loadRecuperations = useCallback(async () => {
    if (!currentCompany?.id) { setRecuperations([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchRecuperations(currentCompany.id);
      setRecuperations(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadRecuperations(); }, [loadRecuperations]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === 'recuperations') loadRecuperations();
    };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadRecuperations]);

  const handleAddRecuperation = async (rec: Record<string, unknown>) => {
    try {
      setError(null);
      const newRec = await addRecuperation(rec);
      setRecuperations(prev => [newRec, ...prev]);
      return newRec;
    } catch (err) { setError((err as Error).message); throw err; }
  };

  const handleUpdateRecuperation = async (id: string, updates: Partial<Recuperation>) => {
    try {
      setError(null);
      await updateRecuperation(id, updates);
      setRecuperations(prev => prev.map(r => r.id === id ? { ...r, ...updates } as Recuperation : r));
    } catch (err) { setError((err as Error).message); throw err; }
  };

  const handleDeleteRecuperation = async (id: string) => {
    try {
      setError(null);
      await deleteRecuperation(id);
      setRecuperations(prev => prev.filter(r => r.id !== id));
    } catch (err) { setError((err as Error).message); throw err; }
  };

  return {
    recuperations, loading, error,
    addRecuperation: handleAddRecuperation,
    updateRecuperation: handleUpdateRecuperation,
    deleteRecuperation: handleDeleteRecuperation,
    reloadRecuperations: loadRecuperations,
  };
};
