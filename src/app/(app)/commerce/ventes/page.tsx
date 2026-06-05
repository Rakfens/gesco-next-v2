// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

// ─── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    paye:       { variant: "success", label: "Payé" },
    credit:     { variant: "secondary", label: "Crédit" },
    en_attente: { variant: "default", label: "En attente" },
    annule:     { variant: "destructive", label: "Annulé" },
  };
  const c = cfg[status] || cfg.en_attente;
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

// ─── Print Ticket (ouvre une nouvelle fenêtre) ──────────────────
const printTicket = (vente, details, company) => {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  const html = `<!DOCTYPE html><html><head><title>Ticket ${vente.numero_facture}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;padding:16px;color:#000;background:#fff}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  .line{border-top:1px dashed #000;margin:8px 0}
  .mb4{margin-bottom:4px}.mb8{margin-bottom:8px}
  table{width:100%;border-collapse:collapse}td{padding:2px 0}
  @media print{body{padding:8px}}
</style></head><body>
<div class="center mb8">
  <div class="bold" style="font-size:16px">${company?.name || 'GesCo'}</div>
  <div>Ticket de caisse</div>
</div>
<div class="line"></div>
<div class="mb4">Facture: <span class="bold">${vente.numero_facture}</span></div>
<div class="mb4">Date: ${new Date(vente.date_vente).toLocaleDateString('fr-FR')}</div>
<div class="mb4">Client: ${vente.client_nom || '—'}</div>
${vente.client_telephone ? `<div class="mb4">Tel: ${vente.client_telephone}</div>` : ''}
<div class="line"></div>
<table>${(details || []).map(d => `<tr>
  <td>${d.produit?.nom || d.nom || 'Produit'}</td>
  <td>${d.quantite} x ${formatAr(d.prix_unitaire)}</td>
  <td class="right">${formatAr(d.sous_total)}</td>
</tr>`).join('')}</table>
<div class="line"></div>
<table>
  <tr><td>Total HT</td><td class="right">${formatAr(vente.montant_ht || 0)}</td></tr>
  ${(vente.remise || 0) > 0 ? `<tr><td>Remise</td><td class="right">-${formatAr(vente.remise)}</td></tr>` : ''}
  <tr><td class="bold">TOTAL</td><td class="right bold">${formatAr(vente.montant_total)}</td></tr>
  <tr><td>Payé</td><td class="right">${formatAr(vente.montant_paye || 0)}</td></tr>
  <tr><td>Reste</td><td class="right">${formatAr(vente.reste_a_payer || 0)}</td></tr>
</table>
<div class="line"></div>
<div class="center" style="margin-top:12px;font-size:11px">Merci de votre achat !</div>
<script>window.print();</script></body></html>`;
  w.document.write(html);
  w.document.close();
};

// ─── Main Page ───────────────────────────────────────────────────
export default function VentesPage() {
  const [ventes, setVentes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ dateDebut: "", dateFin: "", statut: "", search: "" });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [printPending, setPrintPending] = useState(null);

  // Form state
  const [form, setForm] = useState({
    client_nom: "",
    client_telephone: "",
    type_paiement: "especes",
    remise: 0,
    montant_paye: 0,
    date_vente: TODAY(),
    notes: "",
  });
  const [panier, setPanier] = useState([]);
  const [searchProduit, setSearchProduit] = useState("");

  // View detail modal
  const [viewVente, setViewVente] = useState(null);
  const [viewDetails, setViewDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Responsive
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Load company + data
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      loadData();
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);
    try {
      const [ventesData, produitsData] = await Promise.all([
        (async () => {
          let q = getSupabase().from("ventes").select("*").eq("company_id", currentCompany.id).order("date_vente", { ascending: false });
          if (filters.dateDebut) q = q.gte("date_vente", filters.dateDebut);
          if (filters.dateFin) q = q.lte("date_vente", filters.dateFin);
          if (filters.statut) q = q.eq("statut", filters.statut);
          if (filters.search) q = q.or(`client_nom.ilike.%${filters.search}%,numero_facture.ilike.%${filters.search}%`);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        })(),
        getSupabase().from("produits").select("*").eq("company_id", currentCompany.id).eq("is_active", true).order("nom").then(({ data, error }) => { if (error) throw error; return data || []; }),
      ]);
      if (!mountedRef.current) return;
      setVentes(ventesData);
      setProduits(produitsData);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Erreur de chargement");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentCompany, filters]);

  // ─── Panier functions ────────────────────────────────────────
  const addToCart = (produit) => {
    if (produit.quantite_stock <= 0) { setError(`"${produit.nom}" est en rupture de stock`); return; }
    const existing = panier.find(p => p.produit_id === produit.id);
    if (existing) {
      if (existing.quantite >= produit.quantite_stock && !editMode) {
        setError(`Stock insuffisant (${produit.quantite_stock} disponibles)`);
        return;
      }
      setPanier(panier.map(p => p.produit_id === produit.id ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire } : p));
    } else {
      setPanier([...panier, { produit_id: produit.id, nom: produit.nom, quantite: 1, prix_unitaire: produit.prix_vente || 0, sous_total: produit.prix_vente || 0, stock_max: produit.quantite_stock }]);
    }
    setError(null);
  };

  const updateCartQty = (produitId, quantite) => {
    if (quantite <= 0) { setPanier(panier.filter(p => p.produit_id !== produitId)); return; }
    setPanier(panier.map(p => p.produit_id === produitId ? { ...p, quantite, sous_total: quantite * p.prix_unitaire } : p));
  };

  const updateCartPrice = (produitId, newPrice) => {
    setPanier(panier.map(p => p.produit_id === produitId ? { ...p, prix_unitaire: newPrice, sous_total: p.quantite * newPrice } : p));
  };

  const removeFromCart = (produitId) => {
    setPanier(panier.filter(p => p.produit_id !== produitId));
  };

  const resetForm = () => {
    setEditMode(false); setSelectedVente(null); setPanier([]); setSearchProduit("");
    setForm({ client_nom: "", client_telephone: "", type_paiement: "especes", remise: 0, montant_paye: 0, date_vente: TODAY(), notes: "" });
    setShowForm(false);
  };

  // ─── Calculs ─────────────────────────────────────────────────
  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalFinal = totalPanier - (parseFloat(form.remise) || 0);
  const resteAPayer = totalFinal - (parseFloat(form.montant_paye) || 0);

  // ─── Generate invoice number ─────────────────────────────────
  const generateNumeroFacture = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const { data } = await getSupabase().from("ventes").select("numero_facture").eq("company_id", currentCompany.id).order("created_at", { ascending: false }).limit(1);
    if (!data || data.length === 0) return `FACT-${year}-0001`;
    const lastNum = data[0].numero_facture;
    const match = lastNum.match(/\d+$/);
    if (match) return `FACT-${year}-${String(parseInt(match[0]) + 1).padStart(4, "0")}`;
    return `FACT-${year}-0001`;
  };

  // ─── Submit vente ────────────────────────────────────────────
  const handleSubmitVente = async () => {
    if (panier.length === 0) { setError("Ajoutez au moins un produit au panier"); return; }
    setSaving(true);
    setError(null);
    try {
      const venteData = { ...form, remise: parseFloat(form.remise) || 0, montant_paye: parseFloat(form.montant_paye) || 0 };
      const details = panier.map(p => ({ produit_id: p.produit_id, quantite: p.quantite, prix_unitaire: p.prix_unitaire, sous_total: p.sous_total }));

      if (editMode && selectedVente) {
        // Restore old stock
        const { data: oldDetails } = await getSupabase().from("vente_details").select("*").eq("vente_id", selectedVente.id);
        for (const item of (oldDetails || [])) {
          const { data: prod } = await getSupabase().from("produits").select("quantite_stock").eq("id", item.produit_id).single();
          if (prod) await getSupabase().from("produits").update({ quantite_stock: prod.quantite_stock + item.quantite }).eq("id", item.produit_id);
        }
        // Delete old details
        await getSupabase().from("vente_details").delete().eq("vente_id", selectedVente.id);
        // Update totals
        const remise = venteData.remise;
        const montantHT = details.reduce((s, d) => s + d.sous_total, 0);
        const montantFinal = montantHT - remise;
        const reste = montantFinal - venteData.montant_paye;
        await getSupabase().from("ventes").update({
          client_nom: venteData.client_nom, client_telephone: venteData.client_telephone,
          type_paiement: venteData.type_paiement, remise, montant_ht: montantHT,
          montant_total: montantFinal, montant_paye: venteData.montant_paye,
          reste_a_payer: reste, statut: reste === 0 ? "paye" : (venteData.montant_paye > 0 ? "credit" : "en_attente"),
          date_vente: venteData.date_vente, notes: venteData.notes,
        }).eq("id", selectedVente.id);
        // Insert new details + update stock
        for (const d of details) {
          await getSupabase().from("vente_details").insert({ vente_id: selectedVente.id, produit_id: d.produit_id, quantite: d.quantite, prix_unitaire: d.prix_unitaire, sous_total: d.sous_total });
          const { data: prod } = await getSupabase().from("produits").select("quantite_stock").eq("id", d.produit_id).single();
          if (prod) await getSupabase().from("produits").update({ quantite_stock: prod.quantite_stock - d.quantite }).eq("id", d.produit_id);
        }
        resetForm();
        loadData();
      } else {
        // Create new
        const numeroFacture = await generateNumeroFacture();
        const remise = venteData.remise;
        const montantHT = details.reduce((s, d) => s + d.sous_total, 0);
        const montantFinal = montantHT - remise;
        const reste = montantFinal - venteData.montant_paye;
        const { data: newVente, error: venteError } = await getSupabase().from("ventes").insert({
          company_id: currentCompany.id, numero_facture: numeroFacture,
          date_vente: venteData.date_vente, client_nom: venteData.client_nom,
          client_telephone: venteData.client_telephone, montant_ht: montantHT,
          remise, montant_total: montantFinal, montant_paye: venteData.montant_paye,
          reste_a_payer: reste, statut: reste === 0 ? "paye" : (venteData.montant_paye > 0 ? "credit" : "en_attente"),
          type_paiement: venteData.type_paiement, notes: venteData.notes,
        }).select().single();
        if (venteError) throw venteError;
        for (const d of details) {
          await getSupabase().from("vente_details").insert({ vente_id: newVente.id, produit_id: d.produit_id, quantite: d.quantite, prix_unitaire: d.prix_unitaire, sous_total: d.sous_total });
          const { data: prod } = await getSupabase().from("produits").select("quantite_stock").eq("id", d.produit_id).single();
          if (prod) await getSupabase().from("produits").update({ quantite_stock: prod.quantite_stock - d.quantite }).eq("id", d.produit_id);
        }
        resetForm();
        loadData();
        if (newVente?.id) setPrintPending({ venteId: newVente.id });
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit vente ──────────────────────────────────────────────
  const handleEditVente = async (vente) => {
    setEditMode(true); setSelectedVente(vente); setShowForm(true);
    setForm({
      client_nom: vente.client_nom || "", client_telephone: vente.client_telephone || "",
      type_paiement: vente.type_paiement || "especes", remise: vente.remise || 0,
      montant_paye: vente.montant_paye || 0, date_vente: vente.date_vente?.split("T")[0] || TODAY(),
      notes: vente.notes || "",
    });
    const { data: details } = await getSupabase().from("vente_details").select("*, produit:produits(nom)").eq("vente_id", vente.id);
    if (details) {
      setPanier(details.map(d => ({
        produit_id: d.produit_id, nom: d.produit?.nom || "Produit",
        quantite: d.quantite, prix_unitaire: d.prix_unitaire, sous_total: d.sous_total,
      })));
    }
  };

  // ─── Delete vente ────────────────────────────────────────────
  const handleDeleteVente = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const { data: details } = await getSupabase().from("vente_details").select("*").eq("vente_id", id);
      for (const item of (details || [])) {
        const { data: prod } = await getSupabase().from("produits").select("quantite_stock").eq("id", item.produit_id).single();
        if (prod) await getSupabase().from("produits").update({ quantite_stock: prod.quantite_stock + item.quantite }).eq("id", item.produit_id);
      }
      await getSupabase().from("vente_details").delete().eq("vente_id", id);
      await getSupabase().from("ventes").delete().eq("id", id);
      loadData();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // ─── View details ────────────────────────────────────────────
  const handleViewVente = async (vente) => {
    setViewVente(vente); setLoadingDetails(true);
    const { data } = await getSupabase().from("vente_details").select("*, produit:produits(nom,reference,prix_vente)").eq("vente_id", vente.id);
    setViewDetails(data || []);
    setLoadingDetails(false);
  };

  // ─── Print ───────────────────────────────────────────────────
  const handlePrint = async (vente) => {
    const { data: details } = await getSupabase().from("vente_details").select("*, produit:produits(nom)").eq("vente_id", vente.id);
    printTicket(vente, details || [], currentCompany);
  };

  const executePrint = async () => {
    if (!printPending) return;
    const { venteId } = printPending;
    setPrintPending(null);
    const vente = ventes.find(v => v.id === venteId);
    if (vente) handlePrint(vente);
  };

  // ─── Filtered produits ───────────────────────────────────────
  const produitsFiltres = produits.filter(p =>
    !searchProduit || p.nom.toLowerCase().includes(searchProduit.toLowerCase()) || (p.reference || "").toLowerCase().includes(searchProduit.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Gestion des Ventes</CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Du:</label>
                <Input type="date" value={filters.dateDebut} onChange={e => setFilters(f => ({ ...f, dateDebut: e.target.value }))} className="w-32" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Au:</label>
                <Input type="date" value={filters.dateFin} onChange={e => setFilters(f => ({ ...f, dateFin: e.target.value }))} className="w-32" />
              </div>
              <Select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))} className="w-36">
                <option value="">Tous statuts</option>
                <option value="en_attente">En attente</option>
                <option value="paye">Payé</option>
                <option value="credit">Crédit</option>
                <option value="annule">Annulé</option>
              </Select>
              <Input type="text" placeholder="Client ou facture..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-44" />
              <Button onClick={loadData}>Filtrer</Button>
              <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700">+ Nouvelle vente</Button>
            </div>
          </CardHeader>
          {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>}
        </Card>
      </div>

      {/* Mobile cards / Desktop table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
          <p className="mt-2 text-muted-foreground">Chargement des ventes...</p>
        </div>
      ) : ventes.length === 0 ? (
        <div className="text-center py-12"><p className="text-muted-foreground">Aucune vente trouvée.</p></div>
      ) : isMobile ? (
        <div className="flex flex-col gap-3">
          {ventes.map(v => {
            const solde = v.reste_a_payer || 0;
            return (
              <Card key={v.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-sm">{v.numero_facture}</div>
                    <div className="text-xs text-muted-foreground mt-1">{v.client_nom || "—"} · {new Date(v.date_vente).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <StatusBadge status={v.statut} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-muted-foreground font-semibold">TOTAL</div>
                    <div className="text-xs font-bold">{formatAr(v.montant_total)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-muted-foreground font-semibold">PAYÉ</div>
                    <div className="text-xs font-bold text-green-600">{formatAr(v.montant_paye)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-muted-foreground font-semibold">SOLDE</div>
                    <div className={`text-xs font-bold ${solde > 0 ? "text-orange-500" : "text-green-600"}`}>{solde > 0 ? formatAr(solde) : "Payé"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewVente(v)}>Voir</Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(v)}>Imp.</Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditVente(v)}>Modif</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete({ id: v.id })} className="text-red-600">Suppr</Button>
                </div>
              </Card>
            );
          })}
          {/* Total mobile */}
          <Card className="p-4 flex justify-between items-center">
            <span className="font-bold text-sm">TOTAL GÉNÉRAL</span>
            <div className="flex gap-4">
              <span className="text-green-600 font-extrabold">{formatAr(ventes.reduce((s, v) => s + (v.montant_total || 0), 0))}</span>
              <span className="text-orange-500 font-bold">Solde: {formatAr(ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0))}</span>
            </div>
          </Card>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell>Facture</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Client</TableCell>
                <TableCell className="text-right">Montant HT</TableCell>
                <TableCell className="text-right">Remise</TableCell>
                <TableCell className="text-right">Total</TableCell>
                <TableCell className="text-right">Payé</TableCell>
                <TableCell className="text-right">Solde</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.map(v => {
                const solde = v.reste_a_payer || 0;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">{v.numero_facture}</TableCell>
                    <TableCell>{new Date(v.date_vente).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{v.client_nom || "—"}</TableCell>
                    <TableCell className="text-right">{formatAr(v.montant_ht)}</TableCell>
                    <TableCell className="text-right">{(v.remise || 0) > 0 ? formatAr(v.remise) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatAr(v.montant_total)}</TableCell>
                    <TableCell className="text-right">{formatAr(v.montant_paye)}</TableCell>
                    <TableCell className={`text-right font-bold ${solde > 0 ? "text-orange-500" : "text-green-600"}`}>{solde > 0 ? formatAr(solde) : "✓"}</TableCell>
                    <TableCell><StatusBadge status={v.statut} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewVente(v)}>Voir</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(v)}>Imp.</Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditVente(v)}>Modif</Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete({ id: v.id })} className="text-red-600">Suppr</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {/* Total desktop */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
            <span className="font-bold">TOTAL GÉNÉRAL</span>
            <div className="flex gap-6">
              <span className="text-green-600 font-extrabold text-lg">{formatAr(ventes.reduce((s, v) => s + (v.montant_total || 0), 0))}</span>
              <span className="text-orange-500 font-bold">Payé: {formatAr(ventes.reduce((s, v) => s + (v.montant_paye || 0), 0))}</span>
              <span className="text-orange-500 font-bold">Solde: {formatAr(ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Nouvelle / Modifier vente ─────────────────── */}
      {showForm && (
        <Modal open={true} onClose={resetForm}>
          <ModalHeader title={editMode ? "Modifier la vente" : "Nouvelle vente"} subtitle={`${panier.length} article(s) · Total: ${formatAr(totalFinal)}`} onClose={resetForm} />
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Products */}
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Produits disponibles</div>
                <Input type="text" placeholder="Rechercher un produit..." value={searchProduit} onChange={e => setSearchProduit(e.target.value)} className="mb-2" />
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {produitsFiltres.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">Aucun produit</div>
                  ) : produitsFiltres.map(p => (
                    <div key={p.id} className={`flex justify-between items-center p-2 rounded-lg text-sm ${p.quantite_stock <= 0 ? "bg-red-50 opacity-60" : "hover:bg-gray-50"}`}>
                      <div>
                        <div className="font-medium">{p.nom}</div>
                        <div className={`text-xs ${p.quantite_stock <= 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addToCart(p)} disabled={p.quantite_stock <= 0}>+</Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Cart + Form */}
              <div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Panier</div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-3 space-y-1">
                  {panier.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">Panier vide</div>
                  ) : panier.map(item => (
                    <div key={item.produit_id} className="flex items-center gap-2 p-1 text-sm">
                      <span className="flex-1 font-medium truncate">{item.nom}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCartQty(item.produit_id, item.quantite - 1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs bg-white hover:bg-gray-100">−</button>
                        <span className="w-6 text-center font-bold text-xs">{item.quantite}</span>
                        <button onClick={() => updateCartQty(item.produit_id, item.quantite + 1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs bg-white hover:bg-gray-100">+</button>
                      </div>
                      <Input type="number" value={item.prix_unitaire} onChange={e => updateCartPrice(item.produit_id, parseFloat(e.target.value) || 0)} className="w-20 h-7 text-xs" />
                      <span className="text-xs font-medium w-16 text-right">{formatAr(item.sous_total)}</span>
                      <button onClick={() => removeFromCart(item.produit_id)} className="text-red-500 text-xs hover:text-red-700">✕</button>
                    </div>
                  ))}
                </div>

                {/* Form fields */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium">Client</label>
                    <Input type="text" value={form.client_nom} onChange={e => setForm(f => ({ ...f, client_nom: e.target.value }))} placeholder="Nom du client" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Téléphone</label>
                    <Input type="text" value={form.client_telephone} onChange={e => setForm(f => ({ ...f, client_telephone: e.target.value }))} placeholder="Téléphone" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Date</label>
                      <Input type="date" value={form.date_vente} onChange={e => setForm(f => ({ ...f, date_vente: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Paiement</label>
                      <Select value={form.type_paiement} onChange={e => setForm(f => ({ ...f, type_paiement: e.target.value }))}>
                        <option value="especes">Espèces</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="carte">Carte</option>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Remise</label>
                      <Input type="number" value={form.remise} onChange={e => setForm(f => ({ ...f, remise: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Montant payé</label>
                      <Input type="number" value={form.montant_paye} onChange={e => setForm(f => ({ ...f, montant_paye: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Notes</label>
                    <Input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optionnel)" />
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Sous-total</span><span>{formatAr(totalPanier)}</span></div>
                  {(parseFloat(form.remise) || 0) > 0 && <div className="flex justify-between text-orange-600"><span>Remise</span><span>-{formatAr(parseFloat(form.remise))}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1"><span>TOTAL</span><span>{formatAr(totalFinal)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Payé</span><span>{formatAr(parseFloat(form.montant_paye) || 0)}</span></div>
                  <div className={`flex justify-between font-bold ${resteAPayer > 0 ? "text-orange-500" : "text-green-600"}`}>
                    <span>Reste à payer</span><span>{resteAPayer > 0 ? formatAr(resteAPayer) : "Payé"}</span>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>Annuler</Button>
            <Button onClick={handleSubmitVente} disabled={saving || panier.length === 0} className="bg-green-600 hover:bg-green-700">
              {saving ? "Enregistrement..." : editMode ? "Modifier" : "Enregistrer la vente"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Voir détails ──────────────────────────────── */}
      {viewVente && (
        <Modal open={true} onClose={() => { setViewVente(null); setViewDetails([]); }}>
          <ModalHeader title={`Détails — ${viewVente.numero_facture}`} subtitle={`${viewVente.client_nom || "—"} · ${new Date(viewVente.date_vente).toLocaleDateString("fr-FR")}`} onClose={() => { setViewVente(null); setViewDetails([]); }} />
          <ModalBody>
            {loadingDetails ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{viewVente.client_nom || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tél:</span> <span className="font-medium">{viewVente.client_telephone || "—"}</span></div>
                  <div><span className="text-muted-foreground">Paiement:</span> <span className="font-medium">{viewVente.type_paiement}</span></div>
                  <div><span className="text-muted-foreground">Statut:</span> <StatusBadge status={viewVente.statut} /></div>
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Produits</div>
                <Table className="w-full text-sm">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell className="text-right">Qté</TableCell>
                      <TableCell className="text-right">Prix unit.</TableCell>
                      <TableCell className="text-right">Sous-total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewDetails.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.produit?.nom || d.nom || "Produit"}</TableCell>
                        <TableCell className="text-right">{d.quantite}</TableCell>
                        <TableCell className="text-right">{formatAr(d.prix_unitaire)}</TableCell>
                        <TableCell className="text-right font-medium">{formatAr(d.sous_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Total HT</span><span>{formatAr(viewVente.montant_ht)}</span></div>
                  {(viewVente.remise || 0) > 0 && <div className="flex justify-between text-orange-600"><span>Remise</span><span>-{formatAr(viewVente.remise)}</span></div>}
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>TOTAL</span><span>{formatAr(viewVente.montant_total)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Payé</span><span>{formatAr(viewVente.montant_paye)}</span></div>
                  <div className={`flex justify-between font-bold ${(viewVente.reste_a_payer || 0) > 0 ? "text-orange-500" : "text-green-600"}`}>
                    <span>Reste</span><span>{(viewVente.reste_a_payer || 0) > 0 ? formatAr(viewVente.reste_a_payer) : "Payé"}</span>
                  </div>
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => handlePrint(viewVente)}>Imprimer</Button>
            <Button onClick={() => { handleEditVente(viewVente); setViewVente(null); }}>Modifier</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Confirmation suppression ──────────────────── */}
      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(null)}>
          <ModalHeader title="Supprimer la vente ?" message="Cette action est irréversible. Le stock sera restauré." onClose={() => setConfirmDelete(null)} />
          <ModalBody>
            <p className="text-sm text-muted-foreground">Le stock des produits sera restauré automatiquement.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button onClick={handleDeleteVente} className="bg-red-600 hover:bg-red-700">Supprimer</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Impression ticket ─────────────────────────── */}
      {printPending && (
        <Modal open={true} onClose={() => setPrintPending(null)}>
          <ModalHeader title="Impression" message="Vente enregistrée avec succès" onClose={() => setPrintPending(null)} />
          <ModalBody>
            <p className="text-sm text-center text-muted-foreground">Voulez-vous imprimer le ticket de caisse ?</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPrintPending(null)}>Non merci</Button>
            <Button onClick={executePrint} className="bg-blue-600 hover:bg-blue-700">Imprimer</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
