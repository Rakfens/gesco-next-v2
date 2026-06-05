import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'ht_gescom_auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});

/**
 * Récupère le companyId depuis localStorage.
 * Retourne null si non disponible (SSR ou non défini).
 */
export const getCompanyId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('currentCompanyId');
};
