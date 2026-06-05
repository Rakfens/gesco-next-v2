'use client';

// useAuth.ts — v5 : simple, fiable, zéro race condition
import { useState, useEffect, useRef } from 'react';
import { supabase, clearCurrentCompany } from '@/lib/supabase';

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
  const [user,      setUser]      = useState<SupabaseUser | null | undefined>(undefined); // undefined = pas encore résolu
  const [authError, setAuthError] = useState<string | null>(null);
  const resolved = useRef(false);

  useEffect(() => {
    // onAuthStateChange est déclenché IMMÉDIATEMENT avec la session en cache
    // C'est LA source de vérité — pas besoin de getSession() en plus
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = (session?.user ?? null) as SupabaseUser | null;
      setUser(u);
      resolved.current = true;
    });

    // Sécurité : si onAuthStateChange ne se déclenche pas dans 4s → null
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError(error.message); throw error; }
    return data;
  };

  const logout = async () => {
    clearCurrentCompany();
    // Forcer immédiatement AVANT signOut pour débloquer l'UI
    setUser(null);
    try { await supabase.auth.signOut(); } catch (_) {}
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
