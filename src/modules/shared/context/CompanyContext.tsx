"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { logger } from "@/lib/logger";
import {
  clearCurrentCompany,
  getCurrentCompany as getStoredCompany,
  getSupabase,
  setCurrentCompany,
} from "@/lib/supabase";
import type { Company } from "@/modules/shared/types";
import { clearAppState, loadSavedCompanyId } from "../hooks/useAppState";

export type { Company };

export interface CompanyContextValue {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  switchCompany: (company: Company) => void;
}

// ── Context ────────────────────────────────────────────────────────────
const CompanyContext = createContext<CompanyContextValue | null>(null);

export { setCurrentCompany };

export const getCurrentCompany = (): Company | null =>
  (getStoredCompany?.() as Company | null) ?? null;

// ── Provider ───────────────────────────────────────────────────────────
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, _setActive] = useState<Company | null>(null);
  const [companies, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const rtChannels = useRef<RealtimeChannel[]>([]);
  const mounted = useRef(true);

  const setupRealtime = useCallback((companyId: string | undefined) => {
    rtChannels.current.forEach((ch) => {
      try {
        getSupabase().removeChannel(ch);
      } catch (_) {
        /* noop */
      }
    });
    rtChannels.current = [];
    if (!companyId) return;
    const tables = [
      "livraisons",
      "agents",
      "avances",
      "recuperations",
      "ventes",
      "achats",
      "produits",
    ];
    tables.forEach((table) => {
      try {
        const ch = getSupabase()
          .channel(`rt_${table}_${companyId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table, filter: `company_id=eq.${companyId}` },
            (p: unknown) =>
              window.dispatchEvent(
                new CustomEvent("supabase_realtime", { detail: { table, payload: p } }),
              ),
          )
          .subscribe();
        rtChannels.current.push(ch);
      } catch (_) {
        /* noop */
      }
    });
  }, []);

  const applyActive = useCallback(
    (list: Company[], preferredId: string | null = null) => {
      const id = preferredId || loadSavedCompanyId();
      const found = id ? list.find((c) => c.id === id) : null;
      const active = found || list[0] || null;
      setCurrentCompany(active);
      _setActive(active);
      setupRealtime(active?.id);
      return active;
    },
    [setupRealtime],
  );

  const loadCompanies = useCallback(
    async (userId: string) => {
      if (!userId || !mounted.current) return;
      setLoading(true);
      try {
        const { data, error } = await getSupabase()
          .from("user_companies")
          .select("company:companies(*)")
          .eq("user_id", userId);
        if (!mounted.current) return;
        if (error) throw error;
        const list: Company[] = (data || [])
          .map((r: { company: Company[] | Company }) =>
            Array.isArray(r.company) ? r.company[0] : r.company,
          )
          .filter(Boolean);
        setList(list);
        applyActive(list);
      } catch (_) {
        if (mounted.current) {
          setList([]);
          _setActive(null);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [applyActive],
  );

  useEffect(() => {
    mounted.current = true;
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      logger.log("[COMPANY] Auth event:", event, "session:", !!session);
      if (!mounted.current) return;
      if (!session || event === "SIGNED_OUT") {
        clearCurrentCompany();
        clearAppState();
        setList([]);
        _setActive(null);
        setLoading(false);
        rtChannels.current.forEach((ch) => {
          try {
            getSupabase().removeChannel(ch);
          } catch (_) {
            /* noop */
          }
        });
        rtChannels.current = [];
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        logger.log("[COMPANY] Loading companies for user:", session.user.id);
        loadCompanies(session.user.id);
      }
    });
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      rtChannels.current.forEach((ch) => {
        try {
          getSupabase().removeChannel(ch);
        } catch (_) {
          /* noop */
        }
      });
    };
  }, [loadCompanies]);

  const switchCompany = useCallback(
    (company: Company) => {
      setCurrentCompany(company);
      _setActive(company);
      setupRealtime(company?.id);
      try {
        if (company?.id) sessionStorage.setItem("ht_company_id", company.id);
      } catch (_) {
        /* noop */
      }
      window.dispatchEvent(new CustomEvent("companyChanged", { detail: company }));
      // Recharger la page pour mettre à jour le layout avec la nouvelle société
      window.location.reload();
    },
    [setupRealtime],
  );

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, loading, switchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────
export const useCompany = (): CompanyContextValue => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany doit être dans CompanyProvider");
  return ctx;
};
