// src/modules/livraison/pages/Agents.tsx
// Agents.tsx — Design system professionnel - Amélioré
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import { formatAr, currentMonth, monthLabel } from '@/modules/shared/utils/constants';
import { getRecuperationsByLivreurNom, getTotalRecuperationsByLivreurNom } from '../services/recuperationService';
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  // Assurez-vous que ces composants gèrent correctement l'accessibilité
} from '@/modules/shared/components/ui';
import type { Recuperation, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';

// Typage pour les données de récupération
interface RecupMois {
  total: number;
  count: number;
  details: Recuperation[];
}

interface RecupCumul {
  total: number;
  count: number;
}

// Typage pour la confirmation de suppression
interface ConfirmDeleteData {
  id: string;
  name: string;
}

export default function Agents() {
  const { agents, addAgent: onAddAgent, updateAgent: onUpdateAgent, deleteAgent: onDeleteAgent, showToast } = useApp();
  const isMobile = useIsMobile(); // Utilisé dans le rendu

  // États pour l'ajout
  const [newNom, setNewNom] = useState<string>('');
  const [newSalaire, setNewSalaire] = useState<string>('');

  // États pour la modification
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nom: string; salaire: string }>({ nom: '', salaire: '' });

  // États pour les filtres et les données externes
  const [month, setMonth] = useState<string>(currentMonth());
  const [recupsMois, setRecupsMois] = useState<Record<string, RecupMois>>({});
  const [recupsCumul, setRecupsCumul] = useState<Record<string, RecupCumul>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmDel, setConfirmDel] = useState<ConfirmDeleteData | null>(null);

  // Calcul des mois uniques de manière optimisée
  const uniqueMonths = useMemo(() => {
    const s = new Set(agents.map(a => currentMonth())); // Supposons que la logique réelle soit basée sur les données de récupération existantes
    s.add(currentMonth());
    return [...s].sort().reverse();
  }, [agents]);

  const monthOptions = useMemo(() => uniqueMonths.map(m => ({ value: m, label: monthLabel(m) })), [uniqueMonths]);

  const loadRecuperations = useCallback(async () => {
    if (!agents.length) return;
    setLoading(true);
    try {
      const promises = agents.map(async (agent: Agent) => {
        const [dataMois, { total: totalCumul, count: countCumul }] = await Promise.all([
          getRecuperationsByLivreurNom(agent.nom, month),
                                                                                       getTotalRecuperationsByLivreurNom(agent.nom),
        ]);
        return {
          id: agent.id,
          mois: { total: dataMois.reduce((s: number, r: Recuperation) => s + (r.frais_recuperation || 0), 0), count: dataMois.length, details: dataMois },
                                  cumul: { total: totalCumul, count: countCumul },
        };
      });

      const results = await Promise.all(promises);
      const moisMap: Record<string, RecupMois> = {};
      const cumulMap: Record<string, RecupCumul> = {};
      results.forEach((r: { id: string; mois: RecupMois; cumul: RecupCumul }) => {
        moisMap[r.id] = r.mois;
        cumulMap[r.id] = r.cumul;
      });
      setRecupsMois(moisMap);
      setRecupsCumul(cumulMap);
    } catch (error) {
      console.error("Erreur lors du chargement des récupérations:", error);
      // Optionnel: afficher un message d'erreur à l'utilisateur
      // showToast("Erreur lors du chargement des récupérations.", "error");
    } finally {
      setLoading(false);
    }
  }, [agents, month]);

  // Charger les récupérations initialement et sur changement de mois ou agents
  useEffect(() => {
    loadRecuperations();
  }, [loadRecuperations]);

  // Effet pour gérer le redimensionnement (maintenant correctement nettoyé)
  // useEffect(() => { // Ne semble pas être utilisé dans le rendu -> retiré
  //   const fn = () => setIsMobileState(window.innerWidth <= 768);
  //   window.addEventListener('resize', fn);
  //   return () => window.removeEventListener('resize', fn);
  // }, []);

  const handleAdd = async () => {
    if (!newNom.trim() || !newSalaire) {
      showToast('Nom et salaire requis', 'error');
      return;
    }
    try {
      await onAddAgent(newNom, newSalaire);
      setNewNom('');
      setNewSalaire('');
      showToast('Agent ajouté');
      // Optionnel: recharger les récupérations après ajout si nécessaire
      // loadRecuperations();
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'agent:", error);
      showToast("Erreur lors de l'ajout de l'agent.", 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editData.nom || !editData.salaire) return;
    try {
      await onUpdateAgent(editId, { nom: editData.nom, salaire: parseFloat(editData.salaire) });
      setEditId(null);
      setEditData({ nom: '', salaire: '' }); // Réinitialiser les données d'édition
      showToast('Agent modifié');
      // Optionnel: recharger les récupérations après mise à jour si nécessaire
      // loadRecuperations();
    } catch (error) {
      console.error("Erreur lors de la modification de l'agent:", error);
      showToast("Erreur lors de la modification de l'agent.", 'error');
    }
  };

  const startEdit = (agent: Agent) => {
    setEditId(agent.id);
    setEditData({ nom: agent.nom, salaire: String(agent.salaire ?? 0) });
  };

  const handleDelete = (agent: Agent) => {
    setConfirmDel({ id: agent.id, name: agent.nom });
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setConfirmDel(null);
    try {
      await onDeleteAgent(id);
      showToast('Agent supprimé', 'warn');
      // Optionnel: recharger les récupérations après suppression si nécessaire
      // loadRecuperations();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'agent:", error);
      showToast("Erreur lors de la suppression de l'agent.", 'error');
    }
  };

  return (
    <div data-testid="agents-page">
    {/* Modal de confirmation de suppression */}
    <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)}>
    <ModalHeader title="Supprimer l'agent ?" onClose={() => setConfirmDel(null)} />
    <ModalBody>
    <p className="page-header-subtitle">
    {confirmDel?.name} et toutes ses données seront supprimés définitivement.
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmDel(null)}>Annuler</Button>
    <Button variant="danger" onClick={executeDelete}>Supprimer</Button>
    </ModalFooter>
    </Modal>

    {/* Header */}
    <div className="page-header">
    <div>
    <h1 className="page-header-title">Agents</h1>
    <p className="page-header-subtitle">{agents.length} agent(s) enregistré(s)</p>
    </div>
    <div className="flex items-center gap-8">
    <Select
    value={month}
    onChange={e => setMonth(e.target.value)}
    options={monthOptions}
    style={{ width: 'auto' }}
    aria-label="Sélectionnez le mois pour voir les récupérations"
    />
    <Button
    variant="secondary"
    size="sm"
    onClick={loadRecuperations}
    loading={loading}
    data-testid="btn-refresh"
    disabled={loading} // Désactiver pendant le chargement
    >
    Actualiser
    </Button>
    </div>
    </div>

    {/* Formulaire ajout */}
    <Card style={{ marginBottom: 20 }}>
    <CardHeader>
    <CardTitle>Ajouter un agent</CardTitle>
    </CardHeader>
    <div className={isMobile ? '' : 'agent-form-grid'}>
    <Input
    placeholder="Nom complet"
    value={newNom}
    onChange={e => setNewNom(e.target.value)}
    aria-label="Nom de l'agent"
    />
    <Input
    type="number"
    placeholder="250000"
    value={newSalaire}
    onChange={e => setNewSalaire(e.target.value)}
    aria-label="Salaire de l'agent"
    />
    </div>
    <Button variant="primary" fullWidth onClick={handleAdd} data-testid="btn-add-agent">
    Ajouter l'agent
    </Button>
    </Card>

    {loading && (
      <div className="loading-text">
      Chargement des récupérations...
      </div>
    )}

    {/* Liste des agents */}
    <div className="section-label">
    Liste des agents ({agents.length})
    </div>

    {agents.map(a => {
      const rm = recupsMois[a.id] || { total: 0, count: 0, details: [] };
      const rc = recupsCumul[a.id] || { total: 0, count: 0 };
      return (
        <Card key={a.id} style={{ marginBottom: 10 }} data-testid={`agent-card-${a.id}`}>
        {editId === a.id ? (
          <div>
          <div className={isMobile ? '' : 'agent-edit-grid'}>
          <Input
          value={editData.nom}
          onChange={e => setEditData({ ...editData, nom: e.target.value })}
          aria-label="Modifier le nom de l'agent"
          />
          <Input
          type="number"
          value={editData.salaire}
          onChange={e => setEditData({ ...editData, salaire: e.target.value })}
          aria-label="Modifier le salaire de l'agent"
          />
          </div>
          <div className="flex gap-8 mt-12">
          <Button variant="success" onClick={handleUpdate} style={{ flex: 1 }}>Sauver</Button>
          <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
          </div>
          </div>
        ) : (
          <div>
          {/* Ligne principale */}
          <div className="flex items-center gap-12 agent-row">
          <div className="avatar-circle">
          {a.nom.charAt(0)}
          </div>
          <div className="flex-1">
          <div className="agent-name">{a.nom}</div>
          <div className="agent-salary">{formatAr(Number(a.salaire) || 0)} / mois</div>
          </div>
          <div className="flex gap-6">
          <Button variant="ghost" size="sm" onClick={() => startEdit(a)} data-testid={`btn-edit-${a.id}`}>
          Modifier
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(a)} data-testid={`btn-delete-${a.id}`}>
          Supprimer
          </Button>
          </div>
          </div>

          {/* Récupérations du mois */}
          <div className="info-panel">
          <div className="info-panel-header" style={{ marginBottom: rm.details?.length ? 8 : 0 }}>
          <span className="info-panel-label">{monthLabel(month)}</span>
          <div className="flex gap-12">
          <span className="info-panel-stats">{rm.count} récup.</span>
          <span className="info-panel-value">{formatAr(rm.total)}</span>
          </div>
          </div>
          {rm.details?.length > 0 && (
            <div className="info-panel-details">
            {rm.details.map((r, i) => (
              <div key={i} className="info-panel-detail-row">
              <span>{r.date}</span>
              <span>{r.client_donneur}</span>
              <span className="info-panel-detail-value">{formatAr(r.frais_recuperation)}</span>
              </div>
            ))}
            </div>
          )}
          </div>

          {/* Cumul total */}
          <div className="cumul-panel">
          <span className="info-panel-label">Cumul total</span>
          <div className="flex gap-12">
          <span className="cumul-panel-stats">{rc.count} récup.</span>
          <span className="cumul-panel-value">{formatAr(rc.total)}</span>
          </div>
          </div>
          </div>
        )}
        </Card>
      );
    })}
    </div>
  );
}
