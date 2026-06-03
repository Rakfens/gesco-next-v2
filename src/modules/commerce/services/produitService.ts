// @ts-nocheck
// src/modules/commerce/services/produitService.js
import { supabase, getCurrentCompany } from '@/lib/supabase';

// ============ CRUD PRODUITS ============

// Récupérer tous les produits de la société actuelle
export const fetchProduits = async (filters = {}) => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = supabase
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .order('nom');

  if (filters.categorie) {
    query = query.eq('categorie', filters.categorie);
  }
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters.search) {
    query = query.or(`nom.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
  }
  if (filters.stockBas) {
    const { data: allProducts } = await query;
    return allProducts.filter(p => p.quantite_stock <= p.stock_minimum);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Récupérer un produit par son ID
export const fetchProduitById = async (id) => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (error) throw error;
  return data;
};

// Récupérer un produit par sa référence
export const fetchProduitByReference = async (reference) => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('reference', reference)
    .eq('company_id', company.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Créer un nouveau produit
export const createProduit = async (produitData) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await supabase
    .from('produits')
    .insert([{
      ...produitData,
      company_id: company.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mettre à jour un produit
export const updateProduit = async (id, updates) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await supabase
    .from('produits')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('company_id', company.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Supprimer un produit (soft delete)
export const deleteProduit = async (id) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { error } = await supabase
    .from('produits')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;
};

// Supprimer définitivement un produit
export const deleteProduitPermanent = async (id) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { error } = await supabase
    .from('produits')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;
};

// ============ STOCK PRODUITS ============

// Mettre à jour le stock manuellement
export const updateStock = async (id, nouvelleQuantite, raison = 'ajustement') => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const produit = await fetchProduitById(id);
  if (!produit) throw new Error('Produit non trouvé');

  const difference = nouvelleQuantite - produit.quantite_stock;

  const { error: updateError } = await supabase
    .from('produits')
    .update({ 
      quantite_stock: nouvelleQuantite,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('company_id', company.id);

  if (updateError) throw updateError;

  if (difference !== 0) {
    await createMouvementStock({
      produit_id: id,
      type: 'ajustement',
      quantite: Math.abs(difference),
      notes: `${raison} : ${difference > 0 ? '+' : ''}${difference}`,
      date_mouvement: new Date().toISOString()
    });
  }
};

// Vérifier les stocks bas
export const getAlertesStockBas = async () => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  return data.filter(produit => produit.quantite_stock <= produit.stock_minimum);
};

// ============ CATÉGORIES ============

// Récupérer toutes les catégories
export const fetchCategories = async () => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await supabase
    .from('produits')
    .select('categorie')
    .eq('company_id', company.id)
    .not('categorie', 'is', null);

  if (error) throw error;
  
  const categories = [...new Set(data.map(p => p.categorie).filter(Boolean))];
  return categories.sort();
};

// ============ STATISTIQUES ============

// Compter les produits par catégorie
export const countProduitsByCategorie = async () => {
  const company = getCurrentCompany();
  if (!company) return {};

  const { data, error } = await supabase
    .from('produits')
    .select('categorie')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  const counts = {};
  data.forEach(p => {
    const cat = p.categorie || 'Sans catégorie';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
};

// Valeur totale du stock
export const getValeurTotaleStock = async () => {
  const company = getCurrentCompany();
  if (!company) return 0;

  const { data, error } = await supabase
    .from('produits')
    .select('quantite_stock, prix_achat')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  const total = data.reduce((sum, p) => sum + ((p.quantite_stock || 0) * (p.prix_achat || 0)), 0);
  return total;
};

// ============ MOUVEMENTS DE STOCK ============

// Créer un mouvement de stock
export const createMouvementStock = async (mouvementData) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await supabase
    .from('mouvements_stock')
    .insert([{
      ...mouvementData,
      company_id: company.id,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Récupérer l'historique des mouvements d'un produit
export const getMouvementsByProduit = async (produitId, limit = 50) => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await supabase
    .from('mouvements_stock')
    .select('*')
    .eq('produit_id', produitId)
    .eq('company_id', company.id)
    .order('date_mouvement', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};