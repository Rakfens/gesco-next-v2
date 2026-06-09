import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SkeletonTable,
  StatCard,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { printTicketVente } from "../services/impressionService";
import { fetchProduits } from "../services/produitService";
import type { VenteDetailItem } from "../services/venteService";
import {
  createVente,
  deleteVente,
  fetchVentes,
  fetchVenteWithDetails,
  updateVente,
} from "../services/venteService";

// ─── Types ──────────────────────────────────────────────────────────
interface PanierItem {
  produit_id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  stock_max?: number;
}

interface VenteForm {
  client_nom: string;
  client_telephone: string;
  type_paiement: string;
  remise: number;
  montant_paye: number;
  date_vente: string;
}

const EMPTY_FORM: VenteForm = {
  client_nom: "",
  client_telephone: "",
  type_paiement: "especes",
  remise: 0,
  montant_paye: 0,
  date_vente: new Date().toISOString().split("T")[0],
};

const PAIEMENT_OPTIONS = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte" },
];

// ─── Composant principal ────────────────────────────────────────────
export default function Ventes() {
  const { currentCompany } = useCompany();
  const { success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  // State
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Pour les actions de sauvegarde (create/update)
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [printPending, setPrintPending] = useState<string | null>(null);
  const [form, setForm] = useState<VenteForm>(EMPTY_FORM);

  // ─── Data loading ─────────────────────────────────────────────────
  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [v, p] = await Promise.all([fetchVentes(), fetchProduits({ isActive: true })]);
      setVentes(v);
      setProduits(p);
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des ventes/produits:", error);
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime
  useEffect(() => {
    const handler = (e: Event) => {
      if (["ventes", "vente_details"].includes((e as CustomEvent)?.detail?.table)) loadData();
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadData]);

  // ─── Panier ───────────────────────────────────────────────────────
  const addToCart = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) <= 0) {
      toastWarn(`"${produit.nom}" est en rupture de stock`);
      return;
    }
    const existing = panier.find((p) => p.produit_id === produit.id);
    if (existing) {
      if (existing.quantite >= (produit.quantite_stock ?? 0) && !editMode) {
        toastWarn(`Stock insuffisant (${produit.quantite_stock ?? 0} disponibles)`);
        return;
      }
      setPanier(
        panier.map((p) =>
          p.produit_id === produit.id
            ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire }
            : p,
        ),
      );
    } else {
      setPanier([
        ...panier,
        {
          produit_id: produit.id,
          nom: produit.nom,
          quantite: 1,
          prix_unitaire: produit.prix_vente || 0,
          sous_total: produit.prix_vente || 0,
          stock_max: produit.quantite_stock,
        },
      ]);
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setPanier(panier.filter((p) => p.produit_id !== id));
      return;
    }
    setPanier(
      panier.map((p) =>
        p.produit_id === id ? { ...p, quantite: qty, sous_total: qty * p.prix_unitaire } : p,
      ),
    );
  };

  const updateCartPrice = (id: string, price: number) => {
    setPanier(
      panier.map((p) =>
        p.produit_id === id ? { ...p, prix_unitaire: price, sous_total: p.quantite * price } : p,
      ),
    );
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedVente(null);
    setPanier([]);
    setSearchProduit("");
    setForm(EMPTY_FORM);
  };

  // ─── CRUD ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (panier.length === 0) {
      toastWarn("Ajoutez au moins un produit");
      return;
    }
    const details = panier.map((p) => ({
      produit_id: p.produit_id,
      quantite: p.quantite,
      prix_unitaire: p.prix_unitaire,
      sous_total: p.sous_total,
    }));
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      if (editMode && selectedVente) {
        await updateVente(selectedVente.id, form, details);
        toastSuccess("Vente modifiée");
      } else {
        const nv = await createVente(form, details);
        toastSuccess("Vente enregistrée");
        if (nv?.id) setPrintPending(nv.id);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      logger.error("Erreur lors de la sauvegarde de la vente:", err);
      toastError(`Erreur : ${err instanceof Error ? err.message : "Impossible d'enregistrer"}`);
    } finally {
      setSaving(false); // Désactiver l'indicateur de sauvegarde
    }
  };

  const handleEdit = async (vente: Vente) => {
    setEditMode(true);
    setSelectedVente(vente);
    setForm({
      client_nom: vente.client_nom || "",
      client_telephone: vente.client_telephone || "",
      type_paiement: vente.type_paiement || "especes",
      remise: vente.remise || 0,
      montant_paye: vente.montant_paye || 0,
      date_vente: vente.date_vente?.split("T")[0] || new Date().toISOString().split("T")[0],
    });
    try {
      const v = await fetchVenteWithDetails(vente.id);
      if (v?.details) {
        setPanier(
          v.details.map((d: VenteDetailItem) => ({
            produit_id: String(d.produit_id ?? ""),
            nom: String(d.produit?.nom ?? "Produit"),
            quantite: Number(d.quantite ?? 0),
            prix_unitaire: Number(d.prix_unitaire ?? 0),
            sous_total: Number(d.sous_total ?? 0),
          })),
        );
      }
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des détails de la vente:", error);
      toastWarn("Impossible de charger les détails");
    }
    setShowModal(true);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteVente(id);
      toastSuccess("Vente supprimée, stock restauré");
      loadData();
    } catch (error: unknown) {
      logger.error("Erreur lors de la suppression de la vente:", error);
      toastError("Erreur lors de la suppression");
    }
  };

  const handlePrint = async (venteId: string) => {
    try {
      const v = await fetchVenteWithDetails(venteId);
      if (v && currentCompany) printTicketVente(v, v.details, currentCompany);
      else toastWarn("Détails introuvables");
    } catch (error: unknown) {
      logger.error("Erreur lors de l'impression du ticket:", error);
      toastError("Erreur impression");
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────
  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter(
      (p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q),
    );
  }, [produits, searchProduit]);

  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalFinal = totalPanier - (Number(form.remise) || 0);
  const resteAPayer = totalFinal - (Number(form.montant_paye) || 0);

  const totalGeneral = useMemo(
    () => ventes.reduce((s, v) => s + (v.montant_total || 0), 0),
    [ventes],
  );
  const totalPaye = useMemo(() => ventes.reduce((s, v) => s + (v.montant_paye || 0), 0), [ventes]);
  const totalSolde = useMemo(
    () => ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0),
    [ventes],
  );

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) return <SkeletonTable rows={6} />;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 20px" }}>
      {/* Confirmations */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer la vente ?"
        message="Cette action est irréversible. Le stock des produits sera restauré."
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />
      <ConfirmDialog
        open={!!printPending}
        title="Imprimer le ticket ?"
        message={
          printPending
            ? "Voulez-vous imprimer le ticket pour " +
              (ventes.find((v) => v.id === printPending)?.client_nom || "ce client") +
              " ?"
            : "Voulez-vous imprimer le ticket ?"
        }
        confirmLabel="Imprimer"
        cancelLabel="Non merci"
        variant="primary"
        onConfirm={() => {
          if (printPending) handlePrint(printPending);
          setPrintPending(null);
        }}
        onCancel={() => setPrintPending(null)}
      />

      {/* Header */}
      <CardHeader>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Ventes</h1>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>
            {currentCompany?.name} · {ventes.length} transaction(s)
          </p>
        </div>
        <Button
          variant="success"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Nouvelle vente
        </Button>
      </CardHeader>

      {/* Summary cards */}
      {!isMobile && ventes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard title="Total général" value={formatAr(totalGeneral)} color="green" />
          <StatCard title="Total payé" value={formatAr(totalPaye)} color="blue" />
          <StatCard title="Solde restant" value={formatAr(totalSolde)} color="orange" />
        </div>
      )}

      {/* Liste — Mobile cards / Desktop table */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ventes.length === 0 ? (
            <Card padding={48}>
              <div style={{ textAlign: "center", color: "var(--muted)" }}>Aucune vente</div>
            </Card>
          ) : (
            ventes.map((v) => {
              const solde = v.reste_a_payer || 0;
              return (
                <Card key={v.id} padding={16}>
                  <CardHeader>
                    <div>
                      <CardTitle>{v.numero_facture}</CardTitle>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {v.client_nom || "—"} ·{" "}
                        {new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <StatusBadge status={v.statut ?? "en_attente"} />
                  </CardHeader>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { l: "TOTAL", v: formatAr(v.montant_total), c: "var(--text)" },
                      { l: "PAYÉ", v: formatAr(v.montant_paye), c: "var(--green)" },
                      {
                        l: "SOLDE",
                        v: solde > 0 ? formatAr(solde) : "Payé",
                        c: solde > 0 ? "var(--orange)" : "var(--green)",
                      },
                    ].map((r) => (
                      <div
                        key={r.l}
                        style={{ background: "var(--bg)", borderRadius: 10, padding: "8px 10px" }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            marginBottom: 3,
                            fontWeight: 600,
                          }}
                        >
                          {r.l}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                    <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>
                      Impr.
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>
                      Modif.
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>
                      Suppr.
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
          {ventes.length > 0 && (
            <Card padding={14}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>TOTAL GÉNÉRAL</span>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: "var(--green)", fontWeight: 800 }}>
                    {formatAr(totalGeneral)}
                  </span>
                  <span style={{ color: "var(--orange)", fontWeight: 700 }}>
                    Solde: {formatAr(totalSolde)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Facture</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader align="right">Montant</TableHeader>
                <TableHeader align="right">Payé</TableHeader>
                <TableHeader align="right">Solde</TableHeader>
                <TableHeader align="center">Statut</TableHeader>
                <TableHeader align="center">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.length === 0 ? (
                <TableEmpty colSpan={8} message="Aucune vente" />
              ) : (
                ventes.map((v) => {
                  const solde = v.reste_a_payer || 0;
                  return (
                    <TableRow key={v.id}>
                      <TableCell style={{ fontWeight: 600 }}>{v.numero_facture}</TableCell>
                      <TableCell>
                        {v.client_nom || <span style={{ color: "var(--muted)" }}>—</span>}
                      </TableCell>
                      <TableCell>
                        {new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell align="right" style={{ fontWeight: 600 }}>
                        {formatAr(v.montant_total)}
                      </TableCell>
                      <TableCell align="right">{formatAr(v.montant_paye)}</TableCell>
                      <TableCell align="right">
                        <Badge variant={solde > 0 ? "warning" : "success"}>
                          {solde > 0 ? formatAr(solde) : "✓ Payé"}
                        </Badge>
                      </TableCell>
                      <TableCell align="center">
                        <StatusBadge status={v.statut ?? "en_attente"} />
                      </TableCell>
                      <TableCell align="center">
                        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                          <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>
                            Impr.
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>
                            Modif.
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>
                            Suppr.
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {ventes.length > 0 && (
              <TableFooter>
                <td colSpan={3} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13 }}>
                  TOTAL GÉNÉRAL
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 800,
                    fontSize: 15,
                    color: "var(--green)",
                  }}
                >
                  {formatAr(totalGeneral)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                  {formatAr(totalPaye)}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--orange)",
                  }}
                >
                  {formatAr(totalSolde)}
                </td>
                <td colSpan={2} />
              </TableFooter>
            )}
          </Table>
        </Card>
      )}

      {/* Modal Nouvelle/Modification vente */}
      <Modal open={showModal} onClose={() => setShowModal(false)} width={isMobile ? 480 : 900}>
        <ModalHeader
          title={editMode ? "Modifier la vente" : "Nouvelle vente"}
          onClose={() => setShowModal(false)}
        />
        <ModalBody>
          <div
            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}
          >
            {/* Produits */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--blue)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Produits disponibles
              </div>
              <Input
                placeholder="Rechercher un produit..."
                value={searchProduit}
                onChange={(e) => setSearchProduit(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 6,
                }}
              >
                {produitsFiltres.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Aucun produit
                  </div>
                ) : (
                  produitsFiltres.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 8,
                        marginBottom: 4,
                        background: (p.quantite_stock ?? 0) <= 0 ? "var(--red-dim)" : "transparent",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: (p.quantite_stock ?? 0) <= 0 ? "var(--red)" : "var(--muted)",
                          }}
                        >
                          Stock: {p.quantite_stock ?? "—"} · {formatAr(p.prix_vente)}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => addToCart(p)}
                        disabled={(p.quantite_stock ?? 0) <= 0}
                      >
                        +
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panier + formulaire */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--green)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Panier ({panier.length} article{panier.length > 1 ? "s" : ""})
              </div>
              <div
                style={{
                  maxHeight: 240,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 6,
                  marginBottom: 14,
                }}
              >
                {panier.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Panier vide
                  </div>
                ) : (
                  panier.map((item) => (
                    <div
                      key={item.produit_id}
                      style={{
                        padding: "8px 6px",
                        borderBottom: "1px solid var(--border)",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nom}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateCartQty(item.produit_id, item.quantite - 1)}
                          >
                            −
                          </Button>
                          <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>
                            {item.quantite}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateCartQty(item.produit_id, item.quantite + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Prix:</span>
                          <Input
                            type="number"
                            style={{ width: 90 }}
                            value={String(item.prix_unitaire)}
                            onChange={(e) =>
                              updateCartPrice(item.produit_id, Number(e.target.value) || 0)
                            }
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>
                          {formatAr(item.sous_total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <Input
                  label="Client"
                  placeholder="Nom (optionnel)"
                  value={form.client_nom}
                  onChange={(e) => setForm({ ...form, client_nom: e.target.value })}
                />
                <Input
                  label="Téléphone"
                  placeholder="Optionnel"
                  value={form.client_telephone}
                  onChange={(e) => setForm({ ...form, client_telephone: e.target.value })}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <Select
                  label="Paiement"
                  options={PAIEMENT_OPTIONS}
                  value={form.type_paiement}
                  onChange={(e) => setForm({ ...form, type_paiement: e.target.value })}
                />
                <Input
                  label="Date"
                  type="date"
                  value={form.date_vente}
                  onChange={(e) => setForm({ ...form, date_vente: e.target.value })}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <Input
                  label="Remise (Ar)"
                  type="number"
                  value={String(form.remise)}
                  onChange={(e) => setForm({ ...form, remise: Number(e.target.value) || 0 })}
                />
                <Input
                  label="Montant payé"
                  type="number"
                  value={String(form.montant_paye)}
                  onChange={(e) => setForm({ ...form, montant_paye: Number(e.target.value) || 0 })}
                />
              </div>

              {/* Récapitulatif */}
              <div
                style={{ background: "var(--bg)", padding: 14, borderRadius: 12, marginBottom: 14 }}
              >
                {(
                  [
                    { label: "Sous-total", value: formatAr(totalPanier), color: "var(--text)" },
                    { label: "Remise", value: `− ${formatAr(form.remise)}`, color: "var(--red)" },
                    {
                      label: "Total TTC",
                      value: formatAr(totalFinal),
                      color: "var(--text)",
                      bold: true,
                      big: true,
                    },
                    { label: "Payé", value: formatAr(form.montant_paye), color: "var(--text)" },
                  ] as Array<{
                    label: string;
                    value: string;
                    color: string;
                    bold?: boolean;
                    big?: boolean;
                  }>
                ).map((row) => (
                  <div
                    key={row.label}
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                  >
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{row.label}</span>
                    <span
                      style={{
                        fontWeight: row.bold ? 800 : 600,
                        fontSize: row.big ? 16 : 13,
                        color: row.color,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                {resteAPayer > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px dashed var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--orange)", fontWeight: 700 }}>Reste à payer</span>
                    <span style={{ color: "var(--orange)", fontWeight: 800, fontSize: 15 }}>
                      {formatAr(resteAPayer)}
                    </span>
                  </div>
                )}
                {resteAPayer <= 0 && totalFinal > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      textAlign: "right",
                      fontSize: 12,
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    ✓ Entièrement payé
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button variant="success" onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement..." : editMode ? "Mettre à jour" : "Enregistrer la vente"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
