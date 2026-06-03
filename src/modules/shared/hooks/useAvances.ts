// @ts-nocheck
// useAvances.js — avec Realtime sync
import { useState, useEffect, useCallback } from 'react';
import { fetchAvances, addAvance, annulerAvance, deleteAvance } from '../../livraison/services/avanceService';
import { useCompany } from '../context/CompanyContext';

export const useAvances = () => {
  const [avances, setAvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentCompany } = useCompany();

  const loadAvances = useCallback(async () => {
    if (!currentCompany?.id) { setAvances([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchAvances(currentCompany.id);
      setAvances(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadAvances(); }, [loadAvances]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.table === 'avances') loadAvances();
    };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadAvances]);

  const handleAddAvance = async (avance) => {
    try {
      setError(null);
      const newAvance = await addAvance(avance);
      setAvances(prev => [newAvance, ...prev]);
      return newAvance;
    } catch (err) { setError(err.message); throw err; }
  };

  const handleAnnulerAvance = async (id) => {
    try {
      setError(null);
      await annulerAvance(id);
      setAvances(prev => prev.map(a => a.id === id ? { ...a, statut: 'annule' } : a));
    } catch (err) { setError(err.message); throw err; }
  };

  const handleDeleteAvance = async (id) => {
    try {
      setError(null);
      await deleteAvance(id);
      setAvances(prev => prev.filter(a => a.id !== id));
    } catch (err) { setError(err.message); throw err; }
  };

  return {
    avances, loading, error,
    addAvance: handleAddAvance,
    annulerAvance: handleAnnulerAvance,
    deleteAvance: handleDeleteAvance,
    reloadAvances: loadAvances,
  };
};
