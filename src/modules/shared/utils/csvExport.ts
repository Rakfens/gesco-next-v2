// @ts-nocheck
// modules/shared/utils/csvExport.js

/**
 * Exporte des données au format CSV
 * @param {Array} data - Tableau d'objets à exporter
 * @param {Array} headers - Liste des clés à inclure dans l'export
 * @param {string} filename - Nom du fichier (sans extension)
 * @param {Object} options - Options supplémentaires
 */
export const exportToCSV = (data, headers, filename, options = {}) => {
  if (!data || !data.length) {
    console.warn('Aucune donnée à exporter');
    return;
  }

  const { separator = ',', encoding = '\uFEFF', includeHeaders = true } = options;

  // Construction des lignes CSV
  const rows = [];
  
  // Ajouter les en-têtes si demandé
  if (includeHeaders) {
    rows.push(headers.map(h => formatCSVCell(h)).join(separator));
  }
  
  // Ajouter les données
  data.forEach(row => {
    const csvRow = headers.map(header => {
      let value = row[header];
      // Si la valeur est un objet, essayer de prendre une propriété pertinente
      if (typeof value === 'object' && value !== null) {
        value = value.label || value.name || JSON.stringify(value);
      }
      return formatCSVCell(value);
    });
    rows.push(csvRow.join(separator));
  });

  // Créer le fichier CSV avec BOM pour les caractères UTF-8
  const csvContent = encoding + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Télécharger le fichier
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Nettoyer l'URL
  URL.revokeObjectURL(url);
};

/**
 * Formate une cellule CSV (échappe les guillemets et les séparateurs)
 * @param {any} value - Valeur à formater
 * @returns {string} Valeur formatée
 */
const formatCSVCell = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  let stringValue = String(value);
  
  // Échapper les guillemets doubles
  stringValue = stringValue.replace(/"/g, '""');
  
  // Si la valeur contient des virgules, des guillemets ou des sauts de ligne, l'encapsuler entre guillemets
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    stringValue = `"${stringValue}"`;
  }
  
  return stringValue;
};

/**
 * Exporte les livraisons en CSV
 * @param {Array} livraisons - Liste des livraisons
 * @param {string} companyName - Nom de la société
 */
export const exportLivraisonsToCSV = (livraisons, companyName = 'aterinay') => {
  const headers = ['id', 'colis', 'client_donneur', 'destinataire', 'destinataire_telephone', 'agent_nom', 'montant', 'frais', 'paiement', 'date', 'statut'];
  const filename = `livraisons_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(livraisons, headers, filename);
};

/**
 * Exporte les agents en CSV
 * @param {Array} agents - Liste des agents
 * @param {string} companyName - Nom de la société
 */
export const exportAgentsToCSV = (agents, companyName = 'aterinay') => {
  const headers = ['id', 'nom', 'salaire', 'created_at'];
  const filename = `agents_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(agents, headers, filename);
};

/**
 * Exporte les avances en CSV
 * @param {Array} avances - Liste des avances
 * @param {string} companyName - Nom de la société
 */
export const exportAvancesToCSV = (avances, companyName = 'aterinay') => {
  const headers = ['id', 'agent_nom', 'montant', 'motif', 'date', 'mois', 'annule'];
  const filename = `avances_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(avances, headers, filename);
};

/**
 * Exporte les récupérations en CSV
 * @param {Array} recuperations - Liste des récupérations
 * @param {string} companyName - Nom de la société
 */
export const exportRecuperationsToCSV = (recuperations, companyName = 'aterinay') => {
  const headers = ['id', 'date', 'livreur_nom', 'client_donneur', 'frais_recuperation'];
  const filename = `recuperations_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(recuperations, headers, filename);
};

// ==================== EXPORTS POUR LE MODULE COMMERCE ====================

/**
 * Exporte les produits en CSV
 * @param {Array} produits - Liste des produits
 * @param {string} companyName - Nom de la société
 */
export const exportProduitsToCSV = (produits, companyName = 'commerce') => {
  const headers = ['id', 'nom', 'reference', 'categorie', 'prix_achat', 'prix_vente', 'quantite_stock', 'stock_minimum', 'unite'];
  const filename = `produits_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(produits, headers, filename);
};

/**
 * Exporte les ventes en CSV
 * @param {Array} ventes - Liste des ventes
 * @param {string} companyName - Nom de la société
 */
export const exportVentesToCSV = (ventes, companyName = 'commerce') => {
  const headers = ['numero_facture', 'client_nom', 'client_telephone', 'date_vente', 'montant_total', 'remise', 'montant_paye', 'reste_a_payer', 'statut', 'type_paiement'];
  const filename = `ventes_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(ventes, headers, filename);
};

/**
 * Exporte les achats en CSV
 * @param {Array} achats - Liste des achats
 * @param {string} companyName - Nom de la société
 */
export const exportAchatsToCSV = (achats, companyName = 'commerce') => {
  const headers = ['numero_commande', 'fournisseur_nom', 'fournisseur_contact', 'date_achat', 'montant_total', 'montant_paye', 'statut'];
  const filename = `achats_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(achats, headers, filename);
};

/**
 * Exporte les dépenses en CSV (pour Pomanay)
 * @param {Array} depenses - Liste des dépenses
 * @param {string} companyName - Nom de la société
 */
export const exportDepensesToCSV = (depenses, companyName = 'pomanay') => {
  const headers = ['date', 'categorie', 'description', 'montant'];
  const filename = `depenses_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(depenses, headers, filename);
};

/**
 * Exporte le stock en CSV
 * @param {Array} produits - Liste des produits avec stock
 * @param {string} companyName - Nom de la société
 */
export const exportStockToCSV = (produits, companyName = 'commerce') => {
  const headers = ['nom', 'reference', 'categorie', 'prix_achat', 'prix_vente', 'quantite_stock', 'stock_minimum', 'valeur_stock', 'unite'];
  const data = produits.map(p => ({
    ...p,
    valeur_stock: (p.quantite_stock || 0) * (p.prix_achat || 0)
  }));
  const filename = `stock_${companyName}_${new Date().toISOString().split('T')[0]}`;
  exportToCSV(data, headers, filename);
};