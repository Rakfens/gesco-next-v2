// livraisonService.ts — v2 : companyId passé en paramètre
import { getSupabase } from '@/lib/supabase';
import type { Livraison } from '@/modules/shared/types';

export const fetchLivraisons = async (companyId: string): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('livraisons')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addLivraison = async (livraison: Partial<Livraison>, companyId: string): Promise<Livraison> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  if (!livraison.colis) throw new Error('Le colis est requis');
  if (!livraison.client_donneur) throw new Error('Le client donneur est requis');
  if (!livraison.destinataire) throw new Error('Le destinataire est requis');
  if (!livraison.agent_id && !livraison.agent_nom) throw new Error('Le livreur est requis');
  if (!livraison.date) throw new Error('La date est requise');

  const { data, error } = await getSupabase()
    .from('livraisons')
    .insert([{
      colis: livraison.colis,
      client_donneur: livraison.client_donneur,
      destinataire: livraison.destinataire,
      destinataire_telephone: livraison.destinataire_telephone || '',
      destinataire_lieu: livraison.destinataire_lieu || '',
      agent_id: livraison.agent_id ? parseInt(String(livraison.agent_id)) : null,
      agent_nom: livraison.agent_nom,
      montant: parseFloat(String(livraison.montant || 0)),
      frais: parseFloat(String(livraison.frais || 0)),
      paiement: livraison.paiement || 'espece',
      date: livraison.date,
      statut: livraison.statut || 'en_cours',
      remarque: livraison.remarque || null,
      company_id: companyId,
      created_at: new Date().toISOString(),
    }])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateLivraison = async (id: string, updates: Partial<Livraison>, companyId: string): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await getSupabase()
    .from('livraisons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const deleteLivraison = async (id: string, companyId: string): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await getSupabase()
    .from('livraisons')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const fetchLivraisonsByStatut = async (statut: string, companyId: string): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('statut', statut)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchLivraisonsByAgent = async (agentId: string, companyId: string): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('agent_id', agentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchLivraisonsByDate = async (date: string, companyId: string): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('date', date)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};
