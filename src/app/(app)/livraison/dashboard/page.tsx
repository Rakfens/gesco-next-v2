"use client";
export const dynamic = 'force-dynamic';

import { Dashboard } from "@/modules/livraison/pages/Dashboard";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, livraisons, avances, recuperations, addAgent, updateAgent, deleteAgent, addLivraison, updateLivraison, deleteLivraison, addAvance, deleteAvance, addRecuperation, updateRecuperation, deleteRecuperation, success } = useApp();
  return <Dashboard agents={agents} livraisons={livraisons} commissionGerant={500} onNavigate={() => {}} />;
}
