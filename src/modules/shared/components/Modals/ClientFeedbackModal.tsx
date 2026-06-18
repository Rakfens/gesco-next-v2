// ClientFeedbackModal.tsx — v7 : PDF couleur avec icônes statut + remarques colorées
import { useState } from "react";
import type { Livraison } from "@/modules/shared/types";
import { useCompany } from "../../context/CompanyContext";
import { formatAr, STATUTS } from "../../utils/constants";
import { generateClientPDF } from "../../utils/pdfExport";

interface ClientFeedbackModalProps {
  fbClient: string | { client: string; livs: Livraison[] } | null;
  setFbClient: (v: string | { client: string; livs: Livraison[] } | null) => void;
  histDate: string;
  fbRecup: string;
  setFbRecup: (v: string) => void;
  fbProvince: string;
  setFbProvince: (v: string) => void;
  livraisons: Livraison[];
  onClose?: () => void;
}

/* ─── Status config matching the app theme ─── */
const STATUS_CFG = [
  { key: "livre", label: "Livré", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", icon: "check" },
  { key: "retourne", label: "Retourné", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", icon: "xmark" },
  { key: "en_cours", label: "En cours", color: "#c9a96e", bg: "rgba(201,169,110,0.08)", border: "rgba(201,169,110,0.2)", icon: "clock" },
] as const;

function getStatusCfg(statut?: string) {
  return STATUS_CFG.find((s) => s.key === statut) || STATUS_CFG[3];
}

/* ─── SVG Status Icon ─── */
function StatusIcon({ name, size = 12, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    check: "M20 6L9 17l-5-5",
    "rotate-left": "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9",
    xmark: "M18 6L6 18M6 6l12 12",
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.clock} />
    </svg>
  );
}

export function ClientFeedbackModal({
  fbClient, setFbClient, histDate, fbRecup, setFbRecup, fbProvince, setFbProvince, livraisons, onClose,
}: ClientFeedbackModalProps) {
  const { currentCompany } = useCompany();
  const [generating, setGenerating] = useState(false);

  if (!fbClient) return null;

  const clientNom = typeof fbClient === "string" ? fbClient : fbClient.client;
  const livsClient = typeof fbClient === "string"
    ? (livraisons || []).filter((l) => l.client_donneur === fbClient)
    : fbClient.livs;

  const livsLivrees = livsClient.filter((l) => l.statut === "livre");
  const livsRetournees = livsClient.filter((l) => l.statut === "retourne");
  const livsReportees = livsClient.filter((l) => l.statut === "reporte");
  const livsEnCours = livsClient.filter((l) => l.statut === "en_cours");
  const livsFacturees = livsLivrees.filter((l) => l.paiement !== "client");

  const totalMontant = livsFacturees.reduce((s, l) => s + parseFloat(String(l.montant || 0)), 0);
  const aVerser = totalMontant - (parseFloat(fbRecup) || 0) - (parseFloat(fbProvince) || 0);
  const hasNonLivrees = livsRetournees.length > 0 || livsReportees.length > 0;

  const handleClose = () => { if (onClose) onClose(); else setFbClient(null); };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await generateClientPDF(clientNom, livsClient, parseFloat(fbRecup) || 0, parseFloat(fbProvince) || 0, null, currentCompany);
      handleClose();
    } catch (_) { /* ignore */ }
    finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] animate-fade-up max-h-[92vh]"
        style={{ background: "#0c0c10", border: "1px solid rgba(255,255,255,0.04)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full" style={{ background: "var(--border-active)" }} />

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-5 pb-3 pt-2">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Bilan client
            </h2>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {clientNom} · {histDate} · {livsClient.length} colis
            </div>
          </div>
          <button type="button" onClick={handleClose} className="border-none bg-transparent p-1.5 rounded-lg text-lg transition-colors" style={{ color: "var(--text-muted)" }}>
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3">

          {/* Stats grid */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {STATUS_CFG.map((s) => {
              const count = s.key === "livre" ? livsLivrees.length : s.key === "retourne" ? livsRetournees.length : s.key === "reporte" ? livsReportees.length : livsEnCours.length;
              return (
                <div key={s.key} className="rounded-xl py-2.5 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <StatusIcon name={s.icon} size={12} color={s.color} />
                  </div>
                  <div className="text-lg font-extrabold" style={{ color: s.color }}>{count}</div>
                  <div className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Non livrés (retournés + reportés) */}
          {hasNonLivrees && (
            <div className="mb-3 rounded-xl p-3" style={{ border: "1px solid rgba(248,113,113,0.12)", background: "rgba(248,113,113,0.02)" }}>
              {/* Retournés */}
              {livsRetournees.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(248,113,113,0.1)" }}>
                      <StatusIcon name="rotate-left" size={11} color="#f87171" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#f87171" }}>
                      Retournés ({livsRetournees.length})
                    </span>
                  </div>
                  {livsRetournees.map((l) => (
                    <div key={l.id} className="mb-2 rounded-xl p-3" style={{ background: "rgba(248,113,113,0.03)", borderLeft: "2px solid #f87171" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.08)" }}>
                          <StatusIcon name="rotate-left" size={10} color="#f87171" />
                          <span className="text-[9px] font-bold" style={{ color: "#f87171" }}>Retourné</span>
                        </div>
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {l.destinataire}{l.destinataire_lieu ? ` · ${l.destinataire_lieu}` : ""}
                      </div>
                      {l.remarque ? (
                        <div className="mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(248,113,113,0.04)", borderLeft: "2px solid #f87171", color: "var(--text-secondary)" }}>
                          <span className="font-bold" style={{ color: "#f87171" }}>Motif : </span>{l.remarque}
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] italic" style={{ color: "var(--text-faint)" }}>Aucun motif renseigné</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reportés */}
              {livsReportees.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(139,92,246,0.1)" }}>
                      <StatusIcon name="xmark" size={11} color="#8b5cf6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
                      Reportés ({livsReportees.length})
                    </span>
                  </div>
                  {livsReportees.map((l) => (
                    <div key={l.id} className="mb-2 rounded-xl p-3" style={{ background: "rgba(139,92,246,0.03)", borderLeft: "2px solid #8b5cf6" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.08)" }}>
                          <StatusIcon name="xmark" size={10} color="#8b5cf6" />
                          <span className="text-[9px] font-bold" style={{ color: "#8b5cf6" }}>Reporté</span>
                        </div>
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {l.destinataire}{l.destinataire_lieu ? ` · ${l.destinataire_lieu}` : ""}
                      </div>
                      {l.remarque ? (
                        <div className="mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(139,92,246,0.04)", borderLeft: "2px solid #8b5cf6", color: "var(--text-secondary)" }}>
                          <span className="font-bold" style={{ color: "#8b5cf6" }}>Motif : </span>{l.remarque}
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] italic" style={{ color: "var(--text-faint)" }}>Aucun motif renseigné</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Livrés */}
          {livsLivrees.length > 0 && (
            <div className="mb-3 rounded-xl p-3" style={{ border: "1px solid rgba(52,211,153,0.12)", background: "rgba(52,211,153,0.02)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(52,211,153,0.1)" }}>
                  <StatusIcon name="check" size={11} color="#34d399" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#34d399" }}>
                  Livrés ({livsLivrees.length})
                </span>
              </div>
              {livsLivrees.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(52,211,153,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(52,211,153,0.08)" }}>
                      <StatusIcon name="check" size={10} color="#34d399" />
                    </div>
                    <span className="font-semibold text-[12px]" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.destinataire}</span>
                  </div>
                  <span className="font-bold text-[12px]" style={{ color: l.paiement === "client" ? "#60a5fa" : "#34d399" }}>
                    {l.paiement === "client" ? "Payé client" : formatAr(parseFloat(String(l.montant || 0)))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* En cours */}
          {livsEnCours.length > 0 && (
            <div className="mb-3 rounded-xl p-3" style={{ border: "1px solid rgba(201,169,110,0.12)", background: "rgba(201,169,110,0.02)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)" }}>
                  <StatusIcon name="clock" size={11} color="#c9a96e" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#c9a96e" }}>
                  En cours ({livsEnCours.length})
                </span>
              </div>
              {livsEnCours.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(201,169,110,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.08)" }}>
                      <StatusIcon name="clock" size={10} color="#c9a96e" />
                    </div>
                    <span className="font-semibold text-[12px]" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.destinataire}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.08)", color: "#c9a96e" }}>En cours</span>
                </div>
              ))}
            </div>
          )}

          {/* Calcul versement */}
          <div className="mb-2 rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Calcul versement
            </div>
            <div className="mb-3 flex justify-between text-[13px]">
              <span style={{ color: "var(--text-secondary)" }}>Total livré ({livsFacturees.length})</span>
              <span className="font-bold" style={{ color: "#34d399" }}>{formatAr(totalMontant)}</span>
            </div>
            <div className="mb-3 flex flex-col gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Récupération matinale (Ar)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all input-focus"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  value={fbRecup} onChange={(e) => setFbRecup(e.target.value)} placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Province / déduction (Ar)</label>
                <input
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all input-focus"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  value={fbProvince} onChange={(e) => setFbProvince(e.target.value)} placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-between border-t pt-3 text-[17px] font-extrabold" style={{ borderColor: "var(--border-subtle)" }}>
              <span style={{ color: "var(--text-primary)" }}>À VERSER</span>
              <span style={{ color: aVerser >= 0 ? "#34d399" : "#f87171" }}>{formatAr(aVerser)}</span>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 gap-2 p-4" style={{ borderTop: "1px solid var(--border-subtle)", background: "#0c0c10" }}>
          <button
            type="button" onClick={handleClose}
            className="flex-1 rounded-xl px-4 py-3 text-[13px] font-semibold btn-press transition-colors"
            style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
          >
            Annuler
          </button>
          <button
            type="button"
            className="flex-[2] rounded-xl px-4 py-3 text-[13px] font-semibold text-white btn-press transition-colors disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            onClick={handleGeneratePDF}
            disabled={generating}
          >
            {generating ? "Génération..." : "📄 Imprimer le bilan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientFeedbackModal;
