// @ts-nocheck
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, getCurrentCompany } from "@/lib/supabase";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

// ─── Icons ──────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Empty Form ─────────────────────────────────────────────────────
const emptyForm = () => ({
  livreur_id: "",
  client_donneur: "",
  frais_recuperation: 1000,
});

// ─── Main Page ──────────────────────────────────────────────────────
export default function RecuperationPage() {
  const [recuperations, setRecuperations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Date filter
  const [selectedDate, setSelectedDate] = useState(TODAY());

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRecup, setEditRecup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFrais, setEditFrais] = useState(0);

  // Form state
  const [form, setForm] = useState(emptyForm());

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Responsive detection
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Load company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch recuperations for selected date
      const { data: recData, error: recError } = await supabase
        .from("recuperations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("date", selectedDate)
        .order("livreur_nom");
      if (recError) throw recError;

      // Fetch agents for dropdown
      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("nom");
      if (agentsError) throw agentsError;

      if (!mountedRef.current) return;
      setRecuperations(recData || []);
      setAgents(agentsData || []);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Erreur de chargement");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentCompany, selectedDate]);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany, loadData]);

  // ─── Form helpers ──────────────────────────────────────────────
  const resetForm = () => {
    setEditMode(false);
    setEditRecup(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleLivreurChange = (e) => {
    setForm((f) => ({ ...f, livreur_id: e.target.value }));
  };

  // ─── Create ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.livreur_id) { setError("Veuillez sélectionner un livreur"); return; }
    if (!form.client_donneur.trim()) { setError("Le client donneur est requis"); return; }
    if (form.frais_recuperation <= 0) { setError("Le montant doit être > 0"); return; }

    setSaving(true);
    setError(null);
    try {
      const selectedAgent = agents.find((a) => String(a.id) === String(form.livreur_id));
      const { error: insertError } = await supabase.from("recuperations").insert({
        company_id: currentCompany.id,
        date: selectedDate,
        livreur_id: form.livreur_id,
        livreur_nom: selectedAgent ? selectedAgent.nom : "",
        client_donneur: form.client_donneur.trim(),
        frais_recuperation: parseFloat(form.frais_recuperation) || 1000,
      });
      if (insertError) throw insertError;
      resetForm();
      loadData();
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit (frais_recuperation only) ────────────────────────────
  const handleOpenEdit = (recup) => {
    setEditRecup(recup);
    setEditFrais(recup.frais_recuperation);
    setShowEditModal(true);
  };

  const handleUpdateFrais = async () => {
    if (!editRecup) return;
    if (editFrais <= 0) { setError("Le montant doit être > 0"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("recuperations")
        .update({ frais_recuperation: parseFloat(editFrais) })
        .eq("id", editRecup.id)
        .eq("company_id", currentCompany.id);
      if (updateError) throw updateError;
      setShowEditModal(false);
      setEditRecup(null);
      loadData();
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      const { error: delError } = await supabase
        .from("recuperations")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompany.id);
      if (delError) throw delError;
      loadData();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // ─── Group by livreur ──────────────────────────────────────────
  const grouped = {};
  for (const r of recuperations) {
    const key = r.livreur_nom || "Inconnu";
    if (!grouped[key]) grouped[key] = { livreur_nom: key, items: [], total: 0, count: 0 };
    grouped[key].items.push(r);
    grouped[key].total += parseFloat(r.frais_recuperation) || 0;
    grouped[key].count += 1;
  }
  const groupedList = Object.values(grouped).sort((a, b) => a.livreur_nom.localeCompare(b.livreur_nom));

  // ─── Totals ────────────────────────────────────────────────────
  const totalJour = recuperations.reduce((s, r) => s + (parseFloat(r.frais_recuperation) || 0), 0);
  const totalCount = recuperations.length;

  // ─── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Card style={{ padding: 16 }}>
          <CardHeader style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, var(--green), var(--teal))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
              }}>
                <IconWallet />
              </div>
              <div>
                <CardTitle style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  Récupérations
                </CardTitle>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                  {currentCompany?.name} · {selectedDate}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 150 }}
              />
              <Button onClick={() => { resetForm(); setShowForm(true); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IconPlus /> Nouvelle
                </span>
              </Button>
            </div>
          </CardHeader>
          {error && (
            <div style={{ marginTop: 12, padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <Card style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Total du jour
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{formatAr(totalJour)}</div>
        </Card>
        <Card style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Nombre
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)" }}>{totalCount}</div>
        </Card>
        {!isMobile && (
          <Card style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Livreurs actifs
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--purple)" }}>{groupedList.length}</div>
          </Card>
        )}
      </div>

      {/* ─── Loading / Empty / Data ──────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <div style={{
            display: "inline-block", width: 32, height: 32,
            border: "3px solid var(--border)", borderTopColor: "var(--green)",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ marginTop: 10, fontSize: 14 }}>Chargement des récupérations...</p>
        </div>
      ) : recuperations.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Aucune récupération pour cette date</p>
          <p style={{ color: "var(--subtle)", fontSize: 12, marginTop: 4 }}>
            Cliquez sur « Nouvelle » pour enregistrer une récupération
          </p>
        </Card>
      ) : isMobile ? (
        /* ─── Mobile: Grouped Cards ──────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groupedList.map((group) => (
            <div key={group.livreur_nom}>
              {/* Agent header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--bg)", borderRadius: 10,
                marginBottom: 8, border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "var(--green)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {group.livreur_nom.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{group.livreur_nom}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge variant="info" size="sm">{group.count}</Badge>
                  <span style={{ fontWeight: 800, color: "var(--green)", fontSize: 14 }}>{formatAr(group.total)}</span>
                </div>
              </div>
              {/* Items */}
              {group.items.map((r) => (
                <Card key={r.id} style={{ padding: 12, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.client_donneur}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Client donneur</div>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--green)", fontSize: 15, marginLeft: 10 }}>
                      {formatAr(r.frais_recuperation)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(r)}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IconEdit /> Modifier</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(r.id)} style={{ color: "var(--red)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IconTrash /> Supprimer</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ))}
          {/* Grand total */}
          <Card style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)" }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>TOTAL DU JOUR</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge variant="success">{totalCount}</Badge>
              <span style={{ fontWeight: 900, color: "var(--green)", fontSize: 18 }}>{formatAr(totalJour)}</span>
            </div>
          </Card>
        </div>
      ) : (
        /* ─── Desktop: Grouped Table ──────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groupedList.map((group) => (
            <Card key={group.livreur_nom} style={{ overflow: "hidden", padding: 0 }}>
              {/* Agent header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 18px", background: "var(--bg)", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: "linear-gradient(135deg, var(--green), var(--teal))",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {group.livreur_nom.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{group.livreur_nom}</span>
                  <Badge variant="info" size="sm">{group.count} récupération{group.count > 1 ? "s" : ""}</Badge>
                </div>
                <span style={{ fontWeight: 800, color: "var(--green)", fontSize: 16 }}>
                  {formatAr(group.total)}
                </span>
              </div>
              {/* Table */}
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ width: 60 }}>#</TableCell>
                    <TableCell>Client donneur</TableCell>
                    <TableCell style={{ width: 160 }} align="right">Montant</TableCell>
                    <TableCell style={{ width: 140 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.items.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell style={{ color: "var(--muted)", fontSize: 13 }}>{idx + 1}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{r.client_donneur}</TableCell>
                      <TableCell align="right" style={{ fontWeight: 700, color: "var(--green)" }}>
                        {formatAr(r.frais_recuperation)}
                      </TableCell>
                      <TableCell align="center">
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(r)}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IconEdit /> Modifier</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(r.id)} style={{ color: "var(--red)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IconTrash /></span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
          {/* Grand total */}
          <Card style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)", border: "2px solid var(--green)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>TOTAL DU JOUR</span>
              <Badge variant="success">{totalCount} récupération{totalCount > 1 ? "s" : ""}</Badge>
              <Badge variant="info">{groupedList.length} livreur{groupedList.length > 1 ? "s" : ""}</Badge>
            </div>
            <span style={{ fontWeight: 900, color: "var(--green)", fontSize: 22 }}>{formatAr(totalJour)}</span>
          </Card>
        </div>
      )}

      {/* ─── Modal: Add Recuperation ──────────────────────────────── */}
      {showForm && (
        <Modal open={true} onClose={resetForm}>
          <ModalHeader title="Nouvelle récupération" onClose={resetForm} />
          <ModalBody>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Date
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Livreur *
                </label>
                <Select value={form.livreur_id} onChange={handleLivreurChange}>
                  <option value="">— Sélectionner un livreur —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Client donneur *
                </label>
                <Input
                  type="text"
                  placeholder="Nom du client donneur"
                  value={form.client_donneur}
                  onChange={(e) => setForm((f) => ({ ...f, client_donneur: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Montant récupération (Ar) *
                </label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={form.frais_recuperation || ""}
                  onChange={(e) => setForm((f) => ({ ...f, frais_recuperation: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} style={{ background: "var(--green)", color: "#fff" }}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Edit Frais ────────────────────────────────────── */}
      {showEditModal && (
        <Modal open={true} onClose={() => { setShowEditModal(false); setEditRecup(null); }}>
          <ModalHeader
            title={`Modifier — ${editRecup?.client_donneur || ""}`}
            onClose={() => { setShowEditModal(false); setEditRecup(null); }}
            subtitle={editRecup?.livreur_nom || ""}
          />
          <ModalBody>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                Montant récupération (Ar)
              </label>
              <Input
                type="number"
                value={editFrais || ""}
                onChange={(e) => setEditFrais(parseFloat(e.target.value) || 0)}
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditRecup(null); }} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleUpdateFrais} disabled={saving} style={{ background: "var(--green)", color: "#fff" }}>
              {saving ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── Modal: Confirm Delete ───────────────────────────────── */}
      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(null)}>
          <ModalHeader title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} />
          <ModalBody>
            <p style={{ fontSize: 14, color: "var(--text)", textAlign: "center" }}>
              Êtes-vous sûr de vouloir supprimer cette récupération ?
              Cette action est irréversible.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button onClick={handleDelete} style={{ background: "var(--red)", color: "#fff" }}>
              Supprimer
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export const dynamic = "force-dynamic";
