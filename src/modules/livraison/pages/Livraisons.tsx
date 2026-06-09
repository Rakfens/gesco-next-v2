import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useAgents } from "@/modules/shared/hooks/useAgents";
import { useLivraisons } from "@/modules/shared/hooks/useLivraisons";
import { useToast } from "@/modules/shared/hooks/useToast";
import type { Livraison } from "@/modules/shared/types";
import { LivraisonForm } from "../components/LivraisonForm";

interface Suggestions {
  colisList: string[];
  clients: string[];
  lieux: string[];
}

/* ─── Status Button Component ─── */
const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: "var(--warning)", bg: "rgba(251,191,36,0.1)", activeBg: "rgba(251,191,36,0.2)" },
  { key: "livre", label: "Livré", color: "var(--success)", bg: "rgba(52,211,153,0.1)", activeBg: "rgba(52,211,153,0.2)" },
  { key: "reporte", label: "Reporté", color: "var(--accent2)", bg: "rgba(139,92,246,0.1)", activeBg: "rgba(139,92,246,0.2)" },
];

function StatusButtons({ livraison, onUpdate }: { livraison: Livraison; onUpdate: (id: string, statut: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STATUS_OPTIONS.map((opt) => {
        const isActive = livraison.statut === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onUpdate(livraison.id, opt.key)}
            style={{
              padding: "5px 12px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
              border: isActive ? `1px solid ${opt.color}` : "1px solid var(--border)",
              background: isActive ? opt.activeBg : "transparent",
              color: isActive ? opt.color : "var(--text-muted)",
              cursor: "pointer", transition: "all var(--transition-fast)",
              letterSpacing: "0.02em",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LivraisonsPage() {
  const { currentCompany } = useCompany();
  const { livraisons = [], loading: loadingLivraisons, addLivraison, updateLivraison } = useLivraisons();
  const { agents = [] } = useAgents();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestions>({ colisList: [], clients: [], lieux: [] });

  useEffect(() => {
    if (livraisons && livraisons.length > 0) {
      setSuggestions({
        colisList: [...new Set(livraisons.map((l) => l.colis).filter((c): c is string => !!c))],
        clients: [...new Set(livraisons.map((l) => l.client_donneur).filter((c): c is string => !!c))],
        lieux: [...new Set(livraisons.map((l) => l.destinataire_lieu).filter((l): l is string => !!l))],
      });
    }
  }, [livraisons]);

  const handleStatusUpdate = async (id: string, statut: string) => {
    try {
      await updateLivraison(id, { statut });
      showToast(`Statut mis à jour: ${STATUS_OPTIONS.find((s) => s.key === statut)?.label || statut}`);
    } catch (err: unknown) {
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  if (loadingLivraisons) {
    return <div style={{ padding: "0 0 24px", textAlign: "center", color: "var(--text-muted)" }}>Chargement des données...</div>;
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Livraisons</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                {currentCompany ? `${currentCompany.name} · ${livraisons.length} livraison(s)` : "Sélectionnez une société"}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!currentCompany && (
        <Card style={{ padding: 16, background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--warning)", textAlign: "center" }}>Veuillez sélectionner une société pour continuer.</p>
        </Card>
      )}

      {currentCompany && (
        <>
          <LivraisonForm
            agents={agents}
            onAddLivraison={async (data: Record<string, unknown>) => {
              try { await addLivraison(data); } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Erreur";
                showToast(msg, "error");
              }
            }}
            showToast={showToast}
            suggestions={suggestions}
          />

          {/* Livraison list with status buttons */}
          {livraisons.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Liste des livraisons ({livraisons.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {livraisons.map((l) => (
                  <Card key={l.id} padding={16} style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{l.colis}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          {l.date} {l.montant ? `· ${new Intl.NumberFormat("fr-MG").format(Number(l.montant))} Ar` : ""}
                        </div>
                      </div>
                      {/* Status buttons */}
                      <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
