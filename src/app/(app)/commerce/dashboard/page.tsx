// @ts-nocheck
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { Button, Input, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell } from "@/modules/shared/components/ui";

export const dynamic = "force-dynamic";

// ─── SVG Icons ────────────────────────────────────────────────────
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconBanknote = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M6 12h.01M18 12h.01"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconTrendingUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconWarehouse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z"/>
    <path d="M6 18h12"/><path d="M6 14h12"/>
    <rect x="6" y="10" width="12" height="8"/>
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconShoppingBag = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconArrowDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);

const IconReceipt = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
    <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/>
    <line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/>
  </svg>
);

// ─── StatCard Wrapper ─────────────────────────────────────────────
const DashboardStatCard = ({ label, value, icon, color, sub }) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color || 'var(--accent)'}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color || 'var(--accent)',
        }}>
          {icon}
        </div>
      )}
    </div>
  </Card>
);

// ─── Main Page ────────────────────────────────────────────────────
export default function CommerceDashboardPage() {
  const [ventes, setVentes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [achatsMois, setAchatsMois] = useState([]);
  const [depensesMoisList, setDepensesMoisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Responsive
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Date helpers
  const today = TODAY();
  const currentMonth = today.slice(0, 7); // YYYY-MM
  const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  // Fetch all data
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchDashboardData(company);
    }
  }, []);

  const fetchDashboardData = useCallback(async (company) => {
    setLoading(true);
    setError(null);

    try {
      const [ventesData, produitsData, achatsData, depensesData] = await Promise.all([
        // Ventes 30 last days
        getSupabase()
          .from("ventes")
          .select("*")
          .eq("company_id", company.id)
          .gte("date_vente", thirtyDaysAgo)
          .order("date_vente", { ascending: false })
          .then(({ data, error }) => { if (error) throw error; return data || []; }),

        // Produits
        getSupabase()
          .from("produits")
          .select("*")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .order("nom")
          .then(({ data, error }) => { if (error) throw error; return data || []; }),

        // Achats du mois
        getSupabase()
          .from("achats")
          .select("*")
          .eq("company_id", company.id)
          .gte("date_achat", `${currentMonth}-01`)
          .order("date_achat", { ascending: false })
          .then(({ data, error }) => { if (error) return data || []; return data || []; }),

        // Dépenses du mois
        getSupabase()
          .from("depenses")
          .select("*")
          .eq("company_id", company.id)
          .gte("date", `${currentMonth}-01`)
          .order("date", { ascending: false })
          .then(({ data }) => data || []),
      ]);

      if (!mountedRef.current) return;
      setVentes(ventesData);
      setProduits(produitsData);
      setAchatsMois(achatsData);
      setDepensesMoisList(depensesData);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Erreur lors du chargement du tableau de bord");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [thirtyDaysAgo, currentMonth]);

  // ─── Computed stats ──────────────────────────────────────────────
  if (currentCompany && !currentCompany.slug && currentCompany.name) {
    // infer slug from name if needed
  }

  const isPomanay = currentCompany?.slug === "pomanay" || currentCompany?.name?.toLowerCase().includes("pomanay");

  const ventesJour = ventes.filter(v => v.date_vente === today);
  const ventesMoisList = ventes.filter(v => v.date_vente?.startsWith(currentMonth));

  const caJour = ventesJour.reduce((s, v) => s + (parseFloat(v.montant_total) || 0), 0);
  const caMois = ventesMoisList.reduce((s, v) => s + (parseFloat(v.montant_total) || 0), 0);

  const nbProduits = produits.length;
  const stockBas = produits.filter(p => (p.quantite_stock || 0) <= (p.seuil_alerte || 5));
  const valeurStock = produits.reduce((s, p) => s + ((parseFloat(p.prix_vente) || 0) * (parseInt(p.quantite_stock) || 0)), 0);

  const achatsMoisTotal = achatsMois.reduce((s, a) => s + (parseFloat(a.montant_total) || 0), 0);

  const depensesJourList = depensesMoisList.filter(d => d.date === today);
  const depensesJour = depensesJourList.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0);
  const depensesMois = depensesMoisList.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0);

  const beneficeNet = caMois - achatsMoisTotal - depensesMois;

  const dernieresVentes = ventes.slice(0, 5);

  const gridCols = isMobile ? '1fr' : isPomanay ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';

  // ─── Render ──────────────────────────────────────────────────────
  if (!currentCompany && !loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        <p>Aucune société chargée. Veuillez vous reconnecter.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Tableau de bord
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Commerce — {currentCompany?.name || "..."} • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', background: 'var(--red-dim)', color: 'var(--red)',
          borderRadius: 10, marginBottom: 20, fontSize: 14, fontWeight: 600,
          border: '1px solid var(--red-dim)',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Chargement…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : (
        <>
          {/* ── Stat Cards Grid ──────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap: 16,
            marginBottom: 24,
          }}>
            <DashboardStatCard
              label="Ventes aujourd'hui"
              value={ventesJour.length}
              icon={<IconCart />}
              color="#3b82f6"
              sub={ventesJour.length > 0 ? formatAr(caJour) : undefined}
            />
            <DashboardStatCard
              label="CA aujourd'hui"
              value={formatAr(caJour)}
              icon={<IconBanknote />}
              color="#10b981"
            />
            <DashboardStatCard
              label="Ventes du mois"
              value={ventesMoisList.length}
              icon={<IconCalendar />}
              color="#8b5cf6"
            />
            <DashboardStatCard
              label="CA du mois"
              value={formatAr(caMois)}
              icon={<IconTrendingUp />}
              color="#10b981"
            />
            <DashboardStatCard
              label="Produits"
              value={nbProduits}
              icon={<IconPackage />}
              color="#14b8a6"
            />
            <DashboardStatCard
              label="Valeur stock"
              value={formatAr(valeurStock)}
              icon={<IconWarehouse />}
              color="#3b82f6"
            />
            <DashboardStatCard
              label="Alertes stock"
              value={stockBas.length}
              icon={<IconAlertTriangle />}
              color={stockBas.length > 0 ? "#ef4444" : "#10b981"}
              sub={stockBas.length > 0 ? "Stock bas détecté" : "Stock normal"}
            />
            <DashboardStatCard
              label="Achats du mois"
              value={formatAr(achatsMoisTotal)}
              icon={<IconShoppingBag />}
              color="#f59e0b"
            />
            {isPomanay && (
              <>
                <DashboardStatCard
                  label="Dépenses aujourd'hui"
                  value={formatAr(depensesJour)}
                  icon={<IconArrowDown />}
                  color="#ef4444"
                />
                <DashboardStatCard
                  label="Dépenses du mois"
                  value={formatAr(depensesMois)}
                  icon={<IconReceipt />}
                  color="#f59e0b"
                />
              </>
            )}
          </div>

          {/* ── Bénéfice Net ─────────────────────────────────────── */}
          {isPomanay && (
            <Card style={{ marginBottom: 24, borderLeft: `3px solid ${beneficeNet >= 0 ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
                  }}>
                    Bénéfice net du mois
                  </div>
                  <div style={{
                    fontSize: 26, fontWeight: 800,
                    color: beneficeNet >= 0 ? '#10b981' : '#ef4444',
                    letterSpacing: '-0.02em',
                  }}>
                    {formatAr(beneficeNet)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                  <div>CA: {formatAr(caMois)}</div>
                  <div>− Achats: {formatAr(achatsMoisTotal)}</div>
                  <div>− Dépenses: {formatAr(depensesMois)}</div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Two-column section ──────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 20,
            marginBottom: 24,
          }}>
            {/* Alertes Stock */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Alertes stock{stockBas.length > 0 ? (
                    <Badge variant="danger" style={{ marginLeft: 8 }}>{stockBas.length}</Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              {stockBas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                  ✓ Aucune alerte — tous les niveaux de stock sont corrects
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stockBas.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'var(--bg)', borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.nom}</div>
                        {p.reference && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.reference}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Badge variant="danger">{p.quantite_stock || 0} en stock</Badge>
                        {p.seuil_alerte !== undefined && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                            Seuil: {p.seuil_alerte || 5}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Dernières Ventes */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Dernières ventes
                  {dernieresVentes.length > 0 && (
                    <Badge variant="info" style={{ marginLeft: 8 }}>{dernieresVentes.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              {dernieresVentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                  Aucune vente sur les 30 derniers jours
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableCell>Date</TableCell>
                    <TableCell>N° Facture</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Montant</TableCell>
                  </TableHead>
                  <TableBody>
                    {dernieresVentes.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
                            {v.numero_facture || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontSize: 12 }}>{v.client_nom || '—'}</span>
                        </TableCell>
                        <TableCell align="right">
                          <span style={{ fontSize: 12, fontWeight: 700 }}>
                            {formatAr(v.montant_total || 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
