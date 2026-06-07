import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import type { Inventaire } from '@/modules/shared/types';

interface InventoryProduct {
  id: string;
  nom: string;
  reference: string;
  categorie?: string;
  quantite_stock: number;
  stock_minimum?: number;
  unite?: string;
}

interface InventoryDetail {
  id?: string;
  inventaire_id: string;
  produit_id: string;
  quantite_theorique: number;
  quantite_reelle: number;
  ecart: number;
  statut: string;
  notes?: string;
  produit?: InventoryProduct;
}

interface RecordCountResult extends InventoryDetail {
  product_name: string;
  product_reference: string;
  theoretical_quantity: number;
}

interface FinishResult {
  success: boolean;
  corrections_appliquees: number;
}

interface InventoryStats {
  total_products: number;
  products_with_difference: number;
  total_difference: number;
  accuracy_rate: string;
}

interface InventoryWithDetails extends Inventaire {
  details: InventoryDetail[];
  stats: InventoryStats;
}

export const getCurrentInventory = async (): Promise<Inventaire | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await getSupabase()
    .from('inventaires')
    .select('*')
    .eq('company_id', company.id)
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error && (error.code === 'PGRST116' || error.message?.includes('JSON object requested'))) {
    return null;
  }
  if (error) throw error;

  return (data && data.length > 0 ? data[0] : null) as Inventaire | null;
};

export const startInventory = async (notes: string = ''): Promise<Inventaire> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const current = await getCurrentInventory();
  if (current) {
    throw new Error('Un inventaire est déjà en cours. Terminez-le avant d\'en commencer un nouveau.');
  }

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
  return data as Inventaire;
};

export const getProductsForInventory = async (categorie: string | null = null): Promise<InventoryProduct[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('nom');

  if (categorie) {
    query = query.eq('categorie', categorie);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InventoryProduct[];
};

export const getCountedProducts = async (inventoryId: string): Promise<InventoryDetail[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('inventaire_details')
    .select(`
      *,
      produit:produits(id, nom, reference, categorie)
    `)
    .eq('inventaire_id', inventoryId);

  if (error) throw error;
  return (data || []) as InventoryDetail[];
};

export const getUncountedProducts = async (inventoryId: string, categorie: string | null = null): Promise<InventoryProduct[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data: counted, error: countedError } = await getSupabase()
    .from('inventaire_details')
    .select('produit_id')
    .eq('inventaire_id', inventoryId);

  if (countedError) throw countedError;

  const countedIds = (counted || []).map((c: { produit_id: string }) => c.produit_id);

  let query = getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('nom');

  if (categorie) {
    query = query.eq('categorie', categorie);
  }

  const { data, error } = await query;
  if (error) throw error;

  const uncounted = (data || []).filter((p: InventoryProduct) => !countedIds.includes(p.id));
  return uncounted;
};

export const recordCount = async (
  inventoryId: string,
  productId: string,
  actualQuantity: number,
  notes: string = ''
): Promise<RecordCountResult> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data: product, error: productError } = await getSupabase()
    .from('produits')
    .select('quantite_stock, nom, reference')
    .eq('id', productId)
    .eq('company_id', company.id)
    .single();

  if (productError) throw productError;

  const theoreticalQuantity = product.quantite_stock;
  const difference = actualQuantity - theoreticalQuantity;

  const { data: existing, error: existingError } = await getSupabase()
    .from('inventaire_details')
    .select('id')
    .eq('inventaire_id', inventoryId)
    .eq('produit_id', productId)
    .maybeSingle();

  let result: InventoryDetail;

  if (existing) {
    const { data, error } = await getSupabase()
      .from('inventaire_details')
      .update({
        quantite_reelle: actualQuantity,
        ecart: difference,
        statut: difference === 0 ? 'ok' : 'ecart',
        notes: notes
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    result = data as InventoryDetail;
  } else {
    const { data, error } = await getSupabase()
      .from('inventaire_details')
      .insert([{
        inventaire_id: inventoryId,
        produit_id: productId,
        quantite_theorique: theoreticalQuantity,
        quantite_reelle: actualQuantity,
        ecart: difference,
        statut: difference === 0 ? 'ok' : 'ecart',
        notes: notes
      }])
      .select()
      .single();

    if (error) throw error;
    result = data as InventoryDetail;
  }

  return {
    ...result,
    product_name: product.nom,
    product_reference: product.reference,
    theoretical_quantity: theoreticalQuantity
  };
};

export const finishInventory = async (inventoryId: string): Promise<FinishResult> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data: differences, error: diffError } = await getSupabase()
    .from('inventaire_details')
    .select('*')
    .eq('inventaire_id', inventoryId)
    .not('ecart', 'eq', 0);

  if (diffError) throw diffError;

  for (const diff of (differences || [])) {
    await getSupabase()
      .from('produits')
      .update({
        quantite_stock: diff.quantite_reelle,
        updated_at: new Date().toISOString()
      })
      .eq('id', diff.produit_id)
      .eq('company_id', company.id);

    await getSupabase()
      .from('mouvements_stock')
      .insert([{
        company_id: company.id,
        produit_id: diff.produit_id,
        type: 'inventaire',
        quantite: Math.abs(diff.ecart),
        notes: `Correction inventaire - Écart de ${diff.ecart > 0 ? '+' : ''}${diff.ecart}`,
        date_mouvement: new Date().toISOString(),
        created_at: new Date().toISOString()
      }]);
  }

  const { error } = await getSupabase()
    .from('inventaires')
    .update({
      date_fin: new Date().toISOString(),
      statut: 'termine'
    })
    .eq('id', inventoryId)
    .eq('company_id', company.id);

  if (error) throw error;

  return {
    success: true,
    corrections_appliquees: differences?.length || 0
  };
};

export const cancelInventory = async (inventoryId: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { error } = await getSupabase()
    .from('inventaires')
    .update({
      statut: 'annule',
      date_fin: new Date().toISOString()
    })
    .eq('id', inventoryId)
    .eq('company_id', company.id);

  if (error) throw error;
};

export const getInventoryHistory = async (limit: number = 50): Promise<Inventaire[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('inventaires')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Inventaire[];
};

export const getInventoryDetails = async (inventoryId: string): Promise<InventoryWithDetails | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data: inventory, error: invError } = await getSupabase()
    .from('inventaires')
    .select('*')
    .eq('id', inventoryId)
    .eq('company_id', company.id)
    .single();

  if (invError) throw invError;

  const { data: details, error: detailsError } = await getSupabase()
    .from('inventaire_details')
    .select(`
      *,
      produit:produits(id, nom, reference, categorie, unite)
    `)
    .eq('inventaire_id', inventoryId)
    .order('produit_id');

  if (detailsError) throw detailsError;

  const totalProducts = details?.length || 0;
  const productsWithDifference = (details || []).filter((d: InventoryDetail) => d.ecart !== 0).length;
  const totalDifference = (details || []).reduce((sum: number, d: InventoryDetail) => sum + Math.abs(d.ecart), 0);

  return {
    ...inventory,
    details: details || [],
    stats: {
      total_products: totalProducts,
      products_with_difference: productsWithDifference,
      total_difference: totalDifference,
      accuracy_rate: totalProducts > 0 ? ((totalProducts - productsWithDifference) / totalProducts * 100).toFixed(2) : '100'
    }
  } as InventoryWithDetails;
};
