// @ts-nocheck
// modules/commerce/services/stockService.js
import { getSupabase, getCurrentCompany } from '@/lib/supabase';

// ============ MOUVEMENTS DE STOCK ============

// Créer un mouvement de stock (utilisé par ventes et achats)
export const createMouvementStock = async (mouvementData) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
    .from('mouvements_stock')
    .insert([{
      produit_id: mouvementData.produit_id,
      type: mouvementData.type,
      quantite: mouvementData.quantite,
      prix_unitaire: mouvementData.prix_unitaire || null,
      montant_total: mouvementData.montant_total || null,
      reference_type: mouvementData.reference_type || null,
      reference_id: mouvementData.reference_id || null,
      notes: mouvementData.notes || null,
      date_mouvement: mouvementData.date_mouvement || new Date().toISOString(),
      company_id: company.id,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Récupérer tous les mouvements de stock
export const fetchMouvementsStock = async (filters = {}) => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = getSupabase()
    .from('mouvements_stock')
    .select(`
      *,
      produit:produits(id, nom, reference)
    `)
    .eq('company_id', company.id)
    .order('date_mouvement', { ascending: false });

  if (filters.produit_id) {
    query = query.eq('produit_id', filters.produit_id);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.dateDebut) {
    query = query.gte('date_mouvement', filters.dateDebut);
  }
  if (filters.dateFin) {
    query = query.lte('date_mouvement', filters.dateFin);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Créer un mouvement de stock manuel
export const createMouvementStockManuel = async (mouvementData) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer le produit actuel
  const { data: produit, error: produitError } = await getSupabase()
    .from('produits')
    .select('quantite_stock')
    .eq('id', mouvementData.produit_id)
    .eq('company_id', company.id)
    .single();

  if (produitError) throw produitError;

  // Calculer la nouvelle quantité
  let nouvelleQuantite = produit.quantite_stock;
  if (mouvementData.type === 'entree') {
    nouvelleQuantite += mouvementData.quantite;
  } else if (mouvementData.type === 'sortie') {
    nouvelleQuantite -= mouvementData.quantite;
  } else {
    throw new Error('Type de mouvement invalide');
  }

  if (nouvelleQuantite < 0) {
    throw new Error('Stock insuffisant pour cette sortie');
  }

  // Mettre à jour le produit
  const { error: updateError } = await getSupabase()
    .from('produits')
    .update({ 
      quantite_stock: nouvelleQuantite,
      updated_at: new Date().toISOString()
    })
    .eq('id', mouvementData.produit_id)
    .eq('company_id', company.id);

  if (updateError) throw updateError;

  // Créer le mouvement
  const { data, error } = await getSupabase()
    .from('mouvements_stock')
    .insert([{
      ...mouvementData,
      company_id: company.id,
      date_mouvement: mouvementData.date_mouvement || new Date().toISOString(),
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============ INVENTAIRE ============

// Créer un nouvel inventaire
export const createInventaire = async (notes = '') => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
    .from('inventaires')
    .insert([{
      company_id: company.id,
      date_debut: new Date().toISOString(),
      statut: 'en_cours',
      notes: notes,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Récupérer l'inventaire en cours
export const getInventaireEnCours = async () => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await getSupabase()
    .from('inventaires')
    .select('*')
    .eq('company_id', company.id)
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Enregistrer un comptage d'inventaire
export const enregistrerComptage = async (inventaireId, produitId, quantiteReelle) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer la quantité théorique
  const { data: produit, error: produitError } = await getSupabase()
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', company.id)
    .single();

  if (produitError) throw produitError;

  const quantiteTheorique = produit.quantite_stock;
  const ecart = quantiteReelle - quantiteTheorique;

  // Vérifier si le produit a déjà été compté
  const { data: existing, error: existingError } = await getSupabase()
    .from('inventaire_details')
    .select('id')
    .eq('inventaire_id', inventaireId)
    .eq('produit_id', produitId)
    .maybeSingle();

  if (existing) {
    // Mettre à jour
    const { error } = await getSupabase()
      .from('inventaire_details')
      .update({
        quantite_reelle: quantiteReelle,
        ecart: ecart,
        statut: ecart === 0 ? 'ok' : 'ecart',
        notes: `Écart: ${ecart > 0 ? '+' : ''}${ecart}`
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Créer
    const { error } = await getSupabase()
      .from('inventaire_details')
      .insert([{
        inventaire_id: inventaireId,
        produit_id: produitId,
        quantite_theorique: quantiteTheorique,
        quantite_reelle: quantiteReelle,
        ecart: ecart,
        statut: ecart === 0 ? 'ok' : 'ecart',
        notes: `Écart: ${ecart > 0 ? '+' : ''}${ecart}`
      }]);

    if (error) throw error;
  }

  return { quantiteTheorique, quantiteReelle, ecart };
};

// Terminer l'inventaire et appliquer les corrections
export const terminerInventaire = async (inventaireId) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer tous les écarts
  const { data: ecarts, error: ecartsError } = await getSupabase()
    .from('inventaire_details')
    .select('*')
    .eq('inventaire_id', inventaireId)
    .not('ecart', 'eq', 0);

  if (ecartsError) throw ecartsError;

  // Appliquer les corrections
  for (const ecart of ecarts) {
    const nouvelleQuantite = ecart.quantite_reelle;

    // Mettre à jour le produit
    await getSupabase()
      .from('produits')
      .update({ 
        quantite_stock: nouvelleQuantite,
        updated_at: new Date().toISOString()
      })
      .eq('id', ecart.produit_id)
      .eq('company_id', company.id);

    // Créer un mouvement de stock pour justifier l'écart
    await getSupabase()
      .from('mouvements_stock')
      .insert([{
        company_id: company.id,
        produit_id: ecart.produit_id,
        type: 'inventaire',
        quantite: Math.abs(ecart.ecart),
        notes: `Correction inventaire - Écart de ${ecart.ecart > 0 ? '+' : ''}${ecart.ecart}`,
        date_mouvement: new Date().toISOString(),
        created_at: new Date().toISOString()
      }]);
  }

  // Marquer l'inventaire comme terminé
  const { error } = await getSupabase()
    .from('inventaires')
    .update({
      date_fin: new Date().toISOString(),
      statut: 'termine'
    })
    .eq('id', inventaireId)
    .eq('company_id', company.id);

  if (error) throw error;
};

// Récupérer l'historique des inventaires
export const getInventaires = async () => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('inventaires')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// ============ ALERTES ET RAPPORTS ============

// Récupérer les produits en rupture de stock
export const getRupturesStock = async () => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .eq('quantite_stock', 0);

  if (error) throw error;
  return data;
};

// Récupérer les produits avec stock bas
export const getStockBas = async () => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .gt('quantite_stock', 0);

  if (error) throw error;

  // Filtrer côté client car getSupabase().raw() n'est pas supporté côté JS
  return (data || []).filter(p => p.quantite_stock <= (p.stock_minimum || 0));
};

// Rapport de rotation de stock
export const getRotationStock = async (produitId, dateDebut, dateFin) => {
  const company = getCurrentCompany();
  if (!company) return null;

  // Récupérer les ventes de la période via jointure explicite
  let query = getSupabase()
    .from('vente_details')
    .select('quantite, ventes!inner(company_id)')
    .eq('ventes.company_id', company.id)
    .eq('produit_id', produitId);

  if (dateDebut) query = query.gte('ventes.date_vente', dateDebut);
  if (dateFin) query = query.lte('ventes.date_vente', dateFin);

  const { data: ventes, error: ventesError } = await query;
  if (ventesError) throw ventesError;

  const quantiteVendue = (ventes || []).reduce((sum, v) => sum + v.quantite, 0);

  // Récupérer le stock moyen
  const { data: produit, error: produitError } = await getSupabase()
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', company.id)
    .single();

  if (produitError) throw produitError;

  const stockMoyen = produit.quantite_stock;
  const rotation = stockMoyen > 0 ? quantiteVendue / stockMoyen : 0;

  return {
    produitId,
    quantiteVendue,
    stockMoyen,
    rotation: rotation.toFixed(2)
  };
};