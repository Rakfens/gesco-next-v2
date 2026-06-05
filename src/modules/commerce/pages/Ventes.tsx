// @ts-nocheck
// Ventes.jsx — FIX #1 (alert/confirm→toast/modal) + FIX #2 (console.log) + FIX #5 (ticket branché)
import { useState, useEffect } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { fetchProduits } from '../services/produitService';
import { fetchVentes, fetchVenteWithDetails, createVente, updateVente, deleteVente } from '../services/venteService';
import { printTicketVente } from '../services/impressionService';
import { formatAr } from '@/modules/shared/utils/constants';
import { btn, inp, lbl, modalStyles } from '@/modules/shared/utils/helpers';

// ─── Toast inline ────────────────────────────────────────────────────
function useLocalToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, success: m => show(m, 'success'), error: m => show(m, 'error'), warn: m => show(m, 'warn') };
}

function ToastStack({ toasts }) {
  const colors = { success: 'var(--green)', error: 'var(--red)', warn: 'var(--yellow)' };
  const bgs = { success: 'var(--green-dim)', error: 'var(--red-dim)', warn: 'var(--yellow-dim)' };
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: bgs[t.type], color: colors[t.type],
          border: `1px solid ${colors[t.type]}30`,
          padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          animation: 'slideDown 0.3s ease', boxShadow: 'var(--shadow)', maxWidth: 300,
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── FIX #1 : Modal de confirmation (remplace confirm()) ──────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div style={{ ...modalStyles.overlay, zIndex: 300 }}>
      <div style={{ ...modalStyles.box, maxWidth: 360 }}>
        <div style={modalStyles.handle} />
        <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 10 }}>{danger ? '!' : 'i'}</div>
        <div style={{ ...modalStyles.title, textAlign: 'center' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ ...btn('var(--card2)', 'var(--card2)'), flex: 1, color: 'var(--text2)', border: '1px solid var(--border2)' }}>Annuler</button>
          <button onClick={onConfirm} style={{ ...btn(danger ? 'var(--red)' : 'var(--blue)', danger ? 'var(--red2)' : 'var(--blue2)'), flex: 1 }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ─── FIX #5 : Modal de confirmation impression ────────────────────────
function PrintModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ ...modalStyles.overlay, zIndex: 300 }}>
      <div style={{ ...modalStyles.box, maxWidth: 340 }}>
        <div style={modalStyles.handle} />
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>Impression</div>
        <div style={{ ...modalStyles.title, textAlign: 'center' }}>Vente enregistrée</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 24 }}>
          Voulez-vous imprimer le ticket de caisse ?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ ...btn('var(--card2)', 'var(--card2)'), flex: 1, color: 'var(--text2)', border: '1px solid var(--border2)' }}>Non merci</button>
          <button onClick={onConfirm} style={{ ...btn('var(--blue)', 'var(--blue2)'), flex: 1 }}>Imprimer</button>
        </div>
      </div>
    </div>
  );
}

const StatusBadge = ({ status }) => {
  const config = {
    paye:       { bg: 'var(--green-dim)', color: 'var(--green)',  label: 'Payé' },
    credit:     { bg: 'var(--yellow-dim)', color: 'var(--yellow)', label: 'Crédit' },
    en_attente: { bg: 'var(--blue-dim)',  color: 'var(--blue)',   label: 'En attente' },
  };
  const c = config[status] || config.en_attente;
  return <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.label}</span>;
};

export default function Ventes() {
  const { currentCompany } = useCompany();
  const toast = useLocalToast();

  const [ventes, setVentes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState(null);
  const [panier, setPanier] = useState([]);
  const [searchProduit, setSearchProduit] = useState('');

  // FIX #1 : état pour les modaux (plus de confirm())
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [printPending,  setPrintPending]  = useState(null);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth <= 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const [form, setForm] = useState({
    client_nom: '',
    client_telephone: '',
    type_paiement: 'especes',
    remise: 0,
    montant_paye: 0,
    date_vente: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadData(); }, [currentCompany]);

  // Realtime
  useEffect(() => {
    const handler = (e) => {
      if (['ventes', 'vente_details'].includes(e.detail?.table)) loadData();
    };
    window.addEventListener('getSupabase()_realtime', handler);
    return () => window.removeEventListener('getSupabase()_realtime', handler);
  }, []);

  // FIX #2 : suppression des console.log
  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [ventesData, produitsData] = await Promise.all([
        fetchVentes(),
        fetchProduits({ isActive: true }),
      ]);
      setVentes(ventesData);
      setProduits(produitsData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (produit) => {
    if (produit.quantite_stock <= 0) { toast.warn(`"${produit.nom}" est en rupture de stock`); return; }
    const existing = panier.find(p => p.produit_id === produit.id);
    if (existing) {
      if (existing.quantite >= produit.quantite_stock && !editMode) {
        toast.warn(`Stock insuffisant (${produit.quantite_stock} disponibles)`);
        return;
      }
      setPanier(panier.map(p => p.produit_id === produit.id
        ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire }
        : p));
    } else {
      setPanier([...panier, {
        produit_id: produit.id,
        nom: produit.nom,
        quantite: 1,
        prix_unitaire: produit.prix_vente || 0,
        sous_total: produit.prix_vente || 0,
        stock_max: produit.quantite_stock,
      }]);
    }
  };

  const updateCartQty = (produitId, quantite) => {
    if (quantite <= 0) { setPanier(panier.filter(p => p.produit_id !== produitId)); return; }
    setPanier(panier.map(p => p.produit_id === produitId
      ? { ...p, quantite, sous_total: quantite * p.prix_unitaire } : p));
  };

  const updateCartPrice = (produitId, newPrice) => {
    setPanier(panier.map(p => p.produit_id === produitId
      ? { ...p, prix_unitaire: newPrice, sous_total: p.quantite * newPrice } : p));
  };

  const resetForm = () => {
    setEditMode(false); setSelectedVente(null); setPanier([]); setSearchProduit('');
    setForm({ client_nom: '', client_telephone: '', type_paiement: 'especes', remise: 0, montant_paye: 0, date_vente: new Date().toISOString().split('T')[0] });
  };

  // FIX #1 + #5 : plus d'alert() ni de confirm() natifs
  const handleSubmitVente = async () => {
    if (panier.length === 0) { toast.warn('Ajoutez au moins un produit au panier'); return; }
    const total = panier.reduce((s, p) => s + p.sous_total, 0);
    const venteData = { ...form, montant_paye: parseFloat(form.montant_paye) || 0, remise: parseFloat(form.remise) || 0 };
    const details = panier.map(p => ({ produit_id: p.produit_id, quantite: p.quantite, prix_unitaire: p.prix_unitaire, sous_total: p.sous_total }));

    setSaving(true);
    try {
      if (editMode && selectedVente) {
        await updateVente(selectedVente.id, venteData, details);
        toast.success('Vente modifiée avec succès');
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        const newVente = await createVente(venteData, details);
        toast.success('Vente enregistrée avec succès');
        setShowModal(false);
        resetForm();
        loadData();
        // FIX #5 : modal d'impression (plus de confirm() bloquant)
        if (newVente?.id) setPrintPending({ venteId: newVente.id });
      }
    } catch (err) {
      toast.error(`Erreur : ${err.message || 'Impossible d\'enregistrer la vente'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditVente = async (vente) => {
    setEditMode(true); setSelectedVente(vente);
    setForm({
      client_nom: vente.client_nom || '',
      client_telephone: vente.client_telephone || '',
      type_paiement: vente.type_paiement || 'especes',
      remise: vente.remise || 0,
      montant_paye: vente.montant_paye || 0,
      date_vente: vente.date_vente?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    try {
      const v = await fetchVenteWithDetails(vente.id);
      if (v?.details) setPanier(v.details.map(d => ({
        produit_id: d.produit_id, nom: d.produit?.nom || 'Produit',
        quantite: d.quantite, prix_unitaire: d.prix_unitaire, sous_total: d.sous_total,
      })));
    } catch (_) { toast.warn('Impossible de charger les détails'); }
    setShowModal(true);
  };

  // FIX #1 : confirm() → modal
  const handleDeleteVente = (id) => { setConfirmDelete({ id }); };
  const executeDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteVente(id);
      toast.success('Vente supprimée, stock restauré');
      loadData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // FIX #5 : impression depuis la liste + modal confirmation
  const handlePrintTicket = async (venteId) => {
    try {
      const v = await fetchVenteWithDetails(venteId);
      if (v) { printTicketVente(v, v.details, currentCompany); }
      else toast.warn('Détails de la vente introuvables');
    } catch (err) {
      toast.error('Erreur lors de l\'impression');
    }
  };

  const executePrint = async () => {
    if (!printPending) return;
    const { venteId } = printPending;
    setPrintPending(null);
    await handlePrintTicket(venteId);
  };

  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalFinal = totalPanier - (parseFloat(form.remise) || 0);
  const resteAPayer = totalFinal - (parseFloat(form.montant_paye) || 0);

  const produitsFiltres = produits.filter(p =>
    !searchProduit || p.nom.toLowerCase().includes(searchProduit.toLowerCase()) || (p.reference || '').toLowerCase().includes(searchProduit.toLowerCase())
  );

  if (loading) return (
    <div style={{ color: 'var(--muted)', padding: 60, textAlign: 'center' }}>
      Chargement des ventes...
    </div>
  );

  return (
    <div style={{ padding: '0 0 20px' }}>
      <ToastStack toasts={toast.toasts} />

      {/* FIX #1 : Modal suppression */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer la vente ?"
        message="Cette action est irréversible. Le stock des produits sera restauré."
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />

      {/* FIX #5 : Modal impression */}
      <PrintModal
        open={!!printPending}
        onConfirm={executePrint}
        onCancel={() => setPrintPending(null)}
      />

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Ventes</h1>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>{currentCompany?.name} · {ventes.length} transaction(s)</p>
        </div>
        <button style={{ ...btn('var(--green)', 'var(--green2)'), padding: '10px 18px' }}
          onClick={() => { resetForm(); setShowModal(true); }}>
          + Nouvelle vente
        </button>
      </div>

      {/* Mobile : cards / Desktop : tableau */}
      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {ventes.length === 0
            ? <div style={{ textAlign:'center', color:'var(--muted)', padding:48 }}>Aucune vente</div>
            : ventes.map(v => {
              const solde = v.reste_a_payer || 0;
              return (
                <div key={v.id} style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:16, padding:16, animation:'fadeUp 0.3s ease both' }}>
                  {/* Ligne 1 : facture + statut */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{v.numero_facture}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                        {v.client_nom || '—'} · {new Date(v.date_vente).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <StatusBadge status={v.statut} />
                  </div>
                  {/* Ligne 2 : montants */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                    <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>TOTAL</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{formatAr(v.montant_total)}</div>
                    </div>
                    <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>PAYÉ</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>{formatAr(v.montant_paye)}</div>
                    </div>
                    <div style={{ background:'var(--bg)', borderRadius:10, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3, fontWeight:600 }}>SOLDE</div>
                      <div style={{ fontSize:13, fontWeight:700, color: solde>0?'var(--orange)':'var(--green)' }}>
                        {solde>0 ? formatAr(solde) : 'Payé'}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                    <button onClick={()=>handlePrintTicket(v.id)} style={{ ...btn('var(--card2)','var(--card2)'), padding:'9px 0', fontSize:16, border:'1px solid var(--border2)', borderRadius:10 }}>Imp.</button>
                    <button onClick={()=>handleEditVente(v)}      style={{ ...btn('var(--blue-dim)','var(--blue-dim)'), padding:'9px 0', fontSize:16, border:'1px solid rgba(79,158,255,0.2)', borderRadius:10 }}>Modif</button>
                    <button onClick={()=>handleDeleteVente(v.id)} style={{ ...btn('var(--red-dim)','var(--red-dim)'), padding:'9px 0', fontSize:16, color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10 }}>Suppr</button>
                  </div>
                </div>
              );
            })
          }
          {/* Total mobile */}
          {ventes.length > 0 && (
            <div style={{ background:'var(--card)', borderRadius:14, border:'1px solid var(--border2)', padding:'14px 16px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontWeight:700, fontSize:13 }}>TOTAL GÉNÉRAL</span>
              <div style={{ display:'flex', gap:16 }}>
                <span style={{ color:'var(--green)', fontWeight:800 }}>{formatAr(ventes.reduce((s,v)=>s+(v.montant_total||0),0))}</span>
                <span style={{ color:'var(--orange)', fontWeight:700 }}>Solde: {formatAr(ventes.reduce((s,v)=>s+(v.reste_a_payer||0),0))}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:'var(--card)', borderRadius:14, border:'1px solid var(--border2)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg)', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  <th style={{ padding:'10px 12px', textAlign:'left' }}>Facture</th>
                  <th style={{ padding:'10px 12px', textAlign:'left' }}>Client</th>
                  <th style={{ padding:'10px 12px', textAlign:'left' }}>Date</th>
                  <th style={{ padding:'10px 12px', textAlign:'right' }}>Montant</th>
                  <th style={{ padding:'10px 12px', textAlign:'right' }}>Payé</th>
                  <th style={{ padding:'10px 12px', textAlign:'right' }}>Solde</th>
                  <th style={{ padding:'10px 12px', textAlign:'center' }}>Statut</th>
                  <th style={{ padding:'10px 12px', textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ventes.length === 0
                  ? <tr><td colSpan={8} style={{ padding:48, textAlign:'center', color:'var(--muted)' }}>Aucune vente</td></tr>
                  : ventes.map(v => {
                    const solde = v.reste_a_payer || 0;
                    return (
                      <tr key={v.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 12px', fontWeight:600, fontSize:13 }}>{v.numero_facture}</td>
                        <td style={{ padding:'10px 12px' }}>{v.client_nom || <span style={{ color:'var(--muted)' }}>—</span>}</td>
                        <td style={{ padding:'10px 12px', fontSize:13 }}>{new Date(v.date_vente).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:600 }}>{formatAr(v.montant_total)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right' }}>{formatAr(v.montant_paye)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:solde>0?'var(--orange)':'var(--green)' }}>{solde>0?formatAr(solde):'✓'}</td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}><StatusBadge status={v.statut} /></td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                            <button onClick={()=>handlePrintTicket(v.id)} style={{ ...btn('var(--card2)','var(--card2)'), padding:'5px 9px', fontSize:13, border:'1px solid var(--border2)', color:'var(--muted)' }}>Imp.</button>
                            <button onClick={()=>handleEditVente(v)}      style={{ ...btn('var(--card2)','var(--card2)'), padding:'5px 9px', fontSize:13, border:'1px solid var(--border2)', color:'var(--muted)' }}>Modif</button>
                            <button onClick={()=>handleDeleteVente(v.id)} style={{ ...btn('var(--red-dim)','var(--red-dim)'), padding:'5px 9px', fontSize:13, color:'var(--red)', border:'1px solid rgba(248,113,113,0.2)' }}>Suppr</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--bg)', borderTop:'2px solid var(--border2)' }}>
                  <td colSpan={3} style={{ padding:'10px 12px', fontWeight:700, fontSize:13 }}>TOTAL GÉNÉRAL</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, fontSize:15, color:'var(--green)' }}>{formatAr(ventes.reduce((s,v)=>s+(v.montant_total||0),0))}</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700 }}>{formatAr(ventes.reduce((s,v)=>s+(v.montant_paye||0),0))}</td>
                  <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'var(--orange)' }}>{formatAr(ventes.reduce((s,v)=>s+(v.reste_a_payer||0),0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nouvelle/Modification vente */}
      {showModal && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.sheet, maxWidth: 860, borderRadius: 20 }}>
            <div style={modalStyles.handle} />
            <div style={{ padding:'0 20px 10px', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={modalStyles.title}>{editMode ? 'Modifier la vente' : 'Nouvelle vente'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer' }}>Fermer</button>
            </div>
            <div style={modalStyles.body}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Colonne produits */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Produits disponibles
                </div>
                <input type="text" placeholder="Rechercher un produit..."
                  style={{ ...inp(), marginBottom: 10 }}
                  value={searchProduit}
                  onChange={e => setSearchProduit(e.target.value)} />
                <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 6 }}>
                  {produitsFiltres.length === 0
                    ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Aucun produit</div>
                    : produitsFiltres.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: p.quantite_stock <= 0 ? 'var(--red-dim)' : 'transparent' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
                          <div style={{ fontSize: 11, color: p.quantite_stock <= 0 ? 'var(--red)' : 'var(--muted)' }}>
                            Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}
                          </div>
                        </div>
                        <button style={{ ...btn('var(--blue)', 'var(--blue2)'), padding: '5px 11px', fontSize: 12 }}
                          onClick={() => addToCart(p)} disabled={p.quantite_stock <= 0}>
                          +
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Colonne panier + formulaire */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Panier ({panier.length} article{panier.length > 1 ? 's' : ''})
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 6, marginBottom: 14 }}>
                  {panier.length === 0
                    ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Panier vide</div>
                    : panier.map(item => (
                      <div key={item.produit_id} style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nom}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => updateCartQty(item.produit_id, item.quantite - 1)}
                              style={{ ...btn('var(--card2)', 'var(--card2)'), padding: '2px 8px', border: '1px solid var(--border2)', color: 'var(--text)' }}>−</button>
                            <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantite}</span>
                            <button onClick={() => updateCartQty(item.produit_id, item.quantite + 1)}
                              style={{ ...btn('var(--card2)', 'var(--card2)'), padding: '2px 8px', border: '1px solid var(--border2)', color: 'var(--text)' }}>+</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Prix:</span>
                            <input type="number" style={{ width: 90, padding: '3px 7px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 12 }}
                              value={item.prix_unitaire}
                              onChange={e => updateCartPrice(item.produit_id, parseFloat(e.target.value) || 0)} step="100" />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{formatAr(item.sous_total)}</span>
                        </div>
                      </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={lbl()}>Client</label><input style={inp()} placeholder="Nom (optionnel)" value={form.client_nom} onChange={e => setForm({ ...form, client_nom: e.target.value })} /></div>
                  <div><label style={lbl()}>Téléphone</label><input style={inp()} placeholder="Optionnel" value={form.client_telephone} onChange={e => setForm({ ...form, client_telephone: e.target.value })} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={lbl()}>Paiement</label>
                    <select style={inp()} value={form.type_paiement} onChange={e => setForm({ ...form, type_paiement: e.target.value })}>
                      <option value="especes">Espèces</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="carte">Carte</option>
                    </select>
                  </div>
                  <div><label style={lbl()}>Date</label><input type="date" style={inp()} value={form.date_vente} onChange={e => setForm({ ...form, date_vente: e.target.value })} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div><label style={lbl()}>Remise (Ar)</label><input type="number" style={inp()} value={form.remise} onChange={e => setForm({ ...form, remise: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label style={lbl()}>Montant payé</label><input type="number" style={inp()} value={form.montant_paye} onChange={e => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} placeholder="0" /></div>
                </div>

                {/* Récapitulatif */}
                <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, marginBottom: 14 }}>
                  {[
                    { label: 'Sous-total', value: formatAr(totalPanier), color: 'var(--text)' },
                    { label: 'Remise', value: `− ${formatAr(form.remise)}`, color: 'var(--red)' },
                    { label: 'Total TTC', value: formatAr(totalFinal), color: 'var(--text)', bold: true, big: true },
                    { label: 'Payé', value: formatAr(form.montant_paye), color: 'var(--text)' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{row.label}</span>
                      <span style={{ fontWeight: row.bold ? 800 : 600, fontSize: row.big ? 16 : 13, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  {resteAPayer > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border2)' }}>
                      <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Reste à payer</span>
                      <span style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 15 }}>{formatAr(resteAPayer)}</span>
                    </div>
                  )}
                  {resteAPayer <= 0 && totalFinal > 0 && (
                    <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Entièrement payé</div>
                  )}
                </div>

              </div>
            </div>
            </div>{/* fin modalStyles.body */}
            {/* Footer sticky */}
            <div style={modalStyles.footer}>
              <button style={{ ...btn('var(--card2)','var(--card2)'), flex:1, padding:13, border:'1px solid var(--border2)', color:'var(--text2)', fontFamily:'var(--font)' }} onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button style={{ ...btn('var(--green)','var(--green2)'), flex:2, padding:13, fontSize:14, opacity:saving?0.7:1, fontFamily:'var(--font)' }}
                onClick={handleSubmitVente} disabled={saving}>
                {saving ? 'Enregistrement...' : (editMode ? 'Mettre à jour' : 'Enregistrer la vente')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
