// @ts-nocheck
// templates/printStyles.ts — Styles communs pour l'impression
import { formatAr } from "@/modules/shared/utils/constants";

export const THERMAL_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; color: #000; background: #fff;
    margin: 0 auto; padding: 8px;
  }
  .sep { border:none; border-top:1px dashed #000; margin:6px 0; }
  .bold { font-weight:bold; }
  .center { text-align:center; }
  .right { text-align:right; }
  .row { display:flex; justify-content:space-between; align-items:baseline; margin:2px 0; font-size:11px; }
  .row .label { flex:1; }
  .row .val { font-weight:bold; white-space:nowrap; padding-left:6px; }
  .block { border:1px solid #000; margin:6px 0; padding:5px; }
  .block-title { font-weight:bold; font-size:11px; border-bottom:1px solid #000; padding-bottom:3px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px; }
  .total-section { border:1px solid #000; border-top:2px solid #000; padding:6px; margin-top:8px; }
  .total-grand { font-weight:bold; font-size:13px; border-top:1px solid #000; padding-top:5px; margin-top:5px; }
  .no-print { text-align:center; margin:8px 0; padding:8px 0; border-top:2px solid #000; }
  .btn-print { font-family:'Courier New',monospace; background:#000; color:#fff; border:none; padding:8px 20px; cursor:pointer; font-size:12px; margin:4px; }
  .btn-close { font-family:'Courier New',monospace; background:#fff; color:#000; border:2px solid #000; padding:8px 20px; cursor:pointer; font-size:12px; margin:4px; }
  table { width:100%; border-collapse:collapse; margin:6px 0; }
  th, td { padding:4px 2px; text-align:left; font-size:11px; }
  th { font-weight:bold; border-bottom:1px solid #000; }
  td { border-bottom:1px dotted #999; }
  .text-right { text-align:right; }
  @media print {
    .no-print { display:none; }
    body { padding:0; }
  }
`;

export const COMPANY_CONFIG: Record<string, { name: string; footer: string }> = {
  pomanay:   { name: "Pomanay",   footer: "Boutique accessoires téléphones - Merci de votre visite" },
  zazatiana: { name: "Zazatiana", footer: "Boutique articles bébé - Merci de votre visite" },
  aterinay:  { name: "Aterinay",  footer: "Service livraison - Merci pour votre confiance" },
};

export const getCompanyConfig = (slug: string) => COMPANY_CONFIG[slug] || COMPANY_CONFIG.aterinay;

// Ouvre une fenêtre d'impression avec le HTML fourni
export const openPrintWindow = (html: string, title = "Impression") => {
  const w = window.open("", "_blank");
  if (!w) { alert("Veuillez autoriser les popups pour imprimer"); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body>${html}</body></html>`);
  w.document.close();
};
