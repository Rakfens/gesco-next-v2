"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input,
  SkeletonGrid, StatCard, StatusBadge,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT, currentMonth, EXCLUDED_CLIENTS,
  formatAr, monthLabel, shouldCountGerantCommission, TODAY,
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

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e",
  goldDim: "rgba(201,169,110,0.1)",
  violet: "#8b5cf6",
  success: "#34d399",
  successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24",
  warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171",
  dangerDim: "rgba(248,113,113,0.1)",
};

/* ─── SVG Icons ─── */
const Icon = ({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const StatusIcon = ({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: C.warning, activeBg: C.warningDim, icon: "clock" },
  { key: "livre", label: "Livré", color: C.success, activeBg: C.successDim, icon: "check" },
  { key: "retourne", label: "Retourné", color: C.danger, activeBg: C.dangerDim, icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: C.violet, activeBg: "rgba(139,92,246,0.1)", icon: "xmark" },
];

const statusBarColor = (statut?: string) => {
  if (statut === "livre") return C.success;
  if (statut === "retourne") return C.danger;
  if (statut === "reporte") return C.violet;
  return C.warning;
};

/* ─── StatusButtons ─── */
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {STATUS_OPTIONS.map((opt) => {
          const isActive = livraison.statut === opt.key;
          return (
            <button key={opt.key} onClick={() => handleStatusChange(opt.key)} disabled={saving} title={opt.label}
              style={{
                width: 44, height: 44, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isActive ? `2px solid ${opt.color}` : "2px solid var(--border2)",
                background: isActive ? opt.activeBg : "var(--bg-secondary)",
                color: isActive ? opt.color : "var(--text-muted)",
                cursor: saving ? "wait" : "pointer",
                transition: "all var(--transition-fast)",
                boxShadow: isActive ? `0 0 14px ${opt.color}55` : "none",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                opacity: saving ? 0.5 : 1,
              }}
            >
              <StatusIcon name={opt.icon} size={17} color={isActive ? opt.color : "var(--text-muted)"} />
            </button>
          );
        })}
      </div>

      {(showRemarque || needsRemarque) && (
        <div style={{ width: "100%", background: "var(--bg-secondary)", borderRadius: 10, padding: 10, border: "1px solid var(--border)", animation: "fadeUp 0.2s ease" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            {livraison.statut === "retourne" ? "⚠️ Motif du retour" : "📅 Motif du report"}
          </div>
          <textarea value={remarque} onChange={(e) => setRemarque(e.target.value)}
            placeholder={livraison.statut === "retourne" ? "Ex: Client injoignable..." : "Ex: Reporté au lendemain..."}
            style={{ width: "100%", minHeight: 50, padding: "7px 9px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12, fontFamily: "var(--font)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={handleSaveRemarque} disabled={saving || !remarque.trim()}
              style={{ flex: 1, padding: 7, borderRadius: 8, background: remarque.trim() ? C.gold : "var(--bg-tertiary)", color: remarque.trim() ? "#08080c" : "var(--text-faint)", border: "none", fontSize: 11, fontWeight: 700, cursor: remarque.trim() && !saving ? "pointer" : "not-allowed", fontFamily: "var(--font)" }}
            >{saving ? "..." : "✓ OK"}</button>
            <button onClick={() => { setShowRemarque(false); setRemarque(livraison.remarque || ""); }} disabled={saving}
              style={{ padding: "7px 12px", borderRadius: 8, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}
            >Annuler</button>
          </div>
        </div>
      )}

      {editingMontant ? (
        <div style={{ width: "100%", background: "var(--bg-secondary)", borderRadius: 10, padding: 10, border: `1px solid ${C.gold}`, animation: "fadeUp 0.2s ease" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>💰 Modifier montant</div>
          <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant en Ar"
            style={{ width: "100%", padding: "7px 9px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, fontFamily: "var(--font)", outline: "none", boxSizing: "border-box" }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={handleSaveMontant} disabled={saving}
              style={{ flex: 1, padding: 7, borderRadius: 8, background: C.gold, color: "#08080c", border: "none", fontSize: 11, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "var(--font)" }}
            >{saving ? "..." : "✓ OK"}</button>
            <button onClick={() => { setEditingMontant(false); setMontant(String(livraison.montant || "")); }} disabled={saving}
              style={{ padding: "7px 12px", borderRadius: 8, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}
            >Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditingMontant(true)}
          style={{ padding: "3px 8px", borderRadius: 6, background: "transparent", color: "var(--text-faint)", border: "1px solid var(--border)", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font)" }}
        >✏️ Montant</button>
      )}
    </div>
  );
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  const router = useRouter();
  const { agents = [], livraisons = [], showToast, updateLivraison: onUpdateLivraison } = useApp();
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
  }, [safeLivraisons]);

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
      await onUpdateLivraison(id, updates);
      if (updates.statut) {
        const label = STATUS_OPTIONS.find((s) => s.key === updates.statut)?.label || String(updates.statut);
        showToast(updates.remarque ? `${label} — motif enregistré` : `Statut: ${label}`);
      } else if (updates.montant !== undefined) {
        showToast("Montant modifié");
      }
    } catch { showToast("Erreur mise à jour", "error"); }
  };

  useEffect(() => {
    const load = async () => {
      setLoadingRecup(true); setErrorRecup(null);
      try {
        const { getRecuperationsByDate: fetchRecup } = await import("../services/recuperationService");
        setRecuperationsJour(await fetchRecup(selectedDate) || []);
      } catch (e: unknown) { logger.error("Erreur récupérations:", e); setErrorRecup("Erreur lors du chargement."); }
      finally { setLoadingRecup(false); }
    };
    load();
  }, [selectedDate]);

  const { totalRecuperationsJour, nbRecuperationsJour, recuperationsParLivreur } = useMemo(() => {
    const total = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
    const parLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
      acc[nom].total += r.frais_recuperation ?? 0; acc[nom].nb += 1;
      acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
      return acc;
    }, {} as Record<string, RecupParLivreur>);
    return { totalRecuperationsJour: total, nbRecuperationsJour: recuperationsJour.length, recuperationsParLivreur: parLivreur };
  }, [recuperationsJour]);

  const agentStats = useMemo(() => {
    return safeAgents.map((a) => {
      const ls = safeLivraisons.filter((l) => agentMatch(l, a));
      return {
        agent: a, ls,
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
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both" }}>

      {/* ══ HEADER ══ */}
      <div style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.05) 100%)", border: "1px solid var(--border)", borderRadius: 16, padding: isMobile ? "18px 14px" : "24px 28px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #c9a96e, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(201,169,110,0.25)" }}>
              <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={20} color="#08080c" />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", margin: 0 }}>Tableau de bord</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name || "HT-GesCom"} · {TODAY()}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Aujourd'hui", value: `${todayLivraisons.length} livraison${todayLivraisons.length !== 1 ? "s" : ""}`, color: C.gold },
              { label: "Montant du jour", value: formatAr(todayMontant), color: C.success },
              { label: "Taux réussite", value: `${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`, color: C.success },
            ].map((q) => (
              <div key={q.label} style={{ padding: "6px 12px", borderRadius: 99, background: `${q.color}10`, border: `1px solid ${q.color}25` }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 5 }}>{q.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: q.color }}>{q.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total livraisons" value={totalLivraisons} color={C.gold} icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={18} color={C.gold} />} />
        <StatCard label="En cours" value={enCours} color={C.warning} icon={<Icon d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" size={18} color={C.warning} />} />
        <StatCard label="Livrés aujourd'hui" value={todayLivres} color={C.success} icon={<Icon d="M20 6L9 17l-5-5" size={18} color={C.success} />} />
        <StatCard label="Montant du mois" value={formatAr(monthMontant)} color={C.violet} icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.violet} />} />
      </div>

      {/* ══ RACCOURCIS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Nouvelle livraison", icon: "📦", href: "/livraison/livraisons", color: C.gold },
          { label: "Historique", icon: "📋", href: "/livraison/historique", color: C.violet },
          { label: "Agents", icon: "👥", href: "/livraison/agents", color: C.success },
          { label: "Récap", icon: "📊", href: "/livraison/recap", color: C.warning },
        ].map((r) => (
          <button key={r.label} onClick={() => router.push(r.href)}
            style={{ padding: "12px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all var(--transition-fast)", textAlign: "left" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = r.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* ══ LIVRAISONS ══ */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={14} color={C.gold} />
            </div>
            <CardTitle>Livraisons</CardTitle>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => { const p = new Date(selectedMonth + "-01"); p.setMonth(p.getMonth() - 1); setSelectedMonth(p.toISOString().slice(0, 7)); setActiveTab("mois"); }}
              style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>‹</button>
            <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setActiveTab("mois"); }}
              style={{ padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: `1.5px solid ${C.gold}`, background: C.goldDim, color: C.gold, cursor: "pointer", outline: "none", fontFamily: "var(--font)", minWidth: 120, textAlign: "center" }}>
              {availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button onClick={() => { const n = new Date(selectedMonth + "-01"); n.setMonth(n.getMonth() + 1); const s = n.toISOString().slice(0, 7); if (s <= currentMonth()) { setSelectedMonth(s); setActiveTab("mois"); } }} disabled={selectedMonth >= currentMonth()}
              style={{ width: 30, height: 30, borderRadius: 8, background: selectedMonth >= currentMonth() ? "var(--bg-tertiary)" : "var(--bg-secondary)", border: "1px solid var(--border)", color: selectedMonth >= currentMonth() ? "var(--text-faint)" : "var(--text)", cursor: selectedMonth >= currentMonth() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>›</button>
          </div>
        </CardHeader>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: "0 16px" }}>
          {(["jour", "mois"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "jour" ? todayLivraisons.length : selectedMonthLivraisons.length;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "6px 16px", borderRadius: 99, fontSize: 11, fontWeight: 600, border: isActive ? `1.5px solid ${C.gold}` : "1.5px solid var(--border)", background: isActive ? C.goldDim : "transparent", color: isActive ? C.gold : "var(--text-muted)", cursor: "pointer", transition: "all var(--transition-fast)" }}>
                {tab === "jour" ? `Aujourd'hui (${count})` : `${monthLabel(selectedMonth)} (${count})`}
              </button>
            );
          })}
        </div>

        {activeTab === "jour" ? (
          todayLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📦</div>
              Aucune livraison aujourd'hui.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
              {todayLivraisons.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", borderLeft: `3px solid ${statusBarColor(l.statut)}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${statusBarColor(l.statut)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <StatusIcon name={STATUS_OPTIONS.find((s) => s.key === l.statut)?.icon || "clock"} size={16} color={statusBarColor(l.statut)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{l.colis}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, whiteSpace: "nowrap", padding: "3px 8px", background: C.goldDim, borderRadius: 99 }}>{l.montant ? formatAr(l.montant) : "—"}</div>
                  <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                </div>
              ))}
            </div>
          )
        ) : (
          selectedMonthLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📦</div>
              Aucune livraison en {monthLabel(selectedMonth)}.
            </div>
          ) : (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Total", value: selectedMonthLivraisons.length, color: C.gold },
                  { label: "Livrés", value: selectedMonthLivraisons.filter((l) => l.statut === "livre").length, color: C.success },
                  { label: "En cours", value: selectedMonthLivraisons.filter((l) => l.statut === "en_cours").length, color: C.warning },
                  { label: "Frais", value: formatAr(monthFrais), color: C.violet },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedMonthLivraisons.map((l) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", borderLeft: `3px solid ${statusBarColor(l.statut)}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: `${statusBarColor(l.statut)}15`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: statusBarColor(l.statut), lineHeight: 1 }}>{l.date.split("-")[2]}</span>
                      <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>{["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(l.date.split("-")[1]) - 1]}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text)" }}>{l.colis}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{l.client_donneur || "—"} → {l.destinataire || "—"}{l.agent_nom ? ` · ${l.agent_nom}` : ""}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, whiteSpace: "nowrap", padding: "2px 6px", background: C.goldDim, borderRadius: 99 }}>{l.montant ? formatAr(l.montant) : "—"}</div>
                    <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Card>

      {/* ══ RÉCUPÉRATIONS ══ */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.successDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={14} color={C.success} />
            </div>
            <div>
              <CardTitle>Récupérations matinales</CardTitle>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.success, marginTop: 1 }}>{formatAr(totalRecuperationsJour)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{nbRecuperationsJour} récupération(s)</div>
            </div>
          </div>
          <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </CardHeader>
        {loadingRecup && <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />}
        {errorRecup && <div style={{ padding: 14, color: C.danger, textAlign: "center", background: C.dangerDim, borderRadius: 10, margin: "0 14px 14px" }}>{errorRecup}</div>}
        {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: "1px solid var(--border)", padding: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
              {Object.values(recuperationsParLivreur).map((rl) => (
                <div key={rl.livreur} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>{rl.livreur}</span>
                    <span style={{ color: C.success, fontWeight: 700, fontSize: 12 }}>{rl.nb} récup. · {formatAr(rl.total)}</span>
                  </div>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: idx < rl.details.length - 1 ? "1px solid var(--border)" : "none", fontSize: 11 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{d.client}</span>
                      <span style={{ color: C.success, fontWeight: 600 }}>{formatAr(d.frais)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loadingRecup && !errorRecup && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>Aucune récupération pour cette date.</div>
          )
        )}
      </Card>

      {/* ══ GÉRANT ══ */}
      <div style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.04) 100%)", border: "1px solid rgba(201,169,110,0.12)", borderRadius: 16, padding: isMobile ? "16px" : "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={12} color="#08080c" />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>Gérant — Aujourd'hui</span>
          </div>
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.02em" }}>{formatAr(gerantGain)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{livsGerant.length} livraisons × {formatAr(commissionGerant)}</div>
          {excludedToday.length > 0 && <div style={{ fontSize: 10, color: C.warning, marginTop: 2 }}>⚠️ {excludedToday.length} livraison(s) exclue(s)</div>}
        </div>
        <Button variant="primary" onClick={() => router.push("/livraison/gerant")} style={{ position: "relative", zIndex: 1 }}>Voir détails →</Button>
      </div>

      {/* ══ RÉCAP PAR AGENT ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={14} color={C.violet} />
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Récap par agent</h2>
          </div>
          <Badge variant="default" size="sm">Tous temps</Badge>
        </div>

        {safeAgents.length === 0 ? (
          <Card padding={28}>
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
              Aucun agent enregistré.
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <Card key={agent.id} padding={0} style={{ overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.04) 100%)", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #c9a96e, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#08080c", boxShadow: "0 4px 12px rgba(201,169,110,0.2)", flexShrink: 0 }}>
                      {agent.nom?.charAt(0) || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{agent.nom}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{ls.length} livraison{ls.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ padding: "3px 8px", borderRadius: 99, background: taux >= 70 ? C.successDim : taux >= 40 ? C.warningDim : C.dangerDim, color: taux >= 70 ? C.success : taux >= 40 ? C.warning : C.danger, fontSize: 11, fontWeight: 700 }}>{taux}%</div>
                  </div>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
                    {[
                      { label: "Livrés", value: livres, color: C.success },
                      { label: "Retournés", value: retournes, color: C.danger },
                      { label: "Reportés", value: reportes, color: C.violet },
                      { label: "Frais", value: formatAr(totalFrais), color: C.gold },
                    ].map((item) => (
                      <div key={item.label} style={{ textAlign: "center", padding: "8px 3px", background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                        <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Réussite</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: taux >= 70 ? C.success : taux >= 40 ? C.warning : C.danger }}>{taux}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${taux}%`, height: "100%", background: taux >= 70 ? "linear-gradient(90deg, #34d399, #10b981)" : taux >= 40 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" : "linear-gradient(90deg, #f87171, #ef4444)", borderRadius: 3, transition: "width 0.6s ease" }} />
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
