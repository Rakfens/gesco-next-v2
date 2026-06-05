import { supabase } from '@/lib/supabase';

// ============ TYPES ============

export interface AchatFilters {
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  fournisseur_nom?: string;
}

export interface AchatDetail {
  id?: number;
  achat_id?: number;
  produit_id: number;
  quantite: number;
  prix_unitaire: number;
  sous_total?: number;
  produit?: { id: number; nom: string; reference: string };
}

export interface Achat {
  id?: number;
  company_id?: number | string;
  numero_commande?: string;
  date_achat?: string;
  fournisseur_nom?: string;
  fournisseur_contact?: string;
  montant_ht?: number;
  tva?: number;
  montant_total?: number;
  montant_paye?: number;
  statut?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  details?: AchatDetail[];
}

// ============ CRUD ACHATS ============

export const fetchAchats = async (companyId: string | number, filters: AchatFilters = {}): Promise<Achat[]> => {
  if (!companyId) return [];

  let query = supabase
    .from('achats')
    .select('*')
    .eq('company_id', companyId)
    .order('date_achat', { ascending: false });

  if (filters.dateDebut) query = query.gte('date_achat', filters.dateDebut);
  if (filters.dateFin) query = query.lte('date_achat', filters.dateFin);
  if (filters.statut) query = query.eq('statut', filters.statut);
  if (filters.fournisseur_nom) query = query.ilike('fournisseur_nom', `%${filters.fournisseur_nom}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchAchatWithDetails = async (id: number, companyId: string | number): Promise<Achat | null> => {
  if (!companyId) return null;

  const { data: achat, error: achatError } = await supabase
    .from('achats')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  if (achatError) throw achatError;

  const { data: details, error: detailsError } = await supabase
    .from('achat_details')
    .select('*, produit:produits(id, nom, reference)')
    .eq('achat_id', id);
  if (detailsError) throw detailsError;

  return { ...achat, details };
};

export const createAchat = async (achatData: Partial<Achat>, details: AchatDetail[], companyId: string | number): Promise<Achat> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const { data: achat, error: achatError } = await supabase
    .from('achats')
    .insert([{
      company_id: companyId,
      numero_commande: achatData.numero_commande || await generateNumeroCommande(companyId),
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
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();
  if (achatError) throw achatError;

  for (const item of details) {
    const { error: detailError } = await supabase
      .from('achat_details')
      .insert([{
        achat_id: achat.id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.sous_total,
      }]);
    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, achat.id, companyId);
  }

  return achat;
};

export const updateAchat = async (id: number, achatData: Partial<Achat>, details: AchatDetail[], companyId: string | number): Promise<boolean> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const oldAchat = await fetchAchatWithDetails(id, companyId);
  if (!oldAchat) throw new Error('Achat non trouvé');

  for (const item of oldAchat.details || []) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id, companyId);
  }

  const { error: deleteDetailsError } = await supabase
    .from('achat_details')
    .delete()
    .eq('achat_id', id);
  if (deleteDetailsError) throw deleteDetailsError;

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('company_id', companyId);
  if (achatError) throw achatError;

  for (const item of details) {
    const { error: detailError } = await supabase
      .from('achat_details')
      .insert([{
        achat_id: id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        sous_total: item.sous_total,
      }]);
    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, id, companyId);
  }

  return true;
};

export const deleteAchat = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const achat = await fetchAchatWithDetails(id, companyId);
  if (!achat) throw new Error('Achat non trouvé');

  for (const item of achat.details || []) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id, companyId);
  }

  const { error: deleteDetailsError } = await supabase
    .from('achat_details')
    .delete()
    .eq('achat_id', id);
  if (deleteDetailsError) throw deleteDetailsError;

  const { error } = await supabase
    .from('achats')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) throw error;
};

// ============ FONCTIONS STOCK INTERNES ============

const updateStockAfterPurchase = async (produitId: number, quantite: number, achatId: number, companyId: string | number): Promise<void> => {
  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock, prix_achat')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();
  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock + quantite;

  await supabase
    .from('produits')
    .update({ quantite_stock: nouvelleQuantite, updated_at: new Date().toISOString() })
    .eq('id', produitId)
    .eq('company_id', companyId);

  await createMouvementStock({
    produit_id: produitId,
    type: 'achat',
    quantite: quantite,
    reference_type: 'achat',
    reference_id: achatId,
    notes: `Achat #${achatId}`,
    date_mouvement: new Date().toISOString(),
  }, companyId);
};

const revertStockAfterUpdate = async (produitId: number, quantite: number, achatId: number, companyId: string | number): Promise<void> => {
  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();
  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock - quantite;

  await supabase
    .from('produits')
    .update({ quantite_stock: Math.max(0, nouvelleQuantite), updated_at: new Date().toISOString() })
    .eq('id', produitId)
    .eq('company_id', companyId);

  await createMouvementStock({
    produit_id: produitId,
    type: 'sortie',
    quantite: quantite,
    reference_type: 'annulation_achat',
    reference_id: achatId,
    notes: `Annulation achat #${achatId}`,
    date_mouvement: new Date().toISOString(),
  }, companyId);
};

// ============ UTILITAIRES ============

const generateNumeroCommande = async (companyId: string | number): Promise<string> => {
  const { data, error } = await supabase
    .from('achats')
    .select('numero_commande')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
  }

  const lastNum = data[0].numero_commande;
  const match = lastNum?.match(/\d+$/);
  if (match) {
    const newNum = String(parseInt(match[0]) + 1).padStart(4, '0');
    return lastNum.replace(/\d+$/, newNum);
  }
  return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
};

// ============ MOUVEMENT DE STOCK (local) ============

const createMouvementStock = async (mouvementData: Record<string, unknown>, companyId: string | number): Promise<void> => {
  const { error } = await supabase
    .from('mouvements_stock')
    .insert([{ ...mouvementData, company_id: companyId, created_at: new Date().toISOString() }]);
  if (error) throw error;
};

// ============ STATISTIQUES ============

export const getTotalAchats = async (companyId: string | number, dateDebut?: string, dateFin?: string): Promise<number> => {
  if (!companyId) return 0;

  let query = supabase
    .from('achats')
    .select('montant_total')
    .eq('company_id', companyId);

  if (dateDebut) query = query.gte('date_achat', dateDebut);
  if (dateFin) query = query.lte('date_achat', dateFin);

  const { data, error } = await query;
  if (error) throw error;

  return data.reduce((sum, a) => sum + (a.montant_total || 0), 0);
};
