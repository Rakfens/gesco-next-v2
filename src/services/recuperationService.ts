import { supabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Recuperation {
  id?: number;
  date: string;
  livreur_id?: number | string | null;
  livreur_nom: string;
  client_donneur: string;
  frais_recuperation: number;
  company_id?: number | string;
  created_at?: string;
}

export interface RecuperationStats {
  livreur_nom: string;
  total: number;
  count: number;
  details: Recuperation[];
}

export interface RecuperationTotal {
  total: number;
  count: number;
  details?: Recuperation[];
}

// ============ REQUÊTES DE BASE ============

export const fetchRecuperations = async (companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('recuperations')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getRecuperationsByDate = async (date: string, companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('recuperations')
    .select('*')
    .eq('company_id', companyId)
    .eq('date', date)
    .order('livreur_nom');
  if (error) throw error;
  return data || [];
};

export const getRecuperationsByMonth = async (mois: string, companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId) return [];
  const parts = mois.split('-');
  const year = parts[0];
  const month = parts[1];
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month}-${lastDay}`;

  const { data, error } = await supabase
    .from('recuperations')
    .select('*')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addRecuperation = async (recuperation: Recuperation, companyId: string | number): Promise<Recuperation> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  if (!recuperation.date) throw new Error('La date est requise');
  if (!recuperation.livreur_nom) throw new Error('Le livreur_nom est requis');
  if (!recuperation.client_donneur) throw new Error('Le client_donneur est requis');

  const insertData = {
    date: recuperation.date,
    livreur_id: recuperation.livreur_id || null,
    livreur_nom: recuperation.livreur_nom,
    client_donneur: recuperation.client_donneur,
    frais_recuperation: parseFloat(recuperation.frais_recuperation as unknown as string) || 1000,
    company_id: companyId,
  };

  const { data, error } = await supabase
    .from('recuperations')
    .insert([insertData])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateRecuperation = async (id: number, updates: Partial<Recuperation>, companyId: string | number): Promise<Recuperation> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  const { data, error } = await supabase
    .from('recuperations')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId)
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteRecuperation = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');
  const { error } = await supabase
    .from('recuperations')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

// ============ REQUÊTES SPÉCIFIQUES ============

export const getRecuperationsByLivreur = async (livreurId: string | number, mois: string | null, companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId || !livreurId) return [];

  let query = supabase
    .from('recuperations')
    .select('*')
    .eq('livreur_id', livreurId)
    .eq('company_id', companyId);

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
};

export const getRecuperationsByLivreurNom = async (livreurNom: string, mois: string | null, companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId || !livreurNom) return [];

  let query = supabase
    .from('recuperations')
    .select('*')
    .eq('livreur_nom', livreurNom)
    .eq('company_id', companyId);

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
};

export const getTotalRecuperationsByLivreurNom = async (livreurNom: string, companyId: string | number): Promise<RecuperationTotal> => {
  if (!companyId || !livreurNom) return { total: 0, count: 0 };

  const { data, error } = await supabase
    .from('recuperations')
    .select('frais_recuperation, date, client_donneur, livreur_nom')
    .eq('livreur_nom', livreurNom)
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;

  const total = data.reduce((sum, r) => sum + (parseFloat(r.frais_recuperation as unknown as string) || 0), 0);
  const count = data.length;
  return { total, count, details: data };
};

export const getTotalRecuperationsByLivreur = async (livreurId: string | number, companyId: string | number): Promise<{ total: number; count: number }> => {
  if (!companyId || !livreurId) return { total: 0, count: 0 };

  const { data, error } = await supabase
    .from('recuperations')
    .select('frais_recuperation')
    .eq('livreur_id', livreurId)
    .eq('company_id', companyId);
  if (error) throw error;

  const total = data.reduce((sum, r) => sum + (parseFloat(r.frais_recuperation as unknown as string) || 0), 0);
  const count = data.length;
  return { total, count };
};

export const getAllRecuperationsByLivreurNom = async (livreurNom: string, companyId: string | number): Promise<Recuperation[]> => {
  if (!companyId || !livreurNom) return [];

  const { data, error } = await supabase
    .from('recuperations')
    .select('*')
    .eq('livreur_nom', livreurNom)
    .eq('company_id', companyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getRecuperationsStatsByMonth = async (mois: string, companyId: string | number): Promise<Record<string, RecuperationStats>> => {
  if (!companyId) return {};

  const parts = mois.split('-');
  const year = parts[0];
  const month = parts[1];
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month}-${lastDay}`;

  const { data, error } = await supabase
    .from('recuperations')
    .select('*')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;

  const stats: Record<string, RecuperationStats> = {};
  (data || []).forEach(recup => {
    const nom = recup.livreur_nom;
    if (!stats[nom]) {
      stats[nom] = { livreur_nom: nom, total: 0, count: 0, details: [] };
    }
    stats[nom].total += parseFloat(recup.frais_recuperation as unknown as string) || 0;
    stats[nom].count += 1;
    stats[nom].details.push(recup);
  });

  return stats;
};
