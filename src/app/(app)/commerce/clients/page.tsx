"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";

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
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
  });

  const fetchClients = useCallback(async () => {
    const company = getCurrentCompany();
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("clients")
        .select("*")
        .eq("company_id", company.id)
        .order("nom");
      if (error) throw error;
      setClients(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des clients";
      setError(msg);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const resetForm = () => {
    setFormData({ nom: "", telephone: "", email: "", adresse: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const company = getCurrentCompany();
    if (!company) return;
    if (!formData.nom) {
      setError("Le nom est requis");
      return;
    }
    try {
      const payload = {
        nom: formData.nom,
        telephone: formData.telephone || null,
        email: formData.email || null,
        adresse: formData.adresse || null,
        company_id: company.id,
      };
      if (isEditing && editingId) {
        const { error } = await getSupabase()
          .from("clients")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", company.id);
        if (error) throw error;
      } else {
        const { error } = await getSupabase().from("clients").insert(payload);
        if (error) throw error;
      }
      resetForm();
      setShowModal(false);
      fetchClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(msg);
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

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      const company = getCurrentCompany();
      if (!company) return;
      const { error } = await getSupabase()
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("company_id", company.id);
      if (error) throw error;
      fetchClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(msg);
    }
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer le client ?"
        message="Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />

      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>
              Gestion des Clients
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {clients.length} client(s)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Nouveau Client
          </Button>
        </CardHeader>
        {error && (
          <div
            style={{
              background: "var(--danger-light)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
      >
        <ModalHeader
          title={isEditing ? "Modifier le client" : "Nouveau Client"}
          onClose={() => {
            resetForm();
            setShowModal(false);
          }}
        />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Input
              label="Nom *"
              value={formData.nom}
              onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
              required
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Input
                label="Téléphone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData((p) => ({ ...p, telephone: e.target.value }))}
                placeholder="034..."
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="client@email.com"
              />
            </div>
            <Input
              label="Adresse"
              value={formData.adresse}
              onChange={(e) => setFormData((p) => ({ ...p, adresse: e.target.value }))}
              placeholder="Adresse complète"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit">{isEditing ? "Mettre à jour" : "Enregistrer"}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {loading ? (
        <Card padding={48}>
          <div style={{ textAlign: "center", color: "var(--muted)" }}>Chargement...</div>
        </Card>
      ) : clients.length === 0 ? (
        <Card padding={48}>
          <div style={{ textAlign: "center", color: "var(--muted)" }}>Aucun client trouvé.</div>
        </Card>
      ) : (
        <Card padding={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Nom</TableHeader>
                <TableHeader>Téléphone</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Adresse</TableHeader>
                <TableHeader align="right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell style={{ fontWeight: 600 }}>{c.nom}</TableCell>
                  <TableCell>{c.telephone || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.adresse || "—"}</TableCell>
                  <TableCell align="right">
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>
                        Modifier
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setConfirmDelete(c.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
