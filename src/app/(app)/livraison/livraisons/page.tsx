// @ts-nocheck
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

// ─── Status Badge ───────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    en_cours:  { variant: "secondary", label: "En cours" },
    livre:     { variant: "success", label: "Livré" },
    retourne:  { variant: "destructive", label: "Retourné" },
    reporte:   { variant: "default", label: "Reporté" },
    province:  { variant: "default", label: "Province" },
    en_attente:{ variant: "default", label: "En attente" },
  };
  const c = cfg[status] || { variant: "default", label: status || "—" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

// ─── Print Bon de Livraison (thermal 80mm) ─────────────────────────
const printBon = (livraison, company) => {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  const html = `<!DOCTYPE html><html><head><title>Bon #${livraison.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;padding:8px;color:#000;background:#fff;width:80mm}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  .line{border-top:1px dashed #000;margin:6px 0}
  .mb4{margin-bottom:4px}.mb8{margin-bottom:8px}
  table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:11px}
  .big{font-size:14px}.small{font-size:10px}
  @media print{body{padding:4px}}
</style></head><body>
<div class="center mb8">
  <div class="bold big">${company?.name || 'GesCo'}</div>
  <div class="small">Bon de Livraison</div>
</div>
<div class="line"></div>
<div class="mb4">N°: <span class="bold">${livraison.id}</span></div>
<div class="mb4">Date: ${livraison.date ? new Date(livraison.date).toLocaleDateString('fr-FR') : '—'}</div>
<div class="mb4">Colis: <span class="bold">${livraison.colis || '—'}</span></div>
<div class="line"></div>
<div class="bold mb4">Client donneur:</div>
<div class="mb4">${livraison.client_donneur || '—'}</div>
<div class="line"></div>
<div class="bold mb4">Destinataire:</div>
<div class="mb4">${livraison.destinataire || '—'}</div>
<div class="mb4">Tél: ${livraison.destinataire_telephone || '—'}</div>
<div class="mb4">Lieu: ${livraison.destinataire_lieu || '—'}</div>
<div class="line"></div>
<div class="mb4">Agent: <span class="bold">${livraison.agent_nom || '—'}</span></div>
<div class="mb4">Montant: <span class="bold">${formatAr(livraison.montant)}</span></div>
<div class="mb4">Frais: ${formatAr(livraison.frais || 0)}</div>
<div class="mb4">Paiement: ${livraison.paiement || '—'}</div>
<div class="mb4">Statut: ${livraison.statut || '—'}</div>
${livraison.remarque ? `<div class="mb4">Remarque: ${livraison.remarque}</div>` : ''}
<div class="line"></div>
<div class="center" style="margin-top:12px;font-size:10px">Merci !</div>
<script>window.print();</script></body></html>`;
  w.document.write(html);
  w.document.close();
};

// ─── Print Feuille Agent (grouped by destinataire) ─────────────────
const printFeuilleAgent = (agent, livraisons, company) => {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const grouped = {};
  for (const l of livraisons) {
    const key = l.destinataire || "—";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  }
  const rows = Object.entries(grouped).map(([dest, items]) => {
    const totalMontant = items.reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
    const totalFrais = items.reduce((s, i) => s + (parseFloat(i.frais) || 0), 0);
    return `<div style="margin-bottom:16px;padding:8px;border:1px solid #ddd;border-radius:4px">
      <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${dest}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="background:#f5f5f5">
          <th style="padding:4px;text-align:left;border:1px solid #ddd">Colis</th>
          <th style="padding:4px;text-align:left;border:1px solid #ddd">Tél</th>
          <th style="padding:4px;text-align:left;border:1px solid #ddd">Lieu</th>
          <th style="padding:4px;text-align:right;border:1px solid #ddd">Montant</th>
          <th style="padding:4px;text-align:right;border:1px solid #ddd">Frais</th>
          <th style="padding:4px;text-align:center;border:1px solid #ddd">Statut</th>
        </tr>
        ${items.map(i => `<tr>
          <td style="padding:4px;border:1px solid #ddd">${i.colis || '—'}</td>
          <td style="padding:4px;border:1px solid #ddd">${i.destinataire_telephone || '—'}</td>
          <td style="padding:4px;border:1px solid #ddd">${i.destinataire_lieu || '—'}</td>
          <td style="padding:4px;text-align:right;border:1px solid #ddd">${formatAr(i.montant)}</td>
          <td style="padding:4px;text-align:right;border:1px solid #ddd">${formatAr(i.frais || 0)}</td>
          <td style="padding:4px;text-align:center;border:1px solid #ddd">${i.statut || '—'}</td>
        </tr>`).join('')}
        <tr style="font-weight:bold;background:#f9f9f9">
          <td colspan="3" style="padding:4px;border:1px solid #ddd">Total (${items.length} livraison${items.length > 1 ? 's' : ''})</td>
          <td style="padding:4px;text-align:right;border:1px solid #ddd">${formatAr(totalMontant)}</td>
          <td style="padding:4px;text-align:right;border:1px solid #ddd">${formatAr(totalFrais)}</td>
          <td style="border:1px solid #ddd"></td>
        </tr>
      </table>
    </div>`;
  }).join('');

  const grandTotal = livraisons.reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
  const grandFrais = livraisons.reduce((s, i) => s + (parseFloat(i.frais) || 0), 0);

  const html = `<!DOCTYPE html><html><head><title>Feuille Agent - ${agent.nom}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:13px;padding:24px;color:#000;background:#fff}
  @media print{body{padding:12px}}
</style></head><body>
<div style="text-align:center;margin-bottom:20px">
  <div style="font-size:18px;font-weight:bold">${company?.name || 'GesCo'}</div>
  <div style="font-size:14px;margin-top:4px">Feuille Agent: <strong>${agent.nom}</strong></div>
  <div style="font-size:12px;color:#666">Date: ${new Date().toLocaleDateString('fr-FR')} · ${livraisons.length} livraison${livraisons.length > 1 ? 's' : ''}</div>
</div>
<hr style="margin-bottom:16px;border:1px dashed #000">
${rows}
<hr style="margin:16px 0;border:1px dashed #000">
<div style="text-align:right;font-size:14px;font-weight:bold">
  Total Montant: ${formatAr(grandTotal)} · Total Frais: ${formatAr(grandFrais)}
</div>
<div style="text-align:center;margin-top:24px;font-size:11px;color:#888">Signature: ________________________</div>
<script>window.print();</script></body></html>`;
  w.document.write(html);
  w.document.close();
};

// ─── Empty Form ─────────────────────────────────────────────────────
const emptyForm = () => ({
  colis: "",
  client_donneur: "",
  destinataire: "",
  destinataire_telephone: "",
  destinataire_lieu: "",
  agent_id: "",
  agent_nom: "",
  montant: "",
  frais: "",
  paiement: "especes",
  date: TODAY(),
  statut: "en_cours",
  remarque: "",
});

// ─── Main Page ──────────────────────────────────────────────────────
export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    date: TODAY(),
    agent_id: "",
    statut: "",
  });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedLivraison, setSelectedLivraison] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [form, setForm] = useState(emptyForm());

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Responsive detection
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
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);
    try {
      let q = getSupabase()
        .from("livraisons")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("date", { ascending: false })
        .order("id", { ascending: false });

      if (filters.date) q = q.eq("date", filters.date);
      if (filters.agent_id) q = q.eq("agent_id", filters.agent_id);
      if (filters.statut) q = q.eq("statut", filters.statut);

      const { data: livData, error: livError } = await q;
      if (livError) throw livError;

      const { data: agentsData, error: agentsError } = await getSupabase()
        .from("agents")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("nom");
      if (agentsError) throw agentsError;

      if (!mountedRef.current) return;
      setLivraisons(livData || []);
      setAgents(agentsData || []);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Erreur de chargement");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentCompany, filters]);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany, loadData]);

  // ─── Form helpers ──────────────────────────────────────────────
  const resetForm = () => {
    setEditMode(false);
    setSelectedLivraison(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleAgentChange = (e) => {
    const agentId = e.target.value;
    const agent = agents.find((a) => String(a.id) === String(agentId));
    setForm((f) => ({
      ...f,
      agent_id: agentId,
      agent_nom: agent ? agent.nom : "",
    }));
  };

  // ─── Create ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.destinataire) { setError("Le destinataire est requis"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await getSupabase().from("livraisons").insert({
        company_id: currentCompany.id,
        colis: form.colis || null,
        client_donneur: form.client_donneur || null,
        destinataire: form.destinataire || null,
        destinataire_telephone: form.destinataire_telephone || null,
        destinataire_lieu: form.destinataire_lieu || null,
        agent_id: form.agent_id ? parseInt(form.agent_id) : null,
        agent_nom: form.agent_nom || null,
        montant: parseFloat(form.montant) || 0,
        frais: parseFloat(form.frais) || 0,
        paiement: form.paiement || "especes",
        date: form.date || TODAY(),
        statut: form.statut || "en_cours",
        remarque: form.remarque || null,
      });
      if (insertError) throw insertError;
      resetForm();
      loadData();
    } catch (err) {
      setError(err.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  // ─── Update ────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedLivraison) return;
    if (!form.destinataire) { setError("Le destinataire est requis"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await getSupabase()
        .from("livraisons")
        .update({
          colis: form.colis || null,
          client_donneur: form.client_donneur || null,
          destinataire: form.destinataire || null,
          destinataire_telephone: form.destinataire_telephone || null,
          destinataire_lieu: form.destinataire_lieu || null,
          agent_id: form.agent_id ? parseInt(form.agent_id) : null,
          agent_nom: form.agent_nom || null,
          montant: parseFloat(form.montant) || 0,
          frais: parseFloat(form.frais) || 0,
          paiement: form.paiement || "especes",
          date: form.date || TODAY(),
          statut: form.statut || "en_cours",
          remarque: form.remarque || null,
        })
        .eq("id", selectedLivraison.id);
      if (updateError) throw updateError;
      resetForm();
      loadData();
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      const { error: delError } = await getSupabase().from("livraisons").delete().eq("id", id);
      if (delError) throw delError;
      loadData();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // ─── Edit click ────────────────────────────────────────────────
  const handleEdit = (liv) => {
    setEditMode(true);
    setSelectedLivraison(liv);
    setShowForm(true);
    setForm({
      colis: liv.colis || "",
      client_donneur: liv.client_donneur || "",
      destinataire: liv.destinataire || "",
      destinataire_telephone: liv.destinataire_telephone || "",
      destinataire_lieu: liv.destinataire_lieu || "",
      agent_id: liv.agent_id ? String(liv.agent_id) : "",
      agent_nom: liv.agent_nom || "",
      montant: liv.montant != null ? String(liv.montant) : "",
      frais: liv.frais != null ? String(liv.frais) : "",
      paiement: liv.paiement || "especes",
      date: liv.date || TODAY(),
      statut: liv.statut || "en_cours",
      remarque: liv.remarque || "",
    });
  };

  // ─── Print bon ─────────────────────────────────────────────────
  const handlePrintBon = (liv) => {
    printBon(liv, currentCompany);
  };

  // ─── Print feuille agent ───────────────────────────────────────
  const handlePrintFeuille = (agent) => {
    const agentLivs = livraisons.filter(
      (l) => String(l.agent_id) === String(agent.id)
    );
    if (agentLivs.length === 0) {
      setError(`Aucune livraison pour ${agent.nom} avec les filtres actuels`);
      return;
    }
    printFeuilleAgent(agent, agentLivs, currentCompany);
  };

  // ─── Unique agents in current livraisons ───────────────────────
  const activeAgentIds = [...new Set(livraisons.map((l) => l.agent_id).filter(Boolean))];
  const activeAgents = agents.filter((a) => activeAgentIds.includes(a.id));

  // ─── Totals ────────────────────────────────────────────────────
  const totalMontant = livraisons.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const totalFrais = livraisons.reduce((s, l) => s + (parseFloat(l.frais) || 0), 0);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Gestion des Livraisons</CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Date:</label>
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
                  className="w-32"
                />
              </div>
              <Select
                value={filters.agent_id}
                onChange={(e) => setFilters((f) => ({ ...f, agent_id: e.target.value }))}
                className="w-36"
              >
                <option value="">Tous agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </Select>
              <Select
                value={filters.statut}
                onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value }))}
                className="w-36"
              >
                <option value="">Tous statuts</option>
                <option value="en_cours">En cours</option>
                <option value="livre">Livré</option>
                <option value="retourne">Retourné</option>
                <option value="reporte">Reporté</option>
                <option value="province">Province</option>
                <option value="en_attente">En attente</option>
              </Select>
              <Button onClick={loadData}>Filtrer</Button>
              <Button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-green-600 hover:bg-green-700"
              >
                + Nouvelle livraison
              </Button>
            </div>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* Agent feuille buttons */}
      {activeAgents.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground mr-2">Feuille agent:</span>
          {activeAgents.map((a) => {
            const count = livraisons.filter((l) => String(l.agent_id) === String(a.id)).length;
            return (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                onClick={() => handlePrintFeuille(a)}
              >
                📋 {a.nom} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Loading / Empty / Data */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
          <p className="mt-2 text-muted-foreground">Chargement des livraisons...</p>
        </div>
      ) : livraisons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucune livraison trouvée.</p>
        </div>
      ) : isMobile ? (
        /* ─── Mobile Cards ─────────────────────────────────────── */
        <div className="flex flex-col gap-3">
          {livraisons.map((liv) => (
            <Card key={liv.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-sm">#{liv.id} · {liv.colis || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {liv.destinataire || "—"} · {liv.date ? new Date(liv.date).toLocaleDateString("fr-FR") : "—"}
                  </div>
                </div>
                <StatusBadge status={liv.statut} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground font-semibold">CLIENT</div>
                  <div className="text-xs font-medium">{liv.client_donneur || "—"}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground font-semibold">AGENT</div>
                  <div className="text-xs font-medium">{liv.agent_nom || "—"}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground font-semibold">MONTANT</div>
                  <div className="text-xs font-bold">{formatAr(liv.montant)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground font-semibold">FRAIS</div>
                  <div className="text-xs font-bold">{formatAr(liv.frais || 0)}</div>
                </div>
              </div>
              {liv.destinataire_telephone && (
                <div className="text-xs text-muted-foreground mb-2">📞 {liv.destinataire_telephone}</div>
              )}
              {liv.destinataire_lieu && (
                <div className="text-xs text-muted-foreground mb-2">📍 {liv.destinataire_lieu}</div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePrintBon(liv)}>🖨️ Bon</Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(liv)}>Modif</Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(liv.id)} className="text-red-600">Suppr</Button>
              </div>
            </Card>
          ))}
          {/* Total mobile */}
          <Card className="p-4 flex flex-col gap-2">
            <span className="font-bold text-sm">TOTAL GÉNÉRAL ({livraisons.length} livraisons)</span>
            <div className="flex justify-between">
              <span className="text-green-600 font-extrabold">{formatAr(totalMontant)}</span>
              <span className="text-orange-500 font-bold">Frais: {formatAr(totalFrais)}</span>
            </div>
          </Card>
        </div>
      ) : (
        /* ─── Desktop Table ─────────────────────────────────────── */
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Colis</TableCell>
                <TableCell>Client donneur</TableCell>
                <TableCell>Destinataire</TableCell>
                <TableCell>Tél</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell className="text-right">Montant</TableCell>
                <TableCell className="text-right">Frais</TableCell>
                <TableCell>Paiement</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {livraisons.map((liv) => (
                <TableRow key={liv.id}>
                  <TableCell className="font-mono text-xs">#{liv.id}</TableCell>
                  <TableCell>{liv.date ? new Date(liv.date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell>{liv.colis || "—"}</TableCell>
                  <TableCell>{liv.client_donneur || "—"}</TableCell>
                  <TableCell className="font-medium">{liv.destinataire || "—"}</TableCell>
                  <TableCell>{liv.destinataire_telephone || "—"}</TableCell>
                  <TableCell>{liv.destinataire_lieu || "—"}</TableCell>
                  <TableCell>{liv.agent_nom || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatAr(liv.montant)}</TableCell>
                  <TableCell className="text-right">{formatAr(liv.frais || 0)}</TableCell>
                  <TableCell>{liv.paiement || "—"}</TableCell>
                  <TableCell><StatusBadge status={liv.statut} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handlePrintBon(liv)}>🖨️ Bon</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(liv)}>Modif</Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmDelete(liv.id)} className="text-red-600">Suppr</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Total desktop */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
            <span className="font-bold">TOTAL GÉNÉRAL ({livraisons.length} livraisons)</span>
            <div className="flex gap-6">
              <span className="text-green-600 font-extrabold text-lg">Montant: {formatAr(totalMontant)}</span>
              <span className="text-orange-500 font-bold">Frais: {formatAr(totalFrais)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Create / Edit livraison ──────────────────────── */}
      {showForm && (
        <Modal open={true} onClose={resetForm}>
          <ModalHeader title={editMode ? "Modifier la livraison" : "Nouvelle livraison"} onClose={resetForm} />
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Colis</label>
                <Input type="text" placeholder="Référence colis" value={form.colis} onChange={(e) => setForm((f) => ({ ...f, colis: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client donneur</label>
                <Input type="text" placeholder="Nom du client" value={form.client_donneur} onChange={(e) => setForm((f) => ({ ...f, client_donneur: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Destinataire *</label>
                <Input type="text" placeholder="Nom du destinataire" value={form.destinataire} onChange={(e) => setForm((f) => ({ ...f, destinataire: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone destinataire</label>
                <Input type="text" placeholder="Numéro de téléphone" value={form.destinataire_telephone} onChange={(e) => setForm((f) => ({ ...f, destinataire_telephone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lieu destinataire</label>
                <Input type="text" placeholder="Adresse / lieu" value={form.destinataire_lieu} onChange={(e) => setForm((f) => ({ ...f, destinataire_lieu: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <Select value={form.agent_id} onChange={handleAgentChange}>
                  <option value="">— Sélectionner un agent —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant (Ar)</label>
                <Input type="number" placeholder="0" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frais (Ar)</label>
                <Input type="number" placeholder="0" value={form.frais} onChange={(e) => setForm((f) => ({ ...f, frais: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paiement</label>
                <Select value={form.paiement} onChange={(e) => setForm((f) => ({ ...f, paiement: e.target.value }))}>
                  <option value="especes">Espèces</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="client">Payé au client</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <Select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
                  <option value="en_cours">En cours</option>
                  <option value="livre">Livré</option>
                  <option value="retourne">Retourné</option>
                  <option value="reporte">Reporté</option>
                  <option value="province">Province</option>
                  <option value="en_attente">En attente</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Remarque</label>
                <Input type="text" placeholder="Remarque (optionnel)" value={form.remarque} onChange={(e) => setForm((f) => ({ ...f, remarque: e.target.value }))} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>Annuler</Button>
            <Button onClick={editMode ? handleUpdate : handleCreate} disabled={saving}>
              {saving ? "Enregistrement..." : (editMode ? "Mettre à jour" : "Enregistrer")}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Confirm Delete ───────────────────────────────── */}
      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(null)}>
          <ModalHeader title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} />
          <ModalBody>
            <p>Êtes-vous sûr de vouloir supprimer cette livraison ? Cette action est irréversible.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
