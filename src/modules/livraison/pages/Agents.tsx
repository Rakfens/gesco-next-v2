"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Recuperation } from "@/modules/shared/types";
import { currentMonth, formatAr, monthLabel } from "@/modules/shared/utils/constants";
import { getRecuperationsByLivreurNom, getTotalRecuperationsByLivreurNom } from "../services/recuperationService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface RecupMois { total: number; count: number; details: Recuperation[]; }
interface RecupCumul { total: number; count: number; }

export default function Agents() {
  const { agents, addAgent: onAddAgent, updateAgent: onUpdateAgent, deleteAgent: onDeleteAgent, showToast } = useApp();
  const isMobile = useIsMobile();

  const [newNom, setNewNom] = useState("");
  const [newSalaire, setNewSalaire] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nom: string; salaire: string }>({ nom: "", salaire: "" });
  const [month, setMonth] = useState(currentMonth());
  const [recupsMois, setRecupsMois] = useState<Record<string, RecupMois>>({});
  const [recupsCumul, setRecupsCumul] = useState<Record<string, RecupCumul>>({});
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const safeAgents = Array.isArray(agents) ? agents : [];

  const loadRecuperations = useCallback(async () => {
    if (!safeAgents.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(safeAgents.map(async (agent) => {
        const [dataMois, { total: totalCumul, count: countCumul }] = await Promise.all([
          getRecuperationsByLivreurNom(agent.nom, month),
          getTotalRecuperationsByLivreurNom(agent.nom),
        ]);
        return {
          id: agent.id,
          mois: { total: dataMois.reduce((s: number, r: Recuperation) => s + (r.frais_recuperation || 0), 0), count: dataMois.length, details: dataMois },
          cumul: { total: totalCumul, count: countCumul },
        };
      }));
      const moisMap: Record<string, RecupMois> = {};
      const cumulMap: Record<string, RecupCumul> = {};
      results.forEach((r) => { moisMap[r.id] = r.mois; cumulMap[r.id] = r.cumul; });
      setRecupsMois(moisMap);
      setRecupsCumul(cumulMap);
    } catch (error: unknown) { logger.error("Erreur récupérations:", error); }
    finally { setLoading(false); }
  }, [safeAgents, month]);

  useEffect(() => { loadRecuperations(); }, [loadRecuperations]);

  const uniqueMonths = useMemo(() => {
    const s = new Set<string>();
    s.add(currentMonth());
    return [...s].sort().reverse();
  }, []);

  const handleAdd = async () => {
    if (!newNom.trim() || !newSalaire) { showToast("Nom et salaire requis", "error"); return; }
    setSaving(true);
    try {
      await onAddAgent(newNom, newSalaire);
      setNewNom(""); setNewSalaire("");
      showToast("Agent ajouté");
    } catch (err: unknown) { logger.error("Erreur ajout:", err); showToast("Erreur lors de l'ajout.", "error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editId || !editData.nom || !editData.salaire) return;
    setSaving(true);
    try {
      await onUpdateAgent(editId, { nom: editData.nom, salaire: parseFloat(editData.salaire) });
      setEditId(null); setEditData({ nom: "", salaire: "" });
      showToast("Agent modifié");
    } catch (err: unknown) { logger.error("Erreur modif:", err); showToast("Erreur lors de la modification.", "error"); }
    finally { setSaving(false); }
  };

  const startEdit = (agent: Agent) => {
    setEditId(agent.id);
    setEditData({ nom: agent.nom, salaire: String(agent.salaire ?? 0) });
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setConfirmDel(null);
    setSaving(true);
    try { await onDeleteAgent(id); showToast("Agent supprimé", "warn"); }
    catch (err: unknown) { logger.error("Erreur suppression:", err); showToast("Erreur lors de la suppression.", "error"); }
    finally { setSaving(false); }
  };

  // Stats
  const totalSalaire = safeAgents.reduce((s, a) => s + (Number(a.salaire) || 0), 0);
  const totalRecupMois = Object.values(recupsMois).reduce((s, r) => s + r.total, 0);

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.successDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} color={C.success} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Agents</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{safeAgents.length} agent(s) enregistré(s)</p>
          </div>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total agents" value={safeAgents.length} color={C.success} icon={<Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} color={C.success} />} />
        <StatCard label="Salaires mensuels" value={formatAr(totalSalaire)} color={C.gold} icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.gold} />} />
        <StatCard label="Récup. du mois" value={formatAr(totalRecupMois)} color={C.violet} icon={<Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={18} color={C.violet} />} />
      </div>

      {/* ══ FORMULAIRE AJOUT ══ */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader>
          <CardTitle>Ajouter un agent</CardTitle>
        </CardHeader>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <Input placeholder="Nom complet" value={newNom} onChange={(e) => setNewNom(e.target.value)} />
          <Input type="number" placeholder="Salaire (Ar)" value={newSalaire} onChange={(e) => setNewSalaire(e.target.value)} />
          <Button variant="primary" onClick={handleAdd} loading={saving} disabled={saving}>Ajouter</Button>
        </div>
      </Card>

      {/* ══ SÉLECTEUR MOIS ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Select value={month} onChange={(e) => setMonth(e.target.value)}
          options={uniqueMonths.map((m) => ({ value: m, label: monthLabel(m) }))}
          style={{ maxWidth: 180 }} />
        <Button variant="secondary" size="sm" onClick={loadRecuperations} loading={loading} disabled={loading}>
          Actualiser
        </Button>
      </div>

      {/* ══ LISTE DES AGENTS ══ */}
      {safeAgents.length === 0 ? (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            Aucun agent enregistré.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {safeAgents.map((a) => {
            const rm = recupsMois[a.id] || { total: 0, count: 0, details: [] };
            const rc = recupsCumul[a.id] || { total: 0, count: 0 };
            const isEditing = editId === a.id;

            return (
              <Card key={a.id} padding={0} style={{ overflow: "hidden" }}>
                {/* Header */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(201,169,110,0.04) 100%)",
                  padding: "14px 16px", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #34d399, #c9a96e)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 18, color: "#08080c",
                      boxShadow: "0 4px 12px rgba(52,211,153,0.2)", flexShrink: 0,
                    }}>
                      {a.nom?.charAt(0) || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{a.nom}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatAr(a.salaire)} / mois</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => startEdit(a)} title="Modifier"
                        style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✏️</button>
                      <button onClick={() => setConfirmDel({ id: a.id, name: a.nom })} title="Supprimer"
                        style={{ width: 30, height: 30, borderRadius: 8, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🗑</button>
                    </div>
                  </div>
                </div>

                {/* Edition inline */}
                {isEditing && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", animation: "fadeUp 0.2s ease" }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <Input value={editData.nom} onChange={(e) => setEditData({ ...editData, nom: e.target.value })} placeholder="Nom" />
                      <Input type="number" value={editData.salaire} onChange={(e) => setEditData({ ...editData, salaire: e.target.value })} placeholder="Salaire" />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="success" size="sm" onClick={handleUpdate} loading={saving} style={{ flex: 1 }}>Sauver</Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditId(null)}>Annuler</Button>
                    </div>
                  </div>
                )}

                {/* Récupérations du mois */}
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.warning, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      📅 {monthLabel(month)}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{rm.count} récup.</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>{formatAr(rm.total)}</span>
                    </div>
                  </div>

                  {rm.details.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, marginBottom: 8 }}>
                      {rm.details.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{r.date} · {r.client_donneur}</span>
                          <span style={{ color: C.success, fontWeight: 600 }}>{formatAr(r.frais_recuperation)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cumul total */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", background: "var(--bg)", borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      💰 Cumul total
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{rc.count} récup.</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{formatAr(rc.total)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <ModalHeader title="Supprimer l'agent ?" onClose={() => setConfirmDel(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {confirmDel?.name} et toutes ses données seront supprimés définitivement.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDel(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
