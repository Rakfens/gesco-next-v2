import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import type { Produit, MouvementStock } from '@/modules/shared/types';

interface ProduitFilters {
  categorie?: string;
  isActive?: boolean;
  search?: string;
  stockBas?: boolean;
}

interface MouvementData {
  produit_id: string;
  type: string;
  quantite: number;
  notes?: string;
  date_mouvement?: string;
}

export const fetchProduits = async (filters: ProduitFilters = {}): Promise<Produit[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = getSupabase()
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
    return (allProducts || []).filter((p: Produit) => (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0)) as Produit[];
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Produit[];
};

export const fetchProduitById = async (id: string): Promise<Produit | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (error) throw error;
  return data as Produit;
};

export const fetchProduitByReference = async (reference: string): Promise<Produit | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('reference', reference)
    .eq('company_id', company.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Produit | null;
};

export const createProduit = async (produitData: Record<string, unknown>): Promise<Produit> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
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
  return data as Produit;
};

export const updateProduit = async (id: string, updates: Record<string, unknown>): Promise<Produit> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
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
  return data as Produit;
};

export const deleteProduit = async (id: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { error } = await getSupabase()
    .from('produits')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;
};

export const deleteProduitPermanent = async (id: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { error } = await getSupabase()
    .from('produits')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) throw error;
};

export const updateStock = async (id: string, nouvelleQuantite: number, raison: string = 'ajustement'): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const produit = await fetchProduitById(id);
  if (!produit) throw new Error('Produit non trouvé');

  const difference = nouvelleQuantite - (produit.quantite_stock ?? 0);

  const { error: updateError } = await getSupabase()
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

export const getAlertesStockBas = async (): Promise<Produit[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('produits')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  return (data || []).filter((produit: Produit) => (produit.quantite_stock ?? 0) <= (produit.stock_minimum ?? 0)) as Produit[];
};

export const fetchCategories = async (): Promise<string[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('produits')
    .select('categorie')
    .eq('company_id', company.id)
    .not('categorie', 'is', null);

  if (error) throw error;

  const categories = [...new Set((data || []).map((p: { categorie: string }) => p.categorie).filter(Boolean))];
  return categories.sort();
};

export const countProduitsByCategorie = async (): Promise<Record<string, number>> => {
  const company = getCurrentCompany();
  if (!company) return {};

  const { data, error } = await getSupabase()
    .from('produits')
    .select('categorie')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  const counts: Record<string, number> = {};
  (data || []).forEach((p: { categorie: string | null }) => {
    const cat = p.categorie || 'Sans catégorie';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
};

export const getValeurTotaleStock = async (): Promise<number> => {
  const company = getCurrentCompany();
  if (!company) return 0;

  const { data, error } = await getSupabase()
    .from('produits')
    .select('quantite_stock, prix_achat')
    .eq('company_id', company.id)
    .eq('is_active', true);

  if (error) throw error;

  const total = (data || []).reduce((sum: number, p: { quantite_stock: number; prix_achat: number }) => sum + ((p.quantite_stock || 0) * (p.prix_achat || 0)), 0);
  return total;
};

export const createMouvementStock = async (mouvementData: MouvementData): Promise<MouvementStock> => {
  const company = getCurrentCompany();
  if (!company) throw new Error('Aucune société sélectionnée');

  const { data, error } = await getSupabase()
    .from('mouvements_stock')
    .insert([{
      ...mouvementData,
      company_id: company.id,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data as MouvementStock;
};

export const getMouvementsByProduit = async (produitId: string, limit: number = 50): Promise<MouvementStock[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from('mouvements_stock')
    .select('*')
    .eq('produit_id', produitId)
    .eq('company_id', company.id)
    .order('date_mouvement', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as MouvementStock[];
};
