// @ts-nocheck
// useAuth.js — v5 : simple, fiable, zéro race condition
import { useState, useEffect, useRef } from 'react';
import { supabase, clearCurrentCompany } from '@/lib/supabase';

export const useAuth = () => {
  const [user,      setUser]      = useState(undefined); // undefined = pas encore résolu
  const [authError, setAuthError] = useState(null);
  const resolved = useRef(false);

  useEffect(() => {
    // onAuthStateChange est déclenché IMMÉDIATEMENT avec la session en cache
    // C'est LA source de vérité — pas besoin de getSession() en plus
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
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

  const login = async (email, password) => {
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
