'use client';

// useAvances.ts — avec Realtime sync
import { useState, useEffect, useCallback } from 'react';
import { fetchAvances, addAvance, annulerAvance, deleteAvance } from '../../livraison/services/avanceService';
import { useCompany } from '../context/CompanyContext';

interface Avance {
  id: number;
  statut: string;
  [key: string]: unknown;
}

interface UseAvancesReturn {
  avances: Avance[];
  loading: boolean;
  error: string | null;
  addAvance: (avance: Record<string, unknown>) => Promise<Avance>;
  annulerAvance: (id: number) => Promise<void>;
  deleteAvance: (id: number) => Promise<void>;
  reloadAvances: () => Promise<void>;
}

export const useAvances = (): UseAvancesReturn => {
  const [avances, setAvances] = useState<Avance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const loadAvances = useCallback(async () => {
    if (!currentCompany?.id) { setAvances([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchAvances(currentCompany.id);
      setAvances(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadAvances(); }, [loadAvances]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === 'avances') loadAvances();
    };
    window.addEventListener('getSupabase()_realtime', handler);
    return () => window.removeEventListener('getSupabase()_realtime', handler);
  }, [loadAvances]);

  const handleAddAvance = async (avance: Record<string, unknown>) => {
    try {
      setError(null);
      const newAvance = await addAvance(avance);
      setAvances(prev => [newAvance, ...prev]);
      return newAvance;
    } catch (err) { setError((err as Error).message); throw err; }
  };

  const handleAnnulerAvance = async (id: number) => {
    try {
      setError(null);
      await annulerAvance(id);
      setAvances(prev => prev.map(a => a.id === id ? { ...a, statut: 'annule' } : a));
    } catch (err) { setError((err as Error).message); throw err; }
  };

  const handleDeleteAvance = async (id: number) => {
    try {
      setError(null);
      await deleteAvance(id);
      setAvances(prev => prev.filter(a => a.id !== id));
    } catch (err) { setError((err as Error).message); throw err; }
  };

  return {
    avances, loading, error,
    addAvance: handleAddAvance,
    annulerAvance: handleAnnulerAvance,
    deleteAvance: handleDeleteAvance,
    reloadAvances: loadAvances,
  };
};
