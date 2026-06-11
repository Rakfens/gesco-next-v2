"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Recuperation as RecupType } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { addRecuperation, deleteRecuperation, getRecuperationsByDate, updateRecuperation } from "../services/recuperationService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  teal: "#2dd4bf", tealDim: "rgba(45,212,191,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface RecupParLivreur {
  livreur: string;
  recuperations: RecupType[];
  totalGain: number;
}

export default function Recuperation() {
  const { agents, showToast } = useApp();
  const isMobile = useIsMobile();

  const [recuperations, setRecuperations] = useState<RecupType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [form, setForm] = useState({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ client_donneur: "", frais_recuperation: 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const safeAgents = Array.isArray(agents) ? agents : [];

  const loadRecuperations = async () => {
    setLoading(true);
    try {
      const data = await getRecuperationsByDate(selectedDate);
      setRecuperations(data || []);
    } catch (error: unknown) {
      logger.error("Erreur chargement:", error);
      showToast("Erreur lors du chargement.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadRecuperations(); }, [selectedDate]);

  // Regrouper par livreur
  const recuperationsParLivreur: Record<string, RecupParLivreur> = useMemo(() => {
    return recuperations.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, recuperations: [], totalGain: 0 };
      acc[nom].recuperations.push(r);
      acc[nom].totalGain += r.frais_recuperation || 0;
      return acc;
    }, {} as Record<string, RecupParLivreur>);
  }, [recuperations]);

  const totalGains = recuperations.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
  const totalRecuperations = recuperations.length;

  const handleAdd = async () => {
    if (!form.livreur_id || !form.client_donneur) { showToast("Livreur et client requis", "error"); return; }
    if (form.frais_recuperation <= 0) { showToast("Le frais doit être > 0", "error"); return; }
    const agent = safeAgents.find((a) => a.id === form.livreur_id);
    if (!agent) { showToast("Livreur invalide", "error"); return; }
    setSaving(true);
    try {
      await addRecuperation({
        date: selectedDate, livreur_id: form.livreur_id, livreur_nom: agent.nom,
        client_donneur: form.client_donneur, frais_recuperation: form.frais_recuperation,
      });
      setForm({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
      await loadRecuperations();
      showToast("Récupération ajoutée");
    } catch (error: unknown) { logger.error("Erreur ajout:", error); showToast("Erreur lors de l'ajout.", "error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (editId === null) return;
    if (editData.frais_recuperation <= 0) { showToast("Le frais doit être > 0", "error"); return; }
    setSaving(true);
    try {
      await updateRecuperation(editId, { frais_recuperation: editData.frais_recuperation });
      setEditId(null);
      await loadRecuperations();
      showToast("Récupération modifiée");
    } catch (error: unknown) { logger.error("Erreur modif:", error); showToast("Erreur lors de la modification.", "error"); }
    finally { setSaving(false); }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    setSaving(true);
    try { await deleteRecuperation(id); await loadRecuperations(); showToast("Récupération supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const agentOptions = useMemo(() => safeAgents.map((a) => ({ value: a.id, label: a.nom })), [safeAgents]);

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.tealDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={18} color={C.teal} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Récupération matinale</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>Frais de récupération par livreur</p>
          </div>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total du jour" value={formatAr(totalGains)} color={C.teal} icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.teal} />} />
        <StatCard label="Récupérations" value={totalRecuperations} color={C.gold} icon={<Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={18} color={C.gold} />} />
        <StatCard label="Livreurs actifs" value={Object.keys(recuperationsParLivreur).length} color={C.violet} icon={<Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} color={C.violet} />} />
      </div>

      {/* ══ SÉLECTEUR DATE ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ maxWidth: 200 }} />
          <Button variant="secondary" size="sm" onClick={loadRecuperations} loading={loading} disabled={loading}>
            Actualiser
          </Button>
        </div>
      </Card>

      {/* ══ FORMULAIRE AJOUT ══ */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader><CardTitle>Ajouter une récupération</CardTitle></CardHeader>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <Select label="Livreur" value={form.livreur_id}
            onChange={(e) => {
              const id = e.target.value;
              const agent = safeAgents.find((a) => a.id === id);
              setForm({ ...form, livreur_id: id, livreur_nom: agent?.nom || "" });
            }}
            options={[{ value: "", label: "-- Choisir --" }, ...agentOptions]} />
          <Input label="Client donneur" placeholder="Ex: SARL TECH" value={form.client_donneur}
            onChange={(e) => setForm({ ...form, client_donneur: e.target.value })} />
          <Input type="number" label="Frais (Ar)" placeholder="1000" value={String(form.frais_recuperation)}
            onChange={(e) => setForm({ ...form, frais_recuperation: Number(e.target.value) || 0 })} />
          <Button variant="success" onClick={handleAdd} loading={saving} disabled={saving}>Ajouter</Button>
        </div>
      </Card>

      {/* ══ LISTE PAR LIVREUR ══ */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>Chargement...</div>
      ) : Object.keys(recuperationsParLivreur).length === 0 ? (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
            Aucune récupération pour cette date.
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.values(recuperationsParLivreur)
            .sort((a, b) => b.totalGain - a.totalGain)
            .map((rl) => (
              <Card key={rl.livreur} padding={0} style={{ overflow: "hidden" }}>
                {/* Header livreur */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(45,212,191,0.06) 0%, rgba(201,169,110,0.04) 100%)",
                  padding: "14px 16px", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "linear-gradient(135deg, #2dd4bf, #c9a96e)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 16, color: "#08080c",
                      boxShadow: "0 4px 12px rgba(45,212,191,0.2)", flexShrink: 0,
                    }}>
                      {rl.livreur.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{rl.livreur}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rl.recuperations.length} récupération{rl.recuperations.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>{formatAr(rl.totalGain)}</div>
                </div>

                {/* Détails */}
                <div style={{ padding: "10px 16px" }}>
                  {rl.recuperations.map((r) => (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{r.client_donneur}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.date}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{formatAr(r.frais_recuperation)}</div>
                      <button onClick={() => { setEditId(r.id); setEditData({ client_donneur: r.client_donneur, frais_recuperation: r.frais_recuperation ?? 0 }); }}
                        style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✏️</button>
                      <button onClick={() => setConfirmDelete(r.id)}
                        style={{ width: 28, height: 28, borderRadius: 6, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🗑</button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ══ MODAL ÉDITION ══ */}
      <Modal open={!!editId} onClose={() => setEditId(null)}>
        <ModalHeader title="Modifier la récupération" onClose={() => setEditId(null)} />
        <ModalBody>
          <div style={{ display: "grid", gap: 10 }}>
            <Input label="Client donneur" value={editData.client_donneur} onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })} />
            <Input type="number" label="Frais (Ar)" value={String(editData.frais_recuperation)} onChange={(e) => setEditData({ ...editData, frais_recuperation: Number(e.target.value) || 0 })} />
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
        <ModalBody><p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cette récupération sera supprimée définitivement.</p></ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
