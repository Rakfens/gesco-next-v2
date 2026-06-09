// src/modules/livraison/pages/Livraisons.tsx
// modules/livraison/pages/Livraisons.tsx — Refactorisé avec design system professionnel - Amélioré
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useAgents } from "@/modules/shared/hooks/useAgents";
import { useLivraisons } from "@/modules/shared/hooks/useLivraisons";
import { useToast } from "@/modules/shared/hooks/useToast";
import { LivraisonForm } from "../components/LivraisonForm";

// Typage pour les suggestions
interface Suggestions {
  colisList: string[];
  clients: string[];
  lieux: string[];
}

export default function LivraisonsPage() {
  const { currentCompany } = useCompany();
  const { livraisons, loading: loadingLivraisons, addLivraison } = useLivraisons();
  const { agents } = useAgents();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestions>({
    colisList: [],
    clients: [],
    lieux: [],
  });

  useEffect(() => {
    if (livraisons && livraisons.length > 0) {
      // Filtrer les valeurs undefined et créer des Sets pour éviter les doublons
      const colisList = [
        ...new Set(
          livraisons
            .map((l) => l.colis)
            .filter((c): c is string => typeof c === "string" && c.length > 0),
        ),
      ];
      const clients = [
        ...new Set(
          livraisons
            .map((l) => l.client_donneur)
            .filter((c): c is string => typeof c === "string" && c.length > 0),
        ),
      ];
      const lieux = [
        ...new Set(
          livraisons
            .map((l) => l.destinataire_lieu)
            .filter((l): l is string => typeof l === "string" && l.length > 0),
        ),
      ];

      setSuggestions({
        colisList,
        clients,
        lieux,
      });
    }
    // Si livraisons est vide, les suggestions restent vides
  }, [livraisons]);

  // Optionnel: Afficher un indicateur de chargement
  if (loadingLivraisons) {
    return (
      <div style={{ padding: "0 0 24px", textAlign: "center", color: "var(--muted)" }}>
        Chargement des données...
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1
                style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}
                data-testid="page-title"
              >
                Livraisons
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                {/* Vérifier si currentCompany est défini avant d'accéder à .name */}
                {currentCompany
                  ? `${currentCompany.name} · ${livraisons?.length || 0} livraison(s)`
                  : "Sélectionnez une société"}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Optionnel: Désactiver le formulaire si aucune société n'est sélectionnée */}
      {!currentCompany && (
        <Card
          style={{ padding: 16, backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: "var(--warning)", textAlign: "center" }}>
            Veuillez sélectionner une société pour continuer.
          </p>
        </Card>
      )}

      {currentCompany && (
        <LivraisonForm
          agents={agents}
          onAddLivraison={async (data: Record<string, unknown>) => {
            try {
              await addLivraison(data);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Erreur";
              showToast(msg, "error");
            }
          }}
          showToast={showToast}
          suggestions={suggestions}
        />
      )}
    </div>
  );
}
