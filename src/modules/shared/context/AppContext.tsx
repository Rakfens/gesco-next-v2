"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAgents } from "../hooks/useAgents";
import { useAuth } from "../hooks/useAuth";
import { useAvances } from "../hooks/useAvances";
import { useCommission } from "../hooks/useCommission";
import { useLivraisons } from "../hooks/useLivraisons";
import { useRecuperations } from "../hooks/useRecuperations";
import { useToast } from "../hooks/useToast";
import type { Agent, Avance, Livraison, Recuperation } from "../types";
import { type Company, useCompany } from "./CompanyContext";

// ── Types ──────────────────────────────────────────────────────────────
interface Toast {
  id: number;
  msg: string;
  type: string;
}

type CrudFn = (...args: unknown[]) => unknown;

interface AppContextValue {
  // Auth
  user: ReturnType<typeof useAuth>["user"];
  authLoading: boolean;
  companyLoading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
  authError: string | null;
  // Company
  currentCompany: Company | null;
  companies: Company[];
  switchCompany: (company: Company) => void;
  // Agents
  agents: Agent[];
  loadingAgents: boolean;
  addAgent: CrudFn;
  updateAgent: CrudFn;
  deleteAgent: CrudFn;
  reloadAgents: () => void;
  // Livraisons
  livraisons: Livraison[];
  loadingLivraisons: boolean;
  addLivraison: CrudFn;
  updateLivraison: CrudFn;
  deleteLivraison: CrudFn;
  reloadLivraisons: () => void;
  // Avances
  avances: Avance[];
  loadingAvances: boolean;
  addAvance: CrudFn;
  annulerAvance: CrudFn;
  deleteAvance: CrudFn;
  reloadAvances: () => void;
  // Recuperations
  recuperations: Recuperation[];
  loadingRecuperations: boolean;
  addRecuperation: CrudFn;
  updateRecuperation: CrudFn;
  deleteRecuperation: CrudFn;
  reloadRecuperations: () => void;
  // Commission gérant
  commissionGerant: number;
  updateCommission: (val: number) => Promise<void>;
  // Toast
  toasts: Toast[];
  showToast: (msg: string, type?: string, duration?: number) => number;
  hideToast: (id: number) => void;
  clearAll: () => void;
  success: (msg: string) => number;
  error: (msg: string) => number;
  warn: (msg: string) => number;
  info: (msg: string) => number;
}

// ── Context ────────────────────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading, login, logout, authError } = useAuth();
  const { currentCompany, companies, loading: companyLoading, switchCompany } = useCompany();

  const { agents, loading: la, addAgent, updateAgent, deleteAgent, reloadAgents } = useAgents();
  const {
    livraisons,
    loading: ll,
    addLivraison,
    updateLivraison,
    deleteLivraison,
    reloadLivraisons,
  } = useLivraisons();
  const {
    avances,
    loading: lv,
    addAvance,
    annulerAvance,
    deleteAvance,
    reloadAvances,
  } = useAvances();
  const {
    recuperations,
    loading: lr,
    addRecuperation,
    updateRecuperation,
    deleteRecuperation,
    reloadRecuperations,
  } = useRecuperations();

  const { toasts, showToast, hideToast, clearAll, success, error, warn, info } = useToast();
  const { commissionGerant, updateCommission } = useCommission();

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      authLoading,
      companyLoading,
      login,
      logout,
      authError,
      currentCompany,
      companies,
      switchCompany,
      agents,
      loadingAgents: la,
      addAgent: addAgent as CrudFn,
      updateAgent: updateAgent as CrudFn,
      deleteAgent: deleteAgent as CrudFn,
      reloadAgents,
      livraisons,
      loadingLivraisons: ll,
      addLivraison: addLivraison as CrudFn,
      updateLivraison: updateLivraison as CrudFn,
      deleteLivraison: deleteLivraison as CrudFn,
      reloadLivraisons,
      avances,
      loadingAvances: lv,
      addAvance: addAvance as CrudFn,
      annulerAvance: annulerAvance as CrudFn,
      deleteAvance: deleteAvance as CrudFn,
      reloadAvances,
      recuperations,
      loadingRecuperations: lr,
      addRecuperation: addRecuperation as CrudFn,
      updateRecuperation: updateRecuperation as CrudFn,
      deleteRecuperation: deleteRecuperation as CrudFn,
      reloadRecuperations,
      toasts,
      showToast: showToast as (msg: string, type?: string, duration?: number) => number,
      hideToast,
      clearAll,
      success,
      error,
      warn,
      info,
      commissionGerant,
      updateCommission,
    }),
    [
      user,
      authLoading,
      companyLoading,
      login,
      logout,
      authError,
      currentCompany,
      companies,
      switchCompany,
      agents,
      la,
      addAgent,
      updateAgent,
      deleteAgent,
      reloadAgents,
      livraisons,
      ll,
      addLivraison,
      updateLivraison,
      deleteLivraison,
      reloadLivraisons,
      avances,
      lv,
      addAvance,
      annulerAvance,
      deleteAvance,
      reloadAvances,
      recuperations,
      lr,
      addRecuperation,
      updateRecuperation,
      deleteRecuperation,
      reloadRecuperations,
      toasts,
      showToast,
      hideToast,
      clearAll,
      success,
      error,
      warn,
      info,
      commissionGerant,
      updateCommission,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────
export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être dans AppProvider");
  return ctx;
};
