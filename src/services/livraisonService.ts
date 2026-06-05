import { supabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Livraison {
  id?: number;
  colis: string;
  client_donneur: string;
  destinataire: string;
  destinataire_telephone?: string;
  destinataire_lieu?: string;
  agent_id?: number | string;
  agent_nom?: string;
  montant?: number;
  frais?: number;
  paiement?: string;
  date: string;
  statut?: string;
  remarque?: string | null;
  company_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

// ============ CRUD LIVRAISONS ============

export const fetchLivraisons = async (companyId: string | number): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('livraisons')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addLivraison = async (livraison: Livraison, companyId: string | number): Promise<Livraison> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  if (!livraison.colis) throw new Error('Le colis est requis');
  if (!livraison.client_donneur) throw new Error('Le client donneur est requis');
  if (!livraison.destinataire) throw new Error('Le destinataire est requis');
  if (!livraison.agent_id && !livraison.agent_nom) throw new Error('Le livreur est requis');
  if (!livraison.date) throw new Error('La date est requise');

  const { data, error } = await supabase
    .from('livraisons')
    .insert([{
      colis: livraison.colis,
      client_donneur: livraison.client_donneur,
      destinataire: livraison.destinataire,
      destinataire_telephone: livraison.destinataire_telephone || '',
      destinataire_lieu: livraison.destinataire_lieu || '',
      agent_id: parseInt(livraison.agent_id as string),
      agent_nom: livraison.agent_nom,
      montant: parseFloat(livraison.montant as unknown as string) || 0,
      frais: parseFloat(livraison.frais as unknown as string) || 0,
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

export const updateLivraison = async (id: number, updates: Partial<Livraison>, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await supabase
    .from('livraisons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const deleteLivraison = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await supabase
    .from('livraisons')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

// ============ REQUÊTES SPÉCIFIQUES ============

export const fetchLivraisonsByStatut = async (statut: string, companyId: string | number): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('statut', statut)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchLivraisonsByAgent = async (agentId: string | number, companyId: string | number): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('agent_id', agentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchLivraisonsByDate = async (date: string, companyId: string | number): Promise<Livraison[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('livraisons').select('*')
    .eq('company_id', companyId).eq('date', date)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};
