// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr, TODAY, monthLabel } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

export default function LivraisonDashboardPage() {
  const [livraisons, setLivraisons] = useState([]);
  const [agents, setAgents] = useState([]);
  const [commissionGerant, setCommissionGerant] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY());
  const [recuperationsJour, setRecuperationsJour] = useState([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [selectedLivraison, setSelectedLivraison] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchDashboardData();
      fetchRecuperationsJour();
    }
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch livraisons for today
      const { data: livData, error: livError } = await supabase
        .from('livraisons')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate)
        .order('heure', { ascending: true });
      
      if (livError) throw livError;
      setLivraisons(livData || []);
      
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nom');
      
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);
      
      // Calculate commission Gerant (simplified)
      let commission = 0;
      // In a real app, this would come from a service or calculation
      setCommissionGerant(commission);
      
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du tableau de bord");
      setLivraisons([]);
      setAgents([]);
      setCommissionGerant(0);
    } finally {
      setLoading(false);
    }
  }, [currentCompany, selectedDate]);

  // Fetch recuperations for today
  const fetchRecuperationsJour = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoadingRecup(true);
    
    try {
      const { data: recupData, error: recupError } = await supabase
        .from('recuperations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('date', selectedDate);
      
      if (recupError) throw recupError;
      setRecuperationsJour(recupData || []);
    } catch (err: any) {
      setRecuperationsJour([]);
    } finally {
      setLoadingRecup(false);
    }
  }, [currentCompany, selectedDate]);

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Reload recuperations when date changes
  useEffect(() => {
    if (currentCompany) {
      fetchRecuperationsJour();
    }
  }, [selectedDate, currentCompany, fetchRecuperationsJour]);

  // Modal helpers
  const openModal = (liv: any, mode: 'view' | 'edit') => {
    setSelectedLivraison(liv);
    setModalMode(mode);
    setEditForm({
      heure: liv.heure || '',
      colis: liv.colis || '',
      destinataire: liv.destinataire || '',
      destinataire_telephone: liv.destinataire_telephone || '',
      destinataire_lieu: liv.destinataire_lieu || '',
      agent_nom: liv.agent_nom || '',
      montant: liv.montant || 0,
      frais: liv.frais || 0,
      statut: liv.statut || '',
    });
  };

  const closeModal = () => {
    setSelectedLivraison(null);
    setModalMode(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!selectedLivraison) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('livraisons')
        .update({ ...editForm })
        .eq('id', selectedLivraison.id);
      if (updateError) throw updateError;
      closeModal();
      fetchDashboardData();
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde: ' + (err.message || 'inconnue'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              Tableau de Bord Livraison
            </CardTitle>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Date:</label>
              <Input 
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-32"
              />
            </div>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* StatCard: Livraisons du jour */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Livraisons du jour</p>
              <p className="text-2xl font-bold">{livraisons.length}</p>
            </div>
            <div className="text-primary h-10 w-10 flex items-center justify-center">
              #</div>
          </div>
        </Card>
        
        {/* StatCard: Recup du jour */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recup du jour</p>
              <p className="text-2xl font-bold">{recuperationsJour.length}</p>
            </div>
            <div className="text-success h-10 w-10 flex items-center justify-center">
              #</div>
          </div>
        </Card>
        
        {/* StatCard: Agents disponibles */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Agents</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </div>
            <div className="text-accent h-10 w-10 flex items-center justify-center">
              #</div>
          </div>
        </Card>
        
        {/* StatCard: Commission Gerant */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Commission Gérant</p>
              <p className="text-2xl font-bold">{formatAr(commissionGerant)}</p>
            </div>
            <div className="text-muted h-10 w-10 flex items-center justify-center">
              #</div>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        {/* Livraisons du jour table */}
        <Card className="p-4">
          <CardHeader className="mb-4">
            <CardTitle className="text-lg font-bold">Livraisons du {selectedDate}</CardTitle>
          </CardHeader>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
              <p className="mt-2 text-muted-foreground">Chargement...</p>
            </div>
          ) : livraisons.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucune livraison pour cette date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHead>
                  <TableRow>
                    <TableCell className="w-16">Heure</TableCell>
                    <TableCell className="w-20">Colis</TableCell>
                    <TableCell className="w-24">Destinataire</TableCell>
                    <TableCell className="w-20">Téléphone</TableCell>
                    <TableCell className="w-20">Lieu</TableCell>
                    <TableCell className="w-20">Agent</TableCell>
                    <TableCell className="w-20">Montant</TableCell>
                    <TableCell className="w-20">Frais</TableCell>
                    <TableCell className="w-20">Statut</TableCell>
                    <TableCell className="w-24">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {livraisons.map((liv) => (
                    <TableRow key={liv.id}>
                      <TableCell>{liv.heure ? liv.heure.substring(0, 5) : '--:--'}</TableCell>
                      <TableCell>{liv.colis ?? '-'}</TableCell>
                      <TableCell>{liv.destinataire ?? '-'}</TableCell>
                      <TableCell>{liv.destinataire_telephone ?? '-'}</TableCell>
                      <TableCell>{liv.destinataire_lieu ?? '-'}</TableCell>
                      <TableCell>
                        {liv.agent_nom ?? (liv.agent_id ? `Agent #${liv.agent_id}` : '-')}
                      </TableCell>
                      <TableCell className="text-right">{formatAr(liv.montant)}</TableCell>
                      <TableCell className="text-right">{formatAr(liv.frais || 0)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={liv.statut === 'livre' ? 'success' : 
                                   liv.statut === 'en_cours' ? 'secondary' : 
                                   liv.statut === 'retourne' ? 'destructive' : 'default'}
                        >
                          {liv.statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(liv, 'view')}
                        >
                          Voir
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(liv, 'edit')}
                        >
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      {modalMode && selectedLivraison && (
        <Modal open={true} onClose={closeModal}>
          <ModalHeader>
            {modalMode === 'view' ? 'Détails de la livraison' : 'Modifier la livraison'} #{selectedLivraison.id}
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Heure</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.heure ? selectedLivraison.heure.substring(0, 5) : '--:--'}</p>
                ) : (
                  <Input type="time" value={editForm.heure || ''} onChange={(e) => setEditForm({ ...editForm, heure: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Colis</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.colis ?? '-'}</p>
                ) : (
                  <Input type="text" value={editForm.colis || ''} onChange={(e) => setEditForm({ ...editForm, colis: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Destinataire</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.destinataire ?? '-'}</p>
                ) : (
                  <Input type="text" value={editForm.destinataire || ''} onChange={(e) => setEditForm({ ...editForm, destinataire: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.destinataire_telephone ?? '-'}</p>
                ) : (
                  <Input type="text" value={editForm.destinataire_telephone || ''} onChange={(e) => setEditForm({ ...editForm, destinataire_telephone: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lieu</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.destinataire_lieu ?? '-'}</p>
                ) : (
                  <Input type="text" value={editForm.destinataire_lieu || ''} onChange={(e) => setEditForm({ ...editForm, destinataire_lieu: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                {modalMode === 'view' ? (
                  <p>{selectedLivraison.agent_nom ?? (selectedLivraison.agent_id ? `Agent #${selectedLivraison.agent_id}` : '-')}</p>
                ) : (
                  <Input type="text" value={editForm.agent_nom || ''} onChange={(e) => setEditForm({ ...editForm, agent_nom: e.target.value })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant</label>
                {modalMode === 'view' ? (
                  <p>{formatAr(selectedLivraison.montant)}</p>
                ) : (
                  <Input type="number" value={editForm.montant || 0} onChange={(e) => setEditForm({ ...editForm, montant: parseFloat(e.target.value) || 0 })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frais</label>
                {modalMode === 'view' ? (
                  <p>{formatAr(selectedLivraison.frais || 0)}</p>
                ) : (
                  <Input type="number" value={editForm.frais || 0} onChange={(e) => setEditForm({ ...editForm, frais: parseFloat(e.target.value) || 0 })} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                {modalMode === 'view' ? (
                  <Badge
                    variant={selectedLivraison.statut === 'livre' ? 'success' :
                             selectedLivraison.statut === 'en_cours' ? 'secondary' :
                             selectedLivraison.statut === 'retourne' ? 'destructive' : 'default'}
                  >
                    {selectedLivraison.statut}
                  </Badge>
                ) : (
                  <Select value={editForm.statut || ''} onChange={(e) => setEditForm({ ...editForm, statut: e.target.value })}>
                    <option value="en_cours">En cours</option>
                    <option value="livre">Livré</option>
                    <option value="retourne">Retourné</option>
                    <option value="en_attente">En attente</option>
                  </Select>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {modalMode === 'edit' ? (
              <>
                <Button variant="outline" onClick={closeModal} disabled={saving}>Annuler</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeModal}>Fermer</Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
