// src/modules/livraison/pages/Dashboard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  SkeletonGrid,
  StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT,
  currentMonth,
  EXCLUDED_CLIENTS,
  formatAr,
    monthLabel,
    shouldCountGerantCommission,
    TODAY,
} from "@/modules/shared/utils/constants";

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

interface RecupParLivreur {
  livreur: string;
  total: number;
  nb: number;
  details: { client: string; frais: number }[];
}

const Icon = ({ d, size = 18, className = "text-current" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

const StatusIcon = ({ name, size = 14, className = "text-current" }: { name: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
  {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
  {name === "check" && <polyline points="20 6 9 17 4 12" />}
  {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
  {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", activeClass: "text-[var(--gold)] border-[var(--gold)] bg-[var(--gold)]/10 shadow-[0_0_14px_rgba(201,169,110,0.33)]", inactiveClass: "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-active)]", icon: "clock" },
  { key: "livre", label: "Livré", activeClass: "text-[var(--success)] border-[var(--success)] bg-[var(--success)]/10 shadow-[0_0_14px_rgba(52,211,153,0.33)]", inactiveClass: "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-active)]", icon: "check" },
  { key: "retourne", label: "Retourné", activeClass: "text-[var(--danger)] border-[var(--danger)] bg-[var(--danger)]/10 shadow-[0_0_14px_rgba(248,113,113,0.33)]", inactiveClass: "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-active)]", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", activeClass: "text-[var(--violet)] border-[var(--violet)] bg-[var(--violet)]/10 shadow-[0_0_14px_rgba(139,92,246,0.33)]", inactiveClass: "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-active)]", icon: "xmark" },
];

const statusBarColor = (statut?: string) => {
  if (statut === "livre") return "border-[var(--success)]";
  if (statut === "retourne") return "border-[var(--danger)]";
  if (statut === "reporte") return "border-[var(--violet)]";
  return "border-[var(--gold)]";
};

const statusBgColor = (statut?: string) => {
  if (statut === "livre") return "bg-[var(--success)]/10";
  if (statut === "retourne") return "bg-[var(--danger)]/10";
  if (statut === "reporte") return "bg-[var(--violet)]/10";
  return "bg-[var(--gold)]/10";
};

const statusTextColor = (statut?: string) => {
  if (statut === "livre") return "text-[var(--success)]";
  if (statut === "retourne") return "text-[var(--danger)]";
  if (statut === "reporte") return "text-[var(--violet)]";
  return "text-[var(--gold)]";
};

function StatusButtons({ livraison, onUpdate }: { livraison: Livraison; onUpdate: (id: string, updates: Record<string, unknown>) => void }) {
  const [showRemarque, setShowRemarque] = useState(false);
  const [remarque, setRemarque] = useState(livraison.remarque || "");
  const [editingMontant, setEditingMontant] = useState(false);
  const [montant, setMontant] = useState(String(livraison.montant || ""));
  const [saving, setSaving] = useState(false);

  const needsRemarque = livraison.statut === "retourne" || livraison.statut === "reporte";

  const handleStatusChange = async (key: string) => {
    setSaving(true);
    try {
      if (key === "retourne" || key === "reporte") {
        setShowRemarque(true);
        await onUpdate(livraison.id, { statut: key, remarque });
      } else {
        setShowRemarque(false);
        await onUpdate(livraison.id, { statut: key });
      }
    } finally { setSaving(false); }
  };

  const handleSaveRemarque = async () => {
    if (!remarque.trim()) return;
    setSaving(true);
    try {
      await onUpdate(livraison.id, { statut: livraison.statut || "retourne", remarque });
      setShowRemarque(false);
    } finally { setSaving(false); }
  };

  const handleSaveMontant = async () => {
    setSaving(true);
    try {
      await onUpdate(livraison.id, { montant: parseFloat(montant) || 0 });
      setEditingMontant(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col items-center gap-2">
    <div className="flex gap-1.5">
    {STATUS_OPTIONS.map((opt) => {
      const isActive = livraison.statut === opt.key;
      return (
        <button
        key={opt.key}
        type="button"
        onClick={() => handleStatusChange(opt.key)}
        disabled={saving}
        title={opt.label}
        className={`flex h-11 w-11 items-center justify-center rounded-[10px] border-2 transition-all ${isActive ? `scale-110 ${opt.activeClass}` : opt.inactiveClass} ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
        >
        <StatusIcon name={opt.icon} size={17} className={isActive ? "text-current" : "text-[var(--text-faint)]"} />
        </button>
      );
    })}
    </div>
    {(showRemarque || needsRemarque) && (
      <div className="w-full animate-fade-up rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {livraison.statut === "retourne" ? "⚠️ Motif du retour" : "📅 Motif du report"}
      </div>
      <textarea
      value={remarque}
      onChange={(e) => setRemarque(e.target.value)}
      placeholder={livraison.statut === "retourne" ? "Ex: Client injoignable..." : "Ex: Reporté au lendemain..."}
      className="w-full min-h-[50px] resize-y rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
      autoFocus
      />
      <div className="mt-1.5 flex gap-1.5">
      <button
      type="button"
      onClick={handleSaveRemarque}
      disabled={saving || !remarque.trim()}
      className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors ${remarque.trim() ? "bg-[var(--gold)] text-[var(--bg-primary)] cursor-pointer" : "bg-[var(--bg-elevated)] text-[var(--text-faint)] cursor-not-allowed"}`}
      >
      {saving ? "..." : "✓ OK"}
      </button>
      <button
      type="button"
      onClick={() => { setShowRemarque(false); setRemarque(livraison.remarque || ""); }}
      disabled={saving}
      className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]"
      >
      Annuler
      </button>
      </div>
      </div>
    )}
    {editingMontant ? (
      <div className="w-full animate-fade-up rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-2.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">💰 Modifier montant</div>
      <input
      type="number"
      value={montant}
      onChange={(e) => setMontant(e.target.value)}
      placeholder="Montant en Ar"
      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-active)]"
      autoFocus
      />
      <div className="mt-1.5 flex gap-1.5">
      <button
      type="button"
      onClick={handleSaveMontant}
      disabled={saving}
      className="flex-1 rounded-lg bg-[var(--gold)] py-1.5 text-[11px] font-bold text-[var(--bg-primary)] transition-colors hover:bg-[var(--gold-light)] cursor-pointer disabled:cursor-wait"
      >
      {saving ? "..." : "✓ OK"}
      </button>
      <button
      type="button"
      onClick={() => { setEditingMontant(false); setMontant(String(livraison.montant || "")); }}
      disabled={saving}
      className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]"
      >
      Annuler
      </button>
      </div>
      </div>
    ) : (
      <button
      type="button"
      onClick={() => setEditingMontant(true)}
      className="rounded-md border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-active)] hover:text-[var(--text-secondary)]"
      >
      ✏️ Montant
      </button>
    )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { agents = [], livraisons = [], showToast, livraisonCrud } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [errorRecup, setErrorRecup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jour" | "mois">("jour");

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const { enCours, todayLivraisons, livsGerant, gerantGain, excludedToday } = useMemo(() => {
    const todayLivs = safeLivraisons.filter((l) => l.date === TODAY());
    return {
      enCours: todayLivs.filter((l) => l.statut === "en_cours").length,
                                                                                      todayLivraisons: todayLivs,
                                                                                      livsGerant: todayLivs.filter((l) => shouldCountGerantCommission(l)),
                                                                                      gerantGain: todayLivs.filter((l) => shouldCountGerantCommission(l)).length * commissionGerant,
                                                                                      excludedToday: todayLivs.filter((l) => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || "") && (Number(l.frais) || 0) > 0),
    };
  }, [safeLivraisons, commissionGerant]);

  const availableMonths = useMemo(() => {
    const months = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    months.add(currentMonth());
    return [...months].sort().reverse() as string[];
  }, [safeLivraisons]);

  const selectedMonthLivraisons = useMemo(() => {
    return safeLivraisons.filter((l) => l.date && l.date.startsWith(selectedMonth)).sort((a, b) => b.date.localeCompare(a.date));
  }, [safeLivraisons, selectedMonth]);

  const handleStatusUpdate = async (id: string, updates: Record<string, unknown>) => {
    try {
      await livraisonCrud.update(id, updates);
      if (updates.statut) {
        const label = STATUS_OPTIONS.find((s) => s.key === updates.statut)?.label || String(updates.statut);
        showToast(updates.remarque ? `${label} — motif enregistré` : `Statut: ${label}`);
      } else if (updates.montant !== undefined) {
        showToast("Montant modifié");
      }
    } catch {
      showToast("Erreur mise à jour", "error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingRecup(true);
      setErrorRecup(null);
      try {
        const { getRecuperationsByDate: fetchRecup } = await import("../services/recuperationService");
        const { currentCompany } = useCompany();
        const data = await fetchRecup(selectedDate, currentCompany!.id) || [];
        if (!cancelled) setRecuperationsJour(data);
      } catch (e: unknown) {
        if (!cancelled) {
          logger.error("Erreur récupérations:", e);
          setErrorRecup("Erreur lors du chargement.");
        }
      } finally {
        if (!cancelled) setLoadingRecup(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const { totalRecuperationsJour, nbRecuperationsJour, recuperationsParLivreur } = useMemo(() => {
    const total = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
    const parLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
      acc[nom].total += r.frais_recuperation ?? 0;
      acc[nom].nb += 1;
      acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
      return acc;
    }, {} as Record<string, RecupParLivreur>);
    return { totalRecuperationsJour: total, nbRecuperationsJour: recuperationsJour.length, recuperationsParLivreur: parLivreur };
  }, [recuperationsJour]);

  const agentStats = useMemo(() => {
    return safeAgents.map((a) => {
      const ls = safeLivraisons.filter((l) => agentMatch(l, a));
      return {
        agent: a,
        ls,
        totalFrais: ls.reduce((s, l) => s + (Number(l.frais) || 0), 0),
                          livres: ls.filter((l) => l.statut === "livre").length,
                          retournes: ls.filter((l) => l.statut === "retourne").length,
                          reportes: ls.filter((l) => l.statut === "reporte").length,
                          taux: ls.length ? Math.round((ls.filter((l) => l.statut === "livre").length / ls.length) * 100) : 0,
      };
    });
  }, [safeAgents, safeLivraisons]);

  const totalLivraisons = safeLivraisons.length;
  const totalLivres = safeLivraisons.filter((l) => l.statut === "livre").length;
  const todayLivres = todayLivraisons.filter((l) => l.statut === "livre").length;
  const todayMontant = todayLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const monthMontant = selectedMonthLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const monthFrais = selectedMonthLivraisons.reduce((s, l) => s + (Number(l.frais) || 0), 0);

  return (
    <div className="animate-fade-up">
    {/* HEADER */}
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--gold)]/10 to-[var(--violet)]/5 p-6">
    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)]/10 blur-3xl" />
    <div className="relative z-10">
    <div className="mb-2.5 flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--violet)] shadow-[0_0_20px_rgba(201,169,110,0.2)]">
    <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={20} className="text-[var(--bg-primary)]" />
    </div>
    <div>
    <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Tableau de bord</h1>
    <p className="text-xs text-[var(--text-muted)]">{currentCompany?.name || "HT-GesCom"} · {TODAY()}</p>
    </div>
    </div>
    <div className="flex flex-wrap gap-2">
    {[
      { label: "Aujourd'hui", value: `${todayLivraisons.length} livraison${todayLivraisons.length !== 1 ? "s" : ""}`, color: "text-[var(--gold)]", bg: "bg-[var(--gold)]/10", border: "border-[var(--gold)]/15" },
          { label: "Montant du jour", value: formatAr(todayMontant), color: "text-[var(--success)]", bg: "bg-[var(--success)]/10", border: "border-[var(--success)]/15" },
          { label: "Taux réussite", value: `${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10", border: "border-[var(--success)]/15" },
    ].map((q) => (
      <div key={q.label} className={`rounded-full px-3 py-1.5 ${q.bg} ${q.border} border`}>
      <span className="mr-1 text-[10px] text-[var(--text-muted)]">{q.label}</span>
      <span className={`text-[11px] font-bold ${q.color}`}>{q.value}</span>
      </div>
    ))}
    </div>
    </div>
    </div>

    {/* STATS */}
    <div className={`mb-5 grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
    <StatCard label="Total livraisons" value={totalLivraisons} color="accent" icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={18} />} />
    <StatCard label="En cours" value={enCours} color="warning" icon={<Icon d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" size={18} />} />
    <StatCard label="Livrés aujourd'hui" value={todayLivres} color="success" icon={<Icon d="M20 6L9 17l-5-5" size={18} />} />
    <StatCard label="Montant du mois" value={formatAr(monthMontant)} color="purple" icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} />} />
    </div>

    {/* RACCOURCIS */}
    <div className={`mb-5 grid gap-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
    {[
      { label: "Nouvelle livraison", icon: "📦", href: "/livraison/livraisons", hoverBorder: "hover:border-[var(--gold)]" },
          { label: "Historique", icon: "📋", href: "/livraison/historique", hoverBorder: "hover:border-[var(--violet)]" },
          { label: "Agents", icon: "👥", href: "/livraison/agents", hoverBorder: "hover:border-[var(--success)]" },
          { label: "Récap", icon: "📊", href: "/livraison/recap", hoverBorder: "hover:border-[var(--gold)]" },
    ].map((r) => (
      <button
      key={r.label}
      type="button"
      onClick={() => router.push(r.href)}
      className={`flex items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left transition-all hover:-translate-y-0.5 ${r.hoverBorder}`}
      >
      <span className="text-xl">{r.icon}</span>
      <span className="text-xs font-semibold text-[var(--text-primary)]">{r.label}</span>
      </button>
    ))}
    </div>

    {/* LIVRAISONS */}
    <Card className="mb-5">
    <CardHeader className="flex items-center justify-between">
    <div className="flex items-center gap-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--gold)]/10">
    <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={14} className="text-[var(--gold)]" />
    </div>
    <CardTitle>Livraisons</CardTitle>
    </div>
    <div className="flex items-center gap-1.5">
    <button
    type="button"
    onClick={() => { const p = new Date(selectedMonth + "-01"); p.setMonth(p.getMonth() - 1); setSelectedMonth(p.toISOString().slice(0, 7)); setActiveTab("mois"); }}
    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)]"
    >‹</button>
    <select
    value={selectedMonth}
    onChange={(e) => { setSelectedMonth(e.target.value); setActiveTab("mois"); }}
    className="min-w-[120px] rounded-full border-[1.5px] border-[var(--gold)] bg-[var(--gold)]/10 px-3 py-1.5 text-center text-xs font-semibold text-[var(--gold)] outline-none"
    >
    {availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
    </select>
    <button
    type="button"
    onClick={() => { const n = new Date(selectedMonth + "-01"); n.setMonth(n.getMonth() + 1); const s = n.toISOString().slice(0, 7); if (s <= currentMonth()) { setSelectedMonth(s); setActiveTab("mois"); } }}
    disabled={selectedMonth >= currentMonth()}
    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-faint)] hover:bg-[var(--bg-card-hover)]"
    >›</button>
    </div>
    </CardHeader>
    <div className="mb-3.5 flex gap-1.5 px-4">
    {(["jour", "mois"] as const).map((tab) => {
      const isActive = activeTab === tab;
      const count = tab === "jour" ? todayLivraisons.length : selectedMonthLivraisons.length;
      return (
        <button
        key={tab}
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${isActive ? "border-[1.5px] border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border-[1.5px] border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-active)] hover:text-[var(--text-secondary)]"}`}
        >
        {tab === "jour" ? `Aujourd'hui (${count})` : `${monthLabel(selectedMonth)} (${count})`}
        </button>
      );
    })}
    </div>
    {activeTab === "jour" ? (
      todayLivraisons.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        <div className="mb-1.5 text-3xl">📦</div>
        Aucune livraison aujourd'hui.
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-4">
        {todayLivraisons.map((l) => (
          <div
          key={l.id}
          className={`flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 border-l-[3px] ${statusBarColor(l.statut)}`}
          >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusBgColor(l.statut)}`}>
          <StatusIcon name={STATUS_OPTIONS.find((s) => s.key === l.statut)?.icon || "clock"} size={16} className={statusTextColor(l.statut)} />
          </div>
          <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[var(--text-primary)]">{l.colis}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}</div>
          </div>
          <div className="whitespace-nowrap rounded-full bg-[var(--gold)]/10 px-2 py-0.5 text-xs font-bold text-[var(--gold)]">
          {l.montant ? formatAr(l.montant) : "—"}
          </div>
          <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
          </div>
        ))}
        </div>
      )
    ) : (
      selectedMonthLivraisons.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        <div className="mb-1.5 text-3xl">📦</div>
        Aucune livraison en {monthLabel(selectedMonth)}.
        </div>
      ) : (
        <div className="px-4 pb-4">
        <div className={`mb-3.5 grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {[
          { label: "Total", value: selectedMonthLivraisons.length, color: "text-[var(--gold)]" },
           { label: "Livrés", value: selectedMonthLivraisons.filter((l) => l.statut === "livre").length, color: "text-[var(--success)]" },
           { label: "En cours", value: selectedMonthLivraisons.filter((l) => l.statut === "en_cours").length, color: "text-[var(--gold)]" },
           { label: "Frais", value: formatAr(monthFrais), color: "text-[var(--violet)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-2 text-center">
          <div className={`text-base font-extrabold ${s.color}`}>{s.value}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
        </div>
        <div className="flex flex-col gap-1.5">
        {selectedMonthLivraisons.map((l) => (
          <div
          key={l.id}
          className={`flex items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2.5 border-l-[3px] ${statusBarColor(l.statut)}`}
          >
          <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${statusBgColor(l.statut)}`}>
          <span className={`text-[13px] font-extrabold leading-none ${statusTextColor(l.statut)}`}>{l.date.split("-")[2]}</span>
          <span className="text-[8px] uppercase text-[var(--text-muted)]">{["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(l.date.split("-")[1]) - 1]}</span>
          </div>
          <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-[var(--text-primary)]">{l.colis}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{l.client_donneur || "—"} → {l.destinataire || "—"}{l.agent_nom ? ` · ${l.agent_nom}` : ""}</div>
          </div>
          <div className="whitespace-nowrap rounded-full bg-[var(--gold)]/10 px-1.5 py-0.5 text-[11px] font-bold text-[var(--gold)]">
          {l.montant ? formatAr(l.montant) : "—"}
          </div>
          <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
          </div>
        ))}
        </div>
        </div>
      )
    )}
    </Card>

    {/* RÉCUPÉRATIONS */}
    <Card className="mb-5">
    <CardHeader className="flex items-center justify-between">
    <div className="flex items-center gap-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--success)]/10">
    <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={14} className="text-[var(--success)]" />
    </div>
    <div>
    <CardTitle>Récupérations matinales</CardTitle>
    <div className="text-2xl font-extrabold text-[var(--success)]">{formatAr(totalRecuperationsJour)}</div>
    <div className="text-[11px] text-[var(--text-muted)]">{nbRecuperationsJour} récupération(s)</div>
    </div>
    </div>
    <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
    </CardHeader>
    {loadingRecup && <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />}
    {errorRecup && <div className="mx-3.5 mb-3.5 rounded-xl bg-[var(--danger)]/10 p-3.5 text-center text-sm text-[var(--danger)]">{errorRecup}</div>}
    {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
      <div className="border-t border-[var(--border-default)] p-3.5">
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
      {Object.values(recuperationsParLivreur).map((rl) => (
        <div key={rl.livreur} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3.5">
        <div className="mb-2 flex justify-between">
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{rl.livreur}</span>
        <span className="text-xs font-bold text-[var(--success)]">{rl.nb} récup. · {formatAr(rl.total)}</span>
        </div>
        {rl.details.map((d, idx) => (
          <div key={idx} className={`flex justify-between py-1 text-[11px] ${idx < rl.details.length - 1 ? "border-b border-[var(--border-default)]" : ""}`}>
          <span className="text-[var(--text-secondary)]">{d.client}</span>
          <span className="font-semibold text-[var(--success)]">{formatAr(d.frais)}</span>
          </div>
        ))}
        </div>
      ))}
      </div>
      </div>
    ) : (
      !loadingRecup && !errorRecup && (
        <div className="py-5 text-center text-sm text-[var(--text-muted)]">Aucune récupération pour cette date.</div>
      )
    )}
    </Card>

    {/* GÉRANT */}
    <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[var(--gold)]/20 bg-gradient-to-br from-[var(--gold)]/5 to-[var(--violet)]/5 p-5">
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--gold)]/10 blur-2xl" />
    <div className="relative z-10">
    <div className="mb-1.5 flex items-center gap-1.5">
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--gold)]">
    <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={12} className="text-[var(--bg-primary)]" />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">Gérant — Aujourd'hui</span>
    </div>
    <div className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{formatAr(gerantGain)}</div>
    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{livsGerant.length} livraisons × {formatAr(commissionGerant)}</div>
    {excludedToday.length > 0 && <div className="mt-0.5 text-[10px] text-[var(--gold)]">⚠️ {excludedToday.length} livraison(s) exclue(s)</div>}
    </div>
    <Button variant="primary" onClick={() => router.push("/livraison/gerant")} className="relative z-10">Voir détails →</Button>
    </div>

    {/* RÉCAP PAR AGENT */}
    <div className="mb-5">
    <div className="mb-3.5 flex items-center justify-between">
    <div className="flex items-center gap-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--violet)]/10">
    <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={14} className="text-[var(--violet)]" />
    </div>
    <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Récap par agent</h2>
    </div>
    <Badge variant="default" size="sm">Tous temps</Badge>
    </div>
    {safeAgents.length === 0 ? (
      <Card className="p-7 text-center">
      <div className="mb-1.5 text-2xl">👥</div>
      <div className="text-sm text-[var(--text-muted)]">Aucun agent enregistré.</div>
      </Card>
    ) : (
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"}`}>
      {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
        <Card key={agent.id} className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-default)] bg-gradient-to-br from-[var(--gold)]/5 to-[var(--violet)]/5 p-3.5">
        <div className="flex items-center gap-2.5">
        <div className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--violet)] text-lg font-extrabold text-[var(--bg-primary)] shadow-[0_0_20px_rgba(201,169,110,0.2)]">
        {agent.nom?.charAt(0) || "?"}
        </div>
        <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-[var(--text-primary)]">{agent.nom}</div>
        <div className="text-[10px] text-[var(--text-muted)]">{ls.length} livraison{ls.length !== 1 ? "s" : ""}</div>
        </div>
        <div className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${taux >= 70 ? "bg-[var(--success)]/10 text-[var(--success)]" : taux >= 40 ? "bg-[var(--gold)]/10 text-[var(--gold)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}>
        {taux}%
        </div>
        </div>
        </div>
        <div className="p-3">
        <div className="mb-2.5 grid grid-cols-4 gap-1.5">
        {[
          { label: "Livrés", value: livres, color: "text-[var(--success)]" },
                                                                                         { label: "Retournés", value: retournes, color: "text-[var(--danger)]" },
                                                                                         { label: "Reportés", value: reportes, color: "text-[var(--violet)]" },
                                                                                         { label: "Frais", value: formatAr(totalFrais), color: "text-[var(--gold)]" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] py-2 text-center">
          <div className={`text-sm font-extrabold leading-none ${item.color}`}>{item.value}</div>
          <div className="mt-0.5 text-[8px] uppercase tracking-wider text-[var(--text-muted)]">{item.label}</div>
          </div>
        ))}
        </div>
        <div>
        <div className="mb-0.5 flex justify-between">
        <span className="text-[9px] text-[var(--text-muted)]">Réussite</span>
        <span className={`text-[9px] font-bold ${taux >= 70 ? "text-[var(--success)]" : taux >= 40 ? "text-[var(--gold)]" : "text-[var(--danger)]"}`}>{taux}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
        className={`h-full rounded-full transition-all duration-500 ${taux >= 70 ? "bg-gradient-to-r from-[var(--success)] to-emerald-500" : taux >= 40 ? "bg-gradient-to-r from-[var(--gold)] to-amber-500" : "bg-gradient-to-r from-[var(--danger)] to-red-500"}`}
        style={{ width: `${taux}%` }}
        />
        </div>
        </div>
        </div>
        </Card>
      ))}
      </div>
    )}
    </div>
    </div>
  );
}
