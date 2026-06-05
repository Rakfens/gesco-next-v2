// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from '@/lib/supabase';
import { getCurrentCompany } from '@/lib/supabase';
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

export default function AchatsPage() {
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateDebut: "",
    dateFin: "",
    statut: "",
    search: ""
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [selectedAchat, setSelectedAchat] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchAchats();
    }
  }, []);

  // Fetch achats based on filters
  const fetchAchats = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = getSupabase()
        .from('achats')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('date_achat', { ascending: false });

      if (filters.dateDebut) {
        query = query.gte('date_achat', filters.dateDebut);
      }
      if (filters.dateFin) {
        query = query.lte('date_achat', filters.dateFin);
      }
      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters.search) {
        query = query.or(`fournisseur_nom.ilike.%${filters.search}%,numero_commande.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setAchats(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des achats");
      setAchats([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany, filters]);

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handle date changes
  const handleDateChange = (field: string, date: string | null) => {
    setFilters(prev => ({ ...prev, [field]: date || "" }));
  };

  // Modal functions
  const openModal = (achat: any, mode: 'view' | 'edit') => {
    setSelectedAchat(achat);
    setModalMode(mode);
    if (mode === 'edit') {
      setEditForm({
        numero_commande: achat.numero_commande || '',
        date_achat: achat.date_achat || '',
        fournisseur_nom: achat.fournisseur_nom || '',
        montant_ht: achat.montant_ht || 0,
        tva: achat.tva || 0,
        montant_total: achat.montant_total || 0,
        montant_paye: achat.montant_paye || 0,
        statut: achat.statut || 'en_attente',
      });
    }
  };

  const closeModal = () => {
    setSelectedAchat(null);
    setModalMode(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!selectedAchat) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from('achats')
        .update({ ...editForm })
        .eq('id', selectedAchat.id);
      if (error) throw error;
      closeModal();
      fetchAchats();
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde : ' + err.message);
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
              Gestion des Achats
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Du:</label>
                <Input 
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => handleDateChange('dateDebut', e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Au:</label>
                <Input 
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => handleDateChange('dateFin', e.target.value)}
                  className="w-32"
                />
              </div>
              <Select 
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                className="w-40"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="recu">Reçu</option>
                <option value="paye">Payé</option>
                <option value="annule">Annulé</option>
              </Select>
              <Input
                type="text"
                placeholder="Rechercher fournisseur ou commande..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-48"
              />
              <Button 
                onClick={fetchAchats}
                className="ml-auto"
              >
                Filtrer
              </Button>
            </div>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
            <p className="mt-2 text-muted-foreground">Chargement des achats...</p>
          </div>
        ) : achats.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun achat trouvé.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell className="w-20">Commande</TableCell>
                <TableCell className="w-24">Date</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell className="w-20">Montant HT</TableCell>
                <TableCell className="w-20">TVA</TableCell>
                <TableCell className="w-20">Total</TableCell>
                <TableCell className="w-20">Payé</TableCell>
                <TableCell className="w-20">Statut</TableCell>
                <TableCell className="w-24">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {achats.map((achat) => (
                <TableRow key={achat.id}>
                  <TableCell>{achat.numero_commande}</TableCell>
                  <TableCell>{new Date(achat.date_achat).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{achat.fournisseur_nom}</TableCell>
                  <TableCell className="text-right">{formatAr(achat.montant_ht)}</TableCell>
                  <TableCell className="text-right">{formatAr(achat.tva)}</TableCell>
                  <TableCell className="text-right font-medium">{formatAr(achat.montant_total)}</TableCell>
                  <TableCell className="text-right">{formatAr(achat.montant_paye)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={achat.statut === 'paye' ? 'success' : 
                               achat.statut === 'annule' ? 'destructive' : 
                               achat.statut === 'recu' ? 'secondary' : 'default'}
                    >
                      {achat.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAchat(achat);
                        setModalMode('view');
                      }}
                    >
                      Voir
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openModal(achat, 'edit');
                      }}
                    >
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal */}
      {selectedAchat && modalMode && (
        <Modal open={true} onClose={closeModal}>
          <ModalHeader>
            {modalMode === 'view' ? "Détails de l'achat" : "Modifier l'achat"}
          </ModalHeader>
          <ModalBody>
            {modalMode === 'view' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">N° Commande</label>
                  <p>{selectedAchat.numero_commande}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p>{new Date(selectedAchat.date_achat).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fournisseur</label>
                  <p>{selectedAchat.fournisseur_nom}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Montant HT</label>
                  <p>{formatAr(selectedAchat.montant_ht)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">TVA</label>
                  <p>{formatAr(selectedAchat.tva)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Montant Total</label>
                  <p>{formatAr(selectedAchat.montant_total)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Montant Payé</label>
                  <p>{formatAr(selectedAchat.montant_paye)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <p>{selectedAchat.statut}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">N° Commande</label>
                  <Input value={editForm.numero_commande || ''} onChange={(e) => setEditForm((prev: any) => ({ ...prev, numero_commande: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={editForm.date_achat || ''} onChange={(e) => setEditForm((prev: any) => ({ ...prev, date_achat: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Fournisseur</label>
                  <Input value={editForm.fournisseur_nom || ''} onChange={(e) => setEditForm((prev: any) => ({ ...prev, fournisseur_nom: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Montant HT</label>
                  <Input type="number" value={editForm.montant_ht || 0} onChange={(e) => setEditForm((prev: any) => ({ ...prev, montant_ht: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">TVA</label>
                  <Input type="number" value={editForm.tva || 0} onChange={(e) => setEditForm((prev: any) => ({ ...prev, tva: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Montant Total</label>
                  <Input type="number" value={editForm.montant_total || 0} onChange={(e) => setEditForm((prev: any) => ({ ...prev, montant_total: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Montant Payé</label>
                  <Input type="number" value={editForm.montant_paye || 0} onChange={(e) => setEditForm((prev: any) => ({ ...prev, montant_paye: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={editForm.statut || 'en_attente'} onChange={(e) => setEditForm((prev: any) => ({ ...prev, statut: e.target.value }))} className="mt-1">
                    <option value="en_attente">En attente</option>
                    <option value="recu">Reçu</option>
                    <option value="paye">Payé</option>
                    <option value="annule">Annulé</option>
                  </Select>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {modalMode === 'view' ? (
              <Button onClick={closeModal}>Fermer</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeModal} disabled={saving}>Annuler</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
