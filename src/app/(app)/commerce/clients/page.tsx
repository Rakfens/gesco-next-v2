"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { type Company } from '@/modules/shared/types';
import { Button, Input, Card, CardHeader, CardTitle, Modal, ModalHeader, ModalTitle, ModalBody, Table, TableHead, TableBody, TableRow, TableCell } from "@/modules/shared/components/ui";

interface Client {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  company_id: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nom: "", telephone: "", email: "", adresse: "" });

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchClients();
    }
  }, []);

  const fetchClients = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from('clients')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nom');
      if (error) throw error;
      setClients(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany]);

  const resetForm = () => {
    setFormData({ nom: "", telephone: "", email: "", adresse: "" });
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
        email: formData.email || null,
        adresse: formData.adresse || null,
        company_id: currentCompany?.id,
      };
      if (isEditing && editingId) {
        const { error } = await getSupabase().from('clients').update(payload).eq('id', editingId).eq('company_id', currentCompany?.id);
        if (error) throw error;
      } else {
        const { error } = await getSupabase().from('clients').insert(payload);
        if (error) throw error;
      }
      resetForm();
      setShowModal(false);
      fetchClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      nom: client.nom || "",
      telephone: client.telephone || "",
      email: client.email || "",
      adresse: client.adresse || "",
    });
    setIsEditing(true);
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce client ?")) return;
    try {
      const { error } = await getSupabase().from('clients').delete().eq('id', id).eq('company_id', currentCompany?.id);
      if (error) throw error;
      fetchClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Gestion des Clients</CardTitle>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="ml-auto">
              + Nouveau Client
            </Button>
          </CardHeader>
          {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>}
        </Card>
      </div>

      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalHeader title={isEditing ? "Modifier le client" : "Nouveau Client"} />
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
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="client@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Adresse</label>
              <Input type="text" value={formData.adresse} onChange={(e) => setFormData(p => ({ ...p, adresse: e.target.value }))} placeholder="Adresse complète" />
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
              <p className="mt-2 text-muted-foreground">Chargement des clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8"><p className="text-muted-foreground">Aucun client trouvé.</p></div>
          ) : (
            <Table className="w-full">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell className="text-right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    <TableCell>{c.telephone || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.adresse || "—"}</TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(c)}>Modifier</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)}>Supprimer</Button>
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
