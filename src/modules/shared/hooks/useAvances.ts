"use client";

// useAvances.ts — avec Realtime sync
import { useCallback, useEffect, useState } from "react";
import type { Avance } from "@/modules/shared/types";
import {
  addAvance,
  annulerAvance,
  deleteAvance,
  fetchAvances,
} from "../../livraison/services/avanceService";
import { useCompany } from "../context/CompanyContext";

interface UseAvancesReturn {
  avances: Avance[];
  loading: boolean;
  error: string | null;
  addAvance: (avance: Record<string, unknown>) => Promise<Avance>;
  annulerAvance: (id: string) => Promise<void>;
  deleteAvance: (id: string) => Promise<void>;
  reloadAvances: () => Promise<void>;
}

export const useAvances = (): UseAvancesReturn => {
  const [avances, setAvances] = useState<Avance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const loadAvances = useCallback(async () => {
    if (!currentCompany?.id) {
      setAvances([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchAvances(currentCompany.id);
      setAvances(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadAvances();
  }, [loadAvances]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === "avances") loadAvances();
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadAvances]);

  const handleAddAvance = async (avance: Record<string, unknown>) => {
    try {
      setError(null);
      const companyId = currentCompany?.id;
      const newAvance = await addAvance(avance as Partial<Avance>, companyId);
      setAvances((prev) => [newAvance, ...prev]);
      return newAvance;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    }
  };

  const handleAnnulerAvance = async (id: string) => {
    try {
      setError(null);
      await annulerAvance(id, currentCompany?.id);
      setAvances((prev) => prev.map((a) => (a.id === id ? { ...a, statut: "annule" } : a)));
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    }
  };

  const handleDeleteAvance = async (id: string) => {
    try {
      setError(null);
      await deleteAvance(id, currentCompany?.id);
      setAvances((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    }
  };

  return {
    avances,
    loading,
    error,
    addAvance: handleAddAvance,
    annulerAvance: handleAnnulerAvance,
    deleteAvance: handleDeleteAvance,
    reloadAvances: loadAvances,
  };
};
