// ServiceDashboard.tsx — Professional Design
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { formatAr, TODAY, currentMonth, monthLabel, shouldCountGerantCommission, EXCLUDED_CLIENTS } from '@/modules/shared/utils/constants';
import { getRecuperationsByDate } from '../services/recuperationService';
import type { Recuperation, Livraison, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';
import { COMMISSION_DEFAUT } from '@/modules/shared/utils/constants';
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  StatCard,
  StatusBadge,
  SkeletonGrid,
} from '@/modules/shared/components/ui';

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

interface RecupParLivreur {
  livreur: string;
  total: number;
  nb: number;
  details: { client: string; frais: number }[];
}

export default function Dashboard() {
  const { agents, livraisons } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState<boolean>(false);

  const enCours = livraisons?.filter(l => l.statut === 'en_cours').length || 0;
  const todayLivs = livraisons?.filter(l => l.date === TODAY()) || [];
  const livsGerant = todayLivs.filter(l => shouldCountGerantCommission(l));
  const gerantGain = livsGerant.length * commissionGerant;
  const excludedToday = todayLivs.filter(l => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || '') && (Number(l.frais) || 0) > 0);

  useEffect(() => {
    const loadRecuperations = async () => {
      setLoadingRecup(true);
      try {
        const data = await getRecuperationsByDate(selectedDate);
        setRecuperationsJour(data || []);
      } catch (error) {
      } finally {
        setLoadingRecup(false);
      }
    };
    loadRecuperations();
  }, [selectedDate]);

  const totalRecuperationsJour = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
  const nbRecuperationsJour = recuperationsJour.length;

  const recuperationsParLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
    const nom = r.livreur_nom;
    if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
    acc[nom].total += (r.frais_recuperation ?? 0);
    acc[nom].nb += 1;
    acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
    return acc;
  }, {} as Record<string, RecupParLivreur>);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }} data-testid="page-title">Tableau de bord</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          {currentCompany?.name || 'HT-GesCom'} · Aperçu de l'activité
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total livraisons" value={livraisons?.length || 0} color="var(--accent)" />
        <StatCard label="En cours" value={enCours} color="var(--orange)" />
        <StatCard label="Livrés" value={livraisons?.filter(l => l.statut === 'livre').length || 0} color="var(--green)" />
        <StatCard label="Retournés" value={livraisons?.filter(l => l.statut === 'retourne').length || 0} color="var(--red)" />
      </div>

      {/* Récupérations */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div>
            <CardTitle>Récupérations matinales</CardTitle>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>{formatAr(totalRecuperationsJour)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{nbRecuperationsJour} récupération(s)</div>
          </div>
          <div>
            <Input
              type="date"
              label="Date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        </CardHeader>

        {loadingRecup && (
          <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />
        )}

        {!loadingRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {Object.values(recuperationsParLivreur).map(rl => (
              <div key={rl.livreur} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{rl.livreur}</span>
                  <span style={{ color: 'var(--orange)', fontSize: 13, fontWeight: 600 }}>{rl.nb} récup. · {formatAr(rl.total)}</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderBottom: idx < rl.details.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text2)' }}>{d.client}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatAr(d.frais)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadingRecup && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0', fontSize: 13 }}>
              Aucune récupération enregistrée pour cette date.
            </div>
          )
        )}
      </Card>

      {/* Gérant */}
      <Card style={{ marginBottom: 24, background: '#f5f3ff', borderColor: '#ddd6fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700, marginBottom: 4 }}>Gérant — Aujourd'hui ({TODAY()})</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{formatAr(gerantGain)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{livsGerant.length} livraisons × {formatAr(commissionGerant)}</div>
            {excludedToday.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4 }}>
                {excludedToday.length} livraison(s) exclue(s)
              </div>
            )}
          </div>
          <Button variant="primary" onClick={() => {}} style={{ background: 'var(--purple)', boxShadow: '0 1px 2px rgba(139,92,246,0.15)' }}>
            Voir détails →
          </Button>
        </div>
      </Card>

      {/* Récap par agent */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Récap par agent</h2>
        <Badge variant="default" size="sm">Tous temps</Badge>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents?.map(a => {
            const ls = livraisons?.filter(l => agentMatch(l, a)) || [];
            const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
            const livres = ls.filter(l => l.statut === 'livre').length;
            const retournes = ls.filter(l => l.statut === 'retourne').length;
            const reportes = ls.filter(l => l.statut === 'reporte').length;

            return (
              <Card key={a.id} padding={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16, color: 'var(--accent)',
                  }}>
                    {a.nom?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ls.length} livraisons</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Livrés', value: livres, color: 'var(--green)' },
                    { label: 'Retournés', value: retournes, color: 'var(--red)' },
                    { label: 'Reportés', value: reportes, color: 'var(--purple)' },
                    { label: 'Frais', value: formatAr(totalFrais), color: 'var(--orange)' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${ls.length ? (livres / ls.length) * 100 : 0}%`,
                    height: '100%', background: 'var(--green)', borderRadius: 2, transition: 'width 0.3s ease',
                  }} />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableHeader align="left">Agent</TableHeader>
            <TableHeader align="center">Total</TableHeader>
            <TableHeader align="center">Livrés</TableHeader>
            <TableHeader align="center">Retournés</TableHeader>
            <TableHeader align="center">Reportés</TableHeader>
            <TableHeader align="right">Frais</TableHeader>
            <TableHeader align="center">Taux réussite</TableHeader>
          </TableHead>
          <TableBody>
            {agents?.map(a => {
              const ls = livraisons?.filter(l => agentMatch(l, a)) || [];
              const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
              const livres = ls.filter(l => l.statut === 'livre').length;
              const retournes = ls.filter(l => l.statut === 'retourne').length;
              const reportes = ls.filter(l => l.statut === 'reporte').length;
              const taux = ls.length ? Math.round((livres / ls.length) * 100) : 0;

              return (
                <TableRow key={a.id}>
                  <TableCell style={{ fontWeight: 600 }}>{a.nom}</TableCell>
                  <TableCell align="center" style={{ fontWeight: 700 }}>{ls.length}</TableCell>
                  <TableCell align="center">
                    <Badge variant="success" size="sm">{livres}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant="danger" size="sm">{retournes}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant="purple" size="sm">{reportes}</Badge>
                  </TableCell>
                  <TableCell align="right" style={{ color: 'var(--orange)', fontWeight: 600 }}>{formatAr(totalFrais)}</TableCell>
                  <TableCell align="center">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${taux}%`, height: '100%', background: taux >= 70 ? 'var(--green)' : taux >= 40 ? 'var(--orange)' : 'var(--red)' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{taux}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
