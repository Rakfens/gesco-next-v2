"use client";
export const dynamic = 'force-dynamic';

import { Historique } from "@/modules/livraison/pages/Historique";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, livraisons, updateLivraison, deleteLivraison, success } = useApp();
  return <Historique livraisons={livraisons} agents={agents} onUpdateLivraison={updateLivraison} onDeleteLivraison={deleteLivraison} showToast={success} logoUrl={undefined} />;
}
