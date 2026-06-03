// @ts-nocheck
// agentService.js — v2 : companyId passé en paramètre (plus de getCurrentCompany)
import { supabase } from '@/lib/supabase';

export const fetchAgents = async (companyId) => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('company_id', companyId)
    .order('nom');
  if (error) throw error;
  return data || [];
};

export const addAgent = async (nom, salaire, companyId) => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { data, error } = await supabase
    .from('agents')
    .insert([{ nom, salaire: parseFloat(salaire), company_id: companyId }])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateAgent = async (id, updates, companyId) => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

export const deleteAgent = async (id, companyId) => {
  if (!companyId) throw new Error('Société non sélectionnée');
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};
