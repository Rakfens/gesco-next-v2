"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Card, CardContent, CardHeader, CardTitle, SectionHeader, SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from "../services/produitService";
import { fetchVentes } from "../services/venteService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

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
      const t = today();
      const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats] = await Promise.all([
        fetchVentes(), fetchProduits(), getAlertesStockBas(), getValeurTotaleStock(),
        fetchAchats({ dateDebut: fm, dateFin: t }),
      ]);
      const ventesJour = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] === t);
      const ventesMois = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] >= fm);
      const caJour = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
      const caMois = ventesMois.reduce((s, v) => s + (v.montant_total || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
      setStats({
        ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois,
        nbProduits: produits.length, stockBas: alertesData.length, valeurStock,
        achatsMois: totalAchats, depensesJour: 0, depensesMois: 0,
      });
      setRecentVentes(toutesVentes.slice(0, 5));
      setAlertes(alertesData.slice(0, 5));
    } catch (err: unknown) {
      logger.error("Erreur dashboard:", err);
      setError("Erreur lors du chargement des données.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);

  const benefice = useMemo(() => stats.caMois - stats.achatsMois - stats.depensesMois, [stats]);
  const pomanayExtra = currentCompany?.slug === "pomanay";

  if (loading) return <SkeletonGrid cols={isMobile ? 2 : 4} rows={2} />;
  if (error) return (
    <div style={{ padding: 20, textAlign: "center", color: C.danger, background: C.dangerDim, borderRadius: 12, margin: 16 }}>
      {error}
    </div>
  );

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(139,92,246,0.05) 100%)",
        border: "1px solid var(--border)", borderRadius: 16,
        padding: isMobile ? "18px 14px" : "24px 28px", marginBottom: 20,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 160, height: 160,
          background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #60a5fa, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(96,165,250,0.25)",
            }}>
              <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={20} color="#08080c" />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", margin: 0 }}>
                Tableau de bord
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>
                {currentCompany?.name || "Commerce"} · {today()}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Ventes aujourd'hui", value: `${stats.ventesJour}`, color: C.blue },
              { label: "CA du jour", value: formatAr(stats.caJour), color: C.success },
              { label: "Stock bas", value: `${stats.stockBas} produit${stats.stockBas !== 1 ? "s" : ""}`, color: stats.stockBas > 0 ? C.warning : C.success },
            ].map((q) => (
              <div key={q.label} style={{
                padding: "6px 12px", borderRadius: 99,
                background: `${q.color}10`, border: `1px solid ${q.color}25`,
              }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 5 }}>{q.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: q.color }}>{q.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 12, marginBottom: 20,
      }}>
        <StatCard label="Ventes du mois" value={stats.ventesMois} color={C.blue}
          icon={<Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} color={C.blue} />} />
        <StatCard label="CA du mois" value={formatAr(stats.caMois)} color={C.success}
          icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.success} />} />
        <StatCard label="Produits" value={stats.nbProduits} color={C.violet}
          icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.violet} />} />
        <StatCard label="Valeur stock" value={formatAr(stats.valeurStock)} color={C.gold}
          icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.gold} />} />
      </div>

      {/* ══ BÉNÉFICE NET ══ */}
      {pomanayExtra && (
        <Card style={{
          marginBottom: 20,
          borderColor: benefice >= 0 ? C.success : C.danger,
          background: benefice >= 0 ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: benefice >= 0 ? C.success : C.danger, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                💰 Bénéfice net du mois
              </div>
              <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: benefice >= 0 ? C.success : C.danger }}>
                {formatAr(benefice)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                CA {formatAr(stats.caMois)} — Achats {formatAr(stats.achatsMois)} — Dépenses {formatAr(stats.depensesMois)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {[
                { label: "Achats", value: formatAr(stats.achatsMois), color: C.warning },
                { label: "Dépenses", value: formatAr(stats.depensesMois), color: C.danger },
              ].map((s) => (
                <div key={s.label} style={{ padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ══ ALERTES STOCK BAS ══ */}
      {alertes.length > 0 && (
        <Card style={{ marginBottom: 20, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)" }}>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <CardTitle>Stock bas ({alertes.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {alertes.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 16px", borderTop: "1px solid var(--border)",
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{p.nom}</span>
                  {p.categorie && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>· {p.categorie}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.warning, fontWeight: 600 }}>
                    {p.quantite_stock} / min {p.stock_minimum}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {p.prix_vente != null ? formatAr(p.prix_vente) : ""}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ══ DERNIÈRES VENTES ══ */}
      <Card padding={0}>
        <CardHeader style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={16} color={C.blue} />
            <CardTitle>Dernières ventes</CardTitle>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{recentVentes.length} transaction(s)</span>
        </CardHeader>
        {recentVentes.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🛒</div>
            Aucune vente enregistrée.
          </div>
        ) : (
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
              {recentVentes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {v.numero_facture || "—"}
                  </TableCell>
                  <TableCell>{v.client_nom || "—"}</TableCell>
                  <TableCell style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 600, color: C.success }}>
                    {formatAr(v.montant_total)}
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge status={v.statut} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
