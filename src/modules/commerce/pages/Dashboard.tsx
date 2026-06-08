import { useState, useEffect, useMemo } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import type { Produit, Vente } from '@/modules/shared/types';
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from '../services/produitService';
import { fetchVentes } from '../services/venteService';
import { fetchAchats } from '../services/achatService';
import { getSupabase } from '@/lib/supabase';
import { formatAr } from '@/modules/shared/utils/constants';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty,
  StatCard, SkeletonGrid, StatusBadge, SectionHeader,
} from '@/modules/shared/components/ui';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function CommerceDashboard() {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [recentVentes, setRecentVentes] = useState<Vente[]>([]);
  const [alertes, setAlertes] = useState<Produit[]>([]);
  const [stats, setStats] = useState({
    ventesJour: 0, ventesMois: 0, caJour: 0, caMois: 0,
    nbProduits: 0, stockBas: 0, valeurStock: 0, achatsMois: 0,
    depensesJour: 0, depensesMois: 0,
  });

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const t = today();
      const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats] = await Promise.all([
        fetchVentes(), fetchProduits(), getAlertesStockBas(), getValeurTotaleStock(),
        fetchAchats({ dateDebut: fm, dateFin: t }),
      ]);
      const ventesJour = toutesVentes.filter(v => (v.date_vente || '').split('T')[0] === t);
      const ventesMois = toutesVentes.filter(v => (v.date_vente || '').split('T')[0] >= fm);
      const caJour = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
      const caMois = ventesMois.reduce((s, v) => s + (v.montant_total || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
      let depensesJour = 0, depensesMois = 0;
      if (currentCompany.slug === 'pomanay') {
        const [{ data: dj }, { data: dm }] = await Promise.all([
          getSupabase().from('depenses').select('montant').eq('company_id', currentCompany.id).eq('date_depense', t),
          getSupabase().from('depenses').select('montant').eq('company_id', currentCompany.id).gte('date_depense', fm).lte('date_depense', t),
        ]);
        depensesJour = (dj || []).reduce((s: number, d: any) => s + (d.montant || 0), 0);
        depensesMois = (dm || []).reduce((s: number, d: any) => s + (d.montant || 0), 0);
      }
      setStats({ ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois, nbProduits: produits.length, stockBas: alertesData.length, valeurStock, achatsMois: totalAchats, depensesJour, depensesMois });
      setRecentVentes(toutesVentes.slice(0, 5));
      setAlertes(alertesData.slice(0, 5));
    } catch (_e) { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);
  useEffect(() => {
    const h = (e: Event) => { if (['ventes', 'achats', 'produits', 'depenses'].includes((e as CustomEvent).detail?.table)) load(); };
    window.addEventListener('supabase_realtime', h);
    return () => window.removeEventListener('supabase_realtime', h);
  }, [currentCompany]);

  const benefice = useMemo(() => stats.caMois - stats.achatsMois - stats.depensesMois, [stats]);

  if (loading) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <SkeletonGrid cols={6} rows={1} />
      </div>
    );
  }

  const pomanayExtra = currentCompany?.slug === 'pomanay';

  return (
    <div style={{ paddingBottom: 24 }}>
      <SectionHeader
        title="Tableau de bord"
        subtitle={`${currentCompany?.name} — Aperçu de l'activité`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Ventes aujourd'hui" value={stats.ventesJour} color="var(--blue)" />
        <StatCard label="CA aujourd'hui" value={formatAr(stats.caJour)} color="var(--green)" />
        <StatCard label="Ventes du mois" value={stats.ventesMois} color="var(--purple)" />
        <StatCard label="CA du mois" value={formatAr(stats.caMois)} color="var(--green)" />
        <StatCard label="Produits" value={stats.nbProduits} color="var(--teal)" />
        <StatCard label="Valeur stock" value={formatAr(stats.valeurStock)} color="var(--blue)" />
        <StatCard label="Alertes stock" value={stats.stockBas} color={stats.stockBas > 0 ? 'var(--red)' : 'var(--green)'} sub={stats.stockBas > 0 ? 'Produits en rupture' : 'Stock OK'} />
        <StatCard label="Achats du mois" value={formatAr(stats.achatsMois)} color="var(--orange)" />
        {pomanayExtra && <StatCard label="Dépenses aujourd'hui" value={formatAr(stats.depensesJour)} color="var(--red)" />}
        {pomanayExtra && <StatCard label="Dépenses du mois" value={formatAr(stats.depensesMois)} color="var(--orange)" />}
      </div>

      {pomanayExtra && (
        <Card
          padding={20}
          style={{
            marginBottom: 24,
            background: benefice >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${benefice >= 0 ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          <CardTitle style={{ color: benefice >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: 6 }}>
            Bénéfice net du mois
          </CardTitle>
          <div style={{ fontSize: 32, fontWeight: 800, color: benefice >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatAr(benefice)}
          </div>
          <CardContent style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, padding: 0 }}>
            CA {formatAr(stats.caMois)} — Achats {formatAr(stats.achatsMois)} — Dépenses {formatAr(stats.depensesMois)}
          </CardContent>
        </Card>
      )}

      {alertes.length > 0 && (
        <Card padding={16} style={{ marginBottom: 24, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <CardTitle style={{ color: 'var(--orange)' }}>
            Stock bas ({alertes.length})
          </CardTitle>
          <CardContent style={{ padding: 0 }}>
            {alertes.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #fde68a' }}>
                <span>{p.nom}</span>
                <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.quantite_stock} / min {p.stock_minimum}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card padding={0}>
        <CardHeader style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <CardTitle>Dernières ventes</CardTitle>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{recentVentes.length} transaction(s)</span>
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
            {recentVentes.length === 0
              ? <TableEmpty colSpan={5} message="Aucune vente" />
              : recentVentes.map(v => (
                <TableRow key={v.id}>
                  <TableCell style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v.numero_facture}</TableCell>
                  <TableCell>{v.client_nom || '-'}</TableCell>
                  <TableCell style={{ color: 'var(--text2)' }}>{new Date(v.date_vente ?? '').toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell align="right" style={{ fontWeight: 600, color: 'var(--green)' }}>{formatAr(v.montant_total)}</TableCell>
                  <TableCell align="center"><StatusBadge status={v.statut} /></TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
