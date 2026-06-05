// @ts-nocheck
// Stock.jsx — v3 : design mobile cards + tous les FIX précédents
import { useState, useEffect } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { fetchProduits, createProduit, updateProduit, deleteProduit, fetchCategories, updateStock } from '../services/produitService';
import { fetchMouvementsStock } from '../services/stockService';
import { getSupabase } from '@/lib/supabase';
import { formatAr } from '@/modules/shared/utils/constants';
import {
  Button, Input, Select, Badge, Card, Modal, ModalHeader, ModalBody, ModalFooter,
} from '@/modules/shared/components/ui';

function useLocalToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, success: m => show(m,'success'), error: m => show(m,'error'), warn: m => show(m,'warn') };
}

function ToastStack({ toasts }) {
  const colors = { success:'var(--green)', error:'var(--red)', warn:'var(--yellow)' };
  const bgs    = { success:'var(--green-dim)', error:'var(--red-dim)', warn:'var(--yellow-dim)' };
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:90, right:14, zIndex:999, display:'flex', flexDirection:'column', gap:8, maxWidth:280 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:bgs[t.type], color:colors[t.type], border:`1px solid ${colors[t.type]}30`, padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:600, animation:'slideDown 0.3s ease', boxShadow:'var(--shadow)' }}>{t.msg}</div>
      ))}
    </div>
  );
}

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ ...modalStyles.overlay, zIndex:300 }}>
      <div style={{ ...modalStyles.box, maxWidth:360 }}>
        <div style={modalStyles.handle} />
        <div style={{ fontSize:28, textAlign:'center', marginBottom:10 }}>Avertissement</div>
        <div style={{ ...modalStyles.title, textAlign:'center' }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--text2)', textAlign:'center', marginBottom:24 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}  style={{ ...btn('var(--card2)','var(--card2)'), flex:1, color:'var(--text2)', border:'1px solid var(--border2)' }}>Annuler</button>
          <button onClick={onConfirm} style={{ ...btn('var(--red)','var(--red2)'), flex:1 }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card produit mobile ───────────────────────────────────────────────
function ProduitCard({ p, onEdit, onMovement, onHistory, onDelete }) {
  const marge    = p.prix_vente && p.prix_achat ? ((p.prix_vente - p.prix_achat) / p.prix_achat * 100).toFixed(0) : null;
  const isLow    = p.quantite_stock > 0 && p.quantite_stock <= p.stock_minimum;
  const isOut    = p.quantite_stock === 0;
  const statusColor = isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--green)';
  const statusBg    = isOut ? 'var(--red-dim)' : isLow ? 'var(--orange-dim)' : 'var(--green-dim)';
  const statusLabel = isOut ? 'Rupture' : isLow ? 'Stock bas' : 'OK';

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, padding:16, display:'flex', flexDirection:'column', gap:12, animation:'fadeUp 0.3s ease both' }}>
      {/* Ligne 1 : nom + statut */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</div>
          {p.reference && <div style={{ fontSize:11, color:'var(--muted)' }}>Réf: {p.reference}</div>}
          {p.categorie && <div style={{ fontSize:11, color:'var(--muted)' }}>{p.categorie}</div>}
        </div>
        <span style={{ background:statusBg, color:statusColor, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, flexShrink:0 }}>{statusLabel}</span>
      </div>

      {/* Ligne 2 : prix + stock + marge */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>ACHAT</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{formatAr(p.prix_achat)}</div>
        </div>
        <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>VENTE</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{formatAr(p.prix_vente)}</div>
        </div>
        <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>STOCK</div>
          <div style={{ fontSize:13, fontWeight:700, color: isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--text)' }}>
            {p.quantite_stock} <span style={{ fontSize:10, color:'var(--muted)' }}>{p.unite}</span>
          </div>
        </div>
      </div>

      {/* Marge */}
      {marge !== null && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'var(--muted)' }}>Marge :</span>
          <span style={{
            fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:20,
            background: Number(marge) >= 20 ? 'var(--green-dim)' : Number(marge) >= 0 ? 'var(--yellow-dim)' : 'var(--red-dim)',
            color:      Number(marge) >= 20 ? 'var(--green)' : Number(marge) >= 0 ? 'var(--yellow)' : 'var(--red)',
          }}>{marge}%</span>
          {p.stock_minimum > 0 && <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>Min: {p.stock_minimum}</span>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:7 }}>
        <button onClick={() => onEdit(p)}      style={{ ...btn('var(--card2)','var(--card2)'), padding:'9px 0', fontSize:16, border:'1px solid var(--border2)', borderRadius:10 }} title="Modifier">Modifier</button>
        <button onClick={() => onMovement(p)}  style={{ ...btn('var(--blue-dim)','var(--blue-dim)'), padding:'9px 0', fontSize:16, border:'1px solid rgba(79,158,255,0.2)', borderRadius:10 }} title="Mouvement">Mouvement</button>
        <button onClick={() => onHistory(p)}   style={{ ...btn('var(--purple-dim)','var(--purple-dim)'), padding:'9px 0', fontSize:16, border:'1px solid rgba(167,139,250,0.2)', borderRadius:10 }} title="Historique">Historique</button>
        <button onClick={() => onDelete(p)}    style={{ ...btn('var(--red-dim)','var(--red-dim)'), padding:'9px 0', fontSize:16, border:'1px solid rgba(248,113,113,0.2)', borderRadius:10 }} title="Supprimer">Suppr</button>
      </div>
    </div>
  );
}

export default function Stock() {
  const { currentCompany } = useCompany();
  const toast = useLocalToast();

  const [produits,   setProduits]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth <= 768);

  const [showModal,         setShowModal]         = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal,  setShowHistoryModal]  = useState(false);
  const [selectedProduit,   setSelectedProduit]   = useState(null);
  const [mouvements,        setMouvements]        = useState([]);
  const [editMode,          setEditMode]          = useState(false);
  const [confirmDelete,     setConfirmDelete]     = useState(null);
  const [filter,            setFilter]            = useState('');
  const [categorieFilter,   setCategorieFilter]   = useState('');

  const [form, setForm] = useState({ nom:'', reference:'', categorie:'', prix_achat:0, prix_vente:0, quantite_stock:0, stock_minimum:0, unite:'pièce' });
  const [movementForm, setMovementForm] = useState({ type:'entree', quantite:0, notes:'' });

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);

  useEffect(() => {
    const handler = e => { if (['produits','mouvements_stock'].includes(e.detail?.table)) loadData(); };
    window.addEventListener('supabase_realtime', handler);
    return () => window.removeEventListener('supabase_realtime', handler);
  }, []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([fetchProduits(), fetchCategories()]);
      setProduits(pd); setCategories(cd);
    } catch (_) { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const loadMouvements = async (produitId) => {
    if (!currentCompany) return;
    try {
      const { data, error } = await getSupabase().from('mouvements_stock').select('*, produit:produits(id,nom)').eq('produit_id', produitId).eq('company_id', currentCompany.id).order('date_mouvement', { ascending:false }).limit(50);
      if (error) throw error;
      setMouvements(data || []);
    } catch (_) { toast.error('Erreur historique'); }
  };

  const resetForm = () => { setForm({ nom:'', reference:'', categorie:'', prix_achat:0, prix_vente:0, quantite_stock:0, stock_minimum:0, unite:'pièce' }); setEditMode(false); setSelectedProduit(null); };
  const resetMovForm = () => { setMovementForm({ type:'entree', quantite:0, notes:'' }); setSelectedProduit(null); };

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toast.warn('Nom du produit requis'); return; }
    setSaving(true);
    try {
      if (editMode && selectedProduit) { await updateProduit(selectedProduit.id, form); toast.success('Produit modifié'); }
      else { await createProduit(form); toast.success('Produit créé'); }
      setShowModal(false); resetForm(); loadData();
    } catch (_) { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleMovement = async () => {
    if (!selectedProduit) return;
    if (movementForm.quantite <= 0) { toast.warn('Quantité doit être > 0'); return; }
    const newQty = movementForm.type === 'entree'
      ? selectedProduit.quantite_stock + movementForm.quantite
      : selectedProduit.quantite_stock - movementForm.quantite;
    if (newQty < 0) { toast.warn('Stock insuffisant'); return; }
    setSaving(true);
    try {
      await updateStock(selectedProduit.id, newQty, movementForm.notes || movementForm.type);
      toast.success(movementForm.type === 'entree' ? `+${movementForm.quantite} ajouté` : `-${movementForm.quantite} sorti`);
      setShowMovementModal(false); resetMovForm(); loadData();
    } catch (_) { toast.error('Erreur mouvement'); }
    finally { setSaving(false); }
  };

  const handleDeleteProduit = (produit) => {
    if (produit.quantite_stock > 0) { toast.warn(`Impossible : ${produit.nom} a encore ${produit.quantite_stock} unité(s)`); return; }
    setConfirmDelete({ produit });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { produit } = confirmDelete; setConfirmDelete(null);
    try { await deleteProduit(produit.id); toast.success(`"${produit.nom}" supprimé`); loadData(); }
    catch (_) { toast.error('Erreur suppression'); }
  };

  const editProduit = (produit) => {
    setSelectedProduit(produit);
    setForm({ nom:produit.nom, reference:produit.reference||'', categorie:produit.categorie||'', prix_achat:produit.prix_achat, prix_vente:produit.prix_vente, quantite_stock:produit.quantite_stock, stock_minimum:produit.stock_minimum, unite:produit.unite });
    setEditMode(true); setShowModal(true);
  };

  const handleViewHistory = async (produit) => {
    setSelectedProduit(produit);
    await loadMouvements(produit.id);
    setShowHistoryModal(true);
  };

  const marge = (p) => p.prix_vente && p.prix_achat ? ((p.prix_vente - p.prix_achat) / p.prix_achat * 100).toFixed(0) : null;

  const filtered = produits.filter(p => {
    if (filter && !p.nom.toLowerCase().includes(filter.toLowerCase()) && !(p.reference||'').toLowerCase().includes(filter.toLowerCase())) return false;
    if (categorieFilter && p.categorie !== categorieFilter) return false;
    return true;
  });

  if (loading) return <div style={{ color:'var(--muted)', padding:60, textAlign:'center' }}><div style={{ fontSize:32, marginBottom:12 }}></div>Chargement...</div>;

  return (
    <div style={{ padding:'0 0 24px' }}>
      <ToastStack toasts={toast.toasts} />
      <ConfirmModal open={!!confirmDelete} title="Supprimer le produit ?" message={`"${confirmDelete?.produit?.nom}" sera supprimé définitivement.`} onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} />

      {/* En-tête */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)' }}>Stock</h1>
          <p style={{ color:'var(--muted)', fontSize:12, marginTop:2 }}>{currentCompany?.name} · {produits.length} produit(s)</p>
        </div>
        <button style={{ ...btn('var(--blue)','var(--blue2)'), padding:'10px 16px', fontSize:13 }} onClick={() => { resetForm(); setShowModal(true); }}>+ Nouveau</button>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input type="text" placeholder="Rechercher..." style={{ ...inp(), flex:1, minWidth:140 }} value={filter} onChange={e => setFilter(e.target.value)} />
        <select style={{ ...inp(), minWidth:130 }} value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)}>
          <option value="">Toutes</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filter || categorieFilter) && (
          <button style={{ ...btn('var(--card2)','var(--card2)'), color:'var(--muted)', border:'1px solid var(--border2)', padding:'0 12px' }} onClick={() => { setFilter(''); setCategorieFilter(''); }}>Annuler</button>
        )}
      </div>

      {/* Résumé rapide */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Total', value:produits.length, color:'var(--blue)' },
          { label:'Stock bas', value:produits.filter(p => p.quantite_stock > 0 && p.quantite_stock <= p.stock_minimum).length, color:'var(--orange)' },
          { label:'Rupture', value:produits.filter(p => p.quantite_stock === 0).length, color:'var(--red)' },
        ].map(stat => (
          <div key={stat.label} style={{ background:'var(--card)', border:`1px solid ${stat.color}20`, borderRadius:13, padding:'12px 14px', borderTop:`2px solid ${stat.color}` }}>
            <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:4 }}>{stat.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Mobile : cards / Desktop : tableau */}
      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.length === 0
            ? <div style={{ textAlign:'center', color:'var(--muted)', padding:48 }}><div style={{ fontSize:28, marginBottom:8 }}></div>Aucun produit</div>
            : filtered.map(p => (
              <ProduitCard key={p.id} p={p}
                onEdit={editProduit}
                onMovement={p => { setSelectedProduit(p); setMovementForm({ type:'entree', quantite:0, notes:'' }); setShowMovementModal(true); }}
                onHistory={handleViewHistory}
                onDelete={handleDeleteProduit}
              />
            ))
          }
        </div>
      ) : (
        <div style={{ background:'var(--card)', borderRadius:14, border:'1px solid var(--border2)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg)', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {['Produit','Réf.','Catégorie','Prix achat','Prix vente','Marge','Stock','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign: ['Prix achat','Prix vente','Marge','Stock'].includes(h) ? 'right' : ['Statut','Actions'].includes(h) ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{ padding:48, textAlign:'center', color:'var(--muted)' }}><div style={{ fontSize:28, marginBottom:8 }}></div>Aucun produit</td></tr>
                  : filtered.map(p => {
                    const isLow = p.quantite_stock <= p.stock_minimum;
                    const isOut = p.quantite_stock === 0;
                    const m = marge(p);
                    return (
                      <tr key={p.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 12px', fontWeight:600 }}>{p.nom}</td>
                        <td style={{ padding:'10px 12px', color:'var(--muted)', fontSize:12 }}>{p.reference || '—'}</td>
                        <td style={{ padding:'10px 12px', fontSize:12 }}>{p.categorie || '—'}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontSize:13 }}>{formatAr(p.prix_achat)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontSize:13 }}>{formatAr(p.prix_vente)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right' }}>
                          {m !== null ? <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20, background: Number(m)>=20?'var(--green-dim)':Number(m)>=0?'var(--yellow-dim)':'var(--red-dim)', color: Number(m)>=20?'var(--green)':Number(m)>=0?'var(--yellow)':'var(--red)' }}>{m}%</span> : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', color: isLow?'var(--orange)':'var(--text)', fontWeight: isLow?700:400 }}>{p.quantite_stock} {p.unite}</td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          {isOut ? <span style={{ background:'var(--red-dim)', color:'var(--red)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>Rupture</span>
                                 : isLow ? <span style={{ background:'var(--yellow-dim)', color:'var(--yellow)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>Stock bas</span>
                                         : <span style={{ background:'var(--green-dim)', color:'var(--green)', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>OK</span>}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                            <button onClick={() => editProduit(p)} style={{ ...btn('var(--card2)','var(--card2)'), padding:'5px 9px', fontSize:13, border:'1px solid var(--border2)', color:'var(--muted)' }}>Modifier</button>
                            <button onClick={() => { setSelectedProduit(p); setMovementForm({type:'entree',quantite:0,notes:''}); setShowMovementModal(true); }} style={{ ...btn('var(--blue)','var(--blue2)'), padding:'5px 9px', fontSize:13 }}>Mouvement</button>
                            <button onClick={() => handleViewHistory(p)} style={{ ...btn('var(--purple)','#6d28d9'), padding:'5px 9px', fontSize:13 }}>Historique</button>
                            <button onClick={() => handleDeleteProduit(p)} style={{ ...btn('var(--red-dim)','var(--red-dim)'), padding:'5px 9px', fontSize:13, color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)' }}>Suppr</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Produit */}
      {showModal && (
        <div style={{ ...modalStyles.overlay, ...(isMobile ? { alignItems:'stretch' } : {}) }}>
          <div style={{ ...modalStyles.sheet, ...(isMobile ? { borderRadius:0, maxHeight:'100vh', height:'100%' } : { maxWidth:500, borderRadius:'24px 24px 0 0' }) }}>
            <div style={modalStyles.handle} />
            <div style={{ padding:'0 20px 10px', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={modalStyles.title}>{editMode ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer' }}>Annuler</button>
            </div>
            <div style={modalStyles.body}>
            <div style={{ display:'grid', gap:12 }}>
              <div><label style={lbl()}>Nom *</label><input style={inp()} value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} placeholder="Ex: Coque iPhone 14" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl()}>Référence</label><input style={inp()} value={form.reference} onChange={e => setForm({...form, reference:e.target.value})} placeholder="REF-001" /></div>
                <div>
                  <label style={lbl()}>Catégorie</label>
                  <input style={inp()} list="cat-list" value={form.categorie} onChange={e => setForm({...form, categorie:e.target.value})} placeholder="Choisir..." />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl()}>Prix achat (Ar)</label><input type="number" style={inp()} value={form.prix_achat} onChange={e => setForm({...form, prix_achat:parseFloat(e.target.value)||0})} /></div>
                <div>
                  <label style={lbl()}>Prix vente (Ar)
                    {form.prix_achat > 0 && form.prix_vente > 0 && (
                      <span style={{ marginLeft:8, color:form.prix_vente>form.prix_achat?'var(--green)':'var(--red)', fontWeight:700, fontSize:11 }}>
                        ({marge({prix_achat:form.prix_achat, prix_vente:form.prix_vente})}%)
                      </span>
                    )}
                  </label>
                  <input type="number" style={inp()} value={form.prix_vente} onChange={e => setForm({...form, prix_vente:parseFloat(e.target.value)||0})} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div><label style={lbl()}>Stock initial</label><input type="number" style={inp()} value={form.quantite_stock} onChange={e => setForm({...form, quantite_stock:parseFloat(e.target.value)||0})} disabled={editMode} /></div>
                <div><label style={lbl()}>Stock min.</label><input type="number" style={inp()} value={form.stock_minimum} onChange={e => setForm({...form, stock_minimum:parseFloat(e.target.value)||0})} /></div>
                <div>
                  <label style={lbl()}>Unité</label>
                  <select style={inp()} value={form.unite} onChange={e => setForm({...form, unite:e.target.value})}>
                    <option value="pièce">Pièce</option><option value="kg">kg</option><option value="g">g</option>
                    <option value="l">Litre</option><option value="ml">ml</option><option value="m">Mètre</option>
                  </select>
                </div>
              </div>
            </div>
            </div>{/* fin body */}
            {/* Footer sticky */}
            <div style={modalStyles.footer}>
              <button style={{ ...btn('var(--card2)','var(--card2)'), flex:1, padding:13, border:'1px solid var(--border2)', color:'var(--text2)', fontFamily:'var(--font)' }} onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button style={{ ...btn('var(--green)','var(--green2)'), flex:2, padding:13, opacity:saving?0.7:1, fontFamily:'var(--font)' }} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement...' : (editMode ? 'Mettre à jour' : 'Créer le produit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvement */}
      {showMovementModal && selectedProduit && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.box, maxWidth:380 }}>
            <div style={modalStyles.handle} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={modalStyles.title}>Mouvement de stock</h2>
              <button onClick={() => setShowMovementModal(false)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer' }}>Annuler</button>
            </div>
            <div style={{ background:'var(--bg)', padding:14, borderRadius:12, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{selectedProduit.nom} · Stock actuel</div>
              <div style={{ fontSize:30, fontWeight:800 }}>{selectedProduit.quantite_stock} <span style={{ fontSize:14, color:'var(--muted)' }}>{selectedProduit.unite}</span></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <button onClick={() => setMovementForm({...movementForm, type:'entree'})} style={{ ...btn(movementForm.type==='entree'?'var(--green)':'var(--card2)', movementForm.type==='entree'?'var(--green2)':'var(--card2)'), padding:12, color:movementForm.type==='entree'?'#fff':'var(--muted)', border:'1px solid var(--border2)', fontSize:14 }}>Entree</button>
              <button onClick={() => setMovementForm({...movementForm, type:'sortie'})} style={{ ...btn(movementForm.type==='sortie'?'var(--red)':'var(--card2)', movementForm.type==='sortie'?'var(--red2)':'var(--card2)'), padding:12, color:movementForm.type==='sortie'?'#fff':'var(--muted)', border:'1px solid var(--border2)', fontSize:14 }}>Sortie</button>
            </div>
            <div style={{ marginBottom:12 }}><label style={lbl()}>Quantité</label><input type="number" style={inp()} value={movementForm.quantite} onChange={e => setMovementForm({...movementForm, quantite:parseFloat(e.target.value)||0})} /></div>
            <div style={{ marginBottom:14 }}><label style={lbl()}>Notes (optionnel)</label><textarea style={{ ...inp(), minHeight:52 }} value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes:e.target.value})} /></div>
            <div style={{ background:'var(--bg)', padding:12, borderRadius:10, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text2)' }}>Stock après :</span>
              <span style={{ fontWeight:800, fontSize:18, color:(movementForm.type==='entree'?selectedProduit.quantite_stock+movementForm.quantite:selectedProduit.quantite_stock-movementForm.quantite)<0?'var(--red)':'var(--text)' }}>
                {movementForm.type==='entree'?selectedProduit.quantite_stock+movementForm.quantite:selectedProduit.quantite_stock-movementForm.quantite} {selectedProduit.unite}
              </span>
            </div>
            <button style={{ ...btn('var(--blue)','var(--blue2)'), width:'100%', padding:13, opacity:saving?0.7:1 }} onClick={handleMovement} disabled={saving}>
              {saving ? 'Validation...' : 'Valider le mouvement'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && selectedProduit && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.box, maxWidth:600 }}>
            <div style={modalStyles.handle} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={modalStyles.title}>Historique — {selectedProduit.nom}</h2>
              <button onClick={() => setShowHistoryModal(false)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer' }}>Annuler</button>
            </div>
            <div style={{ background:'var(--bg)', padding:'10px 14px', borderRadius:10, marginBottom:14, display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--muted)', fontSize:13 }}>Stock actuel</span>
              <span style={{ fontWeight:700 }}>{selectedProduit.quantite_stock} {selectedProduit.unite}</span>
            </div>
            {mouvements.length === 0
              ? <div style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>Aucun mouvement</div>
              : <div style={{ maxHeight:360, overflowY:'auto' }}>
                {mouvements.map(m => (
                  <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                    <div>
                      <span style={{ background:['entree','achat'].includes(m.type)?'var(--green-dim)':'var(--red-dim)', color:['entree','achat'].includes(m.type)?'var(--green)':'var(--red)', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, marginRight:8 }}>
                        {m.type==='entree'?'Entree':m.type==='achat'?'Achat':m.type==='vente'?'Vente':'Sortie'}
                      </span>
                      <span style={{ color:'var(--muted)', fontSize:11 }}>{new Date(m.date_mouvement).toLocaleString('fr-FR')}</span>
                      {m.notes && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{m.notes}</div>}
                    </div>
                    <span style={{ fontWeight:700 }}>{m.quantite} {selectedProduit.unite}</span>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
