// src/modules/livraison/components/LivraisonForm.jsx — Design system professionnel
import { useState } from "react";
import { Button, Card, Input, Select } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { ToastType } from "@/modules/shared/hooks/useToast";
import { PAIE_MODES, STATUTS, TODAY } from "@/modules/shared/utils/constants";

interface StatusButtonProps {
  mode: { key: string; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}
const StatusButton = ({ mode, active, onClick }: StatusButtonProps) => (
  <button
    onClick={onClick}
    data-testid={`paiement-mode-${mode.key}`}
    style={{
      padding: "10px 8px",
      border: `2px solid ${active ? "var(--accent)" : "var(--border2)"}`,
      borderRadius: 9,
      background: active ? "var(--accent-dim)" : "var(--bg)",
      color: active ? "var(--accent)" : "var(--subtle)",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      textAlign: "center",
      transition: "all 0.15s ease",
      flex: 1,
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: active ? "var(--accent)" : "var(--border2)",
        color: active ? "#fff" : "var(--subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
        flexShrink: 0,
      }}
    >
      {mode.icon}
    </div>
    <div style={{ marginTop: 2 }}>{mode.label}</div>
  </button>
);

interface LivraisonFormProps {
  agents: Array<{ id: string; nom: string }>;
  onAddLivraison: (data: Record<string, unknown>) => Promise<void>;
  showToast: (msg: string, type?: ToastType, duration?: number) => number;
  suggestions?: { colisList?: string[]; clients?: string[]; lieux?: string[] };
}

interface FormState {
  colis: string;
  client_donneur: string;
  destinataire: string;
  destinataire_telephone: string;
  destinataire_lieu: string;
  agentId: string;
  agent_nom: string;
  montant: string;
  frais: string;
  paiement: string;
  date: string;
  statut: string;
  remarque: string;
}

export const LivraisonForm = ({
  agents,
  onAddLivraison,
  showToast,
  suggestions,
}: LivraisonFormProps) => {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<FormState>({
    colis: "",
    client_donneur: "",
    destinataire: "",
    destinataire_telephone: "",
    destinataire_lieu: "",
    agentId: "",
    agent_nom: "",
    montant: "",
    frais: "",
    paiement: "espece",
    date: TODAY(),
    statut: "en_cours",
    remarque: "",
  });

  const handleSubmit = async () => {
    if (!form.colis || !form.client_donneur || !form.destinataire || !form.agentId || !form.date) {
      showToast("Colis, client donneur, destinataire, livreur et date requis", "error");
      return;
    }

    const selectedAgent = agents.find((a) => a.id === form.agentId);
    const agent_nom = selectedAgent?.nom || "—";

    const livraisonData = {
      colis: form.colis,
      client_donneur: form.client_donneur,
      destinataire: form.destinataire,
      destinataire_telephone: form.destinataire_telephone,
      destinataire_lieu: form.destinataire_lieu,
      agent_id: parseInt(form.agentId, 10),
      agent_nom: agent_nom,
      montant: form.paiement === "client" ? 0 : parseFloat(form.montant) || 0,
      frais: parseFloat(form.frais) || 0,
      paiement: form.paiement,
      date: form.date,
      statut: form.statut,
      company_id: currentCompany?.id,
    };

    await onAddLivraison(livraisonData);
    setForm({
      colis: "",
      client_donneur: "",
      destinataire: "",
      destinataire_telephone: "",
      destinataire_lieu: "",
      agentId: "",
      agent_nom: "",
      montant: "",
      frais: "",
      paiement: "espece",
      date: TODAY(),
      statut: "en_cours",
      remarque: "",
    });
    showToast("Livraison enregistrée");
  };

  const grid2 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 };

  const _paiementOptions = Object.entries(PAIE_MODES).map(([key, val]) => ({
    value: key,
    label: val.label,
    icon: val.icon,
  }));

  const paiementObj = Object.entries(PAIE_MODES).map(([key, val]) => ({
    key,
    label: val.label,
    icon: val.icon,
  }));

  const statutOptions = Object.entries(STATUTS).map(([key, val]) => ({
    value: key,
    label: val.label,
  }));

  const agentOptions = agents.map((a) => ({ value: String(a.id), label: a.nom }));

  return (
    <div>
      <div style={{ marginBottom: 20 }} data-testid="livraison-form-page">
        <h1
          style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}
        >
          Nouvelle livraison
          {currentCompany && (
            <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>
              {" "}
              · {currentCompany.name}
            </span>
          )}
        </h1>
      </div>

      <Card padding={isMobile ? 14 : 18}>
        <div style={grid2}>
          <Input
            label="Nom du colis"
            placeholder="Ex: Téléphone"
            value={form.colis}
            onChange={(e) => setForm({ ...form, colis: e.target.value })}
            list="colis-list"
          />
          <datalist id="colis-list">
            {suggestions?.colisList?.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <Input
            label="Montant (Ar)"
            type="number"
            placeholder="50000"
            value={form.montant}
            onChange={(e) => setForm({ ...form, montant: e.target.value })}
            disabled={form.paiement === "client"}
          />
        </div>

        {/* Client donneur */}
        <div
          style={{ background: "var(--blue-dim)", borderRadius: 10, padding: 12, marginBottom: 12 }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--blue)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}
          >
            Client donneur
          </div>
          <Input
            placeholder="Ex: SARL TECH"
            value={form.client_donneur}
            onChange={(e) => setForm({ ...form, client_donneur: e.target.value })}
            list="client-list"
          />
          <datalist id="client-list">
            {suggestions?.clients?.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Destinataire */}
        <div
          style={{
            background: "var(--teal-dim, rgba(20,184,166,0.08))",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--teal)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}
          >
            Destinataire
          </div>
          <div style={grid2}>
            <Input
              placeholder="Ex: Jean RAZAFY"
              value={form.destinataire}
              onChange={(e) => setForm({ ...form, destinataire: e.target.value })}
              list="destinataire-list"
            />
            <datalist id="destinataire-list" />
            <Input
              type="tel"
              placeholder="034 00 000 00"
              value={form.destinataire_telephone}
              onChange={(e) => setForm({ ...form, destinataire_telephone: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <Input
              placeholder="Ex: Analakely, Antaninarenina..."
              value={form.destinataire_lieu}
              onChange={(e) => setForm({ ...form, destinataire_lieu: e.target.value })}
              list="lieu-list"
            />
            <datalist id="lieu-list">
              {suggestions?.lieux?.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div style={grid2}>
          <Select
            label="Livreur"
            value={form.agentId}
            onChange={(e) => {
              const agentId = e.target.value;
              const agent = agents.find((a) => a.id === agentId);
              setForm({ ...form, agentId, agent_nom: agent?.nom || "" });
            }}
            options={agentOptions}
            placeholder="-- Choisir --"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {/* Mode de paiement */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text2)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Mode de paiement
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${paiementObj.length}, 1fr)`,
              gap: 8,
            }}
          >
            {paiementObj.map((mode) => (
              <StatusButton
                key={mode.key}
                mode={mode}
                active={form.paiement === mode.key}
                onClick={() => setForm({ ...form, paiement: mode.key })}
              />
            ))}
          </div>
        </div>

        <Input
          label="Frais de livraison (Ar)"
          type="number"
          placeholder="3000"
          value={form.frais}
          onChange={(e) => setForm({ ...form, frais: e.target.value })}
        />

        <div style={{ marginTop: 12 }}>
          <Select
            label="Statut"
            value={form.statut}
            onChange={(e) => setForm({ ...form, statut: e.target.value })}
            options={statutOptions}
          />
        </div>

        {/* Remarque motif — visible si retourné ou reporté */}
        {(form.statut === "retourne" || form.statut === "reporte") && (
          <div style={{ marginTop: 12 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text2)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {form.statut === "retourne" ? "Motif du retour *" : "Motif du report"}
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "10px 14px",
                minHeight: 70,
                background: "var(--card)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "var(--font)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              value={form.remarque || ""}
              onChange={(e) => setForm({ ...form, remarque: e.target.value })}
              placeholder={
                form.statut === "retourne"
                  ? "Ex: Destinataire absent, adresse incorrecte..."
                  : "Ex: Reporté au lendemain..."
              }
            />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            data-testid="btn-submit-livraison"
          >
            Enregistrer la livraison
          </Button>
        </div>
      </Card>
    </div>
  );
};
