"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Badge, Button, Card, CardHeader, CardTitle, ConfirmDialog, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, SkeletonTable, StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit } from "@/modules/shared/types";
import { UNITES } from "@/modules/shared/utils/constants";
import { formatAr } from "@/modules/shared/utils/constants";
import { createProduit, deleteProduit, fetchCategories, fetchProduits, updateProduit, updateStock } from "../services/produitService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ─── ProduitCard (mobile) ─── */
function ProduitCard({ p, onEdit, onMovement, onHistory, onDelete }: {
  p: Produit; onEdit: (p: Produit) => void; onMovement: (p: Produit) => void; onHistory: (p: Produit) => void; onDelete: (p: Produit) => void;
}) {
  const marge = p.prix_vente && p.prix_achat ? (((p.prix_vente - p.prix_achat) / p.prix_achat) * 100).toFixed(0) : null;
  const isOut = (p.quantite_stock ?? 0) === 0;
  const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
  const statusVariant = isOut ? "danger" as const : isLow ? "warning" as const : "success" as const;
  const statusLabel = isOut ? "Rupture" : isLow ? "Stock bas" : "OK";
  const stockColor = isOut ? C.danger : isLow ? C.warning : "var(--text)";

  return (
    <Card padding={0} style={{ overflow: "hidden", borderLeft: `4px solid ${isOut ? C.danger : isLow ? C.warning : C.success}` }}>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</div>
            {p.reference && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Réf: {p.reference}</div>}
            {p.categorie && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: C.violetDim, color: C.violet, marginRight: 4 }}>{p.categorie}</span>}
          </div>
          <Badge variant={statusVariant} size="sm">{statusLabel}</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
          {[
            { l: "ACHAT", v: formatAr(p.prix_achat), color: C.orange },
            { l: "VENTE", v: formatAr(p.prix_vente), color: C.success },
            { l: "STOCK", v: `${p.quantite_stock} ${p.unite || ""}`, color: stockColor },
          ].map((r) => (
            <div key={r.l} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{r.l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.v}</div>
            </div>
          ))}
        </div>
        {marge !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Marge :</span>
            <Badge variant={Number(marge) >= 20 ? "success" : Number(marge) >= 0 ? "warning" : "danger"} size="sm">{marge}%</Badge>
            {(p.stock_minimum ?? 0) > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>Min: {p.stock_minimum}</span>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          <Button variant="secondary" size="sm" onClick={() => onEdit(p)}>✏️</Button>
          <Button variant="primary" size="sm" onClick={() => onMovement(p)}>📦</Button>
          <Button variant="ghost" size="sm" onClick={() => onHistory(p)} style={{ color: C.violet }}>📋</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(p)}>🗑️</Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Composant principal ─── */
export default function Stock() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [mouvements, setMouvements] = useState<Array<{ id: string; type: string; quantite: number; notes?: string; date_mouvement?: string }>>([]);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");

  const [form, setForm] = useState({ nom: "", reference: "", categorie: "", prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: "pièce" });
  const [movementForm, setMovementForm] = useState({ type: "entree", quantite: 0, notes: "" });

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([fetchProduits(), fetchCategories()]);
      setProduits(pd); setCategories(cd);
    } catch (e: unknown) { logger.error("Erreur chargement:", e); toastError("Erreur chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);
  useEffect(() => {
    const handler = (e: Event) => { if (["produits", "mouvements_stock"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const loadMouvements = async (produitId: string) => {
    if (!currentCompany) return;
    try {
      const { data, error } = await getSupabase().from("mouvements_stock").select("*, produit:produits(id,nom)").eq("produit_id", produitId).eq("company_id", currentCompany.id).order("date_mouvement", { ascending: false }).limit(50);
      if (error) throw error;
      setMouvements(data || []);
    } catch { toastError("Erreur historique"); }
  };

  const resetForm = () => { setForm({ nom: "", reference: "", categorie: "", prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: "pièce" }); setEditMode(false); setSelectedProduit(null); };
  const resetMovForm = () => { setMovementForm({ type: "entree", quantite: 0, notes: "" }); setSelectedProduit(null); };

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toastWarn("Nom du produit requis"); return; }
    setSaving(true);
    try {
      if (editMode && selectedProduit) { await updateProduit(selectedProduit.id, form); toastSuccess("Produit modifié"); }
      else { await createProduit(form); toastSuccess("Produit créé"); }
      setShowModal(false); resetForm(); loadData();
    } catch { toastError("Erreur sauvegarde"); }
    finally { setSaving(false); }
  };

  const handleMovement = async () => {
    if (!selectedProduit) return;
    if (movementForm.quantite <= 0) { toastWarn("Quantité > 0 requise"); return; }
    const newQty = movementForm.type === "entree" ? (selectedProduit.quantite_stock ?? 0) + movementForm.quantite : (selectedProduit.quantite_stock ?? 0) - movementForm.quantite;
    if (newQty < 0) { toastWarn("Stock insuffisant"); return; }
    setSaving(true);
    try {
      await updateStock(selectedProduit.id, newQty, movementForm.notes || movementForm.type);
      toastSuccess(movementForm.type === "entree" ? `+${movementForm.quantite} ajouté` : `-${movementForm.quantite} sorti`);
      setShowMovementModal(false); resetMovForm(); loadData();
    } catch { toastError("Erreur mouvement"); }
    finally { setSaving(false); }
  };

  const handleDeleteProduit = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) > 0) { toastWarn(`Impossible : "${produit.nom}" a encore ${produit.quantite_stock} unité(s)`); return; }
    setConfirmDelete(produit.id);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const produit = produits.find((p) => p.id === confirmDelete);
    if (!produit) return;
    setConfirmDelete(null);
    try { await deleteProduit(produit.id); toastSuccess(`"${produit.nom}" supprimé`); loadData(); }
    catch { toastError("Erreur suppression"); }
  };

  const editProduit = (produit: Produit) => {
    setSelectedProduit(produit);
    setForm({ nom: produit.nom, reference: produit.reference || "", categorie: produit.categorie || "", prix_achat: produit.prix_achat ?? 0, prix_vente: produit.prix_vente ?? 0, quantite_stock: produit.quantite_stock ?? 0, stock_minimum: produit.stock_minimum ?? 0, unite: produit.unite ?? "pièce" });
    setEditMode(true); setShowModal(true);
  };

  const handleViewHistory = async (produit: Produit) => { setSelectedProduit(produit); await loadMouvements(produit.id); setShowHistoryModal(true); };

  const filtered = useMemo(() => {
    return produits.filter((p) => {
      if (filter && !p.nom.toLowerCase().includes(filter.toLowerCase()) && !(p.reference || "").toLowerCase().includes(filter.toLowerCase())) return false;
      if (categorieFilter && p.categorie !== categorieFilter) return false;
      return true;
    });
  }, [produits, filter, categorieFilter]);

  const stats = useMemo(() => ({
    total: produits.length,
    low: produits.filter((p) => (p.quantite_stock ?? 0) > 0 && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0)).length,
    out: produits.filter((p) => p.quantite_stock === 0).length,
    valeur: produits.reduce((s, p) => s + (Number(p.prix_achat) || 0) * (p.quantite_stock || 0), 0),
  }), [produits]);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c, label: c })), [categories]);
  const uniteOptions = UNITES;

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ MODALS ══ */}
      <ConfirmDialog open={!!confirmDelete} title="Supprimer le produit ?" message="Ce produit sera supprimé définitivement." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.blue} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Stock</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {produits.length} produit(s)</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>＋ Nouveau</Button>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total produits" value={stats.total} color={C.blue} icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.blue} />} />
        <StatCard label="Stock bas" value={stats.low} color={C.warning} icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} color={C.warning} />} />
        <StatCard label="Rupture" value={stats.out} color={C.danger} icon={<Icon d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" size={18} color={C.danger} />} />
        <StatCard label="Valeur stock" value={formatAr(stats.valeur)} color={C.gold} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.gold} />} />
      </div>

      {/* ══ FILTRES ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto", gap: 8, alignItems: "end" }}>
          <Input placeholder="Rechercher un produit..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Select placeholder="Toutes catégories" value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)} options={[{ value: "", label: "Toutes" }, ...categoryOptions]} />
          {(filter || categorieFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilter(""); setCategorieFilter(""); }}>✕ Effacer</Button>
          )}
        </div>
      </Card>

      {/* ══ LISTE ══ */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 ? (
            <Card padding={40}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                {produits.length === 0 ? "Aucun produit enregistré." : "Aucun résultat pour ces filtres."}
              </div>
            </Card>
          ) : filtered.map((p) => (
            <ProduitCard key={p.id} p={p} onEdit={editProduit} onMovement={(pr) => { setSelectedProduit(pr); setShowMovementModal(true); }} onHistory={handleViewHistory} onDelete={handleDeleteProduit} />
          ))}
        </div>
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Produit</TableHeader>
                <TableHeader>Catégorie</TableHeader>
                <TableHeader align="right">Prix achat</TableHeader>
                <TableHeader align="right">Prix vente</TableHeader>
                <TableHeader align="right">Stock</TableHeader>
                <TableHeader align="center">Statut</TableHeader>
                <TableHeader align="center">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={7} message={produits.length === 0 ? "Aucun produit" : "Aucun résultat"} />
              ) : filtered.map((p) => {
                const isOut = (p.quantite_stock ?? 0) === 0;
                const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
                      {p.reference && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Réf: {p.reference}</div>}
                    </TableCell>
                    <TableCell>{p.categorie ? <Badge variant="purple" size="sm">{p.categorie}</Badge> : "—"}</TableCell>
                    <TableCell align="right" style={{ color: C.orange, fontWeight: 600 }}>{formatAr(p.prix_achat)}</TableCell>
                    <TableCell align="right" style={{ color: C.success, fontWeight: 600 }}>{formatAr(p.prix_vente)}</TableCell>
                    <TableCell align="right" style={{ color: isOut ? C.danger : isLow ? C.warning : "var(--text)", fontWeight: 600 }}>
                      {p.quantite_stock} {p.unite || ""}
                    </TableCell>
                    <TableCell align="center">
                      <Badge variant={isOut ? "danger" : isLow ? "warning" : "success"} size="sm">
                        {isOut ? "Rupture" : isLow ? "Bas" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <Button variant="secondary" size="sm" onClick={() => editProduit(p)}>✏️</Button>
                        <Button variant="primary" size="sm" onClick={() => { setSelectedProduit(p); setShowMovementModal(true); }}>📦</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduit(p)} style={{ color: C.danger }}>🗑️</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ══ MODAL PRODUIT ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={600}>
        <ModalHeader title={editMode ? "Modifier le produit" : "Nouveau produit"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <Input label="Nom du produit" placeholder="Ex: iPhone 15" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <Input label="Référence" placeholder="Ex: IP15-128" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <Input label="Catégorie" placeholder="Ex: Téléphones" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} />
            <Select label="Unité" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} options={uniteOptions} />
            <Input type="number" label="Prix d'achat (Ar)" value={String(form.prix_achat)} onChange={(e) => setForm({ ...form, prix_achat: parseFloat(e.target.value) || 0 })} />
            <Input type="number" label="Prix de vente (Ar)" value={String(form.prix_vente)} onChange={(e) => setForm({ ...form, prix_vente: parseFloat(e.target.value) || 0 })} />
            <Input type="number" label="Stock initial" value={String(form.quantite_stock)} onChange={(e) => setForm({ ...form, quantite_stock: parseInt(e.target.value) || 0 })} />
            <Input type="number" label="Stock minimum" value={String(form.stock_minimum)} onChange={(e) => setForm({ ...form, stock_minimum: parseInt(e.target.value) || 0 })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving}>{editMode ? "Modifier" : "Créer"}</Button>
        </ModalFooter>
      </Modal>

      {/* ══ MODAL MOUVEMENT ══ */}
      <Modal open={showMovementModal} onClose={() => { setShowMovementModal(false); resetMovForm(); }}>
        <ModalHeader title="Mouvement de stock" onClose={() => { setShowMovementModal(false); resetMovForm(); }} />
        <ModalBody>
          {selectedProduit && (
            <>
              <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedProduit.nom}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stock actuel : {selectedProduit.quantite_stock} {selectedProduit.unite || ""}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Select label="Type" value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                  options={[{ value: "entree", label: "📥 Entrée" }, { value: "sortie", label: "📤 Sortie" }]} />
                <Input type="number" label="Quantité" value={String(movementForm.quantite)} onChange={(e) => setMovementForm({ ...movementForm, quantite: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ marginTop: 10 }}>
                <Input label="Notes (optionnel)" placeholder="Ex: Inventaire, Casse..." value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} />
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowMovementModal(false); resetMovForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleMovement} loading={saving} disabled={saving}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ══ MODAL HISTORIQUE ══ */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} width={500}>
        <ModalHeader title="Historique des mouvements" onClose={() => setShowHistoryModal(false)} />
        <ModalBody>
          {selectedProduit && (
            <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedProduit.nom}</div>
            </div>
          )}
          {mouvements.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20, fontSize: 13 }}>Aucun mouvement</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {mouvements.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                      background: m.type === "entree" ? C.successDim : C.dangerDim,
                      color: m.type === "entree" ? C.success : C.danger, marginRight: 6,
                    }}>
                      {m.type === "entree" ? "ENTRÉE" : "SORTIE"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>×{m.quantite}</span>
                    {m.notes && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>· {m.notes}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
