import { useCompany } from '@/modules/shared/context/CompanyContext';
import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import { formatAr, currentMonth, monthLabel, shouldCountGerantCommission } from '@/modules/shared/utils/constants';
import { getRecuperationsByMonth } from '../services/recuperationService';
import type { Recuperation, Avance, Livraison, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';
import { COMMISSION_DEFAUT } from '@/modules/shared/utils/constants';
import {
  Button, Input, Select, Badge, Card, CardHeader, CardTitle,
  Modal, ModalHeader, ModalBody, ModalFooter, SectionHeader,
} from '@/modules/shared/components/ui';

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

interface AgentStats extends Agent {
  nbLivs: number;
  nbLivres: number;
  nbRetours: number;
  nbReportes: number;
  totalFrais: number;
  totalAvances: number;
  netSalaire: number;
  avances: Avance[];
  recuperations: Recuperation[];
  totalRecuperations: number;
  nbRecuperations: number;
}

export default function Recap() {
  const { livraisons, avances, agents, showToast, addAvance: onAddAvance, deleteAvance: onDeleteAvance } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [avanceAgentId, setAvanceAgentId] = useState<string>('');
  const [avanceMontant, setAvanceMontant] = useState<string>('');
  const [avanceMotif, setAvanceMotif] = useState<string>('');
  const [recuperationsMois, setRecuperationsMois] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState<boolean>(false);
  const [confirmAvance, setConfirmAvance] = useState<string | null>(null);

  // Calcul des mois disponibles
  const months = useMemo(() => {
    const s = new Set(livraisons.map(l => l.date?.slice(0, 7)).filter(Boolean));
    s.add(currentMonth());
    return [...s].sort().reverse();
  }, [livraisons]);

  // Filtrer les livraisons et avances du mois
  const { monthLivs, monthAvances } = useMemo(() => {
    const monthLivs = livraisons.filter(l => l.date && l.date.startsWith(selectedMonth));
    const monthAvances = avances.filter(a => a.mois === selectedMonth && !a.annule);
    return { monthLivs, monthAvances };
  }, [livraisons, avances, selectedMonth]);

  // Charger les récupérations du mois
  useEffect(() => {
    const load = async () => {
      setLoadingRecup(true);
      try {
        if (!currentCompany?.id) return;
        const data = await getRecuperationsByMonth(selectedMonth, currentCompany.id);
        setRecuperationsMois(data || []);
      } catch (error) {
        console.error('Erreur chargement recuperations:', error);
        if (showToast) {
          showToast('Erreur lors du chargement des récupérations.', 'error');
        }
      } finally {
        setLoadingRecup(false);
      }
    };
    load();
  }, [selectedMonth, currentCompany?.id, showToast]);

  // Fonction pour calculer les livraisons du gérant
  const livsGerant = (arr: Livraison[]) => arr.filter(l => shouldCountGerantCommission(l));

  // Calculer les stats par agent
  const monthStatsByAgent: AgentStats[] = useMemo(() => {
    return agents.map(ag => {
      const ls = monthLivs.filter(l => agentMatch(l, ag));
      const av = monthAvances.filter(a => a.agent_id === ag.id);
      const recups = recuperationsMois.filter(r => r.livreur_nom === ag.nom);
      const totalRecups = recups.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
      return {
        ...ag,
        nbLivs: ls.length,
        nbLivres: ls.filter(l => l.statut === 'livre').length,
                      nbRetours: ls.filter(l => l.statut === 'retourne').length,
                      nbReportes: ls.filter(l => l.statut === 'reporte').length,
                      totalFrais: ls.reduce((s, l) => s + (Number(l.frais) || 0), 0),
                      totalAvances: av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
                      netSalaire: Number(ag.salaire) || 0 - av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
                      avances: av,
                      recuperations: recups,
                      totalRecuperations: totalRecups,
                      nbRecuperations: recups.length,
      };
    });
  }, [agents, monthLivs, monthAvances, recuperationsMois]);

  // Calculer les totaux globaux du mois
  const { monthTotalMontant, monthTotalFrais, monthTotalSalaires, monthGerantGain, monthTotalRecuperations, monthBenefice } = useMemo(() => {
    const monthTotalMontant = monthLivs.filter(l => l.paiement !== 'client').reduce((s, l) => s + (Number(l.montant) || 0), 0);
    const monthTotalFrais = monthLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
    const monthTotalSalaires = monthStatsByAgent.reduce((s, a) => s + (Number(a.salaire) || 0), 0);
    const monthGerantGain = livsGerant(monthLivs).length * commissionGerant;
    const monthTotalRecuperations = monthStatsByAgent.reduce((s, a) => s + a.totalRecuperations, 0);
    const monthBenefice = monthTotalFrais - monthTotalSalaires - monthGerantGain - monthTotalRecuperations;

    return {
      monthTotalMontant,
      monthTotalFrais,
      monthTotalSalaires,
      monthGerantGain,
      monthTotalRecuperations,
      monthBenefice,
    };
  }, [monthLivs, monthStatsByAgent, commissionGerant]);

  const handleAddAvance = async () => {
    if (!avanceAgentId || !avanceMontant) {
      if (showToast) showToast('Agent et montant requis', 'error');
      return;
    }
    const agent = agents.find(a => a.id === avanceAgentId);
    if (!agent) {
      if (showToast) showToast('Agent invalide', 'error');
      return;
    }
    try {
      if (onAddAvance) {
        await onAddAvance({
          agent_id: avanceAgentId,
          agent_nom: agent.nom, // Utiliser le nom de l'objet agent trouvé
          montant: Number(avanceMontant) || 0,
                          motif: avanceMotif,
                          date: new Date().toISOString().split('T')[0],
                          mois: currentMonth(),
                          annule: false,
        });
      }
      setAvanceAgentId('');
      setAvanceMontant('');
      setAvanceMotif('');
      if (showToast) showToast('Avance ajoutee');
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'avance:", error);
      if (showToast) showToast("Erreur lors de l'ajout de l'avance.", 'error');
    }
  };

  const executeDeleteAvance = async () => {
    if (!confirmAvance) return;
    const id = confirmAvance;
    setConfirmAvance(null);
    try {
      await onDeleteAvance(id);
      if (showToast) showToast('Avance supprimee', 'warn');
    } catch (error) {
      console.error("Erreur lors de la suppression de l'avance:", error);
      if (showToast) showToast("Erreur lors de la suppression de l'avance.", 'error');
    }
  };

  const monthOptions = useMemo(() => months.map(m => ({ value: m, label: monthLabel(m) })), [months]);
  const agentOptions = useMemo(() => agents.map(a => ({ value: a.id, label: a.nom })), [agents]);

  return (
    <div>
    <Modal open={!!confirmAvance} onClose={() => setConfirmAvance(null)}>
    <ModalHeader title="Supprimer l'avance ?" onClose={() => setConfirmAvance(null)} />
    <ModalBody>
    <p style={{ fontSize: 12, color: 'var(--text2)' }}>Cette action est irreversible.</p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmAvance(null)}>Annuler</Button>
    <Button variant="danger" onClick={executeDeleteAvance}>Supprimer</Button>
    </ModalFooter>
    </Modal>

    <SectionHeader
    title="Recapitulatif"
    subtitle={currentCompany?.name}
    action={
      <Select
      value={selectedMonth}
      onChange={e => setSelectedMonth(e.target.value)}
      options={monthOptions}
      style={{ width: 'auto' }}
      aria-label="Sélectionnez le mois pour voir le récapitulatif"
      />
    }
    />

    {/* Indicateur de chargement pour les récupérations */}
    {loadingRecup && (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 10, marginBottom: 10 }}>
      Chargement des récupérations...
      </div>
    )}

    <Card style={{ marginBottom: 12, borderColor: monthBenefice >= 0 ? 'var(--green)' : 'var(--red)' }}>
    <CardHeader>
    <CardTitle>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
    Benefice net - {monthLabel(selectedMonth)}
    </span>
    </CardTitle>
    </CardHeader>
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <div>
    <div style={{ fontSize: 30, fontWeight: 900, color: monthBenefice >= 0 ? 'var(--green)' : 'var(--red)' }}>
    {formatAr(monthBenefice)}
    </div>
    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Frais - Salaires - Commission - Recuperations</div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
    <div>Montant colis : <b style={{ color: 'var(--green)' }}>{formatAr(monthTotalMontant)}</b></div>
    <div>Frais collectes : <b style={{ color: 'var(--orange)' }}>{formatAr(monthTotalFrais)}</b></div>
    <div>Salaires agents : <b style={{ color: 'var(--red)' }}>{formatAr(monthTotalSalaires)}</b></div>
    <div>Commission gerant : <b style={{ color: 'var(--pink)' }}>{formatAr(monthGerantGain)}</b></div>
    <div>Recuperations : <b style={{ color: 'var(--yellow)' }}>{formatAr(monthTotalRecuperations)}</b></div>
    <div>{monthLivs.length} livraisons</div>
    </div>
    </div>
    </Card>

    <Card style={{ marginBottom: 20, borderColor: 'var(--purple)' }}>
    <CardHeader>
    <CardTitle>
    <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700 }}>
    Commission gerant - {monthLabel(selectedMonth)}
    </span>
    </CardTitle>
    </CardHeader>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
    <div>
    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{formatAr(monthGerantGain)}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{livsGerant(monthLivs).length} livraisons x {formatAr(commissionGerant)}</div>
    </div>
    </div>
    </Card>

    <SectionHeader
    title={`Agents - ${monthLabel(selectedMonth)}`}
    subtitle={`${monthStatsByAgent.length} agent(s)`}
    />

    {monthStatsByAgent.map(a => (
      <Card key={a.id} style={{ marginBottom: 10 }}>
      <CardHeader>
      <CardTitle>{a.nom}</CardTitle>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge variant="success" size="sm">Sal: {formatAr(a.salaire)}</Badge>
      {a.totalAvances > 0 && <Badge variant="warning" size="sm">Av: {formatAr(a.totalAvances)}</Badge>}
      <Badge variant={a.netSalaire >= 0 ? 'success' : 'danger'} size="sm">Net: {formatAr(a.netSalaire)}</Badge>
      </div>
      </CardHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
      <span>Total : <b style={{ color: 'var(--text)' }}>{a.nbLivs}</b></span>
      <span>Livres : <b style={{ color: 'var(--green)' }}>{a.nbLivres}</b></span>
      <span>Retournes : <b style={{ color: 'var(--red)' }}>{a.nbRetours}</b></span>
      <span>Reportes : <b style={{ color: 'var(--purple)' }}>{a.nbReportes}</b></span>
      <span>Frais : <b style={{ color: 'var(--orange)' }}>{formatAr(a.totalFrais)}</b></span>
      </div>
      {a.avances.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pink)', marginBottom: 6, textTransform: 'uppercase' }}>
        Avances sur salaire (deduites du salaire)
        </div>
        {a.avances.map(av => (
          <div key={av.id} style={{ background: 'var(--bg)', borderRadius: 7, padding: '8px 10px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--orange)', fontWeight: 700, fontSize: 13 }}>{formatAr(Number(av.montant) || 0)}</span>
          {av.motif && <span style={{ fontSize: 11, color: 'var(--subtle)', background: 'var(--border)', padding: '2px 10px', borderRadius: 15 }}>{av.motif}</span>}
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{av.date}</span>
          </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Supprimer</Button>
          </div>
        ))}
        </div>
      )}
      {a.nbRecuperations > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', marginBottom: 6, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
        Recuperations matinales ({a.nbRecuperations})
        <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>{formatAr(a.totalRecuperations)}</span>
        </div>
        {a.recuperations.map(rec => (
          <div key={rec.id} style={{ background: 'var(--bg)', borderRadius: 7, padding: '6px 10px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <div>
          <span style={{ fontSize: 11, color: 'var(--yellow)' }}>{rec.client_donneur}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 10 }}>{rec.date}</span>
          </div>
          <div><span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatAr(rec.frais_recuperation)}</span></div>
          </div>
        ))}
        </div>
      )}
      </Card>
    ))}

    <div style={{ marginTop: 20 }}>
    <SectionHeader title="Ajouter une avance" />
    </div>
    <Card>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
    <Select
    label="Agent"
    value={avanceAgentId}
    onChange={e => setAvanceAgentId(e.target.value)}
    options={[{ value: '', label: '-- Agent --' }, ...agentOptions]}
    aria-label="Sélectionnez l'agent pour l'avance"
    />
    <Input
    type="number"
    label="Montant (Ar)"
    placeholder="50000"
    value={avanceMontant}
    onChange={e => setAvanceMontant(e.target.value)}
    aria-label="Entrez le montant de l'avance"
    />
    </div>
    <div style={{ marginBottom: 12 }}>
    <Input
    label="Motif de l'avance"
    placeholder="Ex: Urgence familiale, Achat materiel, Soins medicaux..."
    value={avanceMotif}
    onChange={e => setAvanceMotif(e.target.value)}
    aria-label="Entrez le motif de l'avance"
    />
    </div>
    <Button variant="warning" fullWidth onClick={handleAddAvance}>Enregistrer l'avance</Button>
    </Card>

    {avances.filter(a => a.mois === selectedMonth && a.annule).length > 0 && (
      <div style={{ marginTop: 16 }}>
      <SectionHeader title="Avances annulees" />
      {avances.filter(a => a.mois === selectedMonth && a.annule).map(av => (
        <div key={av.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, opacity: 0.6 }}>
        <div>
        <span style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>{av.agent_nom} - {formatAr(Number(av.montant) || 0)}</span>
        {av.motif && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>({av.motif})</span>}
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Definitivement</Button>
        </div>
      ))}
      </div>
    )}
    </div>
  );
}
