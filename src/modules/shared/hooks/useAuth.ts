'use client';

// useAuth.ts — utilise getSupabase() au lieu du Proxy
import { useState, useEffect, useRef } from 'react';
import { getSupabase, clearCurrentCompany } from '@/lib/supabase';

interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface UseAuthReturn {
  user: SupabaseUser | null | undefined;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
  authError: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user,      setUser]      = useState<SupabaseUser | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);
  const resolved = useRef(false);

  useEffect(() => {
    const sb = getSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const u = (session?.user ?? null) as SupabaseUser | null;
      setUser(u);
      resolved.current = true;
    });

    const guard = setTimeout(() => {
      if (!resolved.current) setUser(null);
    }, 4000);

    return () => {
      clearTimeout(guard);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setAuthError(error.message); throw error; }
    return data;
  };

  const logout = async () => {
    clearCurrentCompany();
    setUser(null);
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
    } catch (_) {}
  };

  return {
    user,
    loading:         user === undefined,
    isAuthenticated: !!user,
    login,
    logout,
    authError,
  };
};
