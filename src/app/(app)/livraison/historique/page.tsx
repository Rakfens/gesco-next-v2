// @ts-nocheck
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import {
  Button, Input, Select, Badge, Card, CardHeader, CardTitle,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty,
} from "@/modules/shared/components/ui";

// ─── Status Badge ───────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    en_cours:  { variant: "info", label: "En cours" },
    livre:     { variant: "success", label: "Livré" },
    retourne:  { variant: "danger", label: "Retourné" },
    reporte:   { variant: "purple", label: "Reporté" },
    province:  { variant: "default", label: "Province" },
    en_attente:{ variant: "warning", label: "En attente" },
  };
  const c = cfg[status] || { variant: "default", label: status || "—" };
  return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
};

// ─── CSV Export ─────────────────────────────────────────────────────
const exportToCSV = (data) => {
  if (!data || !data.length) return;
  const headers = ["Colis", "Client", "Destinataire", "Telephone", "Agent", "Montant", "Frais", "Paiement", "Date", "Statut"];
  const keys = ["colis", "client_donneur", "destinataire", "destinataire_telephone", "agent_nom", "montant", "frais", "paiement", "date", "statut"];

  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = [headers.join(",")];
  data.forEach((row) => {
    rows.push(keys.map((k) => escape(row[k])).join(","));
  });

  const csvContent = "\uFEFF" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historique_livraisons_${TODAY()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Main Page ──────────────────────────────────────────────────────
export const dynamic = "force-dynamic";

export default function HistoriquePage() {
  const [livraisons, setLivraisons] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Filters
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [statut, setStatut] = useState("");
  const [agentId, setAgentId] = useState("");
  const [search, setSearch] = useState("");

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

  // Load company
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) setCurrentCompany(company);
  }, []);

  // Load data
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
        .order("id", { ascending: false })
        .limit(200);

      if (dateDebut) q = q.gte("date", dateDebut);
      if (dateFin) q = q.lte("date", dateFin);
      if (statut) q = q.eq("statut", statut);
      if (agentId) q = q.eq("agent_id", agentId);

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
  }, [currentCompany, dateDebut, dateFin, statut, agentId]);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany, loadData]);

  // Client-side search filter (colis or client_donneur ilike)
  const filtered = livraisons.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (l.colis && l.colis.toLowerCase().includes(s)) ||
      (l.client_donneur && l.client_donneur.toLowerCase().includes(s))
    );
  });

  // Clear filters
  const clearFilters = () => {
    setDateDebut("");
    setDateFin("");
    setStatut("");
    setAgentId("");
    setSearch("");
  };

  // Agent options for select
  const agentOptions = agents.map((a) => ({ value: String(a.id), label: a.nom }));

  // Statut options
  const statutOptions = [
    { value: "en_cours", label: "En cours" },
    { value: "livre", label: "Livré" },
    { value: "retourne", label: "Retourné" },
    { value: "reporte", label: "Reporté" },
    { value: "province", label: "Province" },
    { value: "en_attente", label: "En attente" },
  ];

  // Totals
  const totalMontant = filtered.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const totalFrais = filtered.reduce((s, l) => s + (parseFloat(l.frais) || 0), 0);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            Historique des Livraisons
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            {currentCompany?.name || "—"}
          </p>
        </div>
        <Button
          variant="success"
          size="sm"
          onClick={() => exportToCSV(filtered)}
          disabled={filtered.length === 0}
        >
          📥 Exporter CSV
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--red-dim)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
          <Input
            type="date"
            label="Date début"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
          <Input
            type="date"
            label="Date fin"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
          <Select
            label="Statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            options={statutOptions}
            placeholder="Tous statuts"
          />
          <Select
            label="Agent"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            options={agentOptions}
            placeholder="Tous agents"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto", gap: 12, alignItems: "end", marginTop: 4 }}>
          <Input
            label="Recherche"
            placeholder="Colis ou client donneur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            ✕ Effacer filtres
          </Button>
          <Badge variant="info">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</Badge>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{
            display: "inline-block", width: 32, height: 32,
            border: "3px solid var(--border2)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
          }} />
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>
            Chargement de l'historique...
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 14 }}>
          Aucune livraison trouvée.
        </div>
      )}

      {/* Desktop Table */}
      {!loading && filtered.length > 0 && !isMobile && (
        <Table>
          <TableHead>
            <TableHeader>Colis</TableHeader>
            <TableHeader>Client</TableHeader>
            <TableHeader>Destinataire</TableHeader>
            <TableHeader>Téléphone</TableHeader>
            <TableHeader>Agent</TableHeader>
            <TableHeader align="right">Montant</TableHeader>
            <TableHeader align="right">Frais</TableHeader>
            <TableHeader>Paiement</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Statut</TableHeader>
          </TableHead>
          <TableBody>
            {filtered.map((liv) => (
              <TableRow key={liv.id}>
                <TableCell>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{liv.colis || "—"}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 13 }}>{liv.client_donneur || "—"}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 13 }}>{liv.destinataire || "—"}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{liv.destinataire_telephone || "—"}</span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 13 }}>{liv.agent_nom || "—"}</span>
                </TableCell>
                <TableCell align="right">
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>
                    {formatAr(liv.montant)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span style={{ fontSize: 13, color: "var(--orange)" }}>
                    {formatAr(liv.frais || 0)}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12 }}>
                    {liv.paiement === "espece" ? "Espèces" :
                     liv.paiement === "mobile_money" ? "Mobile Money" :
                     liv.paiement === "client" ? "Payé client" :
                     liv.paiement || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {liv.date ? new Date(liv.date).toLocaleDateString("fr-FR") : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={liv.statut} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Mobile Cards */}
      {!loading && filtered.length > 0 && isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((liv) => (
            <Card key={liv.id} padding={14}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                    {liv.colis || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {liv.date ? new Date(liv.date).toLocaleDateString("fr-FR") : "—"}
                  </div>
                </div>
                <StatusBadge status={liv.statut} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Client</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{liv.client_donneur || "—"}</div>
                </div>
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Destinataire</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{liv.destinataire || "—"}</div>
                </div>
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Téléphone</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{liv.destinataire_telephone || "—"}</div>
                </div>
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Agent</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{liv.agent_nom || "—"}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>Montant</span>
                    <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 13 }}>{formatAr(liv.montant)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>Frais</span>
                    <div style={{ fontWeight: 600, color: "var(--orange)", fontSize: 13 }}>{formatAr(liv.frais || 0)}</div>
                  </div>
                </div>
                <Badge variant="default" size="sm">
                  {liv.paiement === "espece" ? "ESP" :
                   liv.paiement === "mobile_money" ? "MM" :
                   liv.paiement === "client" ? "CL" :
                   liv.paiement || "—"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Totals Footer */}
      {!loading && filtered.length > 0 && (
        <Card style={{ marginTop: 16, padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              TOTAL ({filtered.length} livraison{filtered.length > 1 ? "s" : ""})
            </span>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, color: "var(--green)", fontSize: 15 }}>
                {formatAr(totalMontant)}
              </span>
              <span style={{ fontWeight: 700, color: "var(--orange)", fontSize: 14 }}>
                Frais: {formatAr(totalFrais)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
