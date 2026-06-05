import { getSupabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Avance {
  id?: number;
  agent_id?: number | string;
  agent_nom?: string;
  montant: number;
  motif?: string | null;
  date: string;
  mois?: string;
  annule?: boolean;
  company_id?: number | string;
  created_at?: string;
}

// ============ CRUD AVANCES ============

export const fetchAvances = async (companyId: string | number): Promise<Avance[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('avances')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addAvance = async (avance: Avance, companyId: string | number): Promise<Avance> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  if (!avance.agent_id && !avance.agent_nom) throw new Error('Agent requis');
  if (!avance.montant || avance.montant <= 0) throw new Error('Montant valide requis');
  if (!avance.date) throw new Error('Date requise');

  const { data, error } = await getSupabase()
    .from('avances')
    .insert([{
      agent_id: avance.agent_id,
      agent_nom: avance.agent_nom,
      montant: parseFloat(avance.montant as unknown as string),
      motif: avance.motif || null,
      date: avance.date,
      mois: avance.mois,
      annule: false,
      company_id: companyId,
    }])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateAvance = async (id: number, updates: Partial<Avance>, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  const { error } = await getSupabase()
    .from('avances')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const deleteAvance = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  const { error } = await getSupabase()
    .from('avances')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const getAvancesByAgent = async (agentId: string | number, companyId: string | number): Promise<Avance[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('avances')
    .select('*')
    .eq('company_id', companyId)
    .eq('agent_id', agentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

// ============ ANNULATION ============

export const annulerAvance = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  const { error } = await getSupabase()
    .from('avances')
    .update({ annule: true })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};
