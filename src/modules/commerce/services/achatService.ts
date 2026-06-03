// @ts-nocheck
// src/modules/commerce/services/achatService.js
import { supabase, getCurrentCompany } from '@/lib/supabase';
import { createMouvementStock } from './stockService';

// ============ CRUD ACHATS ============

// Récupérer tous les achats
export const fetchAchats = async (filters = {}) => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = supabase
    .from('achats')
    .select('*')
    .eq('company_id', company.id)
    .order('date_achat', { ascending: false });

  if (filters.dateDebut) {
    query = query.gte('date_achat', filters.dateDebut);
  }
  if (filters.dateFin) {
    query = query.lte('date_achat', filters.dateFin);
  }
  if (filters.statut) {
    query = query.eq('statut', filters.statut);
  }
  if (filters.fournisseur_nom) {
    query = query.ilike('fournisseur_nom', `%${filters.fournisseur_nom}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Récupérer un achat avec ses détails
export const fetchAchatWithDetails = async (id) => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data: achat, error: achatError } = await supabase
    .from('achats')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (achatError) throw achatError;

  const { data: details, error: detailsError } = await supabase
    .from('achat_details')
    .select(`
      *,
      produit:produits(id, nom, reference)
    `)
    .eq('achat_id', id);

  if (detailsError) throw detailsError;

  return { ...achat, details };
};

// Créer un nouvel achat
export const createAchat = async (achatData, details) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Calculer les totaux
  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const { data: achat, error: achatError } = await supabase
    .from('achats')
    .insert([{
      company_id: company.id,
      numero_commande: achatData.numero_commande || await generateNumeroCommande(),
      date_achat: achatData.date_achat || new Date().toISOString(),
      fournisseur_nom: achatData.fournisseur_nom,
      fournisseur_contact: achatData.fournisseur_contact,
      montant_ht: montantTotal,
      tva: achatData.tva || 0,
      montant_total: montantTotal + (achatData.tva || 0),
      montant_paye: achatData.montant_paye || 0,
      statut: achatData.statut || 'en_attente',
      notes: achatData.notes,
      created_by: achatData.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (achatError) throw achatError;

  // Créer les détails et mettre à jour le stock
  for (const item of details) {
    const { error: detailError } = await supabase
      .from('achat_details')
      .insert([{
        achat_id: achat.id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.sous_total
      }]);

    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, achat.id);
  }

  return achat;
};

// Mettre à jour un achat
export const updateAchat = async (id, achatData, details) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer l'ancien achat
  const oldAchat = await fetchAchatWithDetails(id);
  if (!oldAchat) throw new Error('Achat non trouvé');

  // Annuler l'ancien stock (diminuer car on annule l'ancien achat)
  for (const item of oldAchat.details) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  // Supprimer les anciens détails
  const { error: deleteDetailsError } = await supabase
    .from('achat_details')
    .delete()
    .eq('achat_id', id);
  
  if (deleteDetailsError) throw deleteDetailsError;

  // Calculer les nouveaux totaux
  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  // Mettre à jour l'achat
  const { error: achatError } = await supabase
    .from('achats')
    .update({
      date_achat: achatData.date_achat || new Date().toISOString(),
      fournisseur_nom: achatData.fournisseur_nom,
      fournisseur_contact: achatData.fournisseur_contact,
      montant_ht: montantTotal,
      tva: achatData.tva || 0,
      montant_total: montantTotal + (achatData.tva || 0),
      montant_paye: achatData.montant_paye || 0,
      notes: achatData.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('company_id', company.id);

  if (achatError) throw achatError;

  // Créer les nouveaux détails et mettre à jour le stock
  for (const item of details) {
    const { error: detailError } = await supabase
      .from('achat_details')
      .insert([{
        achat_id: id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.sous_total
      }]);

    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, id);
  }

  return true;
};

// Supprimer un achat
export const deleteAchat = async (id) => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  // Récupérer l'achat avec ses détails
  const achat = await fetchAchatWithDetails(id);
  if (!achat) throw new Error('Achat non trouvé');

  // Annuler le stock (diminuer car on annule l'achat)
  for (const item of achat.details) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  // Supprimer les détails
  const { error: deleteDetailsError } = await supabase
    .from('achat_details')
    .delete()
    .eq('achat_id', id);
  
  if (deleteDetailsError) throw deleteDetailsError;

  // Supprimer l'achat
  const { error } = await supabase
    .from('achats')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;
};

// Mettre à jour le stock après un achat
const updateStockAfterPurchase = async (produitId, quantite, achatId) => {
  const company = getCurrentCompany();
  
  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock, prix_achat')
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
    type: 'achat',
    quantite: quantite,
    reference_type: 'achat',
    reference_id: achatId,
    notes: `Achat #${achatId}`,
    date_mouvement: new Date().toISOString()
  });
};

// Annuler le stock après modification/suppression d'achat
const revertStockAfterUpdate = async (produitId, quantite, achatId) => {
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
    console.warn(`Stock potentiellement négatif pour le produit ${produitId}`);
  }

  await supabase
    .from('produits')
    .update({ 
      quantite_stock: Math.max(0, nouvelleQuantite),
      updated_at: new Date().toISOString()
    })
    .eq('id', produitId)
    .eq('company_id', company.id);

  await createMouvementStock({
    produit_id: produitId,
    type: 'sortie',
    quantite: quantite,
    reference_type: 'annulation_achat',
    reference_id: achatId,
    notes: `Annulation achat #${achatId}`,
    date_mouvement: new Date().toISOString()
  });
};

// Générer un numéro de commande unique
const generateNumeroCommande = async () => {
  const company = getCurrentCompany();
  const { data, error } = await supabase
    .from('achats')
    .select('numero_commande')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
  }

  const lastNum = data[0].numero_commande;
  const match = lastNum.match(/\d+$/);
  if (match) {
    const newNum = String(parseInt(match[0]) + 1).padStart(4, '0');
    return lastNum.replace(/\d+$/, newNum);
  }
  return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
};

// ============ STATISTIQUES ACHATS ============

// Total des achats par période
export const getTotalAchats = async (dateDebut, dateFin) => {
  const company = getCurrentCompany();
  if (!company) return 0;

  let query = supabase
    .from('achats')
    .select('montant_total')
    .eq('company_id', company.id);

  if (dateDebut) query = query.gte('date_achat', dateDebut);
  if (dateFin) query = query.lte('date_achat', dateFin);

  const { data, error } = await query;
  if (error) throw error;

  return data.reduce((sum, a) => sum + (a.montant_total || 0), 0);
};