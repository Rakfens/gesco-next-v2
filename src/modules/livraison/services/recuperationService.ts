// recuperationService.ts
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import type { Recuperation } from '@/modules/shared/types';

// ==================== REQUÊTES DE BASE ====================

export const fetchRecuperations = async (companyId: string): Promise<Recuperation[]> => {
  try {
    if (!companyId) return [];
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const getRecuperationsByDate = async (date: string): Promise<Recuperation[]> => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('company_id', company.id)
      .eq('date', date)
      .order('livreur_nom');
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const getRecuperationsByMonth = async (mois: string, companyId: string): Promise<Recuperation[]> => {
  try {
    if (!companyId) return [];
    const parts = mois.split('-');
    const year = parts[0];
    const month = parts[1];
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const addRecuperation = async (recuperation: Partial<Recuperation>): Promise<Recuperation> => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');
    if (!recuperation.date) throw new Error('La date est requise');
    if (!recuperation.livreur_nom) throw new Error('Le livreur_nom est requis');
    if (!recuperation.client_donneur) throw new Error('Le client_donneur est requis');

    const insertData = {
      date: recuperation.date,
      livreur_id: recuperation.livreur_id || null,
      livreur_nom: recuperation.livreur_nom,
      client_donneur: recuperation.client_donneur,
      frais_recuperation: parseFloat(String(recuperation.frais_recuperation || 1000)),
      company_id: company.id,
    };

    const { data, error } = await getSupabase()
      .from('recuperations')
      .insert([insertData])
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

export const updateRecuperation = async (id: string, updates: Partial<Recuperation>): Promise<Recuperation> => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');
    const { data, error } = await getSupabase()
      .from('recuperations')
      .update(updates)
      .eq('id', id)
      .eq('company_id', company.id)
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

export const deleteRecuperation = async (id: string): Promise<void> => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');
    const { error } = await getSupabase()
      .from('recuperations')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id);
    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

// ==================== REQUÊTES SPÉCIFIQUES ====================

export const getRecuperationsByLivreur = async (livreurId: string, mois?: string): Promise<Recuperation[]> => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];
    if (!livreurId) return [];

    let query = getSupabase()
      .from('recuperations')
      .select('*')
      .eq('livreur_id', livreurId)
      .eq('company_id', company.id);

    if (mois) {
      const parts = mois.split('-');
      const year = parts[0];
      const month = parts[1];
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const getRecuperationsByLivreurNom = async (livreurNom: string, mois?: string): Promise<Recuperation[]> => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];
    if (!livreurNom) return [];

    let query = getSupabase()
      .from('recuperations')
      .select('*')
      .eq('livreur_nom', livreurNom)
      .eq('company_id', company.id);

    if (mois) {
      const parts = mois.split('-');
      const year = parts[0];
      const month = parts[1];
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const getTotalRecuperationsByLivreurNom = async (livreurNom: string): Promise<{ total: number; count: number; details: Recuperation[] }> => {
  try {
    const company = getCurrentCompany();
    if (!company) return { total: 0, count: 0, details: [] };
    if (!livreurNom) return { total: 0, count: 0, details: [] };

    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('frais_recuperation, date, client_donneur')
      .eq('livreur_nom', livreurNom)
      .eq('company_id', company.id)
      .order('date', { ascending: false });
    if (error) throw error;

    const total = data.reduce((sum: number, r: { frais_recuperation: unknown }) => sum + (parseFloat(String(r.frais_recuperation)) || 0), 0);
    const count = data.length;
    return { total, count, details: data as Recuperation[] };
  } catch {
    return { total: 0, count: 0, details: [] };
  }
};

export const getTotalRecuperationsByLivreur = async (livreurId: string): Promise<{ total: number; count: number }> => {
  try {
    const company = getCurrentCompany();
    if (!company) return { total: 0, count: 0 };
    if (!livreurId) return { total: 0, count: 0 };

    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('frais_recuperation')
      .eq('livreur_id', livreurId)
      .eq('company_id', company.id);
    if (error) throw error;

    const total = data.reduce((sum: number, r: { frais_recuperation: unknown }) => sum + (parseFloat(String(r.frais_recuperation)) || 0), 0);
    const count = data.length;
    return { total, count };
  } catch {
    return { total: 0, count: 0 };
  }
};

export const getAllRecuperationsByLivreurNom = async (livreurNom: string): Promise<Recuperation[]> => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];
    if (!livreurNom) return [];

    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('livreur_nom', livreurNom)
      .eq('company_id', company.id)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

export const getRecuperationsStatsByMonth = async (mois: string): Promise<Record<string, { livreur_nom: string; total: number; count: number; details: Recuperation[] }>> => {
  try {
    const company = getCurrentCompany();
    if (!company) return {};

    const parts = mois.split('-');
    const year = parts[0];
    const month = parts[1];
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('company_id', company.id)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;

    const stats: Record<string, { livreur_nom: string; total: number; count: number; details: Recuperation[] }> = {};
    (data || []).forEach((recup: Recuperation) => {
      const nom = recup.livreur_nom;
      if (!stats[nom]) {
        stats[nom] = { livreur_nom: nom, total: 0, count: 0, details: [] };
      }
      stats[nom].total += parseFloat(String(recup.frais_recuperation)) || 0;
      stats[nom].count += 1;
      stats[nom].details.push(recup);
    });

    return stats;
  } catch {
    return {};
  }
};
