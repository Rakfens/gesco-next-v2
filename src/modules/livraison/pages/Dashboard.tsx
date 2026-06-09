import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input,
  SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT, currentMonth, EXCLUDED_CLIENTS,
  formatAr, monthLabel, shouldCountGerantCommission, TODAY,
} from "@/modules/shared/utils/constants";

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

interface RecupParLivreur {
  livreur: string;
  total: number;
  nb: number;
  details: { client: string; frais: number }[];
}

export default function Dashboard() {
  const { agents = [], livraisons = [], showToast } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [errorRecup, setErrorRecup] = useState<string | null>(null);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const {
    enCours, todayLivraisons, livsGerant, gerantGain, excludedToday,
  } = useMemo(() => {
    const todayLivs = safeLivraisons.filter((l) => l.date === TODAY());
    const enCours = todayLivs.filter((l) => l.statut === "en_cours").length;
    const livsGerant = todayLivs.filter((l) => shouldCountGerantCommission(l));
    const gerantGain = livsGerant.length * commissionGerant;
    const excludedToday = todayLivs.filter(
      (l) => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || "")
        && (Number(l.frais) || 0) > 0,
    );
    return { enCours, todayLivraisons: todayLivs, livsGerant, gerantGain, excludedToday };
  }, [safeLivraisons]);

  useEffect(() => {
    const loadRecuperations = async () => {
      setLoadingRecup(true); setErrorRecup(null);
      try {
        const { getRecuperationsByDate: fetchRecup } = await import("../services/recuperationService");
        const data = await fetchRecup(selectedDate);
        setRecuperationsJour(data || []);
      } catch (error: unknown) {
        logger.error("Erreur chargement récupérations:", error);
        setErrorRecup("Erreur lors du chargement des récupérations.");
      } finally {
        setLoadingRecup(false);
      }
    };
    loadRecuperations();
  }, [selectedDate]);

  const {
    totalRecuperationsJour, nbRecuperationsJour, recuperationsParLivreur,
  } = useMemo(() => {
    const total = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
    const nb = recuperationsJour.length;
    const parLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
      acc[nom].total += r.frais_recuperation ?? 0;
      acc[nom].nb += 1;
      acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
      return acc;
    }, {} as Record<string, RecupParLivreur>);
    return { totalRecuperationsJour: total, nbRecuperationsJour: nb, recuperationsParLivreur: parLivreur };
  }, [recuperationsJour]);

  const agentStats = useMemo(() => {
    return safeAgents.map((a) => {
      const ls = safeLivraisons.filter((l) => agentMatch(l, a));
      const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
      const livres = ls.filter((l) => l.statut === "livre").length;
      const retournes = ls.filter((l) => l.statut === "retourne").length;
      const reportes = ls.filter((l) => l.statut === "reporte").length;
      return {
        agent: a, ls, totalFrais, livres, retournes, reportes,
        taux: ls.length ? Math.round((livres / ls.length) * 100) : 0,
      };
    });
  }, [safeAgents, safeLivraisons]);

  const totalLivraisons = safeLivraisons.length;
  const totalLivres = safeLivraisons.filter((l) => l.statut === "livre").length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Tableau de bord
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          {currentCompany?.name || "HT-GesCom"} · Aperçu de l'activité · {TODAY()}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 14, marginBottom: 28,
      }}>
        <StatCard label="Total livraisons" value={totalLivraisons} color="var(--accent)" />
        <StatCard label="En cours" value={enCours} color="var(--warning)" />
        <StatCard label="Livrés aujourd'hui" value={todayLivraisons.filter((l) => l.statut === "livre").length} color="var(--success)" />
        <StatCard label="Taux réussite" value={`${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`} color="var(--success)" />
      </div>

      {/* Récupérations */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div>
            <CardTitle>Récupérations matinales</CardTitle>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
              {formatAr(totalRecuperationsJour)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {nbRecuperationsJour} récupération(s)
            </div>
          </div>
          <Input
            type="date"
            label="Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </CardHeader>

        {loadingRecup && <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />}

        {errorRecup && (
          <div style={{ padding: 16, color: "var(--danger)", textAlign: "center" }}>{errorRecup}</div>
        )}

        {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: 14,
            }}>
              {Object.values(recuperationsParLivreur).map((rl) => (
                <div key={rl.livreur} style={{
                  background: "var(--bg)", borderRadius: "var(--radius-lg)", padding: 16,
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{rl.livreur}</span>
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>
                      {rl.nb} récup. · {formatAr(rl.total)}
                    </span>
                  </div>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{
                      display: "flex", justifyContent: "space-between", padding: "6px 0",
                      borderBottom: idx < rl.details.length - 1 ? "1px solid var(--border)" : "none", fontSize: 12,
                    }}>
                      <span style={{ color: "var(--text-secondary)" }}>{d.client}</span>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>{formatAr(d.frais)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loadingRecup && !errorRecup && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>
              Aucune récupération pour cette date.
            </div>
          )
        )}
      </Card>

      {/* Commission gérant */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,169,110,0.08), rgba(139,92,246,0.08))",
        border: "1px solid rgba(201,169,110,0.15)", borderRadius: "var(--radius-lg)",
        padding: "24px 28px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Gérant — Aujourd'hui
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
            {formatAr(gerantGain)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {livsGerant.length} livraisons × {formatAr(commissionGerant)}
          </div>
          {excludedToday.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 4 }}>
              {excludedToday.length} livraison(s) exclue(s)
            </div>
          )}
        </div>
        <Button variant="primary" onClick={() => {}}>
          Voir détails →
        </Button>
      </div>

      {/* Récap par agent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Récap par agent</h2>
        <Badge variant="default" size="sm">Tous temps</Badge>
      </div>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {safeAgents.length === 0 ? (
            <Card padding={24}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Aucun agent enregistré.
              </div>
            </Card>
          ) : (
            agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <Card key={agent.id} padding={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 16, color: "#08080c",
                  }}>
                    {agent.nom?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{agent.nom}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ls.length} livraisons</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Livrés", value: livres, color: "var(--success)" },
                    { label: "Retournés", value: retournes, color: "var(--danger)" },
                    { label: "Reportés", value: reportes, color: "var(--accent2)" },
                    { label: "Frais", value: formatAr(totalFrais), color: "var(--accent)" },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: "center", background: "var(--bg)", borderRadius: "var(--radius-md)", padding: "10px 4px" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${taux}%`, height: "100%", background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)", borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Agent</TableHeader>
              <TableHeader align="center">Total</TableHeader>
              <TableHeader align="center">Livrés</TableHeader>
              <TableHeader align="center">Retournés</TableHeader>
              <TableHeader align="center">Reportés</TableHeader>
              <TableHeader align="right">Frais</TableHeader>
              <TableHeader align="center">Taux</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <TableRow key={agent.id}>
                <TableCell style={{ fontWeight: 600 }}>{agent.nom}</TableCell>
                <TableCell align="center" style={{ fontWeight: 700 }}>{ls.length}</TableCell>
                <TableCell align="center"><Badge variant="success" size="sm">{livres}</Badge></TableCell>
                <TableCell align="center"><Badge variant="danger" size="sm">{retournes}</Badge></TableCell>
                <TableCell align="center"><Badge variant="purple" size="sm">{reportes}</Badge></TableCell>
                <TableCell align="right" style={{ color: "var(--accent)", fontWeight: 600 }}>{formatAr(totalFrais)}</TableCell>
                <TableCell align="center">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${taux}%`, height: "100%", background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{taux}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
