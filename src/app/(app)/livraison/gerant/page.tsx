// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabase, getCurrentCompany } from '@/lib/supabase';
import { formatAr, TODAY, currentMonth } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell } from "@/modules/shared/components/ui";

const COMMISSION_DEFAUT = 500;
const EXCLUDED_CLIENTS = ["POMANAY", "ZAZATIANA"];

const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const mois = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return `${mois[parseInt(mo) - 1]} ${y}`;
};

const isCommissionEligible = (livraison) => {
  const hasFrais = parseFloat(livraison.frais || 0) > 0;
  if (!hasFrais) return false;
  const client = (livraison.client_donneur || "").toUpperCase();
  return !EXCLUDED_CLIENTS.includes(client);
};

export default function GerantPage() {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) setCurrentCompany(company);
  }, []);

  useEffect(() => {
    if (!currentCompany) return;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await getSupabase().from("livraisons").select("*")
          .eq("company_id", currentCompany.id)
          .gte("date", `${selectedMonth}-01`)
          .lte("date", `${selectedMonth}-31`)
          .order("date", { ascending: false });
        if (error) throw error;
        setLivraisons(data || []);
      } catch (err) {
        setLivraisons([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentCompany, selectedMonth]);

  const stats = useMemo(() => {
    const totalLivraisons = livraisons.length;
    const totalFrais = livraisons.reduce((s, l) => s + parseFloat(l.frais || 0), 0);
    const eligible = livraisons.filter(isCommissionEligible);
    const commissionGerantTotal = eligible.length * COMMISSION_DEFAUT;
    const excludedCount = livraisons.filter(l => parseFloat(l.frais || 0) > 0 && EXCLUDED_CLIENTS.includes((l.client_donneur || "").toUpperCase())).length;
    return { totalLivraisons, totalFrais, commissionCount: eligible.length, commissionGerantTotal, excludedCount };
  }, [livraisons]);

  const monthOptions = useMemo(() => {
    const s = new Set(livraisons.map(l => l.date?.slice(0, 7)).filter(Boolean));
    s.add(currentMonth());
    return [...s].sort().reverse();
  }, [livraisons]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Commission Gérant</h1>
          <p className="text-sm text-muted-foreground mt-1">Commission : {formatAr(COMMISSION_DEFAUT)} par livraison éligible</p>
          <p className="text-xs text-orange-500 mt-1">Clients exclus : {EXCLUDED_CLIENTS.join(", ")}</p>
        </div>
        <Button onClick={() => window.print()} variant="outline">Imprimer</Button>
      </div>

      <div className="w-full sm:w-64">
        <label className="text-sm font-medium">Mois</label>
        <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Livraisons</p>
          <p className="text-2xl font-bold mt-1">{stats.totalLivraisons}</p>
          <p className="text-xs text-muted-foreground mt-1">{monthLabel(selectedMonth)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Frais</p>
          <p className="text-2xl font-bold mt-1 text-orange-500">{formatAr(stats.totalFrais)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Commission Gérant</p>
          <p className="text-2xl font-bold mt-1 text-pink-500">{formatAr(stats.commissionGerantTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.commissionCount} × {formatAr(COMMISSION_DEFAUT)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Exclues</p>
          <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.excludedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{EXCLUDED_CLIENTS.join(", ")}</p>
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader className="mb-4">
          <CardTitle className="text-lg font-bold">Détail — {monthLabel(selectedMonth)}</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
          </div>
        ) : livraisons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucune livraison.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Colis</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Destinataire</TableCell>
                  <TableCell className="text-right">Frais</TableCell>
                  <TableCell>Commission</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {livraisons.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{l.date || "—"}</TableCell>
                    <TableCell className="font-medium">{l.colis || "—"}</TableCell>
                    <TableCell>{l.client_donneur || "—"}</TableCell>
                    <TableCell>{l.destinataire || "—"}</TableCell>
                    <TableCell className="text-right">{formatAr(parseFloat(l.frais || 0))}</TableCell>
                    <TableCell>
                      {isCommissionEligible(l) ? <Badge variant="success">Oui</Badge> : <Badge variant="secondary">Non</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
