// @ts-nocheck
// src/modules/livraison/services/recuperationService.js
import { getSupabase, getCurrentCompany } from '@/lib/supabase';

// ==================== REQUÊTES DE BASE ====================

// Récupérer toutes les récupérations de la société actuelle
export const fetchRecuperations = async (companyId) => {
  try {
    if (!companyId) return [];
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
};

// Récupérer les récupérations par date
export const getRecuperationsByDate = async (date) => {
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
  } catch (error) {
    return [];
  }
};

// Récupérer les récupérations par mois (version corrigée sans ilike)
export const getRecuperationsByMonth = async (mois, companyId) => {
  try {
    if (!companyId) return [];

    
    // Convertir le mois en plage de dates
    const parts = mois.split('-');
    const year = parts[0];
    const month = parts[1];
    const startDate = `${year}-${month}-01`;
    
    // Calculer le dernier jour du mois
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
    
    
    if (data && data.length > 0) {
      const dates = data.map(r => r.date);
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
};

// Ajouter une récupération
export const addRecuperation = async (recuperation) => {
  try {
    const company = getCurrentCompany();
    if (!company) throw new Error('Aucune société sélectionnée');

    
    // Validation des données
    if (!recuperation.date) throw new Error('La date est requise');
    if (!recuperation.livreur_nom) throw new Error('Le livreur_nom est requis');
    if (!recuperation.client_donneur) throw new Error('Le client_donneur est requis');
    
    const insertData = {
      date: recuperation.date,
      livreur_id: recuperation.livreur_id || null,
      livreur_nom: recuperation.livreur_nom,
      client_donneur: recuperation.client_donneur,
      frais_recuperation: parseFloat(recuperation.frais_recuperation) || 1000,
      company_id: company.id
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

// Mettre à jour une récupération
export const updateRecuperation = async (id, updates) => {
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

// Supprimer une récupération
export const deleteRecuperation = async (id) => {
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

// Récupérer les récupérations par livreur (par ID)
export const getRecuperationsByLivreur = async (livreurId, mois) => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];

    
    if (!livreurId) {
      return [];
    }
    
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
  } catch (error) {
    return [];
  }
};

// Récupérer les récupérations par livreur (par nom)
export const getRecuperationsByLivreurNom = async (livreurNom, mois) => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];

    
    if (!livreurNom) {
      return [];
    }
    
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
    
    
    if (data && data.length > 0) {
      data.forEach(recup => {
      });
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
};

// Total cumulé des récupérations par livreur (par nom)
export const getTotalRecuperationsByLivreurNom = async (livreurNom) => {
  try {
    const company = getCurrentCompany();
    if (!company) return { total: 0, count: 0 };
    
    
    if (!livreurNom) {
      return { total: 0, count: 0 };
    }
    
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('frais_recuperation, date, client_donneur')
      .eq('livreur_nom', livreurNom)
      .eq('company_id', company.id)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    const total = data.reduce((sum, r) => sum + (parseFloat(r.frais_recuperation) || 0), 0);
    const count = data.length;
    
    
    if (data && data.length > 0) {
      data.forEach(recup => {
      });
    }
    
    return { total, count, details: data };
  } catch (error) {
    return { total: 0, count: 0, details: [] };
  }
};

// Total cumulé des récupérations par livreur (par ID)
export const getTotalRecuperationsByLivreur = async (livreurId) => {
  try {
    const company = getCurrentCompany();
    if (!company) return { total: 0, count: 0 };
    
    
    if (!livreurId) {
      return { total: 0, count: 0 };
    }
    
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('frais_recuperation')
      .eq('livreur_id', livreurId)
      .eq('company_id', company.id);
    
    if (error) throw error;
    
    const total = data.reduce((sum, r) => sum + (parseFloat(r.frais_recuperation) || 0), 0);
    const count = data.length;
    
    return { total, count };
  } catch (error) {
    return { total: 0, count: 0 };
  }
};

// Récupérer toutes les récupérations d'un livreur par nom
export const getAllRecuperationsByLivreurNom = async (livreurNom) => {
  try {
    const company = getCurrentCompany();
    if (!company) return [];
    
    
    if (!livreurNom) {
      return [];
    }
    
    const { data, error } = await getSupabase()
      .from('recuperations')
      .select('*')
      .eq('livreur_nom', livreurNom)
      .eq('company_id', company.id)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    return [];
  }
};

// Statistiques des récupérations par mois
export const getRecuperationsStatsByMonth = async (mois) => {
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
    
    // Grouper par livreur
    const stats = {};
    (data || []).forEach(recup => {
      const nom = recup.livreur_nom;
      if (!stats[nom]) {
        stats[nom] = {
          livreur_nom: nom,
          total: 0,
          count: 0,
          details: []
        };
      }
      stats[nom].total += parseFloat(recup.frais_recuperation) || 0;
      stats[nom].count += 1;
      stats[nom].details.push(recup);
    });
    
    return stats;
  } catch (error) {
    return {};
  }
};