import { getSupabase } from '@/lib/supabase';

// ============ TYPES ============

export interface Produit {
  id?: number;
  nom: string;
  reference?: string;
  categorie?: string;
  prix_achat?: number;
  prix_vente?: number;
  quantite_stock?: number;
  stock_minimum?: number;
  is_active?: boolean;
  company_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface ProduitFilters {
  categorie?: string;
  isActive?: boolean;
  search?: string;
  stockBas?: boolean;
}

// ============ CRUD PRODUITS ============

export const fetchProduits = async (companyId: string | number, filters: ProduitFilters = {}): Promise<Produit[]> => {
  if (!companyId) return [];

  let query = getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', companyId)
    .order('nom');

  if (filters.categorie) query = query.eq('categorie', filters.categorie);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.search) {
    query = query.or(`nom.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (filters.stockBas) {
    return (data || []).filter(p => p.quantite_stock <= (p.stock_minimum || 0));
  }

  return data || [];
};

export const fetchProduit = async (id: number, companyId: string | number): Promise<Produit | null> => {
  if (!companyId) return null;

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();

  if (error) throw error;
  return data;
};

export const createProduit = async (produitData: Partial<Produit>, companyId: string | number): Promise<Produit> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
    .from('produits')
    .insert([{
      ...produitData,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduit = async (id: number, updates: Partial<Produit>, companyId: string | number): Promise<Produit> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
    .from('produits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduit = async (id: number, companyId: string | number): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const { error } = await getSupabase()
    .from('produits')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);

  if (error) throw error;
};

// ============ STOCK PRODUITS ============

export const updateStock = async (
  id: number,
  nouvelleQuantite: number,
  companyId: string | number,
  raison: string = 'ajustement'
): Promise<void> => {
  if (!companyId) throw new Error('Aucune société sélectionnée');

  const produit = await fetchProduit(id, companyId);
  if (!produit) throw new Error('Produit non trouvé');

  const difference = nouvelleQuantite - (produit.quantite_stock || 0);

  const { error: updateError } = await getSupabase()
    .from('produits')
    .update({ quantite_stock: nouvelleQuantite, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId);

  if (updateError) throw updateError;

  if (difference !== 0) {
    await getSupabase()
      .from('mouvements_stock')
      .insert([{
        produit_id: id,
        type: 'ajustement',
        quantite: Math.abs(difference),
        notes: `${raison} : ${difference > 0 ? '+' : ''}${difference}`,
        date_mouvement: new Date().toISOString(),
        company_id: companyId,
        created_at: new Date().toISOString(),
      }]);
  }
};

// ============ CATÉGORIES ============

export const fetchCategories = async (companyId: string | number): Promise<string[]> => {
  if (!companyId) return [];

  const { data, error } = await getSupabase()
    .from('produits')
    .select('categorie')
    .eq('company_id', companyId)
    .not('categorie', 'is', null);

  if (error) throw error;

  const categories = [...new Set((data || []).map(p => p.categorie).filter(Boolean))];
  return categories.sort();
};
