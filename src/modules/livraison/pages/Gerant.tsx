import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle,
  Input, Select, StatCard, Table, TableBody, TableCell,
  TableFooter, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import {
  CURRENT_MONTH, EXCLUDED_CLIENTS, formatAr, monthLabel,
  shouldCountGerantCommission, TODAY,
} from "@/modules/shared/utils/constants";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  pink: "#f472b6", pinkDim: "rgba(244,114,182,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

type TabKey = "jour" | "mois";

export default function Gerant() {
  const { livraisons, commissionGerant: globalCommissionGerant, updateCommission: onUpdateCommission, showToast } = useApp();
  const isMobile = useIsMobile();
  const [editCommission, setEditCommission] = useState(false);
  const [tmpCommission, setTmpCommission] = useState<number>(globalCommissionGerant);
  const [gerantTab, setGerantTab] = useState<TabKey>("jour");
  const [gerantDate, setGerantDate] = useState<string>(TODAY());
  const [gerantMonth, setGerantMonth] = useState<string>(CURRENT_MONTH());

  useEffect(() => {
    if (!editCommission) setTmpCommission(globalCommissionGerant);
  }, [globalCommissionGerant, editCommission]);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  const livsGerant = (arr: Livraison[]) => arr.filter((l) => shouldCountGerantCommission(l));

  // Jour
  const dayLivs = useMemo(() => livsGerant(safeLivraisons.filter((l) => l.date === gerantDate)), [safeLivraisons, gerantDate]);
  const dayCount = dayLivs.length;
  const dayGain = dayCount * globalCommissionGerant;
  const dayFraisTotal = dayLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
  const dayNet = dayFraisTotal - dayGain;
  const dayExcluded = safeLivraisons.filter((l) => l.date === gerantDate && EXCLUDED_CLIENTS.includes((l.client_donneur || "").toUpperCase()) && (Number(l.frais) || 0) > 0);

  // Mois
  const monthLivs = useMemo(() => livsGerant(safeLivraisons.filter((l) => l.date?.startsWith(gerantMonth))), [safeLivraisons, gerantMonth]);
  const monthCount = monthLivs.length;
  const monthGain = monthCount * globalCommissionGerant;
  const monthFrais = monthLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
  const monthByDay = useMemo(() => {
    const map: Record<string, { date: string; count: number; gain: number; frais: number }> = {};
    monthLivs.forEach((l) => {
      if (!map[l.date]) map[l.date] = { date: l.date, count: 0, gain: 0, frais: 0 };
      map[l.date].count++;
      map[l.date].gain += globalCommissionGerant;
      map[l.date].frais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthLivs, globalCommissionGerant]);

  const handleUpdateCommission = async () => {
    try {
      if (onUpdateCommission) await onUpdateCommission(tmpCommission);
      showToast("Commission mise à jour");
    } catch (e: unknown) { logger.error("Erreur commission:", e); showToast("Erreur", "error"); }
    setEditCommission(false);
  };

  const months = useMemo(() => {
    const s = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(CURRENT_MONTH());
    return [...s].sort().reverse() as string[];
  }, [safeLivraisons]);

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.pink} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Gérant</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>
              Commission : {formatAr(globalCommissionGerant)} par livraison
            </p>
          </div>
        </div>
      </div>

      {/* ══ COMMISSION CARD ══ */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.pink, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Commission par livraison
            </div>
            {editCommission ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Input type="number" value={String(tmpCommission)} onChange={(e) => setTmpCommission(parseFloat(e.target.value) || 0)} style={{ width: 120 }} />
                <Button variant="success" size="sm" onClick={handleUpdateCommission}>Sauver</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditCommission(false)}>Annuler</Button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: C.pink }}>{formatAr(globalCommissionGerant)}</span>
                <Button variant="ghost" size="sm" onClick={() => { setTmpCommission(globalCommissionGerant); setEditCommission(true); }}>Modifier</Button>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
            <div>Commission sur toutes les livraisons</div>
            <div>Dès que les frais sont payés</div>
            {EXCLUDED_CLIENTS.length > 0 && <div style={{ color: C.warning, marginTop: 2 }}>Exclus : {EXCLUDED_CLIENTS.join(", ")}</div>}
          </div>
        </div>
      </Card>

      {/* ══ TABS ══ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["jour", "mois"] as const).map((tab) => (
          <button key={tab} onClick={() => setGerantTab(tab)}
            style={{
              padding: "8px 20px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: gerantTab === tab ? `1.5px solid ${C.pink}` : "1.5px solid var(--border)",
              background: gerantTab === tab ? C.pinkDim : "transparent",
              color: gerantTab === tab ? C.pink : "var(--text-muted)",
              cursor: "pointer", transition: "all var(--transition-fast)", fontFamily: "var(--font)",
            }}
          >
            {tab === "jour" ? "Par jour" : "Par mois"}
          </button>
        ))}
      </div>

      {/* ══ TAB JOUR ══ */}
      {gerantTab === "jour" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input label="Sélectionner une date" type="date" value={gerantDate} onChange={(e) => setGerantDate(e.target.value)}
              style={isMobile ? undefined : { maxWidth: 220 }} />
          </div>

          {dayExcluded.length > 0 && (
            <Card style={{ marginBottom: 14, background: C.warningDim, border: `1px solid ${C.warning}30` }}>
              <div style={{ fontSize: 11, color: C.warning, fontWeight: 600 }}>
                ⚠️ {dayExcluded.length} livraison(s) exclue(s) — clients {EXCLUDED_CLIENTS.join(", ")}
              </div>
            </Card>
          )}

          {/* Stats jour */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <StatCard label="Gain du jour" value={formatAr(dayGain)} color={C.pink} icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.pink} />} />
            <StatCard label="Livraisons" value={dayCount} color={C.gold} icon={<Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={18} color={C.gold} />} />
            <StatCard label="Frais collectés" value={formatAr(dayFraisTotal)} color={C.violet} icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} color={C.violet} />} />
            <StatCard label="Frais nets" value={formatAr(dayNet)} color={dayNet >= 0 ? C.success : C.danger} icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} color={dayNet >= 0 ? C.success : C.danger} />} />
          </div>

          {dayLivs.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>#</TableHeader>
                  <TableHeader>Colis</TableHeader>
                  <TableHeader>Client donneur</TableHeader>
                  <TableHeader>Destinataire</TableHeader>
                  <TableHeader>Agent</TableHeader>
                  <TableHeader align="right">Frais</TableHeader>
                  <TableHeader align="right">Commission</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {dayLivs.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>{l.colis}</TableCell>
                    <TableCell>{l.client_donneur}</TableCell>
                    <TableCell>{l.destinataire}</TableCell>
                    <TableCell>{l.agent_nom}</TableCell>
                    <TableCell align="right" style={{ color: C.violet, fontWeight: 600 }}>{formatAr(Number(l.frais) || 0)}</TableCell>
                    <TableCell align="right" style={{ color: C.pink, fontWeight: 600 }}>{formatAr(globalCommissionGerant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableCell colSpan={5} style={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: C.violet }}>{formatAr(dayFraisTotal)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: C.pink }}>{formatAr(dayGain)}</TableCell>
              </TableFooter>
            </Table>
          ) : (
            <Card padding={32}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>💰</div>
                Aucune livraison avec commission ce jour.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ TAB MOIS ══ */}
      {gerantTab === "mois" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Select label="Sélectionner un mois" value={gerantMonth} onChange={(e) => setGerantMonth(e.target.value)}
              style={isMobile ? undefined : { maxWidth: 220 }}
              options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          </div>

          {/* Stats mois */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
            <StatCard label={`Gain total — ${monthLabel(gerantMonth)}`} value={formatAr(monthGain)} color={C.pink}
              icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color={C.pink} />} />
            <StatCard label="Frais collectés" value={formatAr(monthFrais)} color={C.violet}
              icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} color={C.violet} />} />
          </div>

          {monthByDay.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader align="center">Livraisons</TableHeader>
                  <TableHeader align="right">Frais collectés</TableHeader>
                  <TableHeader align="right">Gain gérant</TableHeader>
                  <TableHeader align="right">Frais nets</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthByDay.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell style={{ fontWeight: 600 }}>{d.date}</TableCell>
                    <TableCell align="center"><Badge variant="default" size="sm">{d.count}</Badge></TableCell>
                    <TableCell align="right" style={{ color: C.violet, fontWeight: 600 }}>{formatAr(d.frais)}</TableCell>
                    <TableCell align="right" style={{ color: C.pink, fontWeight: 600 }}>{formatAr(d.gain)}</TableCell>
                    <TableCell align="right" style={{ color: d.frais - d.gain >= 0 ? C.success : C.danger, fontWeight: 600 }}>{formatAr(d.frais - d.gain)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableCell style={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="center" style={{ fontWeight: 700 }}>{monthCount}</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: C.violet }}>{formatAr(monthFrais)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: C.pink }}>{formatAr(monthGain)}</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: monthFrais - monthGain >= 0 ? C.success : C.danger }}>{formatAr(monthFrais - monthGain)}</TableCell>
              </TableFooter>
            </Table>
          ) : (
            <Card padding={32}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>💰</div>
                Aucune livraison avec commission ce mois-ci.
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
