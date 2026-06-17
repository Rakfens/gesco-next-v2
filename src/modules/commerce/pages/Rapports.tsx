"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Depense } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import { getTotalAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas } from "../services/produitService";
import { fetchVentes, getCA, getTopProduits } from "../services/venteService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

/* ─── Local StatCard with subtext ─── */
const ReportStat = ({
  label,
  value,
  color,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  color: "success" | "info" | "warning" | "accent" | "danger";
  sub?: string;
  icon?: React.ReactNode;
}) => {
  const colorMap = {
    success: "border-success",
    info: "border-info",
    warning: "border-warning",
    accent: "border-primary",
    danger: "border-destructive",
  };
  return (
    <div className={`bg-secondary rounded-xl border border-border py-3.5 px-4 border-l-[3px] ${colorMap[color]}`}>
    <div className="flex items-center gap-1.5 mb-1">
    {icon && <span className="text-muted-foreground">{icon}</span>}
    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
    <div className="text-xl font-extrabold text-foreground leading-tight">{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
};

/* ─── BarChart ─── */
const BarChart = ({ data, colorClass = "bg-info" }: { data: Array<{ date: string; total: number }>; colorClass?: string }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-[120px] overflow-x-auto px-1 pb-1">
    {data.map((item) => {
      const h = Math.max((item.total / maxVal) * 100, 2);
      return (
        <div key={item.date} className="flex flex-col items-center min-w-[36px] shrink-0">
        <div className="text-[9px] text-muted-foreground mb-0.5 font-semibold">
        {formatAr(item.total).replace(" Ar", "")}
        </div>
        <div className="w-full bg-background rounded-t h-20 flex items-end">
        <div className={`w-full ${colorClass} rounded-t transition-all duration-500`} style={{ height: `${h}%`, minHeight: 2 }} />
        </div>
        <div className="text-[8px] text-muted-foreground mt-0.5 text-center">
        {(() => {
          const d = new Date(`${item.date}T00:00:00`);
          return Number.isNaN(d.getTime()) ? item.date : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        })()}
        </div>
        </div>
      );
    })}
    </div>
  );
};

const PERIOD_OPTIONS = [
  { value: "aujourdhui", label: "Aujourd'hui", getDates: () => { const d = new Date().toISOString().split("T")[0]; return { debut: d, fin: d }; } },
  { value: "semaine", label: "Semaine", getDates: () => { const t = new Date(); const diff = t.getDay() === 0 ? 6 : t.getDay() - 1; const f = new Date(t); f.setDate(t.getDate() - diff); return { debut: f.toISOString().split("T")[0], fin: t.toISOString().split("T")[0] }; } },
  { value: "mois", label: "Ce mois", getDates: () => ({ debut: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], fin: new Date().toISOString().split("T")[0] }) },
  { value: "trimestre", label: "Trimestre", getDates: () => { const n = new Date(); const q = Math.floor(n.getMonth() / 3); return { debut: new Date(n.getFullYear(), q * 3, 1).toISOString().split("T")[0], fin: n.toISOString().split("T")[0] }; } },
  { value: "annee", label: "Année", getDates: () => ({ debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], fin: new Date().toISOString().split("T")[0] }) },
];

export default function Rapports() {
  const { currentCompany } = useCompany();
  const { error: toastError } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [period, setPeriod] = useState("mois");
  const [dateDebut, setDateDebut] = useState(PERIOD_OPTIONS[2].getDates().debut);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ca: 0,
    totalVentes: 0,
    totalAchats: 0,
    marge: 0,
    txMarge: 0,
    nbProduits: 0,
    alertesStock: 0,
    totalDepenses: 0,
  });
  const [ventesParJour, setVentesParJour] = useState<Array<{ date: string; total: number }>>([]);
  const [topProduits, setTopProduits] = useState<Array<{ produit_nom?: string; produit?: { nom?: string }; quantite?: number; chiffre?: number }>>([]);
  const [depenses, setDepenses] = useState<<Depense[]>([]);

  const loadReports = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [ca, ventes, achatsTotal, produits, alertes, top] = await Promise.all([
        getCA(dateDebut, dateFin),
                                                                                  fetchVentes({ dateDebut, dateFin }),
                                                                                  getTotalAchats(dateDebut, dateFin),
                                                                                  fetchProduits(),
                                                                                  getAlertesStockBas(),
                                                                                  getTopProduits(10, dateDebut, dateFin),
      ]);

      setTopProduits(top || []);

      const byDay = new Map<string, number>();
      ventes.forEach((v) => {
        const date = (v.date_vente || "").split("T")[0];
        if (date) byDay.set(date, (byDay.get(date) || 0) + (v.montant_total || 0));
      });
        setVentesParJour(
          [...byDay.entries()]
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => a.date.localeCompare(b.date))
        );

        let totalDepenses = 0;
        if (currentCompany.slug === "pomanay") {
          const { data: dep } = await getSupabase()
          .from("depenses")
          .select("*")
          .eq("company_id", currentCompany.id)
          .gte("date_depense", dateDebut)
          .lte("date_depense", dateFin)
          .order("date_depense", { ascending: false });
          setDepenses(dep || []);
          totalDepenses = (dep || []).reduce((s, d) => s + (d.montant || 0), 0);
        }

        const achatsNum = Number(achatsTotal) || 0;
        const caNum = Number(ca) || 0;
        const marge = caNum - achatsNum;

        setStats({
          ca: caNum,
          totalVentes: ventes.length,
          totalAchats: achatsNum,
          marge,
          txMarge: caNum > 0 ? parseFloat(((marge / caNum) * 100).toFixed(1)) : 0,
                 nbProduits: produits.length,
                 alertesStock: alertes.length,
                 totalDepenses,
        });
    } catch {
      toastError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [currentCompany, dateDebut, dateFin, toastError]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const opt = PERIOD_OPTIONS.find((o) => o.value === value);
    if (opt) {
      const dates = opt.getDates();
      setDateDebut(dates.debut);
      setDateFin(dates.fin);
    }
  };

  const depensesParCategorie = useMemo(() => {
    if (!depenses.length) return [];
    const acc: Record<string, number> = {};
    depenses.forEach((d) => {
      const cat = d.categorie || "Autre";
      acc[cat] = (acc[cat] || 0) + (d.montant || 0);
    });
    const total = Object.values(acc).reduce((s, v) => s + v, 0);
    return Object.entries(acc)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, totalCat]) => ({
      cat,
      total: totalCat,
      pct: total > 0 ? ((totalCat / total) * 100) : 0,
    }));
  }, [depenses]);

  if (loading) {
    return (
      <div className="p-5 text-center text-muted-foreground animate-fade-in">
      Chargement des rapports...
      </div>
    );
  }

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
    <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} className="text-primary" />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-foreground ${isMobile ? "text-xl" : "text-2xl"}`}>
    Rapports
    </h1>
    <p className="text-xs text-muted-foreground mt-0.5">
    {currentCompany?.name} · Analyse des performances
    </p>
    </div>
    </div>
    <div className="flex gap-2">
    <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/dashboard")} className="btn-press">
    ← Dashboard
    </Button>
    <Button variant="primary" size="sm" onClick={loadReports} className="btn-press shadow-gold">
    ↻ Actualiser
    </Button>
    </div>
    </div>

    {/* ══ PÉRIODE ══ */}
    <Card className="glass-card mb-4">
    <div className="flex gap-2 flex-wrap items-center">
    <div className="flex gap-1 bg-background rounded-xl p-1 border border-border flex-wrap">
    {PERIOD_OPTIONS.map((opt) => (
      <button
      key={opt.value}
      onClick={() => handlePeriodChange(opt.value)}
      className={`py-1.5 px-3.5 border-none rounded-md cursor-pointer text-[11px] font-semibold transition-colors btn-press ${period === opt.value ? "bg-primary text-background" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
      >
      {opt.label}
      </button>
    ))}
    </div>
    <div className="flex gap-1.5 items-center flex-wrap">
    <input
    type="date"
    value={dateDebut}
    onChange={(e) => setDateDebut(e.target.value)}
    className="py-1.5 px-2.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-sans outline-none input-focus"
    />
    <span className="text-muted-foreground text-xs">→</span>
    <input
    type="date"
    value={dateFin}
    onChange={(e) => setDateFin(e.target.value)}
    className="py-1.5 px-2.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-sans outline-none input-focus"
    />
    </div>
    </div>
    </Card>

    {/* ══ STATS ══ */}
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 mb-4 stagger-children">
    <ReportStat
    label="Chiffre d'affaires"
    value={formatAr(stats.ca)}
    color="success"
    icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={14} />}
    />
    <ReportStat
    label="Nb ventes"
    value={stats.totalVentes}
    color="info"
    icon={<Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={14} />}
    />
    <ReportStat
    label="Total achats"
    value={formatAr(stats.totalAchats)}
    color="warning"
    icon={<Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" size={14} />}
    />
    <ReportStat
    label="Marge brute"
    value={formatAr(stats.marge)}
    color={stats.marge >= 0 ? "accent" : "danger"}
    sub={`Taux : ${stats.txMarge}%`}
    icon={<Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={14} />}
    />
    <ReportStat
    label="Produits"
    value={stats.nbProduits}
    color="info"
    icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={14} />}
    />
    <ReportStat
    label="Alertes stock"
    value={stats.alertesStock}
    color={stats.alertesStock > 0 ? "danger" : "success"}
    sub={stats.alertesStock > 0 ? "Stock bas ou rupture" : "Tout est OK"}
    icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={14} />}
    />
    {currentCompany?.slug === "pomanay" && (
      <ReportStat
      label="Dépenses"
      value={formatAr(stats.totalDepenses)}
      color="danger"
      icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={14} />}
      />
    )}
    </div>

    {/* ══ ÉVOLUTION VENTES ══ */}
    {ventesParJour.length > 0 && (
      <Card className="glass-card mb-4">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2">
      <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={16} className="text-info" />
      <span className="text-sm font-bold text-foreground">Évolution des ventes</span>
      </div>
      <span className="text-[11px] text-muted-foreground">{ventesParJour.length} jour(s)</span>
      </div>
      <div className="px-4 pb-4">
      <BarChart data={ventesParJour} colorClass="bg-info" />
      </div>
      </Card>
    )}

    {/* ══ TOP PRODUITS ══ */}
    {topProduits.length > 0 && (
      <Card className="glass-card mb-4">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
      <span className="text-base">🏆</span>
      <span className="text-sm font-bold text-foreground">Top {topProduits.length} produits</span>
      </div>
      <Table>
      <TableHead>
      <TableRow>
      <TableHeader>#</TableHeader>
      <TableHeader>Produit</TableHeader>
      <TableHeader align="right">Qté</TableHeader>
      <TableHeader align="right">CA</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody>
      {topProduits.map((p, idx) => (
        <TableRow key={idx} className="table-row-hover">
        <TableCell className={`font-bold text-[13px] ${idx < 3 ? "text-warning" : "text-muted-foreground"}`}>
        {idx + 1}
        </TableCell>
        <TableCell className="font-semibold text-xs text-foreground">
        {p.produit_nom || p.produit?.nom || "—"}
        </TableCell>
        <TableCell align="right" className="text-xs text-foreground">
        {p.quantite}
        </TableCell>
        <TableCell align="right" className="font-bold text-success text-xs">
        {formatAr(p.chiffre)}
        </TableCell>
        </TableRow>
      ))}
      </TableBody>
      </Table>
      </Card>
    )}

    {/* ══ DÉPENSES PAR CATÉGORIE ══ */}
    {currentCompany?.slug === "pomanay" && depensesParCategorie.length > 0 && (
      <Card className="glass-card">
      <div className="px-5 pt-4 pb-2">
      <span className="text-sm font-bold text-foreground">Dépenses par catégorie</span>
      </div>
      <div className="px-4 pb-4">
      {depensesParCategorie.map(({ cat, total, pct }) => (
        <div key={cat} className="mb-2.5">
        <div className="flex justify-between mb-1 text-xs">
        <span className="font-semibold text-foreground">{cat}</span>
        <span className="text-muted-foreground">
        {formatAr(total)} · {pct.toFixed(1)}%
        </span>
        </div>
        <div className="bg-background h-1.5 rounded-[3px] overflow-hidden">
        <div className="bg-destructive h-full rounded-[3px]" style={{ width: `${pct}%` }} />
        </div>
        </div>
      ))}
      </div>
      </Card>
    )}
    </div>
  );
}
