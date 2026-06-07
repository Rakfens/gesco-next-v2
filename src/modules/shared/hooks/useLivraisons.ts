'use client';

// useLivraisons.ts — v2 : companyId passé au service, plus de race condition
import { useState, useEffect, useCallback } from 'react';
import { fetchLivraisons, addLivraison, updateLivraison, deleteLivraison } from '../../livraison/services/livraisonService';
import { useCompany } from '../context/CompanyContext';
import type { Livraison } from '@/modules/shared/types';

interface UseLivraisonsReturn {
  livraisons: Livraison[];
  loading: boolean;
  error: string | null;
  addLivraison: (livraison: Record<string, unknown>) => Promise<Livraison>;
  updateLivraison: (id: string, updates: Partial<Livraison>) => Promise<void>;
  deleteLivraison: (id: string) => Promise<void>;
  reloadLivraisons: () => Promise<void>;
}

export const useLivraisons = (): UseLivraisonsReturn => {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const loadLivraisons = useCallback(async () => {
    if (!currentCompany?.id) { setLivraisons([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchLivraisons(currentCompany.id);
      setLivraisons(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadLivraisons(); }, [loadLivraisons]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail?.table === 'livraisons') loadLivraisons(); };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadLivraisons]);

  const handleAddLivraison = async (livraison: Record<string, unknown>) => {
    if (!currentCompany?.id) throw new Error('Société non sélectionnée');
    const montant = livraison.paiement === 'client' ? 0 : parseFloat(livraison.montant as string) || 0;
    const newLiv: Partial<Livraison> = {
      colis:                  livraison.colis as string,
      client_donneur:         (livraison.client_donneur || livraison.client) as string,
      destinataire:           livraison.destinataire as string,
      destinataire_telephone: (livraison.destinataire_telephone || livraison.telephone || '') as string,
      destinataire_lieu:      (livraison.destinataire_lieu || livraison.lieu || '') as string,
      agent_id:               String(livraison.agentId || livraison.agent_id || ''),
      agent_nom:              (livraison.agentNom || livraison.agent_nom || '—') as string,
      montant,
      frais:                  parseFloat(livraison.frais as string) || 0,
      paiement:               livraison.paiement as string,
      date:                   livraison.date as string,
      statut:                 (livraison.statut || 'en_cours') as string,
      remarque:               (livraison.remarque || undefined) as string | undefined,
    };
    const data = await addLivraison(newLiv, currentCompany.id);
    setLivraisons(prev => [data, ...prev]);
    return data;
  };

  const handleUpdateLivraison = async (id: string, updates: Partial<Livraison>) => {
    const companyId = currentCompany?.id;
    if (!companyId) throw new Error('Société non sélectionnée');
    await updateLivraison(id, updates, companyId);
    setLivraisons(prev => prev.map(l => l.id === id ? { ...l, ...updates } as Livraison : l));
  };

  const handleDeleteLivraison = async (id: string) => {
    const companyId = currentCompany?.id;
    if (!companyId) throw new Error('Société non sélectionnée');
    await deleteLivraison(id, companyId);
    setLivraisons(prev => prev.filter(l => l.id !== id));
  };

  return {
    livraisons, loading, error,
    addLivraison:    handleAddLivraison,
    updateLivraison: handleUpdateLivraison,
    deleteLivraison: handleDeleteLivraison,
    reloadLivraisons: loadLivraisons,
  };
};
