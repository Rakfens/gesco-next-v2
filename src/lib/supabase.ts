import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Company } from "@/modules/shared/types";

export type { Company };

let _client: SupabaseClient | null = null;
let _company: Company | null = null;

/**
 * Retourne le client Supabase singleton.
 * Ne crée le client que côté navigateur (typeof window !== 'undefined').
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    if (typeof window === "undefined") {
      throw new Error("Supabase client cannot be created on the server side");
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase environment variables");
    }
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "ht_gescom_auth",
        storage: window.localStorage,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    });
  }
  return _client;
}

// ── Company helpers ──────────────────────────────────────────────────

export const setCurrentCompany = (c: Company | null) => {
  _company = c;
};
export const getCurrentCompany = (): Company | null => _company;
export const clearCurrentCompany = () => {
  _company = null;
};
