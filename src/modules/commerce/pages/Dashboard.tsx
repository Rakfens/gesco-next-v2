import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Card, CardContent, CardHeader, CardTitle,
  SectionHeader, SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from "../services/produitService";
import { fetchVentes } from "../services/venteService";

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

export default function CommerceDashboard() {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [recentVentes, setRecentVentes] = useState<Vente[]>([]);
  const [alertes, setAlertes] = useState<Produit[]>([]);
  const [stats, setStats] = useState({
    ventesJour: 0, ventesMois: 0, caJour: 0, caMois: 0,
    nbProduits: 0, stockBas: 0, valeurStock: 0,
    achatsMois: 0, depensesJour: 0, depensesMois: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true); setError(null);
    try {
      const t = today(); const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats] = await Promise.all([
        fetchVentes(), fetchProduits(), getAlertesStockBas(), getValeurTotaleStock(),
        fetchAchats({ dateDebut: fm, dateFin: t }),
      ]);
      const ventesJour = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] === t);
      const ventesMois = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] >= fm);
      const caJour = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
      const caMois = ventesMois.reduce((s, v) => s + (v.montant_total || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
      let depensesJour = 0, depensesMois = 0;
      if (currentCompany.slug === "pomanay") {
        const [{ data: dj }, { data: dm }] = await Promise.all([
          getSupabase().from("depenses").select("montant").eq("company_id", currentCompany.id).eq("date_depense", t),
          getSupabase().from("depenses").select("montant").eq("company_id", currentCompany.id).gte("date_depense", fm).lte("date_depense", t),
        ]);
        depensesJour = (dj || []).reduce((s: number, d: { montant?: number }) => s + (d.montant || 0), 0);
        depensesMois = (dm || []).reduce((s: number, d: { montant?: number }) => s + (d.montant || 0), 0);
      }
      setStats({ ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois, nbProduits: produits.length, stockBas: alertesData.length, valeurStock, achatsMois: totalAchats, depensesJour, depensesMois });
      setRecentVentes(toutesVentes.slice(0, 5));
      setAlertes(alertesData.slice(0, 5));
    } catch (err: unknown) {
      logger.error("Erreur dashboard:", err);
      setError("Erreur lors du chargement des données.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);

  useEffect(() => {
    const h = (e: Event) => { if (["ventes", "achats", "produits", "depenses"].includes((e as CustomEvent).detail?.table)) load(); };
    window.addEventListener("supabase_realtime", h);
    return () => window.removeEventListener("supabase_realtime", h);
  }, [currentCompany]);

  const benefice = useMemo(() => stats.caMois - stats.achatsMois - stats.depensesMois, [stats]);
  const pomanayExtra = currentCompany?.slug === "pomanay";

  if (loading) return <SkeletonGrid cols={6} rows={1} />;
  if (error) return <div style={{ padding: 20, textAlign: "center", color: "var(--danger)" }}>{error}</div>;

  return (
    <div style={{ paddingBottom: 24 }}>
      <SectionHeader title="Tableau de bord" subtitle={`${currentCompany?.name} — Aperçu de l'activité`} />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Ventes aujourd'hui" value={stats.ventesJour} color="var(--accent)" />
        <StatCard label="CA aujourd'hui" value={formatAr(stats.caJour)} color="var(--success)" />
        <StatCard label="Ventes du mois" value={stats.ventesMois} color="var(--accent2)" />
        <StatCard label="CA du mois" value={formatAr(stats.caMois)} color="var(--success)" />
        <StatCard label="Produits" value={stats.nbProduits} color="var(--info)" />
        <StatCard label="Valeur stock" value={formatAr(stats.valeurStock)} color="var(--accent)" />
        <StatCard label="Alertes stock" value={stats.stockBas} color={stats.stockBas > 0 ? "var(--danger)" : "var(--success)"} sub={stats.stockBas > 0 ? "Produits en rupture" : "Stock OK"} />
        <StatCard label="Achats du mois" value={formatAr(stats.achatsMois)} color="var(--warning)" />
        {pomanayExtra && <StatCard label="Dépenses aujourd'hui" value={formatAr(stats.depensesJour)} color="var(--danger)" />}
        {pomanayExtra && <StatCard label="Dépenses du mois" value={formatAr(stats.depensesMois)} color="var(--warning)" />}
      </div>

      {pomanayExtra && (
        <Card padding={24} style={{ marginBottom: 28, background: benefice >= 0 ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${benefice >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}` }}>
          <CardTitle style={{ color: benefice >= 0 ? "var(--success)" : "var(--danger)", marginBottom: 8 }}>Bénéfice net du mois</CardTitle>
          <div style={{ fontSize: 36, fontWeight: 900, color: benefice >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(benefice)}</div>
          <CardContent style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, padding: 0 }}>
            CA {formatAr(stats.caMois)} — Achats {formatAr(stats.achatsMois)} — Dépenses {formatAr(stats.depensesMois)}
          </CardContent>
        </Card>
      )}

      {alertes.length > 0 && (
        <Card padding={18} style={{ marginBottom: 24, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)" }}>
          <CardTitle style={{ color: "var(--warning)" }}>Stock bas ({alertes.length})</CardTitle>
          <CardContent style={{ padding: 0 }}>
            {alertes.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{p.nom}</span>
                <span style={{ color: "var(--warning)", fontWeight: 600 }}>{p.quantite_stock} / min {p.stock_minimum}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card padding={0}>
        <CardHeader style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <CardTitle>Dernières ventes</CardTitle>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{recentVentes.length} transaction(s)</span>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Facture</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader align="right">Montant</TableHeader>
              <TableHeader align="center">Statut</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentVentes.length === 0 ? (
              <TableEmpty colSpan={5} message="Aucune vente" />
            ) : (
              recentVentes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{v.numero_facture}</TableCell>
                  <TableCell>{v.client_nom || "—"}</TableCell>
                  <TableCell style={{ color: "var(--text-secondary)" }}>{new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell align="right" style={{ fontWeight: 600, color: "var(--success)" }}>{formatAr(v.montant_total)}</TableCell>
                  <TableCell align="center"><StatusBadge status={v.statut} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
