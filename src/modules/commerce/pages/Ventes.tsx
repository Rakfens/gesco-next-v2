"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  StatCard,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import { printTicketVente } from "../services/impressionService";
import { fetchProduits } from "../services/produitService";
import { fetchPacks, fetchPackWithProduits, isPackAvailable } from "../services/packService";
import type { VenteDetailItem } from "../services/venteService";
import { createVente, deleteVente, fetchVentes, fetchVenteWithDetails, updateVente } from "../services/venteService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PanierItem {
  produit_id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  stock_max?: number;
  is_pack?: boolean;
  pack_id?: string;
  pack_nom?: string;
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
  { value: "especes", label: "💵 Espèces" },
{ value: "mobile_money", label: "📱 Mobile Money" },
{ value: "carte", label: "💳 Carte" },
];

type ModalTab = "produits" | "packs";

export default function Ventes() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [produits, setProduits] = useState<<Produit[]>([]);
  const [packs, setPacks] = useState<<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<string | null>(null);

  const [panier, setPanier] = useState<<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [isAddingPack, setIsAddingPack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<VenteForm>(EMPTY_FORM);
  const [modalTab, setModalTab] = useState<<ModalTab>("produits");
  const [packDisponible, setPackDisponible] = useState<<Record<string, boolean>>({});

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [v, p, pk] = await Promise.all([fetchVentes(), fetchProduits({ isActive: true }), fetchPacks()]);
      setVentes(v);
      setProduits(p);
      setPacks(pk);
      const dispo: Record<string, boolean> = {};
      for (const pack of pk) {
        dispo[pack.id] = await isPackAvailable(pack.id);
      }
      setPackDisponible(dispo);
    } catch {
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      if (["ventes", "vente_details", "produits"].includes((e as CustomEvent)?.detail?.table)) {
        loadData();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const addToCart = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) <= 0) {
      toastWarn(`"${produit.nom}" est en rupture de stock`);
      return;
    }
    const existing = panier.find((p) => p.produit_id === produit.id && !p.is_pack);
    if (existing) {
      if (existing.quantite >= (produit.quantite_stock ?? 0) && !editMode) {
        toastWarn(`Stock insuffisant (${produit.quantite_stock ?? 0})`);
        return;
      }
      setPanier(
        panier.map((p) =>
        p.produit_id === produit.id && !p.is_pack
        ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire }
        : p
        )
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

  const addPackToCart = async (pack: Pack) => {
    if (isAddingPack) {
      toastWarn("Veuillez patienter...");
      return;
    }
    const dejaDansPanier = panier.some(
      (p) => p.is_pack && p.pack_id === String(pack.id) && String(p.produit_id).startsWith("pack_")
    );
    if (dejaDansPanier) {
      toastWarn(`Le pack "${pack.nom}" est déjà dans le panier`);
      return;
    }
    setIsAddingPack(true);
    try {
      const packComplet = await fetchPackWithProduits(pack.id);
      if (!packComplet?.produits?.length) {
        toastWarn("Ce pack ne contient aucun produit");
        return;
      }
      const produitsIndividuels: PanierItem[] = [];
      for (const pp of packComplet.produits) {
        const produit = pp.produit as Produit | undefined;
        if (!produit) {
          toastWarn(`Un produit du pack n'existe plus`);
          return;
        }
        if ((produit.quantite_stock ?? 0) < pp.quantite) {
          toastWarn(`Stock insuffisant pour "${produit.nom}"`);
          return;
        }
        produitsIndividuels.push({
          produit_id: String(produit.id),
                                 nom: produit.nom,
                                 quantite: pp.quantite,
                                 prix_unitaire: 0,
                                 sous_total: 0,
                                 stock_max: produit.quantite_stock,
                                 is_pack: true,
                                 pack_id: String(pack.id),
                                 pack_nom: pack.nom,
        });
      }
      const packItem: PanierItem = {
        produit_id: `pack_${pack.id}`,
        nom: `📦 ${pack.nom}`,
        quantite: 1,
        prix_unitaire: pack.prix,
        sous_total: pack.prix,
        is_pack: true,
        pack_id: String(pack.id),
        pack_nom: pack.nom,
      };
      setPanier([...panier, packItem, ...produitsIndividuels]);
      toastSuccess(`Pack "${pack.nom}" ajouté`);
    } catch {
      toastError("Erreur ajout pack");
    } finally {
      setIsAddingPack(false);
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setPanier(panier.filter((p) => String(p.produit_id) !== String(id)));
      return;
    }
    setPanier(
      panier.map((p) =>
      String(p.produit_id) === String(id) ? { ...p, quantite: qty, sous_total: qty * p.prix_unitaire } : p
      )
    );
  };

  const updateCartPrice = (id: string, price: number) => {
    setPanier(
      panier.map((p) =>
      String(p.produit_id) === String(id) ? { ...p, prix_unitaire: price, sous_total: p.quantite * price } : p
      )
    );
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedVente(null);
    setPanier([]);
    setSearchProduit("");
    setForm(EMPTY_FORM);
    setModalTab("produits");
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      toastWarn("Veuillez patienter...");
      return;
    }
    if (panier.length === 0) {
      toastWarn("Ajoutez au moins un produit");
      return;
    }
    setIsSubmitting(true);
    const packLines = panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_"));
    const productLines = panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_")));
    const details: VenteDetailItem[] = productLines.map((p) => ({
      produit_id: p.produit_id,
      quantite: p.quantite,
      prix_unitaire: p.prix_unitaire,
      sous_total: p.sous_total,
    }));
    const totalPack = packLines.reduce((s, p) => s + p.sous_total, 0);
    const totalProduits = productLines.reduce((s, p) => s + p.sous_total, 0);
    const montantTotal = totalPack + totalProduits;
    setSaving(true);
    try {
      if (editMode && selectedVente) {
        await updateVente(selectedVente.id, form, details);
        toastSuccess("Vente modifiée");
      } else {
        const nv = await createVente({ ...form }, details);
        if (totalPack > 0) {
          const { getSupabase } = await import("@/lib/supabase");
          await getSupabase()
          .from("ventes")
          .update({
            montant_total: montantTotal - (Number(form.remise) || 0),
                  reste_a_payer: montantTotal - (Number(form.remise) || 0) - (Number(form.montant_paye) || 0),
          })
          .eq("id", nv.id);
        }
        toastSuccess("Vente enregistrée");
        if (nv?.id) setShowPrintModal(nv.id);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: unknown) {
      toastError(`Erreur : ${e instanceof Error ? e.message : "Impossible"}`);
    } finally {
      setSaving(false);
      setIsSubmitting(false);
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
          v.details.map((d: any) => ({
            produit_id: String(d.produit_id ?? ""),
                                     nom: String(d.produit?.nom ?? "Produit"),
                                     quantite: Number(d.quantite ?? 0),
                                     prix_unitaire: Number(d.prix_unitaire ?? 0),
                                     sous_total: Number(d.sous_total ?? 0),
          }))
        );
      }
    } catch {
      toastWarn("Impossible de charger les détails");
    }
    setShowModal(true);
  };

  const executeDelete = async () => {
    if (!showDeleteModal) return;
    const id = showDeleteModal;
    setShowDeleteModal(null);
    try {
      await deleteVente(id);
      toastSuccess("Vente supprimée");
      loadData();
    } catch {
      toastError("Erreur lors de la suppression");
    }
  };

  const handlePrint = async (venteId: string) => {
    try {
      const v = await fetchVenteWithDetails(venteId);
      if (v && currentCompany) {
        printTicketVente(v, v.details, currentCompany);
      } else {
        toastWarn("Détails introuvables");
      }
    } catch {
      toastError("Erreur impression");
    }
  };

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter(
      (p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q)
    );
  }, [produits, searchProduit]);

  const totalPanier = useMemo(() => {
    const packTotal = panier
    .filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_"))
    .reduce((s, p) => s + p.sous_total, 0);
    const productTotal = panier
    .filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_")))
    .reduce((s, p) => s + p.sous_total, 0);
    return packTotal + productTotal;
  }, [panier]);

  const totalFinal = totalPanier - (Number(form.remise) || 0);
  const resteAPayer = totalFinal - (Number(form.montant_paye) || 0);

  const totalGeneral = useMemo(() => ventes.reduce((s, v) => s + (v.montant_total || 0), 0), [ventes]);
  const totalPaye = useMemo(() => ventes.reduce((s, v) => s + (v.montant_paye || 0), 0), [ventes]);
  const totalSolde = useMemo(() => ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0), [ventes]);

  if (loading) {
    return (
      <div className="p-5 text-center text-muted-foreground animate-fade-in">
      Chargement des ventes...
      </div>
    );
  }

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
    <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} className="text-info" />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-foreground ${isMobile ? "text-xl" : "text-2xl"}`}>
    Ventes
    </h1>
    <p className="text-xs text-muted-foreground mt-0.5">
    {currentCompany?.name} · {ventes.length} transaction(s)
    </p>
    </div>
    </div>
    <div className="flex gap-2">
    <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/rapports")} className="btn-press">
    ← Rapports
    </Button>
    <Button variant="success" onClick={() => { resetForm(); setShowModal(true); }} className="btn-press shadow-gold">
    ＋ Nouvelle vente
    </Button>
    </div>
    </div>

    {/* ══ STATS ══ */}
    {ventes.length > 0 && (
      <div className={isMobile ? "grid grid-cols-2 gap-2.5 mb-4 stagger-children" : "grid grid-cols-3 gap-2.5 mb-4 stagger-children"}>
      <StatCard
      label="Total général"
      value={formatAr(totalGeneral)}
      color="accent"
      icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />}
      />
      <StatCard
      label="Total payé"
      value={formatAr(totalPaye)}
      color="success"
      icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />}
      />
      <StatCard
      label="Solde restant"
      value={formatAr(totalSolde)}
      color="warning"
      icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />}
      />
      </div>
    )}

    {/* ══ LISTE ══ */}
    {isMobile ? (
      <div className="flex flex-col gap-3 stagger-children">
      {ventes.length === 0 ? (
        <Card padding={40} className="glass-card">
        <div className="text-center text-muted-foreground text-[13px]">
        <div className="text-[32px] mb-2">🛒</div>
        Aucune vente enregistrée. Cliquez sur "Nouvelle vente" pour commencer.
        </div>
        </Card>
      ) : (
        ventes.map((v) => {
          const solde = v.reste_a_payer || 0;
          return (
            <Card key={v.id} className="glass-card overflow-hidden">
            <div className="p-4">
            <div className="flex justify-between items-start mb-3">
            <div>
            <div className="font-bold text-foreground">{v.numero_facture || "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
            {v.client_nom || "—"} · {v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}
            </div>
            </div>
            <StatusBadge status={v.statut ?? "en_attente"} />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { l: "TOTAL", v: formatAr(v.montant_total), c: "text-primary" },
                  { l: "PAYÉ", v: formatAr(v.montant_paye), c: "text-success" },
                  { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé", c: solde > 0 ? "text-warning" : "text-success" },
            ].map((r) => (
              <div key={r.l} className="bg-background rounded-lg py-2 px-2 text-center">
              <div className="text-[9px] text-muted-foreground mb-0.5">{r.l}</div>
              <div className={`text-xs font-bold ${r.c}`}>{r.v}</div>
              </div>
            ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)} className="btn-press">🖨️</Button>
            <Button variant="primary" size="sm" onClick={() => handleEdit(v)} className="btn-press">✏️</Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(v.id)} className="btn-press">🗑️</Button>
            </div>
            </div>
            </Card>
          );
        })
      )}
      </div>
    ) : (
      <Card padding={0} className="overflow-hidden glass-card">
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
        <TableEmpty colSpan={8} message="Aucune vente enregistrée" />
      ) : (
        ventes.map((v) => {
          const solde = v.reste_a_payer || 0;
          return (
            <TableRow key={v.id} className="table-row-hover">
            <TableCell className="font-semibold font-mono text-xs text-foreground">
            {v.numero_facture || "—"}
            </TableCell>
            <TableCell className="text-sm text-foreground">{v.client_nom || "—"}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
            {v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}
            </TableCell>
            <TableCell align="right" className="font-bold text-primary">
            {formatAr(v.montant_total)}
            </TableCell>
            <TableCell align="right" className="text-success">
            {formatAr(v.montant_paye)}
            </TableCell>
            <TableCell align="right" className={`font-bold ${solde > 0 ? "text-warning" : "text-success"}`}>
            {solde > 0 ? formatAr(solde) : "Payé"}
            </TableCell>
            <TableCell align="center">
            <StatusBadge status={v.statut ?? "en_attente"} />
            </TableCell>
            <TableCell align="center">
            <div className="flex gap-1 justify-center">
            <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)} className="btn-press">🖨️</Button>
            <Button variant="primary" size="sm" onClick={() => handleEdit(v)} className="btn-press">✏️</Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(v.id)} className="btn-press">🗑️</Button>
            </div>
            </TableCell>
            </TableRow>
          );
        })
      )}
      </TableBody>
      </Table>
      {ventes.length > 0 && (
        <div className="py-3 px-5 bg-background border-t border-border flex justify-between flex-wrap gap-2">
        <span className="font-bold text-xs text-muted-foreground">TOTAL GÉNÉRAL</span>
        <div className="flex gap-4">
        <span className="text-success font-extrabold">{formatAr(totalGeneral)}</span>
        <span className="text-info font-bold">Payé: {formatAr(totalPaye)}</span>
        <span className="text-warning font-bold">Solde: {formatAr(totalSolde)}</span>
        </div>
        </div>
      )}
      </Card>
    )}

    {/* ══ MODAL VENTE ══ */}
    <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
    <ModalHeader title={editMode ? "Modifier la vente" : "Nouvelle vente"} onClose={() => { setShowModal(false); resetForm(); }} />
    <ModalBody>
    <div className="flex gap-1 mb-4 bg-background rounded-xl p-1">
    <button
    onClick={() => setModalTab("produits")}
    className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all btn-press ${modalTab === "produits" ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"}`}
    >
    🛍️ Produits
    </button>
    <button
    onClick={() => setModalTab("packs")}
    className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all btn-press ${modalTab === "packs" ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"}`}
    >
    📦 Packs ({packs.length})
    </button>
    </div>

    <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
    {/* Colonne gauche : Produits / Packs */}
    <div>
    {modalTab === "produits" ? (
      <>
      <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} className="mb-2 input-focus" />
      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
      {produitsFiltres.map((p) => (
        <button
        key={p.id}
        onClick={() => addToCart(p)}
        disabled={!editMode && (p.quantite_stock ?? 0) <= 0}
        className={`flex items-center justify-between py-2 px-3 rounded-lg border bg-background text-left text-xs transition-all ${(!editMode && (p.quantite_stock ?? 0) <= 0) ? "opacity-50 cursor-not-allowed" : "hover:border-primary/30 hover:bg-secondary cursor-pointer btn-press"}`}
        >
        <div>
        <div className="font-semibold text-foreground">{p.nom}</div>
        <div className="text-[10px] text-muted-foreground">Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}</div>
        </div>
        <span className="text-base text-success">＋</span>
        </button>
      ))}
      {produitsFiltres.length === 0 && (
        <div className="text-center text-muted-foreground p-4 text-xs">Aucun produit trouvé</div>
      )}
      </div>
      </>
    ) : (
      <>
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
      📦 Packs disponibles
      </div>
      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
      {packs.length === 0 ? (
        <div className="text-center text-muted-foreground p-4 text-xs">Aucun pack créé</div>
      ) : (
        packs.map((pack) => {
          const disponible = packDisponible[pack.id] ?? false;
          return (
            <button
            key={pack.id}
            onClick={() => !editMode && addPackToCart(pack)}
            disabled={!editMode && !disponible}
            className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-left text-xs transition-all ${disponible ? "border border-primary/30 bg-primary/5" : "border border-border bg-background"} ${!editMode && !disponible ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-secondary btn-press"}`}
            >
            <div>
            <div className="font-bold text-foreground">📦 {pack.nom}</div>
            <div className="text-[10px] text-muted-foreground">
            {pack.produits?.length || 0} produit(s) · {disponible ? "✅ Disponible" : "❌ Stock insuffisant"}
            </div>
            </div>
            <div className="text-right">
            <div className="font-bold text-primary">{formatAr(pack.prix)}</div>
            <div className={`text-sm ${disponible ? "text-success" : "text-destructive"}`}>＋</div>
            </div>
            </button>
          );
        })
      )}
      </div>
      </>
    )}
    </div>

    {/* Colonne droite : Panier & Formulaire */}
    <div>
    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
    🛒 Panier ({panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_")).length} pack(s),{" "}
    {panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_"))).length} produit(s))
    </div>
    <div className="max-h-[200px] overflow-y-auto mb-3 space-y-1">
    {panier.length === 0 ? (
      <div className="text-center text-muted-foreground p-5 text-xs border border-dashed border-border rounded-lg">
      Panier vide
      </div>
    ) : (
      panier.map((p) => (
        <div
        key={`${p.produit_id}_${p.is_pack ? "pack" : "prod"}_${p.pack_nom || ""}`}
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg ${p.is_pack && String(p.produit_id).startsWith("pack_") ? "bg-primary/10" : "bg-transparent"} ${p.is_pack && !String(p.produit_id).startsWith("pack_") ? "pl-6" : ""}`}
        >
        <div className="flex-1 min-w-0">
        <div className={`truncate text-[11px] text-foreground ${p.is_pack && String(p.produit_id).startsWith("pack_") ? "font-bold" : "font-semibold"}`}>
        {p.nom}
        {p.is_pack && !String(p.produit_id).startsWith("pack_") && (
          <span className="text-[9px] text-muted-foreground ml-1">(pack)</span>
        )}
        </div>
        </div>
        {p.is_pack && String(p.produit_id).startsWith("pack_") ? (
          <>
          <span className="text-[11px] font-bold text-primary min-w-[60px] text-right">
          {formatAr(p.prix_unitaire)}
          </span>
          <button
          onClick={() => {
            const newPanier = panier.filter((item) => String(item.pack_id) !== String(p.pack_id));
            setPanier(newPanier);
          }}
          className="w-6 h-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center text-xs hover:bg-destructive/20 transition-colors btn-press"
          >
          ✕
          </button>
          </>
        ) : (
          <>
          <input
          type="number"
          min={1}
          value={p.quantite}
          onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)}
          className="w-[50px] py-1 px-1.5 bg-secondary border border-border rounded-md text-foreground text-[11px] text-center outline-none input-focus"
          />
          <input
          type="number"
          value={p.prix_unitaire}
          onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)}
          className="w-[70px] py-1 px-1.5 bg-secondary border border-border rounded-md text-foreground text-[11px] text-center outline-none input-focus"
          />
          <span className="text-[11px] font-bold text-primary min-w-[60px] text-right">
          {formatAr(p.sous_total)}
          </span>
          <button
          onClick={() => updateCartQty(p.produit_id, 0)}
          className="w-6 h-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center text-xs hover:bg-destructive/20 transition-colors btn-press"
          >
          ✕
          </button>
          </>
        )}
        </div>
      ))
    )}
    </div>

    {panier.length > 0 && (
      <div className="py-2 px-3 bg-background rounded-lg mb-3 space-y-1">
      <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground">Sous-total</span>
      <span className="font-semibold text-foreground">{formatAr(totalPanier)}</span>
      </div>
      {form.remise > 0 && (
        <div className="flex justify-between text-[11px]">
        <span className="text-destructive">Remise</span>
        <span className="text-destructive font-semibold">-{formatAr(form.remise)}</span>
        </div>
      )}
      <div className="flex justify-between text-[13px] pt-1 border-t border-border">
      <span className="font-bold text-foreground">TOTAL</span>
      <span className="font-extrabold text-primary text-base">{formatAr(totalFinal)}</span>
      </div>
      </div>
    )}

    <div className={isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
    <Input label="Client" placeholder="Nom du client" value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} />
    <Input label="Tél" placeholder="034 00 000 00" value={form.client_telephone} onChange={(e) => setForm({ ...form, client_telephone: e.target.value })} />
    <Select label="Paiement" value={form.type_paiement} onChange={(e) => setForm({ ...form, type_paiement: e.target.value })} options={PAIEMENT_OPTIONS} />
    <Input type="date" label="Date" value={form.date_vente} onChange={(e) => setForm({ ...form, date_vente: e.target.value })} />
    <Input type="number" label="Remise (Ar)" value={String(form.remise)} onChange={(e) => setForm({ ...form, remise: parseFloat(e.target.value) || 0 })} />
    <Input type="number" label="Payé (Ar)" value={String(form.montant_paye)} onChange={(e) => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} />
    </div>

    {resteAPayer > 0 && (
      <div className="mt-2 py-1.5 px-2.5 bg-warning/10 rounded-lg text-[11px] text-warning font-semibold">
      Reste à payer : {formatAr(resteAPayer)}
      </div>
    )}
    </div>
    </div>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="btn-press">
    Annuler
    </Button>
    <Button variant="success" onClick={handleSubmit} loading={saving} disabled={saving || panier.length === 0} className="btn-press shadow-gold">
    {editMode ? "Modifier" : "Enregistrer"}
    </Button>
    </ModalFooter>
    </Modal>

    {/* ══ MODAL SUPPRESSION ══ */}
    <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
    <ModalHeader title="Supprimer la vente ?" onClose={() => setShowDeleteModal(null)} />
    <ModalBody>
    <p className="text-[13px] text-muted-foreground text-center">
    Cette action est irréversible. Le stock sera restauré.
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setShowDeleteModal(null)} className="btn-press">Annuler</Button>
    <Button variant="danger" onClick={executeDelete} loading={saving} className="btn-press">Supprimer</Button>
    </ModalFooter>
    </Modal>

    {/* ══ MODAL IMPRESSION ══ */}
    <Modal open={!!showPrintModal} onClose={() => setShowPrintModal(null)}>
    <ModalHeader title="Imprimer le ticket ?" onClose={() => setShowPrintModal(null)} />
    <ModalBody>
    <p className="text-[13px] text-muted-foreground text-center">
    Imprimer le ticket pour {ventes.find((v) => v.id === showPrintModal)?.client_nom || "ce client"} ?
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setShowPrintModal(null)} className="btn-press">Non merci</Button>
    <Button variant="primary" onClick={() => { if (showPrintModal) handlePrint(showPrintModal); setShowPrintModal(null); }} className="btn-press">
    Imprimer
    </Button>
    </ModalFooter>
    </Modal>
    </div>
  );
}
