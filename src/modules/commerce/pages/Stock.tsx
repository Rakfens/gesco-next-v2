// Stock.tsx — Refactorisé avec design system centralisé
import { useState, useEffect, useMemo } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { useApp } from '@/modules/shared/context/AppContext';
import { fetchProduits, createProduit, updateProduit, deleteProduit, fetchCategories, updateStock } from '../services/produitService';
import { fetchMouvementsProduit as fetchMouvementsStock } from '../services/stockService';
import { getSupabase } from '@/lib/supabase';
import { formatAr } from '@/modules/shared/utils/constants';
import { modalStyles, btn, inp, lbl } from '@/modules/shared/utils/helpers';
import type { Produit } from '@/modules/shared/types';
import {
  Button, Input, Select, Card, Modal, ModalHeader, ModalBody, ModalFooter,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty,
  ConfirmDialog, StatCard, SkeletonTable,
} from '@/modules/shared/components/ui';

// ─── Hook useIsMobile ──────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

// ─── Card produit (mobile) ─────────────────────────────────────────
function ProduitCard({ p, onEdit, onMovement, onHistory, onDelete }: {
  p: Produit; onEdit: (p: Produit) => void; onMovement: (p: Produit) => void;
  onHistory: (p: Produit) => void; onDelete: (p: Produit) => void;
}) {
  const marge = p.prix_vente && p.prix_achat ? ((p.prix_vente - p.prix_achat) / p.prix_achat * 100).toFixed(0) : null;
  const isOut = (p.quantite_stock ?? 0) === 0;
  const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
  const statusCfg = isOut ? { l: 'Rupture', c: 'var(--red)', bg: 'var(--red-dim)' }
    : isLow ? { l: 'Stock bas', c: 'var(--orange)', bg: 'var(--orange-dim)' }
    : { l: 'OK', c: 'var(--green)', bg: 'var(--green-dim)' };

  return (
    <Card padding={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
          {p.reference && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Réf: {p.reference}</div>}
          {p.categorie && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.categorie}</div>}
        </div>
        <span style={{ background: statusCfg.bg, color: statusCfg.c, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{statusCfg.l}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'ACHAT', v: formatAr(p.prix_achat) },
          { l: 'VENTE', v: formatAr(p.prix_vente) },
          { l: 'STOCK', v: `${p.quantite_stock} ${p.unite}`, c: isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--text)' },
        ].map(r => (
          <div key={r.l} style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>{r.l}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: (r as any).c || 'var(--text)' }}>{r.v}</div>
          </div>
        ))}
      </div>
      {marge !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Marge :</span>
          <BadgeMarge value={Number(marge)} />
          {(p.stock_minimum ?? 0) > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Min: {p.stock_minimum ?? 0}</span>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 7 }}>
        <Button variant="secondary" size="sm" onClick={() => onEdit(p)}>Modifier</Button>
        <Button variant="primary" size="sm" onClick={() => onMovement(p)}>Mouvement</Button>
        <Button variant="primary" size="sm" onClick={() => onHistory(p)} style={{ background: 'var(--purple)', color: '#fff' }}>Historique</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(p)}>Suppr.</Button>
      </div>
    </Card>
  );
}

function BadgeMarge({ value }: { value: number }) {
  const bg = value >= 20 ? 'var(--green-dim)' : value >= 0 ? 'var(--yellow-dim)' : 'var(--red-dim)';
  const c = value >= 20 ? 'var(--green)' : value >= 0 ? 'var(--yellow)' : 'var(--red)';
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: bg, color: c }}>{value}%</span>;
}

// ─── Composant principal ────────────────────────────────────────────
export default function Stock() {
  const { currentCompany } = useCompany();
  const { success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  // State
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobileState, setIsMobile] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [mouvements, setMouvements] = useState<Array<{ id: string; type: string; quantite: number; notes?: string; date_mouvement?: string }>>([]);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');

  const [form, setForm] = useState({
    nom: '', reference: '', categorie: '', prix_achat: 0, prix_vente: 0,
    quantite_stock: 0, stock_minimum: 0, unite: 'pièce',
  });
  const [movementForm, setMovementForm] = useState({ type: 'entree', quantite: 0, notes: '' });

  // ─── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([fetchProduits(), fetchCategories()]);
      setProduits(pd); setCategories(cd);
    } catch { toastError('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  useEffect(() => {
    const handler = (e: Event) => {
      if (['produits', 'mouvements_stock'].includes((e as CustomEvent)?.detail?.table)) loadData();
    };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, []);

  const loadMouvements = async (produitId: string) => {
    if (!currentCompany) return;
    try {
      const { data, error } = await getSupabase().from('mouvements_stock')
        .select('*, produit:produits(id,nom)').eq('produit_id', produitId)
        .eq('company_id', currentCompany.id).order('date_mouvement', { ascending: false }).limit(50);
      if (error) throw error;
      setMouvements(data || []);
    } catch { toastError('Erreur historique'); }
  };

  const resetForm = () => {
    setForm({ nom: '', reference: '', categorie: '', prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: 'pièce' });
    setEditMode(false); setSelectedProduit(null);
  };
  const resetMovForm = () => { setMovementForm({ type: 'entree', quantite: 0, notes: '' }); setSelectedProduit(null); };

  // ─── CRUD ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.nom.trim()) { toastWarn('Nom du produit requis'); return; }
    setSaving(true);
    try {
      if (editMode && selectedProduit) { await updateProduit(selectedProduit.id, form); toastSuccess('Produit modifié'); }
      else { await createProduit(form); toastSuccess('Produit créé'); }
      setShowModal(false); resetForm(); loadData();
    } catch { toastError('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleMovement = async () => {
    if (!selectedProduit) return;
    if (movementForm.quantite <= 0) { toastWarn('Quantité > 0 requise'); return; }
    const newQty = movementForm.type === 'entree'
      ? (selectedProduit.quantite_stock ?? 0) + movementForm.quantite
      : (selectedProduit.quantite_stock ?? 0) - movementForm.quantite;
    if (newQty < 0) { toastWarn('Stock insuffisant'); return; }
    setSaving(true);
    try {
      await updateStock(selectedProduit.id, newQty, movementForm.notes || movementForm.type);
      toastSuccess(movementForm.type === 'entree' ? `+${movementForm.quantite} ajouté` : `-${movementForm.quantite} sorti`);
      setShowMovementModal(false); resetMovForm(); loadData();
    } catch { toastError('Erreur mouvement'); }
    finally { setSaving(false); }
  };

  const handleDeleteProduit = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) > 0) {
      toastWarn(`Impossible : "${produit.nom}" a encore ${produit.quantite_stock} unité(s)`);
      return;
    }
    setConfirmDelete(produit.id);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const produit = produits.find(p => p.id === confirmDelete);
    if (!produit) return;
    setConfirmDelete(null);
    try { await deleteProduit(produit.id); toastSuccess(`"${produit.nom}" supprimé`); loadData(); }
    catch { toastError('Erreur suppression'); }
  };

  const editProduit = (produit: Produit) => {
    setSelectedProduit(produit);
    setForm({
      nom: produit.nom, reference: produit.reference || '', categorie: produit.categorie || '',
      prix_achat: produit.prix_achat ?? 0, prix_vente: produit.prix_vente ?? 0,
      quantite_stock: produit.quantite_stock ?? 0, stock_minimum: produit.stock_minimum ?? 0,
      unite: produit.unite ?? '',
    });
    setEditMode(true); setShowModal(true);
  };

  const handleViewHistory = async (produit: Produit) => {
    setSelectedProduit(produit);
    await loadMouvements(produit.id);
    setShowHistoryModal(true);
  };

  const calcMarge = (p: { prix_vente?: number; prix_achat?: number }) =>
    p.prix_vente && p.prix_achat ? ((p.prix_vente - p.prix_achat) / p.prix_achat * 100).toFixed(0) : null;

  // ─── Computed ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return produits.filter(p => {
      if (filter && !p.nom.toLowerCase().includes(filter.toLowerCase()) && !(p.reference || '').toLowerCase().includes(filter.toLowerCase())) return false;
      if (categorieFilter && p.categorie !== categorieFilter) return false;
      return true;
    });
  }, [produits, filter, categorieFilter]);

  const stats = useMemo(() => ({
    total: produits.length,
    low: produits.filter(p => (p.quantite_stock ?? 0) > 0 && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0)).length,
    out: produits.filter(p => p.quantite_stock === 0).length,
  }), [produits]);

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) return <SkeletonTable rows={6} />;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Confirmations */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer le produit ?"
        message="Ce produit sera supprimé définitivement."
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Stock</h1>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{currentCompany?.name} · {produits.length} produit(s)</p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nouveau</Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total" value={stats.total} icon="📦" color="var(--blue)" />
        <StatCard label="Stock bas" value={stats.low} icon="⚠️" color="var(--orange)" />
        <StatCard label="Rupture" value={stats.out} icon="🚫" color="var(--red)" />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Input placeholder="Rechercher..." value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <select style={{ ...inp(), minWidth: 130 }} value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)}>
          <option value="">Toutes</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filter || categorieFilter) && (
          <Button variant="secondary" size="sm" onClick={() => { setFilter(''); setCategorieFilter(''); }}>Annuler</Button>
        )}
      </div>

      {/* Mobile cards / Desktop table */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Aucun produit</div>
          ) : filtered.map(p => (
            <ProduitCard key={p.id} p={p}
              onEdit={editProduit}
              onMovement={p => { setSelectedProduit(p); setMovementForm({ type: 'entree', quantite: 0, notes: '' }); setShowMovementModal(true); }}
              onHistory={handleViewHistory}
              onDelete={handleDeleteProduit}
            />
          ))}
        </div>
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {['Produit', 'Réf.', 'Catégorie', 'Prix achat', 'Prix vente', 'Marge', 'Stock', 'Statut', 'Actions'].map(h => (
                    <TableHeader key={h} style={{
                      textAlign: ['Prix achat', 'Prix vente', 'Marge', 'Stock'].includes(h) ? 'right'
                        : ['Statut', 'Actions'].includes(h) ? 'center' : 'left',
                    }}>{h}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableEmpty colSpan={9} message="Aucun produit" />
                ) : filtered.map(p => {
                  const isOut = (p.quantite_stock ?? 0) === 0;
                  const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
                  const m = calcMarge(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell style={{ fontWeight: 600 }}>{p.nom}</TableCell>
                      <TableCell style={{ color: 'var(--muted)', fontSize: 12 }}>{p.reference || '—'}</TableCell>
                      <TableCell style={{ fontSize: 12 }}>{p.categorie || '—'}</TableCell>
                      <TableCell style={{ textAlign: 'right', fontSize: 13 }}>{formatAr(p.prix_achat)}</TableCell>
                      <TableCell style={{ textAlign: 'right', fontSize: 13 }}>{formatAr(p.prix_vente)}</TableCell>
                      <TableCell style={{ textAlign: 'right' }}>
                        {m !== null ? <BadgeMarge value={Number(m)} /> : '—'}
                      </TableCell>
                      <TableCell style={{ textAlign: 'right', color: isLow ? 'var(--orange)' : 'var(--text)', fontWeight: isLow ? 700 : 400 }}>
                        {p.quantite_stock} {p.unite}
                      </TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        {isOut ? <span style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Rupture</span>
                          : isLow ? <span style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Stock bas</span>
                            : <span style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>OK</span>}
                      </TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                          <Button variant="secondary" size="sm" onClick={() => editProduit(p)}>Modifier</Button>
                          <Button variant="primary" size="sm" onClick={() => { setSelectedProduit(p); setMovementForm({ type: 'entree', quantite: 0, notes: '' }); setShowMovementModal(true); }}>Mouvement</Button>
                          <Button variant="primary" size="sm" onClick={() => handleViewHistory(p)} style={{ background: 'var(--purple)', color: '#fff' }}>Historique</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteProduit(p)}>Suppr.</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal Produit */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <ModalHeader title={editMode ? 'Modifier le produit' : 'Nouveau produit'} onClose={() => setShowModal(false)} />
        <ModalBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl()}>Nom *</label>
              <Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Coque iPhone 14" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl()}>Référence</label>
                <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="REF-001" />
              </div>
              <div>
                <label style={lbl()}>Catégorie</label>
                <Input list="cat-list" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} placeholder="Choisir..." />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl()}>Prix achat (Ar)</label>
                <Input type="number" value={String(form.prix_achat)} onChange={e => setForm({ ...form, prix_achat: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={lbl()}>
                  Prix vente (Ar)
                  {form.prix_achat > 0 && form.prix_vente > 0 && (
                    <span style={{ marginLeft: 8, color: form.prix_vente > form.prix_achat ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 11 }}>
                      ({calcMarge({ prix_achat: form.prix_achat, prix_vente: form.prix_vente })}%)
                    </span>
                  )}
                </label>
                <Input type="number" value={String(form.prix_vente)} onChange={e => setForm({ ...form, prix_vente: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl()}>Stock initial</label>
                <Input type="number" value={String(form.quantite_stock)} onChange={e => setForm({ ...form, quantite_stock: Number(e.target.value) || 0 })} disabled={editMode} />
              </div>
              <div>
                <label style={lbl()}>Stock min.</label>
                <Input type="number" value={String(form.stock_minimum)} onChange={e => setForm({ ...form, stock_minimum: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={lbl()}>Unité</label>
                <select style={inp()} value={form.unite} onChange={e => setForm({ ...form, unite: e.target.value })}>
                  <option value="pièce">Pièce</option><option value="kg">kg</option><option value="g">g</option>
                  <option value="l">Litre</option><option value="ml">ml</option><option value="m">Mètre</option>
                </select>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button variant="success" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : (editMode ? 'Mettre à jour' : 'Créer le produit')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Mouvement */}
      <Modal open={showMovementModal && !!selectedProduit} onClose={() => setShowMovementModal(false)}>
        <ModalHeader title="Mouvement de stock" onClose={() => setShowMovementModal(false)} />
        <ModalBody>
          {selectedProduit && (
            <>
              <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{selectedProduit.nom} · Stock actuel</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{selectedProduit.quantite_stock} <span style={{ fontSize: 14, color: 'var(--muted)' }}>{selectedProduit.unite}</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <Button variant={movementForm.type === 'entree' ? 'success' : 'secondary'} onClick={() => setMovementForm({ ...movementForm, type: 'entree' })}>Entrée</Button>
                <Button variant={movementForm.type === 'sortie' ? 'danger' : 'secondary'} onClick={() => setMovementForm({ ...movementForm, type: 'sortie' })}>Sortie</Button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl()}>Quantité</label>
                <Input type="number" value={String(movementForm.quantite)} onChange={e => setMovementForm({ ...movementForm, quantite: Number(e.target.value) || 0 })} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl()}>Notes (optionnel)</label>
                <textarea style={{ ...inp(), minHeight: 52 }} value={movementForm.notes} onChange={e => setMovementForm({ ...movementForm, notes: e.target.value })} />
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Stock après :</span>
                {(() => {
                  const after = movementForm.type === 'entree'
                    ? (selectedProduit.quantite_stock ?? 0) + movementForm.quantite
                    : (selectedProduit.quantite_stock ?? 0) - movementForm.quantite;
                  return <span style={{ fontWeight: 800, fontSize: 18, color: after < 0 ? 'var(--red)' : 'var(--text)' }}>{after} {selectedProduit.unite}</span>;
                })()}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowMovementModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleMovement} disabled={saving}>
            {saving ? 'Validation...' : 'Valider le mouvement'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Historique */}
      <Modal open={showHistoryModal && !!selectedProduit} onClose={() => setShowHistoryModal(false)}>
        <ModalHeader title={`Historique — ${selectedProduit?.nom || ''}`} onClose={() => setShowHistoryModal(false)} />
        <ModalBody>
          {selectedProduit && (
            <>
              <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>Stock actuel</span>
                <span style={{ fontWeight: 700 }}>{selectedProduit.quantite_stock ?? 0} {selectedProduit.unite}</span>
              </div>
              {mouvements.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Aucun mouvement</div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {mouvements.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div>
                        <span style={{
                          background: ['entree', 'achat'].includes(m.type) ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: ['entree', 'achat'].includes(m.type) ? 'var(--green)' : 'var(--red)',
                          padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginRight: 8,
                        }}>
                          {m.type === 'entree' ? 'Entrée' : m.type === 'achat' ? 'Achat' : m.type === 'vente' ? 'Vente' : 'Sortie'}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(m.date_mouvement ?? '').toLocaleString('fr-FR')}</span>
                        {m.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.notes}</div>}
                      </div>
                      <span style={{ fontWeight: 700 }}>{m.quantite} {selectedProduit.unite}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
