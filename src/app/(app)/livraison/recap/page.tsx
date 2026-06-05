"use client";
export const dynamic = 'force-dynamic';

import { Recap } from "@/modules/livraison/pages/Recap";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, livraisons, avances, recuperations, addAgent, updateAgent, deleteAgent, addLivraison, updateLivraison, deleteLivraison, addAvance, deleteAvance, addRecuperation, updateRecuperation, deleteRecuperation, success } = useApp();
  return <Recap livraisons={livraisons} avances={avances} agents={agents} commissionGerant={500} onAddAvance={addAvance} onDeleteAvance={deleteAvance} showToast={success} />;
}
