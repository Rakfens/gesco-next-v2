import { supabase } from './supabase';

// ============ TYPES ============

export interface MouvementStock {
  id?: number;
  produit_id: number;
  type: string;
  quantite: number;
  prix_unitaire?: number | null;
  montant_total?: number | null;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  date_mouvement?: string;
  company_id?: number | string;
  created_at?: string;
  produit?: { id: number; nom: string; reference: string };
}

export interface MouvementStockFilters {
  produit_id?: number;
  type?: string;
  dateDebut?: string;
  dateFin?: string;
  limit?: number;
}

export interface Inventaire {
  id?: number;
  company_id?: number | string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  notes?: string;
  created_at?: string;
}

export interface InventaireDetail {
  id?: number;
  inventaire_id: number;
  produit_id: number;
  quantite_theorique: number;
  quantite_reelle: number;
  ecart: number;
  statut: string;
  notes?: string;
}

// ============ MOUVEMENTS DE STOCK ============

export const createMouvementStock = async (mouvementData: MouvementStock, companyId: string | number): Promise<MouvementStock> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data, error } = await supabase
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
      company_id: companyId,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchMouvementsStock = async (companyId: string | number, filters: MouvementStockFilters = {}): Promise<MouvementStock[]> => {
  if (!companyId) return [];

  let query = supabase
    .from('mouvements_stock')
    .select('*, produit:produits(id, nom, reference)')
    .eq('company_id', companyId)
    .order('date_mouvement', { ascending: false });

  if (filters.produit_id) query = query.eq('produit_id', filters.produit_id);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.dateDebut) query = query.gte('date_mouvement', filters.dateDebut);
  if (filters.dateFin) query = query.lte('date_mouvement', filters.dateFin);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createMouvementStockManuel = async (mouvementData: MouvementStock, companyId: string | number): Promise<MouvementStock> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', mouvementData.produit_id)
    .eq('company_id', companyId)
    .single();

  if (produitError) throw produitError;

  let nouvelleQuantite = produit.quantite_stock;
  if (mouvementData.type === 'entree') {
    nouvelleQuantite += mouvementData.quantite;
  } else if (mouvementData.type === 'sortie') {
    nouvelleQuantite -= mouvementData.quantite;
  } else {
    throw new Error('Type de mouvement invalide');
  }

  if (nouvelleQuantite < 0) throw new Error('Stock insuffisant pour cette sortie');

  const { error: updateError } = await supabase
    .from('produits')
    .update({ quantite_stock: nouvelleQuantite, updated_at: new Date().toISOString() })
    .eq('id', mouvementData.produit_id)
    .eq('company_id', companyId);

  if (updateError) throw updateError;

  const { data, error } = await supabase
    .from('mouvements_stock')
    .insert([{
      ...mouvementData,
      company_id: companyId,
      date_mouvement: mouvementData.date_mouvement || new Date().toISOString(),
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============ INVENTAIRE ============

export const createInventaire = async (companyId: string | number, notes: string = ''): Promise<Inventaire> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data, error } = await supabase
    .from('inventaires')
    .insert([{
      company_id: companyId,
      date_debut: new Date().toISOString(),
      statut: 'en_cours',
      notes: notes,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getInventaireEnCours = async (companyId: string | number): Promise<Inventaire | null> => {
  if (!companyId) return null;

  const { data, error } = await supabase
    .from('inventaires')
    .select('*')
    .eq('company_id', companyId)
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const enregistrerComptage = async (
  inventaireId: number,
  produitId: number,
  quantiteReelle: number,
  companyId: string | number
): Promise<{ quantiteTheorique: number; quantiteReelle: number; ecart: number }> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();

  if (produitError) throw produitError;

  const quantiteTheorique = produit.quantite_stock;
  const ecart = quantiteReelle - quantiteTheorique;

  const { data: existing } = await supabase
    .from('inventaire_details')
    .select('id')
    .eq('inventaire_id', inventaireId)
    .eq('produit_id', produitId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('inventaire_details')
      .update({
        quantite_reelle: quantiteReelle,
        ecart: ecart,
        statut: ecart === 0 ? 'ok' : 'ecart',
        notes: `Écart: ${ecart > 0 ? '+' : ''}${ecart}`,
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('inventaire_details')
      .insert([{
        inventaire_id: inventaireId,
        produit_id: produitId,
        quantite_theorique: quantiteTheorique,
        quantite_reelle: quantiteReelle,
        ecart: ecart,
        statut: ecart === 0 ? 'ok' : 'ecart',
        notes: `Écart: ${ecart > 0 ? '+' : ''}${ecart}`,
      }]);

    if (error) throw error;
  }

  return { quantiteTheorique, quantiteReelle, ecart };
};

export const terminerInventaire = async (inventaireId: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data: ecarts, error: ecartsError } = await supabase
    .from('inventaire_details')
    .select('*')
    .eq('inventaire_id', inventaireId)
    .not('ecart', 'eq', 0);

  if (ecartsError) throw ecartsError;

  for (const ecart of ecarts || []) {
    await supabase
      .from('produits')
      .update({ quantite_stock: ecart.quantite_reelle, updated_at: new Date().toISOString() })
      .eq('id', ecart.produit_id)
      .eq('company_id', companyId);

    await supabase
      .from('mouvements_stock')
      .insert([{
        company_id: companyId,
        produit_id: ecart.produit_id,
        type: 'inventaire',
        quantite: Math.abs(ecart.ecart),
        notes: `Correction inventaire - Écart de ${ecart.ecart > 0 ? '+' : ''}${ecart.ecart}`,
        date_mouvement: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);
  }

  const { error } = await supabase
    .from('inventaires')
    .update({ date_fin: new Date().toISOString(), statut: 'termine' })
    .eq('id', inventaireId)
    .eq('company_id', companyId);

  if (error) throw error;
};

export const getInventaires = async (companyId: string | number): Promise<Inventaire[]> => {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('inventaires')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ============ ALERTES ET RAPPORTS ============

export const getRupturesStock = async (companyId: string | number): Promise<unknown[]> => {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('quantite_stock', 0);

  if (error) throw error;
  return data || [];
};

export const getStockBas = async (companyId: string | number): Promise<unknown[]> => {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .gt('quantite_stock', 0)
    .lte('quantite_stock', 10); // stock_minimum fallback

  if (error) throw error;
  return data || [];
};

export const getRotationStock = async (
  produitId: number,
  companyId: string | number,
  dateDebut?: string,
  dateFin?: string
): Promise<{ produitId: number; quantiteVendue: number; stockMoyen: number; rotation: string } | null> => {
  if (!companyId) return null;

  let query = supabase
    .from('vente_details')
    .select('quantite')
    .eq('ventes.company_id', companyId)
    .eq('produit_id', produitId);

  if (dateDebut) query = query.gte('ventes.date_vente', dateDebut);
  if (dateFin) query = query.lte('ventes.date_vente', dateFin);

  const { data: ventes, error: ventesError } = await query;
  if (ventesError) throw ventesError;

  const quantiteVendue = ventes.reduce((sum, v) => sum + v.quantite, 0);

  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('quantite_stock')
    .eq('id', produitId)
    .eq('company_id', companyId)
    .single();

  if (produitError) throw produitError;

  const stockMoyen = produit.quantite_stock;
  const rotation = stockMoyen > 0 ? quantiteVendue / stockMoyen : 0;

  return {
    produitId,
    quantiteVendue,
    stockMoyen,
    rotation: rotation.toFixed(2),
  };
};
