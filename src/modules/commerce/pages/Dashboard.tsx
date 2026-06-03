// @ts-nocheck
// CommerceDashboard.tsx — Professional Design
import { useState, useEffect } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from '../services/produitService';
import { fetchVentes } from '../services/venteService';
import { fetchAchats } from '../services/achatService';
import { supabase } from '@/lib/supabase';
import { formatAr } from '@/modules/shared/utils/constants';
import { badge as badgeStyle } from '@/modules/shared/utils/helpers';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: 18,
      }}>
        {icon}
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    paye:       { variant: 'success', label: 'Payé' },
    credit:     { variant: 'warning', label: 'Crédit' },
    en_attente: { variant: 'info',    label: 'En attente' },
    annule:     { variant: 'danger',  label: 'Annulé' },
  };
  const c = cfg[status] || cfg.en_attente;
  const styles = badgeStyle(c.variant);
  return <span className="badge" style={styles}>{c.label}</span>;
};

export default function CommerceDashboard() {
  const { currentCompany } = useCompany();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [recentVentes, setRecentVentes] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [stats, setStats] = useState({
    ventesJour: 0, ventesMois: 0, caJour: 0, caMois: 0,
    nbProduits: 0, stockBas: 0, valeurStock: 0, achatsMois: 0,
    depensesJour: 0, depensesMois: 0,
  });

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);

  useEffect(() => {
    const h = e => { if (['ventes', 'achats', 'produits', 'depenses'].includes(e.detail?.table)) load(); };
    window.addEventListener('supabase_realtime', h);
    return () => window.removeEventListener('supabase_realtime', h);
  }, [currentCompany]);

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const t = today();
      const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats] = await Promise.all([
        fetchVentes(),
        fetchProduits(),
        getAlertesStockBas(),
        getValeurTotaleStock(),
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
          supabase.from('depenses').select('montant').eq('company_id', currentCompany.id).eq('date_depense', t),
          supabase.from('depenses').select('montant').eq('company_id', currentCompany.id).gte('date_depense', fm).lte('date_depense', t),
        ]);
        depensesJour = (dj || []).reduce((s, d) => s + (d.montant || 0), 0);
        depensesMois = (dm || []).reduce((s, d) => s + (d.montant || 0), 0);
      }
      setStats({ ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois, nbProduits: produits.length, stockBas: alertesData.length, valeurStock, achatsMois: totalAchats, depensesJour, depensesMois });
      setRecentVentes(toutesVentes.slice(0, 5));
      setAlertes(alertesData.slice(0, 5));
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  if (loading) return (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  const benefice = stats.caMois - stats.achatsMois - stats.depensesMois;

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }} data-testid="page-title">Tableau de bord</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{currentCompany?.name} · Aperçu de l'activité</p>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard label="Ventes aujourd'hui" value={stats.ventesJour} icon="PKG" color="var(--blue)" />
        <StatCard label="CA aujourd'hui" value={formatAr(stats.caJour)} icon="CA" color="var(--green)" />
        <StatCard label="Ventes du mois" value={stats.ventesMois} icon="VENTES" color="var(--purple)" />
        <StatCard label="CA du mois" value={formatAr(stats.caMois)} icon="CASH" color="var(--green)" />
        <StatCard label="Produits" value={stats.nbProduits} icon="PROD" color="var(--teal)" />
        <StatCard label="Valeur stock" value={formatAr(stats.valeurStock)} icon="PKG" color="var(--blue)" />
        <StatCard
          label="Alertes stock"
          value={stats.stockBas}
          icon="!"
          color={stats.stockBas > 0 ? 'var(--red)' : 'var(--green)'}
          sub={stats.stockBas > 0 ? 'Produits en rupture' : 'Stock OK'}
        />
        <StatCard label="Achats du mois" value={formatAr(stats.achatsMois)} icon="IN" color="var(--orange)" />
        {currentCompany?.slug === 'pomanay' && (
          <>
            <StatCard label="Dépenses aujourd'hui" value={formatAr(stats.depensesJour)} icon="DEP" color="var(--red)" />
            <StatCard label="Dépenses du mois" value={formatAr(stats.depensesMois)} icon="DOWN" color="var(--orange)" />
          </>
        )}
      </div>

      {/* Bénéfice net */}
      {currentCompany?.slug === 'pomanay' && (
        <div style={{
          background: benefice >= 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${benefice >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: benefice >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: 6 }}>
            Bénéfice net du mois
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: benefice >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatAr(benefice)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            CA {formatAr(stats.caMois)} − Achats {formatAr(stats.achatsMois)} − Dépenses {formatAr(stats.depensesMois)}
          </div>
        </div>
      )}

      {/* Alertes stock */}
      {alertes.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 14, padding: 16, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--orange)', marginBottom: 10, fontSize: 14, fontWeight: 700 }}>
            Stock bas ({alertes.length})
          </h3>
          {alertes.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, padding: '6px 0',
              borderBottom: '1px solid #fde68a',
            }}>
              <span style={{ color: 'var(--text)' }}>{p.nom}</span>
              <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.quantite_stock} / min {p.stock_minimum}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dernières ventes */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          fontWeight: 700, fontSize: 14, color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          Dernières ventes
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>{recentVentes.length} transaction(s)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {['Facture', 'Client', 'Date', 'Montant', 'Statut'].map(h => (
                  <th key={h} style={{
                    padding: '9px 14px',
                    textAlign: h === 'Montant' ? 'right' : h === 'Statut' ? 'center' : 'left',
                    fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentVentes.length === 0
                ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Aucune vente</td></tr>
                : recentVentes.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v.numero_facture}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{v.client_nom || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{new Date(v.date_vente).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{formatAr(v.montant_total)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}><StatusBadge status={v.statut} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Import needed
import { CardSkeleton } from '@/modules/shared/components/common/Loader';
