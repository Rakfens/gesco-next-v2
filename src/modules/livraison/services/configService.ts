// @ts-nocheck
// src/services/configService.js
import { getSupabase, getCurrentCompany } from '@/lib/supabase';  

// Récupérer la commission gérant pour la société actuelle
export const fetchCommission = async () => {
  const company = getCurrentCompany();
  
  if (!company) {
    return 500; // Valeur par défaut
  }
  
  try {
    const { data, error } = await getSupabase()
      .from('config')
      .select('valeur')
      .eq('cle', 'commission_gerant')
      .eq('company_id', company.id)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data ? Number(data.valeur) : 500;
  } catch (error) {
    return 500;
  }
};

// Mettre à jour la commission gérant pour la société actuelle
export const updateCommission = async (newVal) => {
  const company = getCurrentCompany();
  
  if (!company) {
    throw new Error('Aucune société sélectionnée');
  }
  
  const { error } = await getSupabase()
    .from('config')
    .upsert({ 
      cle: 'commission_gerant', 
      valeur: String(newVal),
      company_id: company.id
    }, { 
      onConflict: 'cle,company_id'
    });
    
  if (error) throw error;
};

// Récupérer le logo pour la société actuelle
export const fetchLogo = async () => {
  const company = getCurrentCompany();
  
  if (!company) {
    return null;
  }
  
  try {
    const { data, error } = await getSupabase()
      .from('config')
      .select('valeur')
      .eq('cle', 'logo_url')
      .eq('company_id', company.id)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error;
    return data?.valeur || null;
  } catch (error) {
    return null;
  }
};

// Mettre à jour le logo pour la société actuelle
export const updateLogo = async (url) => {
  const company = getCurrentCompany();
  
  if (!company) {
    throw new Error('Aucune société sélectionnée');
  }
  
  const { error } = await getSupabase()
    .from('config')
    .upsert({ 
      cle: 'logo_url', 
      valeur: url,
      company_id: company.id
    }, { 
      onConflict: 'cle,company_id'
    });
    
  if (error) throw error;
};

// Upload du logo (bucket commun, mais accessible par société)
export const uploadLogoFile = async (file) => {
  const company = getCurrentCompany();
  
  if (!company) {
    throw new Error('Aucune société sélectionnée');
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `logos/${company.slug}/logo_${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await getSupabase().storage
    .from('logos')
    .upload(fileName, file);
    
  if (uploadError) throw uploadError;
  
  const { data: publicUrl } = getSupabase().storage
    .from('logos')
    .getPublicUrl(fileName);
    
  return publicUrl.publicUrl;
};

// Récupérer la configuration complète d'une société
export const fetchAllConfig = async () => {
  const company = getCurrentCompany();
  
  if (!company) {
    return {};
  }
  
  try {
    const { data, error } = await getSupabase()
      .from('config')
      .select('cle, valeur')
      .eq('company_id', company.id);
      
    if (error) throw error;
    
    const configMap = {};
    data?.forEach(item => {
      configMap[item.cle] = item.valeur;
    });
    
    return configMap;
  } catch (error) {
    return {};
  }
};

// Récupérer une valeur de configuration spécifique
export const getConfigValue = async (key, defaultValue = null) => {
  const company = getCurrentCompany();
  
  if (!company) return defaultValue;
  
  try {
    const { data, error } = await getSupabase()
      .from('config')
      .select('valeur')
      .eq('cle', key)
      .eq('company_id', company.id)
      .single();
      
    if (error && error.code !== 'PGRST116') return defaultValue;
    return data?.valeur || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Sauvegarder une valeur de configuration spécifique
export const setConfigValue = async (key, value) => {
  const company = getCurrentCompany();
  
  if (!company) {
    throw new Error('Aucune société sélectionnée');
  }
  
  const { error } = await getSupabase()
    .from('config')
    .upsert({ 
      cle: key, 
      valeur: String(value),
      company_id: company.id
    }, { 
      onConflict: 'cle,company_id'
    });
    
  if (error) throw error;
};