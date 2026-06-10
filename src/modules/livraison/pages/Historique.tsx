"use client";

import { useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import { ClientFeedbackModal } from "@/modules/shared/components/Modals/ClientFeedbackModal";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison } from "@/modules/shared/types";
import { formatAr, PAIE_MODES, STATUTS, TODAY } from "@/modules/shared/utils/constants";
import { printAgentList } from "@/modules/shared/utils/pdfExport";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
};

const statusColor = (statut?: string) => {
  if (statut === "livre") return C.success;
  if (statut === "retourne") return C.danger;
  if (statut === "reporte") return C.violet;
  return C.warning;
};

const StatusIcon = ({ name, size = 13, color = "currentColor" }: { name: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const STATUS_ICONS = [
  { key: "en_cours", label: "En cours", color: C.warning, icon: "clock" },
  { key: "livre", label: "Livré", color: C.success, icon: "check" },
  { key: "retourne", label: "Retourné", color: C.danger, icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: C.violet, icon: "xmark" },
];

const STATUS_OPTIONS = STATUS_ICONS.map(({ key, label }) => ({ value: key, label }));

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) return Number(livraison.agent_id) === Number(agent.id);
  return livraison.agent_nom === agent.nom;
};

interface ClientStat {
  client: string;
  livs: Livraison[];
  totalMontant: number;
  totalFrais: number;
}

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Historique() {
  const { livraisons = [], agents = [], showToast, updateLivraison: onUpdateLivraison, deleteLivraison: onDeleteLivraison } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const logoUrl = currentCompany?.logo_url ? String(currentCompany.logo_url) : null;

  const [histDate, setHistDate] = useState<string>(TODAY());
  const [histAgent, setHistAgent] = useState<string>("tous");
  const [histStatut, setHistStatut] = useState<string>("tous");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Livraison>>({});
  const [fbClient, setFbClient] = useState<string | { client: string; livs: Livraison[] } | null>(null);
  const [fbRecup, setFbRecup] = useState("0");
  const [fbProvince, setFbProvince] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  // Filtrer
  const livsFiltered = useMemo(() => {
    return safeLivraisons.filter((l) =>
      l.date === histDate &&
      (histAgent === "tous" || l.agent_nom === histAgent) &&
      (histStatut === "tous" || l.statut === histStatut)
    );
  }, [safeLivraisons, histDate, histAgent, histStatut]);

  // Stats par agent
  const statsByAgent = useMemo(() => {
    const map: Record<string, { agent: string; count: number; frais: number }> = {};
    livsFiltered.forEach((l) => {
      const nom = l.agent_nom || "—";
      if (!map[nom]) map[nom] = { agent: nom, count: 0, frais: 0 };
      map[nom].count++;
      map[nom].frais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [livsFiltered]);

  // Stats par client
  const statsByClient: ClientStat[] = useMemo(() => {
    const map: Record<string, ClientStat> = {};
    livsFiltered.forEach((l) => {
      const client = l.client_donneur;
      if (!map[client]) map[client] = { client, livs: [], totalMontant: 0, totalFrais: 0 };
      map[client].livs.push(l);
      if (l.paiement !== "client") map[client].totalMontant += Number(l.montant) || 0;
      map[client].totalFrais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalMontant - a.totalMontant);
  }, [livsFiltered]);

  // Stats globales
  const stats = useMemo(() => ({
    total: livsFiltered.length,
    montant: livsFiltered.reduce((s, l) => s + (Number(l.montant) || 0), 0),
    frais: livsFiltered.reduce((s, l) => s + (Number(l.frais) || 0), 0),
    livres: livsFiltered.filter((l) => l.statut === "livre").length,
    enCours: livsFiltered.filter((l) => l.statut === "en_cours").length,
    retournes: livsFiltered.filter((l) => l.statut === "retourne").length,
  }), [livsFiltered]);

  const handleUpdate = async () => {
    if (!editId) return;
    const montant = editData.paiement === "client" ? 0 : parseFloat(String(editData.montant)) || 0;
    setSaving(true);
    try {
      await onUpdateLivraison(editId, { ...editData, montant, frais: parseFloat(String(editData.frais)) || 0 });
      setEditId(null);
      showToast("Livraison mise à jour");
    } catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    setSaving(true);
    try { await onDeleteLivraison(id); showToast("Livraison supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const startEdit = (l: Livraison) => { setEditId(l.id); setEditData({ ...l }); };

  const handleUpdateField = async (id: string, updates: Record<string, unknown>) => {
    setSaving(true);
    try { await onUpdateLivraison(id, updates); showToast("Mis à jour"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violetDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.violet} />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Historique</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name}</p>
            </div>
          </div>
          <Button variant="success" size="sm" onClick={() => {
            const bom = "\uFEFF";
            const header = "Date;Colis;Donneur;Destinataire;Agent;Montant;Frais;Statut\n";
            const rows = livsFiltered.map((l) => [l.date, l.colis, l.client_donneur, l.destinataire, l.agent_nom || "", l.montant || 0, l.frais || 0, STATUTS[l.statut || ""]?.label || ""].join(";")).join("\n");
            const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `historique_${histDate}.csv`; a.click();
            showToast("Export CSV téléchargé");
          }}>📥 Exporter CSV</Button>
        </div>
      </div>

      {/* ══ STATS ══ */}
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

      {/* ══ FILTRES ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
          <Input type="date" label="Date" value={histDate} onChange={(e) => setHistDate(e.target.value)} />
          <Select label="Agent" value={histAgent} onChange={(e) => setHistAgent(e.target.value)}
            options={[{ value: "tous", label: "Tous" }, ...agents.map((a) => ({ value: a.nom, label: a.nom }))]} />
          <Select label="Statut" value={histStatut} onChange={(e) => setHistStatut(e.target.value)}
            options={[{ value: "tous", label: "Tous" }, ...STATUS_OPTIONS]} />
        </div>
      </Card>

      {/* ══ IMPRESSION LISTE LIVREUR ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          🖨️ Imprimer liste livreur
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {safeLivraisons.length > 0 && agents.map((a) => {
            const lsDate = livsFiltered.filter((l) => agentMatch(l, a));
            const lsEnCours = safeLivraisons.filter((l) => agentMatch(l, a) && l.statut === "en_cours");
            const ls = lsDate.length > 0 ? lsDate : lsEnCours;
            if (ls.length === 0) return null;
            const label = lsDate.length > 0 ? `${a.nom} — ${histDate} (${ls.length})` : `${a.nom} — En cours (${ls.length})`;
            return (
              <Button key={a.id} variant="secondary" size="sm" onClick={() => printAgentList(a, ls, lsDate.length > 0 ? histDate : "en cours", logoUrl, currentCompany)}>
                {label}
              </Button>
            );
          })}
          {agents.every((a) => livsFiltered.filter((l) => agentMatch(l, a)).length === 0 && safeLivraisons.filter((l) => agentMatch(l, a) && l.statut === "en_cours").length === 0) && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucune livraison pour cette date.</span>
          )}
        </div>
      </Card>

      {/* ══ FRAIS PAR AGENT ══ */}
      {statsByAgent.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            💰 Frais par agent
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
            {statsByAgent.map((s) => (
              <Card key={s.agent} padding={14} hover>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{s.agent}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.count} livraison{s.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.violet }}>{formatAr(s.frais)}</div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ══ VERSEMENT PAR CLIENT ══ */}
      <ClientFeedbackModal fbClient={fbClient} setFbClient={setFbClient} histDate={histDate} fbRecup={fbRecup} setFbRecup={setFbRecup} fbProvince={fbProvince} setFbProvince={setFbProvince} livraisons={livsFiltered} onClose={() => setFbClient(null)} />

      {statsByClient.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            💵 Versement par client donneur
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {statsByClient.map((cl) => (
              <Card key={cl.client} padding={14}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{cl.client}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: C.success, fontWeight: 700, fontSize: 14 }}>{formatAr(cl.totalMontant)}</span>
                    <Button variant="primary" size="sm" onClick={() => { setFbClient(cl.client); setFbRecup("0"); setFbProvince("0"); }}>📄 PDF</Button>
                  </div>
                </div>
                {cl.livs.map((l) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(l.statut), flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--text)", flex: 1, minWidth: 100 }}>{l.colis}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{l.destinataire}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(l.statut) }}>{STATUTS[l.statut || ""]?.label || l.statut}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{l.montant ? formatAr(l.montant) : "—"}</span>
                    <button onClick={() => startEdit(l)} style={{ padding: "2px 6px", borderRadius: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>✏️</button>
                    <button onClick={() => setConfirmDelete(l.id)} style={{ padding: "2px 6px", borderRadius: 6, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", fontSize: 12 }}>🗑</button>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ══ LISTE COMPLÈTE ══ */}
      {livsFiltered.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            📋 Toutes les livraisons ({livsFiltered.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {livsFiltered.map((l) => {
              const sc = statusColor(l.statut);
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border)", borderLeft: `3px solid ${sc}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${sc}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <StatusIcon name={STATUS_ICONS.find((s) => s.key === l.statut)?.icon || "clock"} size={15} color={sc} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text)" }}>{l.colis}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `${sc}15`, color: sc, textTransform: "uppercase" }}>{STATUTS[l.statut || ""]?.label || l.statut}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{l.client_donneur || "—"} → {l.destinataire || "—"}{l.agent_nom ? ` · ${l.agent_nom}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>{l.montant ? formatAr(l.montant) : "—"}</div>
                  <button onClick={() => startEdit(l)} style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✏️</button>
                  <button onClick={() => setConfirmDelete(l.id)} style={{ width: 28, height: 28, borderRadius: 6, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🗑</button>
                </div>
              );
            })}
          </div>
          {/* Totaux */}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: 10, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Montant total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{formatAr(stats.montant)}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Frais total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.violet }}>{formatAr(stats.frais)}</span>
          </div>
        </Card>
      )}

      {/* ══ EMPTY STATE ══ */}
      {livsFiltered.length === 0 && (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            Aucune livraison pour cette date.
          </div>
        </Card>
      )}

      {/* ══ MODAL ÉDITION ══ */}
      <Modal open={!!editId} onClose={() => setEditId(null)}>
        <ModalHeader title="Modifier la livraison" onClose={() => setEditId(null)} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <Input label="Colis" value={String(editData.colis ?? "")} onChange={(e) => setEditData({ ...editData, colis: e.target.value })} />
            <Input label="Client donneur" value={String(editData.client_donneur ?? "")} onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })} />
            <Input label="Destinataire" value={String(editData.destinataire ?? "")} onChange={(e) => setEditData({ ...editData, destinataire: e.target.value })} />
            <Input label="Lieu" value={String(editData.destinataire_lieu ?? "")} onChange={(e) => setEditData({ ...editData, destinataire_lieu: e.target.value })} />
            <Input type="number" label="Montant (Ar)" value={String(editData.montant ?? "")} onChange={(e) => setEditData({ ...editData, montant: Number(e.target.value) })} />
            <Input type="number" label="Frais (Ar)" value={String(editData.frais ?? "")} onChange={(e) => setEditData({ ...editData, frais: Number(e.target.value) })} />
            <Select label="Statut" value={String(editData.statut ?? "en_cours")} onChange={(e) => setEditData({ ...editData, statut: e.target.value })} options={STATUS_OPTIONS} />
            <Select label="Paiement" value={String(editData.paiement ?? "espece")} onChange={(e) => setEditData({ ...editData, paiement: e.target.value })} options={Object.entries(PAIE_MODES).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Input label="Remarque" value={String(editData.remarque ?? "")} onChange={(e) => setEditData({ ...editData, remarque: e.target.value })} placeholder="Motif du retour, du report..." />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
          <Button variant="primary" onClick={handleUpdate} loading={saving}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody><p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cette action est irréversible.</p></ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
