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

// ── Store mémoire (lu par tous les services) ──────────────────────────
let _company = null;
export const setCurrentCompany = (c) => { _company = c; };
export const getCurrentCompany = () => _company;
export const clearCurrentCompany = () => { _company = null; };
