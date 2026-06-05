import { getSupabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Agent {
  id?: number;
  nom: string;
  salaire: number;
  company_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

// ============ CRUD AGENTS ============

export const fetchAgents = async (companyId: string | number): Promise<Agent[]> => {
  if (!companyId) return [];
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .eq('company_id', companyId)
    .order('nom');
  if (error) throw error;
  return data || [];
};

export const addAgent = async (nom: string, salaire: number, companyId: string | number): Promise<Agent> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { data, error } = await getSupabase()
    .from('agents')
    .insert([{ nom, salaire: parseFloat(salaire as unknown as string), company_id: companyId }])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateAgent = async (id: number, updates: Partial<Agent>, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await getSupabase()
    .from('agents')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const deleteAgent = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await getSupabase()
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};
