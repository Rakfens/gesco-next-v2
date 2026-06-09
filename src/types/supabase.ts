// src/types/supabase.ts
// ============================================================
// GesCo — Types de base de données Supabase
// ============================================================
// Généré manuellement.
// TODO : remplacer par `supabase gen types typescript`
// une fois que le CLI Supabase est configuré localement.
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: number;
          company_id: number;
          nom: string;
          salaire: number;
        };
        Insert: {
          id?: number;
          company_id: number;
          nom: string;
          salaire?: number;
        };
        Update: {
          id?: number;
          company_id?: number;
          nom?: string;
          salaire?: number;
        };
      };
      avances: {
        Row: {
          id: number;
          company_id: number;
          agent_id: number;
          agent_nom: string | null;
          montant: number;
          motif: string | null;
          date: string;
          mois: string;
          annule: boolean;
        };
        Insert: {
          id?: number;
          company_id: number;
          agent_id: number;
          agent_nom?: string | null;
          montant: number;
          motif?: string | null;
          date: string;
          mois: string;
          annule?: boolean;
        };
        Update: {
          id?: number;
          company_id?: number;
          agent_id?: number;
          agent_nom?: string | null;
          montant?: number;
          motif?: string | null;
          date?: string;
          mois?: string;
          annule?: boolean;
        };
      };
      companies: {
        Row: {
          id: number;
          name: string;
          slug: string;
          type: string;
          logo_url: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          type: string;
          logo_url?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          type?: string;
          logo_url?: string | null;
        };
      };
      config: {
        Row: {
          id: number;
          company_id: number;
          cle: string;
          valeur: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          cle: string;
          valeur: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          cle?: string;
          valeur?: string;
        };
      };
      livraisons: {
        Row: {
          id: number;
          company_id: number;
          colis: string;
          client_donneur: string;
          destinataire: string;
          destinataire_telephone: string;
          destinataire_lieu: string;
          agent_id: number | null;
          agent_nom: string | null;
          montant: number;
          frais: number;
          paiement: string;
          date: string;
          statut: string;
          remarque: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          colis: string;
          client_donneur: string;
          destinataire: string;
          destinataire_telephone: string;
          destinataire_lieu: string;
          agent_id?: number | null;
          agent_nom?: string | null;
          montant: number;
          frais?: number;
          paiement?: string;
          date: string;
          statut?: string;
          remarque?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          colis?: string;
          client_donneur?: string;
          destinataire?: string;
          destinataire_telephone?: string;
          destinataire_lieu?: string;
          agent_id?: number | null;
          agent_nom?: string | null;
          montant?: number;
          frais?: number;
          paiement?: string;
          date?: string;
          statut?: string;
          remarque?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recuperations: {
        Row: {
          id: number;
          company_id: number;
          date: string;
          livreur_id: number | null;
          livreur_nom: string | null;
          client_donneur: string;
          frais_recuperation: number;
        };
        Insert: {
          id?: number;
          company_id: number;
          date: string;
          livreur_id?: number | null;
          livreur_nom?: string | null;
          client_donneur: string;
          frais_recuperation?: number;
        };
        Update: {
          id?: number;
          company_id?: number;
          date?: string;
          livreur_id?: number | null;
          livreur_nom?: string | null;
          client_donneur?: string;
          frais_recuperation?: number;
        };
      };
      produits: {
        Row: {
          id: number;
          company_id: number;
          nom: string;
          reference: string | null;
          categorie: string | null;
          unite: string | null;
          prix_vente: number;
          prix_achat: number;
          quantite_stock: number;
          stock_minimum: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          nom: string;
          reference?: string | null;
          categorie?: string | null;
          unite?: string | null;
          prix_vente: number;
          prix_achat: number;
          quantite_stock?: number;
          stock_minimum?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          nom?: string;
          reference?: string | null;
          categorie?: string | null;
          unite?: string | null;
          prix_vente?: number;
          prix_achat?: number;
          quantite_stock?: number;
          stock_minimum?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ventes: {
        Row: {
          id: number;
          company_id: number;
          numero_facture: string;
          date_vente: string;
          client_nom: string;
          client_telephone: string | null;
          client_email: string | null;
          montant_ht: number;
          remise: number;
          montant_total: number;
          montant_paye: number;
          reste_a_payer: number;
          statut: string;
          type_paiement: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          numero_facture: string;
          date_vente: string;
          client_nom: string;
          client_telephone?: string | null;
          client_email?: string | null;
          montant_ht: number;
          remise?: number;
          montant_total: number;
          montant_paye?: number;
          reste_a_payer?: number;
          statut?: string;
          type_paiement: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          numero_facture?: string;
          date_vente?: string;
          client_nom?: string;
          client_telephone?: string | null;
          client_email?: string | null;
          montant_ht?: number;
          remise?: number;
          montant_total?: number;
          montant_paye?: number;
          reste_a_payer?: number;
          statut?: string;
          type_paiement?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vente_details: {
        Row: {
          id: number;
          vente_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          remise_ligne: number;
          sous_total: number;
        };
        Insert: {
          id?: number;
          vente_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          remise_ligne?: number;
          sous_total: number;
        };
        Update: {
          id?: number;
          vente_id?: number;
          produit_id?: number;
          quantite?: number;
          prix_unitaire?: number;
          remise_ligne?: number;
          sous_total?: number;
        };
      };
      achats: {
        Row: {
          id: number;
          company_id: number;
          numero_commande: string;
          date_achat: string;
          fournisseur_nom: string;
          fournisseur_contact: string | null;
          montant_ht: number;
          tva: number;
          montant_total: number;
          montant_paye: number;
          statut: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          numero_commande: string;
          date_achat: string;
          fournisseur_nom: string;
          fournisseur_contact?: string | null;
          montant_ht: number;
          tva?: number;
          montant_total: number;
          montant_paye?: number;
          statut?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          numero_commande?: string;
          date_achat?: string;
          fournisseur_nom?: string;
          fournisseur_contact?: string | null;
          montant_ht?: number;
          tva?: number;
          montant_total?: number;
          montant_paye?: number;
          statut?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      achat_details: {
        Row: {
          id: number;
          achat_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          sous_total: number;
        };
        Insert: {
          id?: number;
          achat_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          sous_total: number;
        };
        Update: {
          id?: number;
          achat_id?: number;
          produit_id?: number;
          quantite?: number;
          prix_unitaire?: number;
          sous_total?: number;
        };
      };
      mouvements_stock: {
        Row: {
          id: number;
          company_id: number;
          produit_id: number;
          type: string;
          quantite: number;
          prix_unitaire: number | null;
          montant_total: number | null;
          reference_type: string | null;
          reference_id: number | null;
          notes: string | null;
          date_mouvement: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          produit_id: number;
          type: string;
          quantite: number;
          prix_unitaire?: number | null;
          montant_total?: number | null;
          reference_type?: string | null;
          reference_id?: number | null;
          notes?: string | null;
          date_mouvement: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          produit_id?: number;
          type?: string;
          quantite?: number;
          prix_unitaire?: number | null;
          montant_total?: number | null;
          reference_type?: string | null;
          reference_id?: number | null;
          notes?: string | null;
          date_mouvement?: string;
          created_at?: string;
        };
      };
      inventaires: {
        Row: {
          id: number;
          company_id: number;
          date_debut: string;
          date_fin: string | null;
          statut: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          date_debut: string;
          date_fin?: string | null;
          statut?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          date_debut?: string;
          date_fin?: string | null;
          statut?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      inventaire_details: {
        Row: {
          id: number;
          inventaire_id: number;
          produit_id: number;
          quantite_theorique: number;
          quantite_reelle: number;
          ecart: number;
          statut: string;
          notes: string | null;
        };
        Insert: {
          id?: number;
          inventaire_id: number;
          produit_id: number;
          quantite_theorique: number;
          quantite_reelle: number;
          ecart: number;
          statut: string;
          notes?: string | null;
        };
        Update: {
          id?: number;
          inventaire_id?: number;
          produit_id?: number;
          quantite_theorique?: number;
          quantite_reelle?: number;
          ecart?: number;
          statut?: string;
          notes?: string | null;
        };
      };
      user_companies: {
        Row: {
          user_id: string;
          company_id: number;
        };
        Insert: {
          user_id: string;
          company_id: number;
        };
        Update: {
          user_id?: string;
          company_id?: number;
        };
      };
    };
  };
}
