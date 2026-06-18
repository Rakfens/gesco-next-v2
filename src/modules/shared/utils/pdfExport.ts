// pdfExport.ts — v4 : PDF couleur avec icônes statut SVG + remarques colorées
import type { Company, Livraison } from "@/modules/shared/types";
import { formatAr, STATUTS } from "./constants";

interface Agent {
  nom?: string;
}

/* ─── Status config with colors matching the app theme ─── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  livre:    { label: "Livré",     color: "#34d399", bg: "#0a2e1a", border: "#34d399", icon: "check" },
  retourne: { label: "Retourné",  color: "#f87171", bg: "#2e0a0a", border: "#f87171", icon: "rotate-left" },
  reporte:  { label: "Reporté",   color: "#8b5cf6", bg: "#1a0a2e", border: "#8b5cf6", icon: "xmark" },
  en_cours: { label: "En cours",  color: "#c9a96e", bg: "#2e2a0a", border: "#c9a96e", icon: "clock" },
};

function getStatusCfg(statut?: string) {
  return STATUS_CFG[statut || ""] || STATUS_CFG.en_cours;
}

/* ─── SVG icons as data URIs for PDF embedding ─── */
function getIconSvg(name: string, color: string): string {
  const paths: Record<string, string> = {
    check: "M20 6L9 17l-5-5",
    "rotate-left": "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9",
    xmark: "M18 6L6 18M6 6l12 12",
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  };
  const d = paths[name] || paths.clock;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

// ── Logo selon la société ─────────────────────────────────────────────
const getCompanyLogo = (logoUrlParam: string | null = null, company: Company | null = null): string => {
  if (logoUrlParam) return logoUrlParam;
  if (company?.logo_url && typeof company.logo_url === "string") return company.logo_url;
  if (!company) return "/logos/aterinay/logo.png";
  if (company.slug === "pomanay") return "/logos/pomanay/logo.png";
  if (company.slug === "zazatiana") return "/logos/zazatiana/logo.png";
  return "/logos/aterinay/logo.png";
};

// ── CSS commun ticket thermique ───────────────────────────────────────
const THERMAL_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #000;
  background: #fff;
  margin: 0 auto;
  padding: 4px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.sep  { border:none; border-top:1px solid #000; margin:6px 0; }
.sep2 { text-align:center; font-size:11px; letter-spacing:2px; margin:5px 0; }
.bold { font-weight:bold; }
.center { text-align:center; }
.right  { text-align:right; }
.row {
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  margin:2px 0;
  font-size:11px;
}
.row .label { flex:1; }
.row .val   { font-weight:bold; white-space:nowrap; padding-left:6px; }
.block {
  border:1px solid #000;
  margin:6px 0;
  padding:5px;
}
.block-title {
  font-weight:bold;
  font-size:12px;
  border-bottom:1px solid #000;
  padding-bottom:3px;
  margin-bottom:4px;
  text-transform:uppercase;
}
.total-section {
  border:1px solid #000;
  border-top:2px solid #000;
  padding:6px;
  margin-top:8px;
}
.total-grand {
  font-weight:bold;
  font-size:13px;
  border-top:1px solid #000;
  padding-top:5px;
  margin-top:5px;
}
.logo {
  width:32px; height:32px;
  object-fit:contain;
  display:block;
  margin:0 auto 4px;
}
.no-print {
  text-align:center;
  margin-top: 8px;
  margin-bottom: 20px;
  padding: 8px 0;
  border-top: 2px solid #000;
}
.btn-print {
  font-family:'Courier New',monospace;
  background:#000; color:#fff;
  border:none; padding:8px 20px;
  cursor:pointer; font-size:12px;
  margin:4px;
}
.btn-close {
  font-family:'Courier New',monospace;
  background:#fff; color:#000;
  border:2px solid #000; padding:8px 20px;
  cursor:pointer; font-size:12px;
  margin:4px;
}
@media print {
  .no-print { display:none; }
  body { padding:0; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
/* ── Color status blocks for client PDF ── */
.status-header {
  padding: 4px 6px;
  margin: 6px 0 4px 0;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.livraison-item {
  margin: 3px 0;
  padding: 5px 6px;
  border-bottom: 1px dashed #ccc;
}
.livraison-item:last-child { border-bottom: none; }
.remarque-box {
  margin-top: 4px;
  padding: 3px 6px;
  font-size: 10px;
  border-left: 2px solid;
}
`;

function openPrintWindow(title: string): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les popups pour imprimer"); return null; }
  w.document.title = title;
  return w;
}

function closePrintWindow(w: Window) {
  try { w.document.close(); } catch (_) { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════════════
// TICKET LIVREUR — Liste des livraisons par destinataire
// ═══════════════════════════════════════════════════════════════════════
export function printAgentList(
  agent: Agent,
  livraisons: Livraison[],
  date: string,
  logoUrlParam: string | null = null,
  company: Company | null = null,
): void {
  const w = openPrintWindow(`Livraison - ${agent.nom || "—"} - ${date}`);
  if (!w) return;

  const logoUrl = getCompanyLogo(logoUrlParam, company);
  const companyName = company?.name || "Aterinay Services";

  const destsMap: Record<string, { destinataire: string; telephone: string; lieu: string; items: Livraison[]; totalMontant: number; totalFrais: number }> = {};
  let grandMontant = 0;
  let grandFrais = 0;

  for (const l of livraisons) {
    const dest = l.destinataire || "—";
    const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
    const frais = parseFloat(String(l.frais || 0));
    grandMontant += montant;
    grandFrais += frais;

    if (!destsMap[dest]) {
      destsMap[dest] = { destinataire: dest, telephone: l.destinataire_telephone || "", lieu: l.destinataire_lieu || "", items: [], totalMontant: 0, totalFrais: 0 };
    }
    destsMap[dest].items.push(l);
    destsMap[dest].totalMontant += montant;
    destsMap[dest].totalFrais += frais;
  }

  let corpsHtml = "";
  let numDest = 1;

  for (const key of Object.keys(destsMap)) {
    const d = destsMap[key];
    const totalDest = d.totalMontant + d.totalFrais;

    let itemsHtml = "";
    d.items.forEach((l: Livraison, i: number) => {
      const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
      const frais = parseFloat(String(l.frais || 0));
      const montantTxt = l.paiement === "client" ? "CLIENT" : formatAr(montant);
      const sc = getStatusCfg(l.statut);
      const iconSvg = getIconSvg(sc.icon, sc.color);

      itemsHtml += `
      <div class="livraison-item">
        <div class="bold" style="font-size:12px;">${i + 1}. ${l.colis || "—"}</div>
        <div class="row"><span class="label">Donneur :</span><span class="val">${l.client_donneur || "—"}</span></div>
        <div class="row"><span class="label">Montant :</span><span class="val">${montantTxt}</span></div>
        ${frais > 0 ? `<div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(frais)}</span></div>` : ""}
        <div class="row">
          <span class="label">Statut  :</span>
          <span class="val" style="color:${sc.color};">${iconSvg} ${sc.label}</span>
        </div>
      </div>`;
    });

    corpsHtml += `
    <div class="block">
      <div class="block-title">DEST. ${numDest} : ${d.destinataire}</div>
      ${d.telephone ? `<div class="row"><span class="label">Tel  :</span><span class="val">${d.telephone}</span></div>` : ""}
      ${d.lieu ? `<div class="row"><span class="label">Lieu :</span><span class="val">${d.lieu}</span></div>` : ""}
      ${itemsHtml}
      <div style="margin-top:4px; padding-top:4px; border-top:1px solid #000;">
        ${d.totalMontant > 0 ? `<div class="row"><span class="label">Montant :</span><span class="val">${formatAr(d.totalMontant)}</span></div>` : ""}
        ${d.totalFrais > 0 ? `<div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(d.totalFrais)}</span></div>` : ""}
        <div class="row bold"><span class="label">TOTAL   :</span><span class="val">${formatAr(totalDest)}</span></div>
      </div>
    </div>`;
    numDest++;
  }

  const agentNom = agent.nom || "—";

  w.document.write(`<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><title>${companyName} - ${agentNom} - ${date}</title>
  <style>body { width:72mm; } ${THERMAL_CSS}</style>
  </head><body>
  <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  <div class="center">
    <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
    <div class="bold" style="font-size:14px; letter-spacing:1px;">${companyName.toUpperCase()}</div>
    <div style="font-size:11px;">FEUILLE DE LIVRAISON</div>
  </div>
  <hr class="sep">
  <div class="row"><span class="label">DATE    :</span><span class="val">${date}</span></div>
  <div class="row"><span class="label">LIVREUR :</span><span class="val">${agentNom.toUpperCase()}</span></div>
  <div class="row"><span class="label">COLIS   :</span><span class="val">${livraisons.length}</span></div>
  <hr class="sep">
  ${corpsHtml}
  <div class="total-section">
    <div style="font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">RECAPITULATIF</div>
    ${grandMontant > 0 ? `<div class="row"><span class="label">Total montant :</span><span class="val">${formatAr(grandMontant)}</span></div>` : ""}
    ${grandFrais > 0 ? `<div class="row"><span class="label">Total frais   :</span><span class="val">${formatAr(grandFrais)}</span></div>` : ""}
    <div class="row total-grand"><span class="label">A REMETTRE    :</span><span class="val">${formatAr(grandMontant + grandFrais)}</span></div>
  </div>
  <div class="sep2">- - - - - - - - - - - - - -</div>
  <div class="center" style="font-size:10px;">Signature livreur :</div>
  <div style="height:28px; border-bottom:1px solid #000; margin:4px 8px;"></div>
  <div class="center" style="font-size:9px; margin-top:6px;">Merci pour votre travail</div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  </body></html>`);

  closePrintWindow(w);
  setTimeout(() => w.print(), 400);
}

// ═══════════════════════════════════════════════════════════════════════
// TICKET CLIENT — Facture / bilan du client donneur (COULEUR)
// ═══════════════════════════════════════════════════════════════════════
export function generateClientPDF(
  client: string,
  livraisons: Livraison[],
  recuperation: number | string,
  province: number | string,
  _logoUrlParam: string | null = null,
  company: Company | null = null,
): void {
  const w = openPrintWindow(`Facture - ${client}`);
  if (!w) return;

  const logoUrl = getCompanyLogo(_logoUrlParam, company);
  const companyName = company?.name || "Aterinay Services";
  const date = new Date().toLocaleDateString("fr-FR");

  const livreesFacturees = livraisons.filter((l: Livraison) => l.statut === "livre" && l.paiement !== "client");
  const totalMontant = livreesFacturees.reduce((s: number, l: Livraison) => s + parseFloat(String(l.montant || 0)), 0);
  const recNum = parseFloat(String(recuperation)) || 0;
  const provNum = parseFloat(String(province)) || 0;
  const net = totalMontant - recNum - provNum;

  // Group livraisons by status
  const livrees = livraisons.filter((l) => l.statut === "livre");
  const retournees = livraisons.filter((l) => l.statut === "retourne");
  const reportees = livraisons.filter((l) => l.statut === "reporte");
  const enCours = livraisons.filter((l) => l.statut === "en_cours");

  function renderLivraisonItem(l: Livraison, i: number) {
    const sc = getStatusCfg(l.statut);
    const iconSvg = getIconSvg(sc.icon, sc.color);
    const montantTxt = l.paiement === "client" ? "CLIENT" : l.statut === "livre" ? formatAr(parseFloat(String(l.montant || 0))) : sc.label.toUpperCase();
    const hasRemarque = (l.statut === "retourne" || l.statut === "reporte") && l.remarque;

    return `
    <div class="livraison-item" style="border-left: 3px solid ${sc.color}; padding-left: 6px;">
      <div class="bold" style="font-size:12px;">${i + 1}. ${l.colis || "—"}</div>
      <div class="row"><span class="label">Destinataire :</span><span class="val">${l.destinataire || "—"}</span></div>
      ${l.destinataire_lieu ? `<div class="row"><span class="label">Lieu         :</span><span class="val">${l.destinataire_lieu}</span></div>` : ""}
      <div class="row">
        <span class="label">Statut       :</span>
        <span class="val" style="color:${sc.color};">${iconSvg} ${sc.label}</span>
      </div>
      <div class="row"><span class="label">Montant      :</span><span class="val">${montantTxt}</span></div>
      ${hasRemarque ? `<div class="remarque-box" style="border-color:${sc.color}; background:${sc.bg}; color:#000;"><span class="bold" style="color:${sc.color};">Motif : </span>${l.remarque}</div>` : ""}
    </div>`;
  }

  function renderSection(title: string, items: Livraison[], color: string, bg: string, icon: string) {
    if (items.length === 0) return "";
    const iconSvg = getIconSvg(icon, color);
    let itemsHtml = "";
    items.forEach((l, i) => { itemsHtml += renderLivraisonItem(l, i + 1); });
    return `
    <div class="status-header" style="background:${bg}; color:${color}; border:1px solid ${color};">
      ${iconSvg} ${title} (${items.length})
    </div>
    ${itemsHtml}`;
  }

  const livsHtml = `
    ${renderSection("LIVRÉS", livrees, "#34d399", "#0a2e1a", "check")}
    ${renderSection("RETOURNÉS", retournees, "#f87171", "#2e0a0a", "rotate-left")}
    ${renderSection("REPORTÉS", reportees, "#8b5cf6", "#1a0a2e", "xmark")}
    ${renderSection("EN COURS", enCours, "#c9a96e", "#2e2a0a", "clock")}
  `;

  w.document.write(`<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><title>Facture - ${client} - ${companyName}</title>
  <style>body { max-width:180mm; } ${THERMAL_CSS}</style>
  </head><body>
  <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  <div class="center">
    <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
    <div class="bold" style="font-size:14px; letter-spacing:1px;">${companyName.toUpperCase()}</div>
    <div style="font-size:11px;">RELEVE DE LIVRAISONS</div>
  </div>
  <hr class="sep">
  <div class="bold" style="font-size:13px;">CLIENT : ${client.toUpperCase()}</div>
  <div class="row"><span class="label">DATE :</span><span class="val">${date}</span></div>
  <div class="row"><span class="label">NB COLIS :</span><span class="val">${livraisons.length}</span></div>
  <hr class="sep">
  ${livsHtml}
  <div class="total-section">
    <div style="font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">BILAN FINANCIER</div>
    <div class="row"><span class="label">Total livre   :</span><span class="val" style="color:#34d399;">${formatAr(totalMontant)}</span></div>
    ${recNum > 0 ? `<div class="row"><span class="label">- Recuperation:</span><span class="val" style="color:#f87171;">- ${formatAr(recNum)}</span></div>` : ""}
    ${provNum > 0 ? `<div class="row"><span class="label">- Province    :</span><span class="val" style="color:#f87171;">- ${formatAr(provNum)}</span></div>` : ""}
    <div class="row total-grand">
      <span class="label">A VERSER      :</span>
      <span class="val" style="color:${net >= 0 ? "#34d399" : "#f87171"};">${formatAr(net)}</span>
    </div>
  </div>
  <div class="sep2">- - - - - - - - - - - - - -</div>
  <div class="center" style="font-size:9px; margin-top:4px;">${companyName} - Merci pour votre confiance</div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  </body></html>`);

  closePrintWindow(w);
  setTimeout(() => w.print(), 400);
}
