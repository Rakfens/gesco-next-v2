// Gerant.tsx — Refactorisé avec design system professionnel - Amélioré
import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  Input,
  Select,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import {
  CURRENT_MONTH,
  EXCLUDED_CLIENTS,
  formatAr,
  monthLabel,
  shouldCountGerantCommission,
} from "@/modules/shared/utils/constants";

type TabKey = "jour" | "mois";

export default function Gerant() {
  const {
    livraisons,
    commissionGerant: globalCommissionGerant,
    updateCommission: onUpdateCommission,
    showToast,
  } = useApp(); // Supposons updateCommission
  // Suppression de la gestion locale de la commission
  // const [localCommission, setLocalCommission] = useState<number>(commissionGerant);

  const isMobile = useIsMobile();
  const [editCommission, setEditCommission] = useState(false);
  const [tmpCommission, setTmpCommission] = useState<number>(globalCommissionGerant); // Etat temporaire pendant l'édition

  const [gerantTab, setGerantTab] = useState<TabKey>("jour");
  const [gerantDate, setGerantDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [gerantMonth, setGerantMonth] = useState<string>(CURRENT_MONTH());

  // Mise à jour de tmpCommission si la commission globale change pendant l'édition
  useEffect(() => {
    if (!editCommission) {
      setTmpCommission(globalCommissionGerant);
    }
  }, [globalCommissionGerant, editCommission]);

  // Fonction pour calculer les livraisons du gérant
  const livsGerant = (arr: Livraison[]) => arr.filter((l) => shouldCountGerantCommission(l));

  // Calculs pour la vue "jour"
  const { dayLivs, dayCount, dayGain, dayFraisTotal, dayNet, dayExcluded } = useMemo(() => {
    const dayLivs = livsGerant(livraisons.filter((l) => l.date === gerantDate));
    const dayCount = dayLivs.length;
    const dayGain = dayCount * globalCommissionGerant; // Utiliser la commission globale
    const dayFraisTotal = dayLivs.reduce(
      (s, l: Livraison) =>
        s + (typeof l.frais === "number" ? l.frais : parseFloat(String(l.frais || 0))),
      0,
    );
    const dayNet = dayFraisTotal - dayGain;

    const dayExcluded = livraisons.filter(
      (l) =>
        l.date === gerantDate &&
        EXCLUDED_CLIENTS.includes((l.client_donneur || "").toUpperCase()) &&
        (typeof l.frais === "number" ? l.frais : parseFloat(String(l.frais || 0))) > 0,
    );

    return { dayLivs, dayCount, dayGain, dayFraisTotal, dayNet, dayExcluded };
  }, [livraisons, gerantDate, globalCommissionGerant, livsGerant]);

  // Calculs pour la vue "mois"
  const { monthLivs, monthCount, monthGain, monthFrais, monthByDay } = useMemo(() => {
    const monthLivs = livsGerant(livraisons.filter((l) => l.date?.startsWith(gerantMonth)));
    const monthCount = monthLivs.length;
    const monthGain = monthCount * globalCommissionGerant; // Utiliser la commission globale
    const monthFrais = monthLivs.reduce(
      (s, l: Livraison) =>
        s + (typeof l.frais === "number" ? l.frais : parseFloat(String(l.frais || 0))),
      0,
    );

    const monthByDay = monthLivs.reduce(
      (acc: Record<string, { date: string; count: number; gain: number }>, l) => {
        if (!acc[l.date]) acc[l.date] = { date: l.date, count: 0, gain: 0 };
        acc[l.date].count++;
        acc[l.date].gain += globalCommissionGerant; // Utiliser la commission globale
        return acc;
      },
      {},
    );
    const sortedDays = Object.values(monthByDay).sort((a, b) => b.date.localeCompare(a.date));

    return { monthLivs, monthCount, monthGain, monthFrais, monthByDay: sortedDays };
  }, [livraisons, gerantMonth, globalCommissionGerant, livsGerant]);

  // Calcul des mois disponibles
  const months = useMemo(() => {
    const s = new Set(livraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(CURRENT_MONTH());
    return [...s].sort().reverse();
  }, [livraisons]);

  const handleUpdateCommission = async () => {
    // Appeler la fonction de mise à jour dans useApp
    if (onUpdateCommission) {
      try {
        await onUpdateCommission(tmpCommission);
        showToast("Commission mise à jour");
      } catch (error: unknown) {
        logger.error("Erreur lors de la mise à jour de la commission:", error);
        showToast("Erreur lors de la mise à jour de la commission.", "error");
      }
    }
    setEditCommission(false);
  };

  const statutBadge = (statut: string) => {
    const variants: Record<string, BadgeVariant> = {
      livre: "success",
      en_cours: "primary",
      retourne: "danger",
      reporte: "default",
      livre_partiel: "warning",
    };
    const labels: Record<string, string> = {
      livre: "Livré",
      en_cours: "En cours",
      retourne: "Retourné",
      reporte: "Reporté",
      livre_partiel: "Partiel",
    };
    return <Badge variant={variants[statut] || "default"}>{labels[statut] || statut}</Badge>;
  };

  const monthOptions = useMemo(
    () => months.map((m) => ({ value: m, label: monthLabel(m) })),
    [months],
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "jour", label: "Par jour" },
    { key: "mois", label: "Par mois" },
  ];

  return (
    <div data-testid="gerant-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}
        >
          Gérant
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Commission : {formatAr(globalCommissionGerant)} par livraison (dès que les frais sont
          payés) {/* Utiliser la commission globale */}
        </p>
        {EXCLUDED_CLIENTS.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--orange)", marginTop: 4 }}>
            Clients exclus : {EXCLUDED_CLIENTS.join(", ")} (pas de commission)
          </p>
        )}
      </div>

      {/* Commission card */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Commission par livraison
            </div>
            {editCommission ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Input
                  type="number"
                  value={String(tmpCommission)} // Utiliser l'état temporaire
                  onChange={(e) => setTmpCommission(parseFloat(e.target.value) || 0)}
                  style={{ width: 140 }}
                  aria-label="Entrez la nouvelle commission du gérant"
                />
                <Button variant="success" size="sm" onClick={handleUpdateCommission}>
                  Sauver
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditCommission(false)}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: "var(--pink)" }}>
                  {formatAr(globalCommissionGerant)}
                </span>{" "}
                {/* Utiliser la commission globale */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTmpCommission(globalCommissionGerant);
                    setEditCommission(true);
                  }}
                >
                  {" "}
                  {/* Initialiser tmp avec la globale */}
                  Modifier
                </Button>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
            <div>Commission sur toutes les livraisons</div>
            <div>Dès que les frais sont payés (montant &gt; 0)</div>
            <div>Sauf pour les clients : {EXCLUDED_CLIENTS.join(", ")}</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: "var(--card)",
          borderRadius: 12,
          padding: 4,
          border: "1px solid var(--border)",
        }}
      >
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={gerantTab === tab.key ? "primary" : "ghost"}
            size="sm"
            onClick={() => setGerantTab(tab.key)}
            style={{ flex: 1 }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ====== TAB JOUR ====== */}
      {gerantTab === "jour" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input
              label="Sélectionner une date"
              type="date"
              value={gerantDate}
              onChange={(e) => setGerantDate(e.target.value)}
              style={isMobile ? undefined : { maxWidth: 220 }}
              aria-label="Sélectionnez une date pour voir les détails du gérant"
            />
          </div>

          {dayExcluded.length > 0 && (
            <Card
              style={{
                marginBottom: 16,
                background: "var(--orange-dim)",
                borderColor: "var(--orange)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--orange)", fontWeight: 600 }}>
                {dayExcluded.length} livraison(s) exclue(s) de la commission (clients{" "}
                {EXCLUDED_CLIENTS.join(", ")})
              </div>
            </Card>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2,1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <Card
              style={{
                background: "linear-gradient(135deg, var(--card2), var(--bg))",
                border: "1px solid var(--purple)",
                gridColumn: "1/-1",
              }}
            >
              <div
                style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700, marginBottom: 6 }}
              >
                GAIN DU GÉRANT — {gerantDate}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
                {formatAr(dayGain)}
              </div>{" "}
              {/* Utiliser le gain calculé */}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {dayCount} livraisons × {formatAr(globalCommissionGerant)}
              </div>{" "}
              {/* Utiliser la commission globale */}
            </Card>
            <StatCard value={dayCount} label="Livraisons avec commission" color="blue" />
            <StatCard value={formatAr(dayGain)} label="Gain gérant" color="purple" />
            <StatCard value={formatAr(dayFraisTotal)} label="Frais collectés" color="orange" />
            <StatCard
              value={formatAr(dayNet)}
              label="Frais nets (frais - commission)"
              color={dayNet >= 0 ? "green" : "red"}
            />
          </div>

          {dayLivs.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}
              >
                Détail des livraisons avec commission — {gerantDate}
              </div>
              <Table>
                <TableHead>
                  <TableHeader>#</TableHeader>
                  <TableHeader>Colis</TableHeader>
                  <TableHeader>Client donneur</TableHeader>
                  <TableHeader>Destinataire</TableHeader>
                  <TableHeader>Agent</TableHeader>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader align="right">Frais</TableHeader>
                  <TableHeader align="right">Commission</TableHeader>
                </TableHead>
                <TableBody>
                  {dayLivs.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{l.colis}</TableCell>
                      <TableCell>{l.client_donneur}</TableCell>
                      <TableCell>{l.destinataire}</TableCell>
                      <TableCell>{l.agent_nom}</TableCell>
                      <TableCell>{statutBadge(String(l.statut))}</TableCell>
                      <TableCell align="right" style={{ color: "var(--orange)" }}>
                        {formatAr(
                          typeof l.frais === "number" ? l.frais : parseFloat(String(l.frais || 0)),
                        )}
                      </TableCell>
                      <TableCell align="right">{formatAr(globalCommissionGerant)}</TableCell>{" "}
                      {/* Utiliser la commission globale */}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <td
                    colSpan={6}
                    style={{
                      padding: "10px 12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      fontSize: 11,
                    }}
                  >
                    TOTAL
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--orange)",
                    }}
                  >
                    {formatAr(dayFraisTotal)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--pink)",
                    }}
                  >
                    {formatAr(dayGain)}
                  </td>
                </TableFooter>
              </Table>
            </div>
          )}
          {dayLivs.length === 0 && (
            <Card style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}>
              Aucune livraison avec commission ce jour.
            </Card>
          )}
        </div>
      )}

      {/* ====== TAB MOIS ====== */}
      {gerantTab === "mois" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Sélectionner un mois"
              value={gerantMonth}
              onChange={(e) => setGerantMonth(e.target.value)}
              options={monthOptions}
              style={isMobile ? undefined : { maxWidth: 220 }}
              aria-label="Sélectionnez un mois pour voir les détails du gérant"
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700, marginBottom: 4 }}
                >
                  GAIN TOTAL GÉRANT — {monthLabel(gerantMonth)}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
                  {formatAr(monthGain)}
                </div>{" "}
                {/* Utiliser le gain calculé */}
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {monthCount} livraisons × {formatAr(globalCommissionGerant)}
                </div>{" "}
                {/* Utiliser la commission globale */}
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
                <div>
                  Frais collectés: <b style={{ color: "var(--orange)" }}>{formatAr(monthFrais)}</b>
                </div>
                <div>
                  Frais nets:{" "}
                  <b style={{ color: "var(--green)" }}>{formatAr(monthFrais - monthGain)}</b>
                </div>
              </div>
            </div>
          </Card>

          {monthByDay.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}
              >
                Détail jour par jour — {monthLabel(gerantMonth)}
              </div>
              <Table>
                <TableHead>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Livraisons avec commission</TableHeader>
                  <TableHeader align="right">Gain gérant</TableHeader>
                </TableHead>
                <TableBody>
                  {monthByDay.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell style={{ fontWeight: 600 }}>{d.date}</TableCell>
                      <TableCell>
                        <Badge variant="info">{d.count}</Badge>
                      </TableCell>
                      <TableCell align="right">
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--pink)" }}>
                          {formatAr(d.gain)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <td
                    style={{
                      padding: "11px 14px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      fontSize: 11,
                    }}
                  >
                    TOTAL DU MOIS
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--blue)" }}>
                    {monthCount}
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      textAlign: "right",
                      fontWeight: 900,
                      color: "var(--pink)",
                      fontSize: 15,
                    }}
                  >
                    {formatAr(monthGain)}
                  </td>
                </TableFooter>
              </Table>
            </div>
          )}
          {monthByDay.length === 0 && (
            <Card style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}>
              Aucune livraison avec commission ce mois.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
