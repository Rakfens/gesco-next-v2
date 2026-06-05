// @ts-nocheck
// src/services/avanceService.js
import { getSupabase, getCurrentCompany } from '@/lib/supabase';

export const fetchAvances = async (companyId) => {
  try {
    const company = getCurrentCompany();
    if (!company) {
      return [];
    }

    const { data, error } = await getSupabase()
      .from('avances')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

export const addAvance = async (avance) => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');

    // Validation des données
    if (!avance.agent_id && !avance.agent_nom) {
      throw new Error('Agent requis');
    }
    if (!avance.montant || avance.montant <= 0) {
      throw new Error('Montant valide requis');
    }
    if (!avance.date) {
      throw new Error('Date requise');
    }

    const { data, error } = await getSupabase()
      .from('avances')
      .insert([{
        agent_id: avance.agent_id,
        agent_nom: avance.agent_nom,
        montant: parseFloat(avance.montant),
        motif: avance.motif || null,
        date: avance.date,
        mois: avance.mois,
        annule: false,
        company_id: company.id
      }])
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

export const annulerAvance = async (id) => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');

    const { error } = await getSupabase()
      .from('avances')
      .update({ annule: true })
      .eq('id', id)
      .eq('company_id', company.id);
      
    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

export const deleteAvance = async (id) => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');

    const { error } = await getSupabase()
      .from('avances')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id);
      
    if (error) throw error;
  } catch (error) {
    throw error;
  }
};