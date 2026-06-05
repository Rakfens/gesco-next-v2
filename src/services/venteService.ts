import { getSupabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Vente {
  id?: number;
  company_id?: number | string;
  numero_facture?: string;
  date_vente: string;
  client_nom?: string;
  client_telephone?: string;
  client_email?: string;
  montant_ht?: number;
  remise?: number;
  montant_total?: number;
  montant_paye?: number;
  reste_a_payer?: number;
  statut?: string;
  type_paiement?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  details?: VenteDetail[];
}

export interface VenteDetail {
  id?: number;
  vente_id?: number;
  produit_id: number;
  quantite: number;
  prix_unitaire: number;
  remise_ligne?: number;
  sous_total?: number;
  produit?: { id: number; nom: string; reference: string; prix_vente: number };
}

export interface VenteFilters {
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  client_nom?: string;
}

export interface VentesStats {
  paye: number;
  credit: number;
  en_attente: number;
  annule: number;
}

// ============ CRUD VENTES ============

export const fetchVentes = async (companyId: string | number, filters: VenteFilters = {}): Promise<Vente[]> => {
  if (!companyId) return [];

  let query = getSupabase()
    .from('ventes')
    .select('*')
    .eq('company_id', companyId)
    .order('date_vente', { ascending: false });

  if (filters.dateDebut) query = query.gte('date_vente', filters.dateDebut);
  if (filters.dateFin) query = query.lte('date_vente', filters.dateFin);
  if (filters.statut) query = query.eq('statut', filters.statut);
  if (filters.client_nom) query = query.ilike('client_nom', `%${filters.client_nom}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchVenteWithDetails = async (id: number, companyId: string | number): Promise<Vente | null> => {
  if (!companyId) return null;

  const { data: vente, error: venteError } = await getSupabase()
    .from('ventes')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();

  if (venteError) throw venteError;

  const { data: details, error: detailsError } = await getSupabase()
    .from('vente_details')
    .select('*, produit:produits(id, nom, reference, prix_vente)')
    .eq('vente_id', id);

  if (detailsError) throw detailsError;

  return { ...vente, details: details || [] };
};

export const createVente = async (
  venteData: Partial<Vente>,
  details: VenteDetail[],
  companyId: string | number
): Promise<Vente> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  const { data: vente, error: venteError } = await getSupabase()
    .from('ventes')
    .insert([{
      company_id: companyId,
      date_vente: venteData.date_vente || new Date().toISOString(),
      client_nom: venteData.client_nom,
      client_telephone: venteData.client_telephone,
      client_email: venteData.client_email,
      montant_ht: montantTotal,
      remise: remise,
      montant_total: montantFinal,
      montant_paye: venteData.montant_paye || 0,
      reste_a_payer: resteAPayer,
      statut: resteAPayer === 0 ? 'paye' : (venteData.montant_paye && venteData.montant_paye > 0 ? 'credit' : 'en_attente'),
      type_paiement: venteData.type_paiement,
      notes: venteData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (venteError) throw venteError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from('vente_details')
      .insert([{
        vente_id: vente.id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        remise_ligne: item.remise_ligne || 0,
        sous_total: item.sous_total,
      }]);

    if (detailError) throw detailError;

    // Mettre à jour le stock (diminuer)
    await updateStockAfterSale(item.produit_id, item.quantite, vente.id, companyId);
  }

  return vente;
};

export const updateVente = async (
  id: number,
  venteData: Partial<Vente>,
  details: VenteDetail[],
  companyId: string | number
): Promise<boolean> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const oldVente = await fetchVenteWithDetails(id, companyId);
  if (!oldVente) throw new Error('Vente non trouvée');

  // Restaurer l'ancien stock
  for (const item of oldVente.details || []) {
    await restoreStockAfterUpdate(item.produit_id, item.quantite, id, companyId);
  }

  // Supprimer les anciens détails
  const { error: deleteDetailsError } = await getSupabase()
    .from('vente_details')
    .delete()
    .eq('vente_id', id);

  if (deleteDetailsError) throw deleteDetailsError;

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  const { error: venteError } = await getSupabase()
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
      statut: resteAPayer === 0 ? 'paye' : (venteData.montant_paye && venteData.montant_paye > 0 ? 'credit' : 'en_attente'),
      type_paiement: venteData.type_paiement,
      notes: venteData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('company_id', companyId);

  if (venteError) throw venteError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from('vente_details')
      .insert([{
        vente_id: id,
        produit_id: item.produit_id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
        remise_ligne: item.remise_ligne || 0,
        sous_total: item.sous_total,
      }]);

    if (detailError) throw detailError;
    await updateStockAfterSale(item.produit_id, item.quantite, id, companyId);
  }

  return true;
};

export const deleteVente = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const vente = await fetchVenteWithDetails(id, companyId);
  if (!vente) throw new Error('Vente non trouvée');

  for (const item of vente.details || []) {
    await restoreStockAfterUpdate(item.produit_id, item.quantite, id, companyId);
  }

  const { error: deleteDetailsError } = await getSupabase()
    .from('vente_details')
    .delete()
    .eq('vente_id', id);

  if (deleteDetailsError) throw deleteDetailsError;

  const { error } = await getSupabase()
    .from('ventes')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) throw error;
};

// ============ FONCTIONS STOCK INTERNES ============

const updateStockAfterSale = async (produitId: number, quantite: number, venteId: number, companyId: string | number): Promise<void> => {
  const { data: produit, error: produitError } = await getSupabase()
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock - quantite;
  if (nouvelleQuantite < 0) throw new Error(`Stock insuffisant pour le produit ${produitId}`);

  await getSupabase()
    .from('produits')
    .update({ quantite_stock: nouvelleQuantite, updated_at: new Date().toISOString() })
    .eq('id', produitId)
    .eq('company_id', companyId);

  await getSupabase()
    .from('mouvements_stock')
    .insert([{
      produit_id: produitId,
      type: 'vente',
      quantite: quantite,
      reference_type: 'vente',
      reference_id: venteId,
      notes: `Vente #${venteId}`,
      date_mouvement: new Date().toISOString(),
      company_id: companyId,
      created_at: new Date().toISOString(),
    }]);
};

const restoreStockAfterUpdate = async (produitId: number, quantite: number, venteId: number, companyId: string | number): Promise<void> => {
  const { data: produit, error: produitError } = await getSupabase()
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock + quantite;

  await getSupabase()
    .from('produits')
    .update({ quantite_stock: nouvelleQuantite, updated_at: new Date().toISOString() })
    .eq('id', produitId)
    .eq('company_id', companyId);

  await getSupabase()
    .from('mouvements_stock')
    .insert([{
      produit_id: produitId,
      type: 'entree',
      quantite: quantite,
      reference_type: 'annulation_vente',
      reference_id: venteId,
      notes: `Annulation vente #${venteId}`,
      date_mouvement: new Date().toISOString(),
      company_id: companyId,
      created_at: new Date().toISOString(),
    }]);
};

// ============ STATISTIQUES ============

export const getCA = async (companyId: string | number, dateDebut?: string, dateFin?: string): Promise<number> => {
  if (!companyId) return 0;

  let query = getSupabase()
    .from('ventes')
    .select('montant_total')
    .eq('company_id', companyId)
    .eq('statut', 'paye');

  if (dateDebut) query = query.gte('date_vente', dateDebut);
  if (dateFin) query = query.lte('date_vente', dateFin);

  const { data, error } = await query;
  if (error) throw error;

  return data.reduce((sum, v) => sum + (v.montant_total || 0), 0);
};

export const getTopProduits = async (
  companyId: string | number,
  limit: number = 10,
  dateDebut?: string,
  dateFin?: string
): Promise<unknown[]> => {
  if (!companyId) return [];

  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const startDate = dateDebut || firstDayOfMonth;
    const endDate = dateFin || today;

    const { data, error } = await getSupabase().rpc('get_top_produits', {
      p_company_id: companyId,
      p_date_debut: startDate,
      p_date_fin: endDate,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur getTopProduits:', error);
    return [];
  }
};

export const getVentesByDay = async (companyId: string | number, date: string): Promise<Vente[]> => {
  if (!companyId) return [];

  const { data, error } = await getSupabase()
    .from('ventes')
    .select('*')
    .eq('company_id', companyId)
    .eq('date_vente', date)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getVentesByMonth = async (companyId: string | number, annee: number, mois: number): Promise<Vente[]> => {
  if (!companyId) return [];

  const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const dateFin = `${annee}-${String(mois).padStart(2, '0')}-31`;

  const { data, error } = await getSupabase()
    .from('ventes')
    .select('*')
    .eq('company_id', companyId)
    .gte('date_vente', dateDebut)
    .lte('date_vente', dateFin)
    .order('date_vente', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getVentesStats = async (companyId: string | number): Promise<VentesStats> => {
  if (!companyId) return { paye: 0, credit: 0, en_attente: 0, annule: 0 };

  const { data, error } = await getSupabase()
    .from('ventes')
    .select('statut')
    .eq('company_id', companyId);

  if (error) throw error;

  const stats: VentesStats = { paye: 0, credit: 0, en_attente: 0, annule: 0 };
  (data || []).forEach((v) => {
    if (v.statut in stats) {
      stats[v.statut as keyof VentesStats]++;
    }
  });

  return stats;
};
