import { logger } from "@/lib/logger";

export const exportToCSV = (
  data: Record<string, unknown>[],
  headers: string[],
  filename: string,
  options: { separator?: string; encoding?: string; includeHeaders?: boolean } = {},
): void => {
  if (!data?.length) {
    logger.warn("Aucune donnée à exporter");
    return;
  }

  const { separator = ",", encoding = "\uFEFF", includeHeaders = true } = options;

  const rows: string[] = [];

  if (includeHeaders) {
    rows.push(headers.map((h) => formatCSVCell(h)).join(separator));
  }

  data.forEach((row) => {
    const csvRow = headers.map((header) => {
      let value = row[header];
      if (typeof value === "object" && value !== null) {
        value =
          (value as Record<string, unknown>).label ||
          (value as Record<string, unknown>).name ||
          JSON.stringify(value);
      }
      return formatCSVCell(value);
    });
    rows.push(csvRow.join(separator));
  });

  const csvContent = encoding + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const formatCSVCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue = String(value);

  stringValue = stringValue.replace(/"/g, '""');

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    stringValue = `"${stringValue}"`;
  }

  return stringValue;
};

export const exportLivraisonsToCSV = (
  livraisons: Record<string, unknown>[],
  companyName: string = "aterinay",
): void => {
  const headers = [
    "id",
    "colis",
    "client_donneur",
    "destinataire",
    "destinataire_telephone",
    "agent_nom",
    "montant",
    "frais",
    "paiement",
    "date",
    "statut",
  ];
  const filename = `livraisons_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(livraisons, headers, filename);
};

export const exportAgentsToCSV = (
  agents: Record<string, unknown>[],
  companyName: string = "aterinay",
): void => {
  const headers = ["id", "nom", "salaire", "created_at"];
  const filename = `agents_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(agents, headers, filename);
};

export const exportAvancesToCSV = (
  avances: Record<string, unknown>[],
  companyName: string = "aterinay",
): void => {
  const headers = ["id", "agent_nom", "montant", "motif", "date", "mois", "annule"];
  const filename = `avances_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(avances, headers, filename);
};

export const exportRecuperationsToCSV = (
  recuperations: Record<string, unknown>[],
  companyName: string = "aterinay",
): void => {
  const headers = ["id", "date", "livreur_nom", "client_donneur", "frais_recuperation"];
  const filename = `recuperations_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(recuperations, headers, filename);
};

export const exportProduitsToCSV = (
  produits: Record<string, unknown>[],
  companyName: string = "commerce",
): void => {
  const headers = [
    "id",
    "nom",
    "reference",
    "categorie",
    "prix_achat",
    "prix_vente",
    "quantite_stock",
    "stock_minimum",
    "unite",
  ];
  const filename = `produits_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(produits, headers, filename);
};

export const exportVentesToCSV = (
  ventes: Record<string, unknown>[],
  companyName: string = "commerce",
): void => {
  const headers = [
    "numero_facture",
    "client_nom",
    "client_telephone",
    "date_vente",
    "montant_total",
    "remise",
    "montant_paye",
    "reste_a_payer",
    "statut",
    "type_paiement",
  ];
  const filename = `ventes_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(ventes, headers, filename);
};

export const exportAchatsToCSV = (
  achats: Record<string, unknown>[],
  companyName: string = "commerce",
): void => {
  const headers = [
    "numero_commande",
    "fournisseur_nom",
    "fournisseur_contact",
    "date_achat",
    "montant_total",
    "montant_paye",
    "statut",
  ];
  const filename = `achats_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(achats, headers, filename);
};

export const exportDepensesToCSV = (
  depenses: Record<string, unknown>[],
  companyName: string = "pomanay",
): void => {
  const headers = ["date", "categorie", "description", "montant"];
  const filename = `depenses_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(depenses, headers, filename);
};

export const exportStockToCSV = (
  produits: Record<string, unknown>[],
  companyName: string = "commerce",
): void => {
  const headers = [
    "nom",
    "reference",
    "categorie",
    "prix_achat",
    "prix_vente",
    "quantite_stock",
    "stock_minimum",
    "valeur_stock",
    "unite",
  ];
  const data = produits.map((p: Record<string, unknown>) => ({
    ...p,
    valeur_stock: (Number(p.quantite_stock) || 0) * (Number(p.prix_achat) || 0),
  }));
  const filename = `stock_${companyName}_${new Date().toISOString().split("T")[0]}`;
  exportToCSV(data, headers, filename);
};
