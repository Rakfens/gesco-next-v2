// @ts-nocheck
// useLivraisons.js — v2 : companyId passé au service, plus de race condition
import { useState, useEffect, useCallback } from 'react';
import { fetchLivraisons, addLivraison, updateLivraison, deleteLivraison } from '../../livraison/services/livraisonService';
import { useCompany } from '../context/CompanyContext';

export const useLivraisons = () => {
  const [livraisons, setLivraisons] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const { currentCompany } = useCompany();

  const loadLivraisons = useCallback(async () => {
    if (!currentCompany?.id) { setLivraisons([]); setLoading(false); return; }
    try {
      setError(null);
      const data = await fetchLivraisons(currentCompany.id);
      setLivraisons(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadLivraisons(); }, [loadLivraisons]);

  useEffect(() => {
    const handler = (e) => { if (e.detail?.table === 'livraisons') loadLivraisons(); };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, [loadLivraisons]);

  const handleAddLivraison = async (livraison) => {
    if (!currentCompany?.id) throw new Error('Société non sélectionnée');
    const montant = livraison.paiement === 'client' ? 0 : parseFloat(livraison.montant) || 0;
    const newLiv = {
      colis:                  livraison.colis,
      client_donneur:         livraison.client_donneur || livraison.client,
      destinataire:           livraison.destinataire,
      destinataire_telephone: livraison.destinataire_telephone || livraison.telephone || '',
      destinataire_lieu:      livraison.destinataire_lieu || livraison.lieu || '',
      agent_id:               Number(livraison.agentId || livraison.agent_id) || null,
      agent_nom:              livraison.agentNom || livraison.agent_nom || '—',
      montant,
      frais:                  parseFloat(livraison.frais) || 0,
      paiement:               livraison.paiement,
      date:                   livraison.date,
      statut:                 livraison.statut || 'en_cours',
      remarque:               livraison.remarque || null,
    };
    const data = await addLivraison(newLiv, currentCompany.id);
    setLivraisons(prev => [data, ...prev]);
    return data;
  };

  const handleUpdateLivraison = async (id, updates) => {
    await updateLivraison(id, updates, currentCompany?.id);
    setLivraisons(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleDeleteLivraison = async (id) => {
    await deleteLivraison(id, currentCompany?.id);
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
