import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, Input, Select } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useAgents } from "@/modules/shared/hooks/useAgents";
import { useLivraisons } from "@/modules/shared/hooks/useLivraisons";
import { useToast } from "@/modules/shared/hooks/useToast";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import { LivraisonForm } from "../components/LivraisonForm";
import { TODAY, formatAr, STATUTS, PAIE_MODES } from "@/modules/shared/utils/constants";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
};

const statusBarColor = (statut?: string) => {
  if (statut === "livre") return C.success;
  if (statut === "retourne") return C.danger;
  if (statut === "reporte") return C.violet;
  return C.warning;
};

const StatusIcon = ({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: C.warning, icon: "clock" },
  { key: "livre", label: "Livré", color: C.success, icon: "check" },
  { key: "retourne", label: "Retourné", color: C.danger, icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: C.violet, icon: "xmark" },
];

export default function LivraisonsPage() {
  const { currentCompany } = useCompany();
  const { livraisons = [], loading, addLivraison, updateLivraison, deleteLivraison } = useLivraisons();
  const { agents = [] } = useAgents();
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterAgent, setFilterAgent] = useState("tous");
  const [filterDate, setFilterDate] = useState(TODAY());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMontant, setEditMontant] = useState("");
  const [editRemarque, setEditRemarque] = useState("");
  const [saving, setSaving] = useState(false);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  // Filtrer les livraisons
  const filtered = useMemo(() => {
    let result = safeLivraisons;

    // Par date
    if (filterDate) {
      result = result.filter((l) => l.date === filterDate);
    }

    // Par statut
    if (filterStatut !== "tous") {
      result = result.filter((l) => l.statut === filterStatut);
    }

    // Par agent
    if (filterAgent !== "tous") {
      result = result.filter((l) => l.agent_nom === filterAgent || l.agent_id === filterAgent);
    }

    // Recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.colis?.toLowerCase().includes(q) ||
        l.client_donneur?.toLowerCase().includes(q) ||
        l.destinataire?.toLowerCase().includes(q) ||
        l.agent_nom?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [safeLivraisons, filterDate, filterStatut, filterAgent, search]);

  // Stats
  const stats = useMemo(() => ({
    total: filtered.length,
    livres: filtered.filter((l) => l.statut === "livre").length,
    enCours: filtered.filter((l) => l.statut === "en_cours").length,
    retournes: filtered.filter((l) => l.statut === "retourne").length,
    reportes: filtered.filter((l) => l.statut === "reporte").length,
    montant: filtered.reduce((s, l) => s + (Number(l.montant) || 0), 0),
    frais: filtered.reduce((s, l) => s + (Number(l.frais) || 0), 0),
  }), [filtered]);

  const handleStatusUpdate = async (id: string, statut: string, remarque?: string) => {
    setSaving(true);
    try {
      await updateLivraison(id, { statut, ...(remarque !== undefined ? { remarque } : {}) });
      showToast(`Statut: ${STATUTS[statut]?.label || statut}`);
    } catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const handleEditMontant = async (id: string) => {
    if (!editMontant) return;
    setSaving(true);
    try {
      await updateLivraison(id, { montant: parseFloat(editMontant) || 0 });
      showToast("Montant modifié");
      setEditingId(null);
    } catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette livraison ?")) return;
    setSaving(true);
    try {
      await deleteLivraison(id);
      showToast("Livraison supprimée", "warn");
    } catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const startEdit = (l: Livraison) => {
    setEditingId(l.id);
    setEditMontant(String(l.montant || ""));
    setEditRemarque(l.remarque || "");
  };

  if (loading) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)" }}>
        Chargement des livraisons...
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={18} color={C.gold} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Livraisons</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>
              {currentCompany?.name} · {filtered.length} livraison{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ══ STATS RAPIDES ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total", value: stats.total, color: C.gold },
          { label: "Livrés", value: stats.livres, color: C.success },
          { label: "En cours", value: stats.enCours, color: C.warning },
          { label: "Montant", value: formatAr(stats.montant), color: C.violet },
        ].map((s) => (
          <div key={s.label} style={{ padding: "12px 14px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ BOUTON NOUVELLE LIVRAISON ══ */}
      <button onClick={() => setShowForm(!showForm)}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, marginBottom: 16,
          background: showForm ? "var(--bg-secondary)" : `linear-gradient(135deg, ${C.gold}, #a68b4b)`,
          color: showForm ? "var(--text)" : "#08080c",
          border: showForm ? "1px solid var(--border)" : "none",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "var(--font)", transition: "all var(--transition-fast)",
        }}
      >
        {showForm ? "✕ Fermer" : "＋ Nouvelle livraison"}
      </button>

      {/* ══ FORMULAIRE ══ */}
      {showForm && (
        <div style={{ marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <LivraisonForm
            agents={agents}
            onAddLivraison={async (data) => {
              try {
                await addLivraison(data);
                showToast("Livraison enregistrée");
                setShowForm(false);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Erreur";
                showToast(msg, "error");
              }
            }}
            showToast={showToast}
            suggestions={{
              colisList: [...new Set(safeLivraisons.map((l) => l.colis).filter((c): c is string => !!c))],
              clients: [...new Set(safeLivraisons.map((l) => l.client_donneur).filter((c): c is string => !!c))],
              lieux: [...new Set(safeLivraisons.map((l) => l.destinataire_lieu).filter((c): c is string => !!c))],
            }}
          />
        </div>
      )}

      {/* ══ FILTRES ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 10 }}>
          <Input
            type="date" label="Date" value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <Select label="Statut" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
            options={[
              { value: "tous", label: "Tous les statuts" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.key, label: s.label })),
            ]}
          />
          <Select label="Agent" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
            options={[
              { value: "tous", label: "Tous les agents" },
              ...agents.map((a) => ({ value: a.nom, label: a.nom })),
            ]}
          />
          <Input
            label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Colis, client, destinataire..."
          />
        </div>
      </Card>

      {/* ══ LISTE DES LIVRAISONS ══ */}
      {filtered.length === 0 ? (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            {safeLivraisons.length === 0 ? "Aucune livraison enregistrée." : "Aucun résultat pour ces filtres."}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((l) => {
            const isEditing = editingId === l.id;
            const statutColor = statusBarColor(l.statut);
            const statutIcon = STATUS_OPTIONS.find((s) => s.key === l.statut)?.icon || "clock";

            return (
              <Card key={l.id} padding={0} style={{ overflow: "hidden", borderLeft: `4px solid ${statutColor}` }}>
                <div style={{ padding: isMobile ? "12px" : "14px 16px" }}>
                  {/* Ligne principale */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Icône statut */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${statutColor}15`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <StatusIcon name={statutIcon} size={18} color={statutColor} />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{l.colis}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                          background: `${statutColor}15`, color: statutColor, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                          {STATUTS[l.statut || ""]?.label || l.statut || "—"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {l.client_donneur || "—"} → {l.destinataire || "—"}
                        {l.agent_nom ? <span style={{ color: C.gold }}> · 🚚 {l.agent_nom}</span> : ""}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>
                        {l.date} {l.destinataire_lieu ? `· 📍 ${l.destinataire_lieu}` : ""}
                      </div>
                    </div>

                    {/* Montant */}
                    <div style={{ textAlign: "right" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="number" value={editMontant} onChange={(e) => setEditMontant(e.target.value)}
                            style={{ width: 90, padding: "5px 8px", background: "var(--card)", border: `1px solid ${C.gold}`, borderRadius: 8, color: "var(--text)", fontSize: 12, fontFamily: "var(--font)", outline: "none" }}
                            autoFocus
                          />
                          <button onClick={() => handleEditMontant(l.id)} disabled={saving}
                            style={{ padding: "5px 10px", borderRadius: 8, background: C.gold, color: "#08080c", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditingId(null)}
                            style={{ padding: "5px 10px", borderRadius: 8, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 11, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{l.montant ? formatAr(l.montant) : "—"}</div>
                          {l.frais ? <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Frais: {formatAr(l.frais)}</div> : null}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(l)} title="Modifier"
                        style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✏️</button>
                      <button onClick={() => handleDelete(l.id)} title="Supprimer"
                        style={{ width: 32, height: 32, borderRadius: 8, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑</button>
                    </div>
                  </div>

                  {/* Remarque si présente */}
                  {l.remarque && (
                    <div style={{ marginTop: 8, padding: "6px 10px", background: "var(--bg)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", borderLeft: `2px solid ${C.warning}` }}>
                      📝 {l.remarque}
                    </div>
                  )}

                  {/* Boutons de changement de statut */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    {STATUS_OPTIONS.map((opt) => {
                      const isActive = l.statut === opt.key;
                      return (
                        <button key={opt.key} onClick={() => handleStatusUpdate(l.id, opt.key)} disabled={saving || isActive}
                          style={{
                            flex: 1, padding: "7px 4px", borderRadius: 8,
                            border: isActive ? `2px solid ${opt.color}` : "1px solid var(--border)",
                            background: isActive ? `${opt.color}15` : "transparent",
                            color: isActive ? opt.color : "var(--text-muted)",
                            fontSize: 10, fontWeight: isActive ? 700 : 500,
                            cursor: isActive ? "default" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                            fontFamily: "var(--font)", transition: "all var(--transition-fast)",
                            opacity: isActive ? 1 : 0.7,
                          }}
                        >
                          <StatusIcon name={opt.icon} size={12} color={isActive ? opt.color : "var(--text-muted)"} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
