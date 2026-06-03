// @ts-nocheck
// src/modules/commerce/services/venteService.js
import { supabase, getCurrentCompany } from '@/lib/supabase';
import { createMouvementStock } from './stockService';
import { cache } from '@/modules/shared/utils/cache';

// ============ CRUD VENTES ============

// Récupérer toutes les ventes (avec cache)
export const fetchVentes = async (filters = {}) => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_${company.id}_${JSON.stringify(filters)}`;
  
  return cache.get(cacheKey, async () => {
    let query = supabase
      .from('ventes')
      .select('*')
      .eq('company_id', company.id)
      .order('date_vente', { ascending: false });

    if (filters.dateDebut) {
      query = query.gte('date_vente', filters.dateDebut);
    }
    if (filters.dateFin) {
      query = query.lte('date_vente', filters.dateFin);
    }
    if (filters.statut) {
      query = query.eq('statut', filters.statut);
    }
    if (filters.client_nom) {
      query = query.ilike('client_nom', `%${filters.client_nom}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, 60000); // 1 minute de cache
};

// Récupérer une vente avec ses détails
export const fetchVenteWithDetails = async (id) => {
  const company = getCurrentCompany();
  if (!company) return null;

  const cacheKey = `vente_details_${company.id}_${id}`;
  
  return cache.get(cacheKey, async () => {
    // Récupérer la vente
    const { data: vente, error: venteError } = await supabase
      .from('ventes')
      .select('*')
      .eq('id', id)
      .eq('company_id', company.id)
      .single();

    if (venteError) throw venteError;

    // Récupérer les détails
    const { data: details, error: detailsError } = await supabase
      .from('vente_details')
      .select(`
        *,
        produit:produits(id, nom, reference, prix_vente)
      `)
      .eq('vente_id', id);

    if (detailsError) throw detailsError;

    return { ...vente, details: details || [] };
  }, 300000); // 5 minutes de cache
};

// Créer une nouvelle vente
export const createVente = async (venteData, details) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Calculer les totaux
  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  // Générer un numéro de facture
  const numeroFacture = await generateNumeroFacture();

  // Créer la vente
  const { data: vente, error: venteError } = await supabase
    .from('ventes')
    .insert([{
      company_id: company.id,
      numero_facture: numeroFacture,
      date_vente: venteData.date_vente || new Date().toISOString(),
      client_nom: venteData.client_nom,
      client_telephone: venteData.client_telephone,
      client_email: venteData.client_email,
      montant_ht: montantTotal,
      remise: remise,
      montant_total: montantFinal,
      montant_paye: venteData.montant_paye || 0,
      reste_a_payer: resteAPayer,
      statut: resteAPayer === 0 ? 'paye' : (venteData.montant_paye > 0 ? 'credit' : 'en_attente'),
      type_paiement: venteData.type_paiement,
      notes: venteData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (venteError) throw venteError;

  // Créer les détails et mettre à jour le stock
  for (const item of details) {
    // Ajouter le détail
    const { error: detailError } = await supabase
      .from('vente_details')
      .insert([{
        vente_id: vente.id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        remise_ligne: item.remise_ligne || 0,
        sous_total: item.sous_total
      }]);

    if (detailError) throw detailError;

    // Mettre à jour le stock (diminuer)
    await updateStockAfterSale(item.produit_id, item.quantite, vente.id);
  }

  // Invalider les caches
  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`ca_${company.id}`);
  
  return vente;
};

// Mettre à jour une vente
export const updateVente = async (id, venteData, details) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer l'ancienne vente
  const oldVente = await fetchVenteWithDetails(id);
  if (!oldVente) throw new Error('Vente non trouvée');

  // Restaurer l'ancien stock (annuler l'ancienne vente)
  for (const item of oldVente.details) {
    await restoreStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  // Supprimer les anciens détails
  const { error: deleteDetailsError } = await supabase
    .from('vente_details')
    .delete()
    .eq('vente_id', id);
  
  if (deleteDetailsError) throw deleteDetailsError;

  // Calculer les nouveaux totaux
  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  // Mettre à jour la vente
  const { error: venteError } = await supabase
    .from('ventes')
    .update({
      date_vente: venteData.date_vente || new Date().toISOString(),
      client_nom: venteData.client_nom,
      client_telephone: venteData.client_telephone,
      client_email: venteData.client_email,
      montant_ht: montantTotal,
      remise: remise,
      montant_total: montantFinal,
      montant_paye: venteData.montant_paye || 0,
      reste_a_payer: resteAPayer,
      statut: resteAPayer === 0 ? 'paye' : (venteData.montant_paye > 0 ? 'credit' : 'en_attente'),
      type_paiement: venteData.type_paiement,
      notes: venteData.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('company_id', company.id);

  if (venteError) throw venteError;

  // Créer les nouveaux détails et mettre à jour le stock
  for (const item of details) {
    const { error: detailError } = await supabase
      .from('vente_details')
      .insert([{
        vente_id: id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        remise_ligne: item.remise_ligne || 0,
        sous_total: item.sous_total
      }]);

    if (detailError) throw detailError;

    await updateStockAfterSale(item.produit_id, item.quantite, id);
  }

  // Invalider les caches
  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`vente_details_${company.id}_${id}`);
  cache.invalidate(`ca_${company.id}`);

  return true;
};

// Supprimer une vente
export const deleteVente = async (id) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer la vente avec ses détails
  const vente = await fetchVenteWithDetails(id);
  if (!vente) throw new Error('Vente non trouvée');

  // Restaurer le stock (annuler la vente)
  for (const item of vente.details) {
    await restoreStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  // Supprimer les détails
  const { error: deleteDetailsError } = await supabase
    .from('vente_details')
    .delete()
    .eq('vente_id', id);
  
  if (deleteDetailsError) throw deleteDetailsError;

  // Supprimer la vente
  const { error } = await supabase
    .from('ventes')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;

  // Invalider les caches
  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`ca_${company.id}`);
};

// ============ FONCTIONS STOCK ============

// Mettre à jour le stock après une vente
const updateStockAfterSale = async (produitId, quantite, venteId) => {
  const company = getCurrentCompany();
  
  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', company.id)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock - quantite;

  if (nouvelleQuantite < 0) {
    throw new Error(`Stock insuffisant pour le produit ${produitId}`);
  }

  await supabase
    .from('produits')
    .update({ 
      quantite_stock: nouvelleQuantite,
      updated_at: new Date().toISOString()
    })
    .eq('id', produitId)
    .eq('company_id', company.id);

  await createMouvementStock({
    produit_id: produitId,
    type: 'vente',
    quantite: quantite,
    reference_type: 'vente',
    reference_id: venteId,
    notes: `Vente #${venteId}`,
    date_mouvement: new Date().toISOString()
  });
};

// Restaurer le stock après modification/suppression
const restoreStockAfterUpdate = async (produitId, quantite, venteId) => {
  const company = getCurrentCompany();
  
  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', company.id)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock + quantite;

  await supabase
    .from('produits')
    .update({ 
      quantite_stock: nouvelleQuantite,
      updated_at: new Date().toISOString()
    })
    .eq('id', produitId)
    .eq('company_id', company.id);

  await createMouvementStock({
    produit_id: produitId,
    type: 'entree',
    quantite: quantite,
    reference_type: 'annulation_vente',
    reference_id: venteId,
    notes: `Annulation vente #${venteId}`,
    date_mouvement: new Date().toISOString()
  });
};

// ============ UTILITAIRES ============

// Générer un numéro de facture unique
const generateNumeroFacture = async () => {
  const company = getCurrentCompany();
  const { data, error } = await supabase
    .from('ventes')
    .select('numero_facture')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    const year = new Date().getFullYear().toString().slice(-2);
    return `FACT-${year}-0001`;
  }

  const lastNum = data[0].numero_facture;
  const match = lastNum.match(/\d+$/);
  if (match) {
    const newNum = String(parseInt(match[0]) + 1).padStart(4, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    return `FACT-${year}-${newNum}`;
  }
  
  const year = new Date().getFullYear().toString().slice(-2);
  return `FACT-${year}-0001`;
};

// ============ STATISTIQUES ============

// Chiffre d'affaires par période (avec cache)
export const getCA = async (dateDebut, dateFin) => {
  const company = getCurrentCompany();
  if (!company) return 0;

  const cacheKey = `ca_${company.id}_${dateDebut}_${dateFin}`;
  
  return cache.get(cacheKey, async () => {
    let query = supabase
      .from('ventes')
      .select('montant_total')
      .eq('company_id', company.id)
      .eq('statut', 'paye');

    if (dateDebut) query = query.gte('date_vente', dateDebut);
    if (dateFin) query = query.lte('date_vente', dateFin);

    const { data, error } = await query;
    if (error) throw error;

    return data.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  }, 300000); // 5 minutes
};

// Top produits vendus (version avec fonction SQL)
export const getTopProduits = async (limit = 10, dateDebut, dateFin) => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `top_produits_${company.id}_${dateDebut}_${dateFin}_${limit}`;
  
  return cache.get(cacheKey, async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const startDate = dateDebut || firstDayOfMonth;
      const endDate = dateFin || today;

      const { data, error } = await supabase
        .rpc('get_top_produits', {
          p_company_id: company.id,
          p_date_debut: startDate,
          p_date_fin: endDate,
          p_limit: limit
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur getTopProduits:', error);
      return [];
    }
  }, 300000); // 5 minutes
};

// Ventes par jour
export const getVentesByDay = async (date) => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_day_${company.id}_${date}`;
  
  return cache.get(cacheKey, async () => {
    const { data, error } = await supabase
      .from('ventes')
      .select('*')
      .eq('company_id', company.id)
      .eq('date_vente', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, 60000); // 1 minute
};

// Ventes par mois
export const getVentesByMonth = async (annee, mois) => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_month_${company.id}_${annee}_${mois}`;
  
  return cache.get(cacheKey, async () => {
    const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const dateFin = `${annee}-${String(mois).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('ventes')
      .select('*')
      .eq('company_id', company.id)
      .gte('date_vente', dateDebut)
      .lte('date_vente', dateFin)
      .order('date_vente', { ascending: false });

    if (error) throw error;
    return data || [];
  }, 300000); // 5 minutes
};

// Nombre de ventes par statut
export const getVentesStats = async () => {
  const company = getCurrentCompany();
  if (!company) return { paye: 0, credit: 0, en_attente: 0, annule: 0 };

  const cacheKey = `ventes_stats_${company.id}`;
  
  return cache.get(cacheKey, async () => {
    const { data, error } = await supabase
      .from('ventes')
      .select('statut')
      .eq('company_id', company.id);

    if (error) throw error;

    const stats = {
      paye: 0,
      credit: 0,
      en_attente: 0,
      annule: 0
    };

    (data || []).forEach(v => {
      if (stats[v.statut] !== undefined) stats[v.statut]++;
    });

    return stats;
  }, 300000); // 5 minutes
};