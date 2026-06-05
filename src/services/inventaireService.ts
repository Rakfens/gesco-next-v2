import { supabase } from './supabase';

// ============ TYPES ============

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
  produit?: { id: number; nom: string; reference: string; categorie: string; unite?: string };
}

export interface InventaireWithDetails extends Inventaire {
  details: InventaireDetail[];
  stats: {
    total_products: number;
    products_with_difference: number;
    total_difference: number;
    accuracy_rate: string;
  };
}

export interface RecordCountResult {
  id?: number;
  inventaire_id: number;
  produit_id: number;
  quantite_theorique: number;
  quantite_reelle: number;
  ecart: number;
  statut: string;
  notes?: string;
  product_name: string;
  product_reference: string;
  theoretical_quantity: number;
}

// ============ INVENTAIRE COURANT ============

export const getCurrentInventory = async (companyId: string | number): Promise<Inventaire | null> => {
  if (!companyId) return null;

  const { data, error } = await supabase
    .from('inventaires')
    .select('*')
    .eq('company_id', companyId)
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error && error.code !== 'PGRST116') throw error;
  return data && data.length > 0 ? data[0] : null;
};

export const startInventory = async (companyId: string | number, notes: string = ''): Promise<Inventaire> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const current = await getCurrentInventory(companyId);
  if (current) {
    throw new Error("Un inventaire est déjà en cours. Terminez-le avant d'en commencer un nouveau.");
  }

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

// ============ COMPTAGE ============

export const recordCount = async (
  inventoryId: number,
  productId: number,
  actualQuantity: number,
  companyId: string | number,
  notes: string = ''
): Promise<RecordCountResult> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data: product, error: productError } = await supabase
    .from('produits')
    .select('quantite_stock, nom, reference')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single();

  if (productError) throw productError;

  const theoreticalQuantity = product.quantite_stock;
  const difference = actualQuantity - theoreticalQuantity;

  const { data: existing } = await supabase
    .from('inventaire_details')
    .select('id')
    .eq('inventaire_id', inventoryId)
    .eq('produit_id', productId)
    .maybeSingle();

  let result;

  if (existing) {
    const { data, error } = await supabase
      .from('inventaire_details')
      .update({
        quantite_reelle: actualQuantity,
        ecart: difference,
        statut: difference === 0 ? 'ok' : 'ecart',
        notes: notes,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('inventaire_details')
      .insert([{
        inventaire_id: inventoryId,
        produit_id: productId,
        quantite_theorique: theoreticalQuantity,
        quantite_reelle: actualQuantity,
        ecart: difference,
        statut: difference === 0 ? 'ok' : 'ecart',
        notes: notes,
      }])
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  return {
    ...result,
    product_name: product.nom,
    product_reference: product.reference,
    theoretical_quantity: theoreticalQuantity,
  };
};

export const finishInventory = async (
  inventoryId: number,
  companyId: string | number
): Promise<{ success: boolean; corrections_appliquees: number }> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data: differences, error: diffError } = await supabase
    .from('inventaire_details')
    .select('*')
    .eq('inventaire_id', inventoryId)
    .not('ecart', 'eq', 0);

  if (diffError) throw diffError;

  for (const diff of differences || []) {
    await supabase
      .from('produits')
      .update({ quantite_stock: diff.quantite_reelle, updated_at: new Date().toISOString() })
      .eq('id', diff.produit_id)
      .eq('company_id', companyId);

    await supabase
      .from('mouvements_stock')
      .insert([{
        company_id: companyId,
        produit_id: diff.produit_id,
        type: 'inventaire',
        quantite: Math.abs(diff.ecart),
        notes: `Correction inventaire - Écart de ${diff.ecart > 0 ? '+' : ''}${diff.ecart}`,
        date_mouvement: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);
  }

  const { error } = await supabase
    .from('inventaires')
    .update({ date_fin: new Date().toISOString(), statut: 'termine' })
    .eq('id', inventoryId)
    .eq('company_id', companyId);

  if (error) throw error;

  return {
    success: true,
    corrections_appliquees: differences?.length || 0,
  };
};

// ============ HISTORIQUE ET DÉTAILS ============

export const getInventoryHistory = async (companyId: string | number, limit: number = 50): Promise<Inventaire[]> => {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('inventaires')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getInventoryDetails = async (inventoryId: number, companyId: string | number): Promise<InventaireWithDetails | null> => {
  if (!companyId) return null;

  const { data: inventory, error: invError } = await supabase
    .from('inventaires')
    .select('*')
    .eq('id', inventoryId)
    .eq('company_id', companyId)
    .single();

  if (invError) throw invError;

  const { data: details, error: detailsError } = await supabase
    .from('inventaire_details')
    .select('*, produit:produits(id, nom, reference, categorie, unite)')
    .eq('inventaire_id', inventoryId)
    .order('produit_id');

  if (detailsError) throw detailsError;

  const totalProducts = details?.length || 0;
  const productsWithDifference = details?.filter(d => d.ecart !== 0).length || 0;
  const totalDifference = details?.reduce((sum, d) => sum + Math.abs(d.ecart), 0) || 0;

  return {
    ...inventory,
    details: details || [],
    stats: {
      total_products: totalProducts,
      products_with_difference: productsWithDifference,
      total_difference: totalDifference,
      accuracy_rate: totalProducts > 0
        ? ((totalProducts - productsWithDifference) / totalProducts * 100).toFixed(2)
        : '100',
    },
  };
};

// ============ PRODUITS COMPTÉS / NON COMPTÉS ============

export const getCountedProducts = async (inventoryId: number, companyId: string | number): Promise<InventaireDetail[]> => {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('inventaire_details')
    .select('*, produit:produits(id, nom, reference, categorie)')
    .eq('inventaire_id', inventoryId);

  if (error) throw error;
  return data || [];
};

export const getUncountedProducts = async (
  inventoryId: number,
  companyId: string | number,
  categorie?: string
): Promise<unknown[]> => {
  if (!companyId) return [];

  const { data: counted, error: countedError } = await supabase
    .from('inventaire_details')
    .select('produit_id')
    .eq('inventaire_id', inventoryId);

  if (countedError) throw countedError;

  const countedIds = counted?.map(c => c.produit_id) || [];

  let query = supabase
    .from('produits')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('nom');

  if (categorie) query = query.eq('categorie', categorie);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).filter(p => !countedIds.includes(p.id));
};
