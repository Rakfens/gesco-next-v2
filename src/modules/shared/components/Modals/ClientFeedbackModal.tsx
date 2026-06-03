// @ts-nocheck
// ClientFeedbackModal.jsx — v5 : sticky footer (boutons toujours visibles mobile)
import { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { formatAr, STATUTS } from '../../utils/constants';
import { btn, inp, lbl, modalStyles } from '../../utils/helpers';
import { generateClientPDF } from '../../utils/pdfExport';

export const ClientFeedbackModal = ({
  fbClient, setFbClient,
  histDate,
  fbRecup, setFbRecup,
  fbProvince, setFbProvince,
  livraisons,
  onClose,
}) => {
  const { currentCompany } = useCompany();
  const [generating, setGenerating] = useState(false);

  if (!fbClient) return null;

  const clientNom  = typeof fbClient === 'string' ? fbClient : fbClient.client;
  const livsClient = typeof fbClient === 'string'
    ? (livraisons || []).filter(l => l.client_donneur === fbClient)
    : fbClient.livs;

  const livsLivrees    = livsClient.filter(l => l.statut === 'livre');
  const livsRetournees = livsClient.filter(l => l.statut === 'retourne');
  const livsReportees  = livsClient.filter(l => l.statut === 'reporte');
  const livsEnCours    = livsClient.filter(l => l.statut === 'en_cours');
  const livsFacturees  = livsLivrees.filter(l => l.paiement !== 'client');
  const totalMontant   = livsFacturees.reduce((s, l) => s + parseFloat(l.montant || 0), 0);
  const aVerser        = totalMontant - (parseFloat(fbRecup) || 0) - (parseFloat(fbProvince) || 0);
  const hasNonLivrees  = livsRetournees.length > 0 || livsReportees.length > 0;

  const handleClose = () => { if (onClose) onClose(); else setFbClient(null); };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await generateClientPDF(clientNom, livsClient, parseFloat(fbRecup)||0, parseFloat(fbProvince)||0, null, currentCompany);
      handleClose();
    } catch (_) {} finally { setGenerating(false); }
  };

  const StatBadge = ({ statut }) => {
    const s = STATUTS[statut];
    if (!s) return null;
    return <span style={{ background:s.bg||'var(--card2)', color:s.color||'var(--text)', padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700 }}>{s.label}</span>;
  };

  return (
    <div style={{ ...modalStyles.overlay }}>
      {/* ── Conteneur flex colonne ── */}
      <div style={{ ...modalStyles.sheet, maxWidth:500 }}>

        {/* Handle — hors du scroll */}
        <div style={modalStyles.handle} />

        {/* Header — hors du scroll */}
        <div style={{ padding:'0 20px 10px', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', letterSpacing:'-0.02em' }}>Bilan client</h2>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
              {clientNom} · {histDate} · {livsClient.length} colis
            </div>
          </div>
          <button onClick={handleClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:20, cursor:'pointer', padding:4 }}>Fermer</button>
        </div>

        {/* ── Zone scrollable ── */}
        <div style={modalStyles.body}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:14 }}>
            {[
              { label:'Livrés',    count:livsLivrees.length,    color:'var(--green)',  bg:'var(--green-dim)' },
              { label:'Retournés', count:livsRetournees.length, color:'var(--red)',    bg:'var(--red-dim)' },
              { label:'Reportés',  count:livsReportees.length,  color:'var(--orange)', bg:'var(--orange-dim)' },
              { label:'En cours',  count:livsEnCours.length,    color:'var(--blue)',   bg:'var(--blue-dim)' },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.count}</div>
                <div style={{ fontSize:9, color:s.color, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Colis non livrés */}
          {hasNonLivrees && (
            <div style={{ background:'var(--red-dim)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:13, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                Colis non livrés ({livsRetournees.length + livsReportees.length})
              </div>
              {[...livsRetournees, ...livsReportees].map(l => (
                <div key={l.id} style={{ background:'var(--card)', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{l.colis}</span>
                    <StatBadge statut={l.statut} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom: l.remarque ? 7 : 0 }}>
                    {l.destinataire}{l.destinataire_lieu ? ` · ${l.destinataire_lieu}` : ''}
                  </div>
                  {l.remarque
                    ? <div style={{ background:'var(--bg)', borderRadius:8, padding:'7px 10px', fontSize:12, color:'var(--text2)', borderLeft:'3px solid var(--orange)' }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--orange)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Motif : </span>
                        {l.remarque}
                      </div>
                    : <div style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic' }}>Aucun motif renseigné</div>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Colis livrés */}
          {livsLivrees.length > 0 && (
            <div style={{ background:'var(--green-dim)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:13, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Livrés ({livsLivrees.length})
              </div>
              {livsLivrees.map(l => (
                <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(52,211,153,0.15)', fontSize:13 }}>
                  <div>
                    <span style={{ fontWeight:600 }}>{l.colis}</span>
                    <span style={{ color:'var(--muted)', fontSize:11, marginLeft:8 }}>{l.destinataire}</span>
                  </div>
                  <span style={{ fontWeight:700, color: l.paiement==='client'?'var(--blue)':'var(--green)' }}>
                    {l.paiement==='client' ? 'Payé client' : formatAr(parseFloat(l.montant||0))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Calcul versement */}
          <div style={{ background:'var(--bg)', borderRadius:13, padding:'14px 16px', marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
              Calcul versement
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:13 }}>
              <span style={{ color:'var(--text2)' }}>Total livré ({livsFacturees.length})</span>
              <span style={{ color:'var(--green)', fontWeight:700 }}>{formatAr(totalMontant)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
              <div>
                <label style={lbl()}>Récupération matinale (Ar)</label>
                <input type="number" style={inp()} value={fbRecup} onChange={e => setFbRecup(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={lbl()}>Province / déduction (Ar)</label>
                <input type="number" style={inp()} value={fbProvince} onChange={e => setFbProvince(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid var(--border2)', fontSize:17, fontWeight:800 }}>
              <span style={{ color:'var(--text)' }}>À VERSER</span>
              <span style={{ color: aVerser >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatAr(aVerser)}</span>
            </div>
          </div>

          {/* Spacer pour que le dernier élément ne soit pas collé au footer */}
          <div style={{ height:8 }} />
        </div>

        {/* ── Footer sticky — TOUJOURS visible ── */}
        <div style={modalStyles.footer}>
          <button onClick={handleClose} style={{ ...btn('var(--card2)','var(--card2)'), flex:1, padding:13, border:'1px solid var(--border2)', color:'var(--text2)', fontFamily:'var(--font)' }}>
            Annuler
          </button>
          <button
            style={{ ...btn('var(--blue)','var(--blue2)'), flex:2, padding:13, opacity:generating?0.7:1, fontFamily:'var(--font)' }}
            onClick={handleGeneratePDF}
            disabled={generating}
          >
            {generating ? 'Génération...' : 'Imprimer le bilan'}
          </button>
        </div>
      </div>
    </div>
  );
};
