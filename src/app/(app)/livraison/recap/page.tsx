// @ts-nocheck
"use client";
// @ts-nocheck

import { useState, useEffect, useMemo, useCallback } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY, currentMonth, monthLabel, shouldCountGerantCommission, COMMISSION_DEFAUT } from "@/modules/shared/utils/constants";
import { getRecuperationsByMonth } from "@/modules/livraison/services/recuperationService";
import {
  Button, Input, Select, Badge, Card, CardHeader, CardTitle,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@/modules/shared/components/ui";

export default function RecapPage() {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [agents, setAgents] = useState([]);
  const [avances, setAvances] = useState([]);
  const [recuperationsMois, setRecuperationsMois] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Avance modal state
  const [showAvanceModal, setShowAvanceModal] = useState(false);
  const [avanceAgentId, setAvanceAgentId] = useState("");
  const [avanceMontant, setAvanceMontant] = useState("");
  const [avanceMotif, setAvanceMotif] = useState("");
  const [savingAvance, setSavingAvance] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
    }
  }, []);

  // Fetch all data when company or month changes
  const fetchData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch livraisons for the selected month
      const { data: livData, error: livError } = await getSupabase()
        .from("livraisons")
        .select("*")
        .eq("company_id", currentCompany.id)
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-31`)
        .order("date", { ascending: false });
      if (livError) throw livError;
      setLivraisons(livData || []);

      // Fetch agents
      const { data: agentsData, error: agentsError } = await getSupabase()
        .from("agents")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("nom");
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Fetch avances for the selected month
      const { data: avData, error: avError } = await getSupabase()
        .from("avances")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("mois", selectedMonth);
      if (avError) throw avError;
      setAvances(avData || []);

      // Fetch recuperations for the selected month
      const recupData = await getRecuperationsByMonth(selectedMonth, currentCompany.id);
      setRecuperationsMois(recupData || []);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [currentCompany, selectedMonth]);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany, fetchData]);

  // Build month options from livraisons
  const monthOptions = useMemo(() => {
    const s = new Set(livraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(currentMonth());
    return [...s].sort().reverse().map((m) => ({ value: m, label: monthLabel(m) }));
  }, [livraisons]);

  // Filter livraisons by selected month
  const monthLivs = useMemo(
    () => livraisons.filter((l) => l.date && l.date.startsWith(selectedMonth)),
    [livraisons, selectedMonth]
  );

  // Filter avances by selected month (non-annule only for display)
  const monthAvances = useMemo(
    () => avances.filter((a) => a.mois === selectedMonth && !a.annule),
    [avances, selectedMonth]
  );

  // Agent match helper
  const agentMatch = (livraison, agent) => {
    if (livraison.agent_id != null && agent.id != null) {
      return Number(livraison.agent_id) === Number(agent.id);
    }
    return livraison.agent_nom === agent.nom;
  };

  // Per-agent stats
  const monthStatsByAgent = useMemo(() => {
    return agents.map((ag) => {
      const ls = monthLivs.filter((l) => agentMatch(l, ag));
      const av = monthAvances.filter((a) => a.agent_id === ag.id);
      const recups = recuperationsMois.filter((r) => r.livreur_nom === ag.nom);
      const totalRecups = recups.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
      const totalAvances = av.reduce((s, a) => s + parseFloat(a.montant || 0), 0);
      return {
        ...ag,
        nbLivs: ls.length,
        nbLivres: ls.filter((l) => l.statut === "livre").length,
        nbRetours: ls.filter((l) => l.statut === "retourne").length,
        nbReportes: ls.filter((l) => l.statut === "reporte").length,
        totalFrais: ls.reduce((s, l) => s + parseFloat(l.frais || 0), 0),
        totalAvances,
        netSalaire: parseFloat(ag.salaire || 0) - totalAvances,
        avances: av,
        recuperations: recups,
        totalRecuperations: totalRecups,
        nbRecuperations: recups.length,
      };
    });
  }, [agents, monthLivs, monthAvances, recuperationsMois]);

  // Month summary calculations
  const monthTotalMontant = monthLivs
    .filter((l) => l.paiement !== "client")
    .reduce((s, l) => s + parseFloat(l.montant || 0), 0);
  const monthTotalFrais = monthLivs.reduce((s, l) => s + parseFloat(l.frais || 0), 0);
  const monthTotalSalaires = monthStatsByAgent.reduce((s, a) => s + parseFloat(a.salaire || 0), 0);
  const monthTotalAvances = monthStatsByAgent.reduce((s, a) => s + a.totalAvances, 0);
  const livsGerant = monthLivs.filter((l) => shouldCountGerantCommission(l));
  const monthGerantGain = livsGerant.length * COMMISSION_DEFAUT;
  const monthTotalRecuperations = monthStatsByAgent.reduce((s, a) => s + a.totalRecuperations, 0);
  const monthBenefice = monthTotalFrais - monthTotalSalaires - monthGerantGain - monthTotalRecuperations;

  // Agent options for select
  const agentOptions = agents.map((a) => ({ value: a.id, label: a.nom }));

  // Handle add avance
  const handleAddAvance = async () => {
    if (!avanceAgentId || !avanceMontant) {
      showToast("Agent et montant requis", "error");
      return;
    }
    setSavingAvance(true);
    try {
      const agent = agents.find((a) => a.id === parseInt(avanceAgentId));
      const { error: insertError } = await getSupabase().from("avances").insert({
        agent_id: parseInt(avanceAgentId),
        agent_nom: agent?.nom || "",
        montant: parseFloat(avanceMontant),
        motif: avanceMotif || "",
        date: TODAY(),
        mois: currentMonth(),
        annule: false,
        company_id: currentCompany?.id,
      });
      if (insertError) throw insertError;
      showToast("Avance ajoutée");
      setAvanceAgentId("");
      setAvanceMontant("");
      setAvanceMotif("");
      setShowAvanceModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || "Erreur lors de l'ajout de l'avance", "error");
    } finally {
      setSavingAvance(false);
    }
  };

  // Handle delete avance
  const handleDeleteAvance = async (id) => {
    if (!window.confirm("Supprimer cette avance ?")) return;
    try {
      const { error: delError } = await getSupabase().from("avances").delete().eq("id", id);
      if (delError) throw delError;
      showToast("Avance supprimée");
      fetchData();
    } catch (err) {
      showToast(err.message || "Erreur lors de la suppression", "error");
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-red-500"
              : toast.type === "warn"
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Récapitulatif</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{currentCompany?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">Mois:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-border rounded-md px-3 py-2 text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Month Summary Card */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Bénéfice net — {monthLabel(selectedMonth)}
            </p>
            <p
              className={`text-3xl font-black ${
                monthBenefice >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatAr(monthBenefice)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Frais − Salaires − Commission − Récupérations
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Montant colis</p>
              <p className="font-bold text-green-500">{formatAr(monthTotalMontant)}</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Frais collectés</p>
              <p className="font-bold text-orange-500">{formatAr(monthTotalFrais)}</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Salaires</p>
              <p className="font-bold text-red-500">{formatAr(monthTotalSalaires)}</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Avances</p>
              <p className="font-bold text-yellow-500">{formatAr(monthTotalAvances)}</p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Livraisons</p>
              <p className="font-bold text-text">{monthLivs.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Commission Gérant Card */}
      <Card className="p-4 mb-6 border-l-4 border-l-purple-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">
              Commission gérant — {monthLabel(selectedMonth)}
            </p>
            <p className="text-2xl font-black text-text">{formatAr(monthGerantGain)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {livsGerant.length} livraisons × {formatAr(COMMISSION_DEFAUT)}
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 max-w-xs">
            <p>Exclus: POMANAY, ZAZATIANA</p>
            <p>Uniquement les livraisons avec frais &gt; 0</p>
          </div>
        </div>
      </Card>

      {/* Per-Agent Stats */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Agents — {monthLabel(selectedMonth)}
        </h2>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
          <p className="mt-3 text-muted-foreground">Chargement...</p>
        </div>
      ) : agents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun agent trouvé.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block mb-6">
            <Card className="p-4 overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHead>
                  <TableRow>
                    <TableCell className="font-bold">Agent</TableCell>
                    <TableCell className="text-center font-bold">Total</TableCell>
                    <TableCell className="text-center font-bold text-green-500">Livrés</TableCell>
                    <TableCell className="text-center font-bold text-red-500">Retournés</TableCell>
                    <TableCell className="text-center font-bold text-purple-500">Reportés</TableCell>
                    <TableCell className="text-right font-bold text-orange-500">Frais</TableCell>
                    <TableCell className="text-right font-bold">Salaire</TableCell>
                    <TableCell className="text-right font-bold text-yellow-500">Avances</TableCell>
                    <TableCell className="text-right font-bold">Net</TableCell>
                    <TableCell className="text-center font-bold text-teal-500">Récup.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthStatsByAgent.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-bold">{a.nom}</TableCell>
                      <TableCell className="text-center">{a.nbLivs}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" size="sm">{a.nbLivres}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" size="sm">{a.nbRetours}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" size="sm">{a.nbReportes}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-orange-500 font-semibold">
                        {formatAr(a.totalFrais)}
                      </TableCell>
                      <TableCell className="text-right">{formatAr(a.salaire)}</TableCell>
                      <TableCell className="text-right text-yellow-500">
                        {a.totalAvances > 0 ? formatAr(a.totalAvances) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          a.netSalaire >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatAr(a.netSalaire)}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.nbRecuperations > 0 ? (
                          <span className="text-teal-500 font-semibold">
                            {a.nbRecuperations} ({formatAr(a.totalRecuperations)})
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 mb-6">
            {monthStatsByAgent.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{a.nom}</h3>
                  <div className="flex gap-2">
                    <Badge variant="success" size="sm">Sal: {formatAr(a.salaire)}</Badge>
                    {a.totalAvances > 0 && (
                      <Badge variant="warning" size="sm">Av: {formatAr(a.totalAvances)}</Badge>
                    )}
                    <Badge variant={a.netSalaire >= 0 ? "success" : "destructive"} size="sm">
                      Net: {formatAr(a.netSalaire)}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold">{a.nbLivs}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Livrés</p>
                    <p className="font-bold text-green-500">{a.nbLivres}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Retournés</p>
                    <p className="font-bold text-red-500">{a.nbRetours}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Reportés</p>
                    <p className="font-bold text-purple-500">{a.nbReportes}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Frais</p>
                    <p className="font-bold text-orange-500">{formatAr(a.totalFrais)}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">Récup.</p>
                    <p className="font-bold text-teal-500">
                      {a.nbRecuperations > 0 ? `${a.nbRecuperations} (${formatAr(a.totalRecuperations)})` : "—"}
                    </p>
                  </div>
                </div>

                {/* Avances list */}
                {a.avances.length > 0 && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-bold text-pink-500 uppercase mb-2">
                      Avances sur salaire (déduites du salaire)
                    </p>
                    {a.avances.map((av) => (
                      <div
                        key={av.id}
                        className="flex items-center justify-between bg-muted/20 rounded-lg p-2 mb-2"
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-orange-500 font-bold text-sm">
                            {formatAr(parseFloat(av.montant || 0))}
                          </span>
                          {av.motif && (
                            <span className="text-xs text-muted-foreground bg-border px-2 py-0.5 rounded-full">
                              {av.motif}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{av.date}</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAvance(av.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recuperations list */}
                {a.nbRecuperations > 0 && (
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-yellow-500 uppercase">
                        Récupérations matinales ({a.nbRecuperations})
                      </p>
                      <span className="text-xs text-green-500 font-semibold">
                        {formatAr(a.totalRecuperations)}
                      </span>
                    </div>
                    {a.recuperations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between bg-muted/20 rounded-lg p-2 mb-2"
                      >
                        <div>
                          <span className="text-xs text-yellow-500">{rec.client_donneur}</span>
                          <span className="text-xs text-muted-foreground ml-2">{rec.date}</span>
                        </div>
                        <span className="text-green-500 font-semibold text-sm">
                          {formatAr(rec.frais_recuperation)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Avance Section */}
      <div className="mt-8 mb-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Ajouter une avance
        </h2>
      </div>
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Agent</label>
            <select
              value={avanceAgentId}
              onChange={(e) => setAvanceAgentId(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Agent --</option>
              {agentOptions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Montant (Ar)</label>
            <Input
              type="number"
              placeholder="50000"
              value={avanceMontant}
              onChange={(e) => setAvanceMontant(e.target.value)}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Motif de l'avance</label>
          <Input
            type="text"
            placeholder="Ex: Urgence familiale, Achat matériel, Soins médicaux..."
            value={avanceMotif}
            onChange={(e) => setAvanceMotif(e.target.value)}
          />
        </div>
        <Button
          variant="warning"
          fullWidth
          onClick={() => setShowAvanceModal(true)}
          disabled={!avanceAgentId || !avanceMontant}
        >
          Enregistrer l'avance
        </Button>
      </Card>

      {/* Cancelled Avances */}
      {avances.filter((a) => a.mois === selectedMonth && a.annule).length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Avances annulées
          </h2>
          {avances
            .filter((a) => a.mois === selectedMonth && a.annule)
            .map((av) => (
              <div
                key={av.id}
                className="flex items-center justify-between bg-muted/20 border border-border rounded-lg p-3 mb-2 opacity-60"
              >
                <div>
                  <span className="text-muted-foreground line-through">
                    {av.agent_nom} — {formatAr(parseFloat(av.montant || 0))}
                  </span>
                  {av.motif && (
                    <span className="text-xs text-muted-foreground ml-2">({av.motif})</span>
                  )}
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteAvance(av.id)}>
                  Définitivement
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Confirm Avance Modal */}
      <Modal open={showAvanceModal} onClose={() => setShowAvanceModal(false)}>
        <ModalHeader title="Confirmer l'avance" onClose={() => setShowAvanceModal(false)} />
        <ModalBody>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Agent:</span>{" "}
              <span className="font-bold">
                {agents.find((a) => a.id === parseInt(avanceAgentId))?.nom || "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Montant:</span>{" "}
              <span className="font-bold text-orange-500">
                {formatAr(parseFloat(avanceMontant || 0))}
              </span>
            </p>
            {avanceMotif && (
              <p>
                <span className="text-muted-foreground">Motif:</span>{" "}
                <span className="font-medium">{avanceMotif}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Cette avance sera déduite du salaire net de l'agent pour le mois de{" "}
              {monthLabel(currentMonth())}.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAvanceModal(false)}>
            Annuler
          </Button>
          <Button variant="warning" onClick={handleAddAvance} disabled={savingAvance}>
            {savingAvance ? "Enregistrement..." : "Confirmer"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export const dynamic = "force-dynamic";
