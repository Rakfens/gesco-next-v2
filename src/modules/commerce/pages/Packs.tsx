"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchPacks, fetchPackWithProduits, createPack, updatePack, deletePack, checkPackStock, isPackAvailable } from "@/modules/commerce/services/packService";
import { fetchProduits } from "@/modules/commerce/services/produitService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.1)",
  pink: "#f472b6", pinkDim: "rgba(244,114,182,0.1)",
  teal: "#2dd4bf", tealDim: "rgba(45,212,191,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PackProduitForm {
  produit_id: string;
  quantite: number;
}

interface PackWithAvailability extends Pack {
  disponible?: boolean;
  valeurAchat?: number;
  marge?: number;
}

export default function PacksPage() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [packs, setPacks] = useState<PackWithAvailability[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDisponible, setFilterDisponible] = useState<"tous" | "disponible" | "indisponible">("tous");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [detailPack, setDetailPack] = useState<PackWithAvailability | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<Array<{ nom: string; quantite: number; stock: number; suffisant: boolean }>>([]);

  // Form state
  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrix, setFormPrix] = useState("");
  const [formProduits, setFormProduits] = useState<PackProduitForm[]>([]);

  // Rediriger vers le dashboard si société de type service
  useEffect(() => {
    if (currentCompany?.type === "service") {
      router.push("/livraison/dashboard");
    }
  }, [currentCompany, router]);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [p, pr] = await Promise.all([
        fetchPacks(),
        fetchProduits({ isActive: true }),
      ]);

      // Calculer la disponibilité et la valeur d'achat pour chaque pack
      const packsWithAvailability: PackWithAvailability[] = [];
      for (const pack of p) {
        const packComplet = await fetchPackWithProduits(pack.id);
        const disponible = await isPackAvailable(pack.id);

        // Calculer la valeur d'achat totale du pack
        let valeurAchat = 0;
        if (packComplet?.produits) {
          for (const pp of packComplet.produits) {
            const produit = pp.produit as Produit | undefined;
            valeurAchat += (produit?.prix_achat || 0) * pp.quantite;
          }
        }

        packsWithAvailability.push({
          ...pack,
          disponible,
          valeurAchat,
          marge: pack.prix - valeurAchat,
          produits: packComplet?.produits,
        });
      }

      setPacks(packsWithAvailability);
      setProduits(pr);
    } catch (e: unknown) {
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentCompany]);

  // Filtrage des packs
  const packsFiltres = useMemo(() => {
    let result = packs;

    // Filtre par recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.nom.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }

    // Filtre par disponibilité
    if (filterDisponible === "disponible") {
      result = result.filter((p) => p.disponible);
    } else if (filterDisponible === "indisponible") {
      result = result.filter((p) => !p.disponible);
    }

    return result;
  }, [packs, search, filterDisponible]);

  // Stats
  const stats = useMemo(() => ({
    total: packs.length,
    disponibles: packs.filter((p) => p.disponible).length,
    indisponibles: packs.filter((p) => !p.disponible).length,
    valeurTotal: packs.reduce((s, p) => s + (p.prix || 0), 0),
    valeurAchatTotal: packs.reduce((s, p) => s + (p.valeurAchat || 0), 0),
    margeTotal: packs.reduce((s, p) => s + (p.marge || 0), 0),
    totalProduits: packs.reduce((s, p) => s + (p.produits?.length || 0), 0),
  }), [packs]);

  // Form handlers
  const resetForm = () => {
    setFormNom("");
    setFormDescription("");
    setFormPrix("");
    setFormProduits([]);
    setEditMode(false);
    setSelectedPack(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFormProduits([{ produit_id: "", quantite: 1 }]);
    setShowModal(true);
  };

  const openEditModal = async (pack: Pack) => {
    const packComplet = await fetchPackWithProduits(pack.id);
    if (!packComplet) return;

    setEditMode(true);
    setSelectedPack(pack);
    setFormNom(pack.nom);
    setFormDescription(pack.description || "");
    setFormPrix(String(pack.prix));
    setFormProduits(
      (packComplet.produits || []).map((pp) => ({
        produit_id: String(pp.produit_id),
        quantite: pp.quantite,
      }))
    );
    setShowModal(true);
  };

  const addProduitLine = () => {
    setFormProduits([...formProduits, { produit_id: "", quantite: 1 }]);
  };

  const removeProduitLine = (index: number) => {
    setFormProduits(formProduits.filter((_, i) => i !== index));
  };

  const updateProduitLine = (index: number, field: "produit_id" | "quantite", value: string | number) => {
    setFormProduits(formProduits.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async () => {
    if (!formNom.trim()) { toastWarn("Le nom du pack est requis"); return; }
    if (!formPrix || parseFloat(formPrix) <= 0) { toastWarn("Le prix doit être > 0"); return; }
    if (formProduits.length === 0 || formProduits.some((p) => !p.produit_id)) {
      toastWarn("Ajoutez au moins un produit valide");
      return;
    }

    setSaving(true);
    try {
      const produitsData = formProduits
        .filter((p) => p.produit_id)
        .map((p) => ({ produit_id: p.produit_id, quantite: p.quantite }));

      if (editMode && selectedPack) {
        await updatePack(selectedPack.id, formNom, formDescription, parseFloat(formPrix), produitsData);
        toastSuccess("Pack modifié");
      } else {
        await createPack(formNom, formDescription, parseFloat(formPrix), produitsData);
        toastSuccess("Pack créé");
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await deletePack(showDeleteModal);
      toastSuccess("Pack supprimé");
      setShowDeleteModal(null);
      loadData();
    } catch (e: unknown) {
      toastError("Erreur lors de la suppression");
    }
  };

  const openDetailModal = async (packId: string) => {
    setDetailLoading(true);
    setShowDetailModal(packId);
    try {
      const pack = await fetchPackWithProduits(packId);
      setDetailPack(pack);

      // Vérifier le stock pour chaque produit
      if (pack) {
        const stock = await checkPackStock(pack.id);
        setDetailStock(
          stock.map((s) => ({
            nom: s.nom,
            quantite: s.quantite_necessaire,
            stock: s.quantite_stock,
            suffisant: s.suffisant,
          }))
        );
      }
    } catch {
      toastError("Erreur lors du chargement des détails");
    } finally {
      setDetailLoading(false);
    }
  };

  const produitNom = (id: string) => {
    const p = produits.find((pr) => String(pr.id) === String(id));
    return p?.nom || `Produit #${id}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
        Chargement des packs...
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.pink} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Packs</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {packs.length} pack(s)</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/ventes")}>← Ventes</Button>
          <Button variant="primary" onClick={openCreateModal}>＋ Nouveau pack</Button>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total packs" value={stats.total} color={C.pink} icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.pink} />} />
        <StatCard label="Disponibles" value={stats.disponibles} color={C.success} icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.success} />} />
        <StatCard label="Indisponibles" value={stats.indisponibles} color={C.danger} icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} color={C.danger} />} />
        <StatCard label="Marge totale" value={formatAr(stats.margeTotal)} color={C.gold} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.gold} />} />
      </div>

      {/* ══ FILTRES ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto", gap: 8, alignItems: "end" }}>
          <Input placeholder="Rechercher un pack..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 4 }}>
            {(["tous", "disponible", "indisponible"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterDisponible(f)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: filterDisponible === f ? C.gold : "transparent",
                  color: filterDisponible === f ? "#08080c" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                }}
              >
                {f === "tous" ? "Tous" : f === "disponible" ? "✅ Disponibles" : "❌ Indisponibles"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ══ LISTE DES PACKS ══ */}
      {packsFiltres.length === 0 ? (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            {packs.length === 0 ? "Aucun pack créé. Cliquez sur \"Nouveau pack\" pour commencer." : "Aucun pack ne correspond à votre recherche."}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {packsFiltres.map((pack) => (
            <Card key={pack.id} padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: pack.disponible ? C.successDim : C.dangerDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 22 }}>{pack.disponible ? "📦" : "⚠️"}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{pack.nom}</span>
                        <Badge variant={pack.disponible ? "success" : "danger"} size="sm">
                          {pack.disponible ? "Disponible" : "Indisponible"}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {pack.produits?.length || 0} produit(s) · {pack.description || "Pas de description"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{formatAr(pack.prix)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        Achat: {formatAr(pack.valeurAchat || 0)} · Marge: <span style={{ color: (pack.marge || 0) >= 0 ? C.success : C.danger }}>{formatAr(pack.marge || 0)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="success" size="sm" onClick={() => router.push("/commerce/ventes")}>🛒 Vendre</Button>
                      <Button variant="secondary" size="sm" onClick={() => openDetailModal(pack.id)}>👁️</Button>
                      <Button variant="primary" size="sm" onClick={() => openEditModal(pack)}>✏️</Button>
                      <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(pack.id)}>🗑️</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ MODAL CRÉER/ÉDITER PACK ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 700}>
        <ModalHeader title={editMode ? "Modifier le pack" : "Nouveau pack"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <Input label="Nom du pack *" placeholder="Ex: Pack Mahampy" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
            <Input label="Prix de vente (Ar) *" type="number" placeholder="120000" value={formPrix} onChange={(e) => setFormPrix(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Input label="Description" placeholder="Description du pack..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </div>

          {/* Liste des produits du pack */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            Produits du pack ({formProduits.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {formProduits.map((fp, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={fp.produit_id}
                  onChange={(e) => updateProduitLine(index, "produit_id", e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font)",
                  }}
                >
                  <option value="">-- Choisir un produit --</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} (Stock: {p.quantite_stock})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={fp.quantite}
                  onChange={(e) => updateProduitLine(index, "quantite", parseInt(e.target.value) || 1)}
                  style={{ width: 60, padding: "8px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => removeProduitLine(index)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addProduitLine} style={{ marginBottom: 8 }}>
            ＋ Ajouter un produit
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving}>
            {editMode ? "Modifier" : "Créer"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ══ MODAL DÉTAILS PACK ══ */}
      <Modal open={!!showDetailModal} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} width={isMobile ? 480 : 600}>
        <ModalHeader title={detailPack?.nom || "Détails du pack"} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} />
        <ModalBody>
          {detailLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Chargement...</div>
          ) : detailPack ? (
            <>
              {/* Infos générales */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Prix de vente</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{formatAr(detailPack.prix)}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Nombre de produits</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>{detailPack.produits?.length || 0}</div>
                </div>
              </div>

              {/* Valeur d'achat et marge */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Valeur d'achat</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.orange }}>{formatAr(detailPack.valeurAchat || 0)}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Marge</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: (detailPack.marge || 0) >= 0 ? C.success : C.danger }}>
                    {formatAr(detailPack.marge || 0)}
                  </div>
                </div>
              </div>

              {detailPack.description && (
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Description</div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{detailPack.description}</div>
                </div>
              )}

              {/* Disponibilité */}
              <div style={{ padding: "10px 14px", background: detailPack.disponible ? C.successDim : C.dangerDim, borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{detailPack.disponible ? "✅" : "❌"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: detailPack.disponible ? C.success : C.danger }}>
                  {detailPack.disponible ? "Pack disponible - Stock suffisant pour tous les produits" : "Pack indisponible - Stock insuffisant pour un ou plusieurs produits"}
                </span>
              </div>

              {/* Produits du pack avec stock */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Composition du pack</div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Produit</TableHeader>
                    <TableHeader align="center">Qté nécessaire</TableHeader>
                    <TableHeader align="right">Stock actuel</TableHeader>
                    <TableHeader align="center">Statut</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailStock.map((ds, idx) => (
                    <TableRow key={idx}>
                      <TableCell style={{ fontWeight: 600 }}>{ds.nom}</TableCell>
                      <TableCell align="center">{ds.quantite}</TableCell>
                      <TableCell align="right" style={{ color: ds.suffisant ? "var(--text)" : C.danger }}>{ds.stock}</TableCell>
                      <TableCell align="center">
                        <Badge variant={ds.suffisant ? "success" : "danger"} size="sm">
                          {ds.suffisant ? "✅ OK" : "❌ Insuffisant"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Pack introuvable</div>
          )}
        </ModalBody>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
        <ModalHeader title="Supprimer le pack ?" onClose={() => setShowDeleteModal(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
            Cette action est irréversible. Le pack sera supprimé définitivement.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
