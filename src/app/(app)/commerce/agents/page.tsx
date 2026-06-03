// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Badge, Card, CardHeader, CardTitle, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function AgentsCommercePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nom: "", telephone: "", salaire: "" });

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchAgents();
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nom');
      if (error) throw error;
      setAgents(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des agents");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany]);

  const resetForm = () => {
    setFormData({ nom: "", telephone: "", salaire: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) { setError("Le nom est requis"); return; }
    try {
      const payload = {
        nom: formData.nom,
        telephone: formData.telephone || null,
        salaire: parseFloat(formData.salaire) || 0,
        company_id: currentCompany?.id,
      };
      if (isEditing && editingId) {
        const { error } = await supabase.from('agents').update(payload).eq('id', editingId).eq('company_id', currentCompany?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agents').insert(payload);
        if (error) throw error;
      }
      resetForm();
      setShowModal(false);
      fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (agent: any) => {
    setFormData({
      nom: agent.nom || "",
      telephone: agent.telephone || "",
      salaire: (agent.salaire || "").toString(),
    });
    setIsEditing(true);
    setEditingId(agent.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cet agent ?")) return;
    try {
      const { error } = await supabase.from('agents').delete().eq('id', id).eq('company_id', currentCompany?.id);
      if (error) throw error;
      fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Gestion des Agents</CardTitle>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="ml-auto">
              + Nouvel Agent
            </Button>
          </CardHeader>
          {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>}
        </Card>
      </div>

      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalHeader>
          <ModalTitle>{isEditing ? "Modifier l'agent" : "Nouvel Agent"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom *</label>
              <Input type="text" value={formData.nom} onChange={(e) => setFormData(p => ({ ...p, nom: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Téléphone</label>
                <Input type="tel" value={formData.telephone} onChange={(e) => setFormData(p => ({ ...p, telephone: e.target.value }))} placeholder="034..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Salaire (MGA)</label>
                <Input type="number" value={formData.salaire} onChange={(e) => setFormData(p => ({ ...p, salaire: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setShowModal(false); }}>Annuler</Button>
              <Button type="submit">{isEditing ? "Mettre à jour" : "Enregistrer"}</Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

      <div className="mt-6">
        <Card className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
              <p className="mt-2 text-muted-foreground">Chargement des agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8"><p className="text-muted-foreground">Aucun agent trouvé.</p></div>
          ) : (
            <Table className="w-full">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell className="text-right">Salaire</TableCell>
                  <TableCell className="text-right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nom}</TableCell>
                    <TableCell>{a.telephone || "—"}</TableCell>
                    <TableCell className="text-right">{formatAr(a.salaire)}</TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(a)}>Modifier</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(a.id)}>Supprimer</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
