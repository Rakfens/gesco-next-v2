// @ts-nocheck
// useRecuperations.js — avec Realtime sync
import { useState, useEffect, useCallback } from 'react';
import { fetchRecuperations, addRecuperation, updateRecuperation, deleteRecuperation } from '../../livraison/services/recuperationService';
import { useCompany } from '../context/CompanyContext';

export const useRecuperations = () => {
  const [recuperations, setRecuperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentCompany } = useCompany();

  const loadRecuperations = useCallback(async () => {
    if (!currentCompany?.id) { setRecuperations([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchRecuperations(currentCompany.id);
      setRecuperations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadRecuperations(); }, [loadRecuperations]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.table === 'recuperations') loadRecuperations();
    };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadRecuperations]);

  const handleAddRecuperation = async (rec) => {
    try {
      setError(null);
      const newRec = await addRecuperation(rec);
      setRecuperations(prev => [newRec, ...prev]);
      return newRec;
    } catch (err) { setError(err.message); throw err; }
  };

  const handleUpdateRecuperation = async (id, updates) => {
    try {
      setError(null);
      await updateRecuperation(id, updates);
      setRecuperations(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) { setError(err.message); throw err; }
  };

  const handleDeleteRecuperation = async (id) => {
    try {
      setError(null);
      await deleteRecuperation(id);
      setRecuperations(prev => prev.filter(r => r.id !== id));
    } catch (err) { setError(err.message); throw err; }
  };

  return {
    recuperations, loading, error,
    addRecuperation: handleAddRecuperation,
    updateRecuperation: handleUpdateRecuperation,
    deleteRecuperation: handleDeleteRecuperation,
    reloadRecuperations: loadRecuperations,
  };
};
