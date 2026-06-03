// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

// ── Company helpers ──────────────────────────────────────────────────
let _company = null;

export const setCurrentCompany = (c) => { _company = c; };
export const getCurrentCompany = () => _company;
export const clearCurrentCompany = () => { _company = null; };

/**
 * Charge le company depuis la table `companies` en utilisant l'user connecté.
 * Stocke le résultat en mémoire pour éviter les appels répétés.
 */
export async function loadCurrentCompany() {
  if (_company) return _company;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Chercher le company lié à cet user
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback : prendre le premier company
    const { data: first } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .single();
    _company = first || null;
  } else {
    _company = data;
  }

  return _company;
}
