// src/modules/livraison/pages/Recuperation.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Recuperation as RecupType } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import {
  addRecuperation, deleteRecuperation, getRecuperationsByDate, updateRecuperation,
} from "../services/recuperationService";

interface RecupParLivreur {
  livreur: string;
  recuperations: RecupType[];
  totalGain: number;
}

/* ─── SVG Icons ─── */
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" />
  </svg>
);
const CashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default function Recuperation() {
  const { agents, showToast } = useApp();
  const isMobile = useIsMobile();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [recuperations, setRecuperations] = useState<RecupType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [form, setForm] = useState({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ client_donneur: "", frais_recuperation: 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const safeAgents = Array.isArray(agents) ? agents : [];

  const loadRecuperations = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getRecuperationsByDate(selectedDate, companyId);
      setRecuperations(data || []);
    } catch (error: unknown) {
      logger.error("Erreur chargement:", error);
      showToast("Erreur lors du chargement.", "error");
    } finally { setLoading(false); }
  }, [selectedDate, companyId, showToast]);

  useEffect(() => { loadRecuperations(); }, [loadRecuperations]);

  const recuperationsParLivreur = useMemo(() => {
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
  const nbLivreurs = Object.keys(recuperationsParLivreur).length;
  const moyenneParLivreur = nbLivreurs > 0 ? Math.round(totalGains / nbLivreurs) : 0;

  const handleAdd = async () => {
    if (!companyId) { showToast("Aucune société sélectionnée", "error"); return; }
    if (!form.livreur_id || !form.client_donneur) { showToast("Livreur et client requis", "error"); return; }
    if (form.frais_recuperation <= 0) { showToast("Le frais doit être > 0", "error"); return; }
    const agent = safeAgents.find((a) => a.id === form.livreur_id);
    if (!agent) { showToast("Livreur invalide", "error"); return; }
    setSaving(true);
    try {
      await addRecuperation({ date: selectedDate, livreur_id: form.livreur_id, livreur_nom: agent.nom, client_donneur: form.client_donneur, frais_recuperation: form.frais_recuperation }, companyId);
      setForm({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
      await loadRecuperations();
      showToast("Récupération ajoutée");
    } catch (error: unknown) {
      logger.error("Erreur ajout:", error); showToast("Erreur lors de l'ajout.", "error");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!companyId) { showToast("Aucune société sélectionnée", "error"); return; }
    if (editId === null) return;
    if (editData.frais_recuperation <= 0) { showToast("Le frais doit être > 0", "error"); return; }
    setSaving(true);
    try {
      await updateRecuperation(editId, { frais_recuperation: editData.frais_recuperation }, companyId);
      setEditId(null); await loadRecuperations();
      showToast("Récupération modifiée");
    } catch (error: unknown) {
      logger.error("Erreur modif:", error); showToast("Erreur lors de la modification.", "error");
    } finally { setSaving(false); }
  };

  const executeDelete = async () => {
    if (!companyId) { showToast("Aucune société sélectionnée", "error"); return; }
    if (!confirmDelete) return;
    const id = confirmDelete; setConfirmDelete(null); setSaving(true);
    try { await deleteRecuperation(id, companyId); await loadRecuperations(); showToast("Récupération supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const agentOptions = useMemo(() => safeAgents.map((a) => ({ value: a.id, label: a.nom })), [safeAgents]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-5"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(201,169,110,0.03) 100%)",
          border: "1px solid rgba(52,211,153,0.08)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(52,211,153,0.05)" }} />
        <div className="relative z-10 flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0"
            style={{
              border: "2px solid rgba(52,211,153,0.2)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 20px rgba(52,211,153,0.06)",
            }}
          >
            <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Récupération matinale
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Frais de récupération par livreur · {selectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        <StatCard label="Total du jour" value={formatAr(totalGains)} color="success" icon={<CashIcon />} sub={`${totalRecuperations} récup.${totalRecuperations !== 1 ? "s" : ""}`} />
        <StatCard label="Récupérations" value={totalRecuperations} color="accent" icon={<RefreshIcon />} />
        <StatCard label="Livreurs actifs" value={nbLivreurs} color="purple" icon={<UsersIcon />} />
        <StatCard label="Moyenne/livreur" value={formatAr(moyenneParLivreur)} color="info" icon={<BoxIcon />} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          DATE + REFRESH
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-xl p-4" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(52,211,153,0.08)", color: "var(--success)" }}>
            <CalendarIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Date</span>
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          <Input type="date" label="Sélectionner une date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="max-w-[200px]" />
          <Button variant="secondary" size="sm" onClick={loadRecuperations} loading={loading} disabled={loading} icon={<RefreshIcon />}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          FORMULAIRE AJOUT
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-xl overflow-hidden" style={{ ...sectionStyle(0.2), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(52,211,153,0.03)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(52,211,153,0.1)", color: "var(--success)" }}>
              <PlusIcon />
            </div>
            <CardTitle className="text-sm">Ajouter une récupération</CardTitle>
          </div>
        </div>
        <div className="p-4">
          <div className={`grid gap-3 items-end ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_1fr_auto]"}`}>
            <Select
              label="Livreur"
              value={form.livreur_id}
              onChange={(e) => {
                const id = e.target.value;
                const agent = safeAgents.find((a) => a.id === id);
                setForm({ ...form, livreur_id: id, livreur_nom: agent?.nom || "" });
              }}
              options={[{ value: "", label: "-- Choisir --" }, ...agentOptions]}
            />
            <Input label="Client donneur" placeholder="Ex: SARL TECH" value={form.client_donneur} onChange={(e) => setForm({ ...form, client_donneur: e.target.value })} />
            <Input type="number" label="Frais (Ar)" placeholder="1000" value={String(form.frais_recuperation)} onChange={(e) => setForm({ ...form, frais_recuperation: Number(e.target.value) || 0 })} />
            <Button variant="success" onClick={handleAdd} loading={saving} disabled={saving} icon={<PlusIcon />}>
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LISTE PAR LIVREUR
          ═══════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 rounded-2xl" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--success)" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement...</span>
        </div>
      ) : Object.keys(recuperationsParLivreur).length === 0 ? (
        <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="text-5xl mb-3">🔄</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune récupération pour cette date.</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Ajoutez une récupération ci-dessus.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.values(recuperationsParLivreur)
            .sort((a, b) => b.totalGain - a.totalGain)
            .map((rl, idx) => (
              <div
                key={rl.livreur}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  ...sectionStyle(0.25 + idx * 0.04),
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-card)",
                }}
              >
                {/* Livreur header */}
                <div className="px-4 py-3.5" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.04) 0%, rgba(201,169,110,0.02) 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold shrink-0"
                        style={{
                          background: "linear-gradient(135deg, var(--success), var(--gold))",
                          color: "var(--bg-primary)",
                          boxShadow: "0 0 12px rgba(52,211,153,0.15)",
                        }}
                      >
                        {rl.livreur.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{rl.livreur}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(52,211,153,0.08)", color: "var(--success)" }}>
                            {rl.recuperations.length} récup.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total</div>
                      <div className="text-xl font-extrabold" style={{ color: "var(--success)" }}>{formatAr(rl.totalGain)}</div>
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  {rl.recuperations.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150" style={{ borderColor: "var(--border-subtle)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{r.client_donneur}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{r.date}</div>
                      </div>
                      <div className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(52,211,153,0.06)", color: "var(--success)" }}>
                        {formatAr(r.frais_recuperation)}
                      </div>
                      <button
                        onClick={() => { setEditId(r.id); setEditData({ client_donneur: r.client_donneur, frais_recuperation: r.frais_recuperation ?? 0 }); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center btn-press transition-colors"
                        style={{ border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center btn-press transition-colors"
                        style={{ border: "1px solid rgba(248,113,113,0.12)", color: "var(--danger)", background: "rgba(248,113,113,0.03)" }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL ÉDITION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!editId} onClose={() => setEditId(null)}>
        <ModalHeader title="Modifier la récupération" onClose={() => setEditId(null)} />
        <ModalBody>
          <div className="grid gap-3">
            <Input label="Client donneur" value={editData.client_donneur} onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })} />
            <Input type="number" label="Frais (Ar)" value={String(editData.frais_recuperation)} onChange={(e) => setEditData({ ...editData, frais_recuperation: Number(e.target.value) || 0 })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
          <Button variant="primary" onClick={handleUpdate} loading={saving}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL SUPPRESSION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Cette récupération sera supprimée définitivement.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
