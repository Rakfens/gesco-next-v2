"use client";
export const dynamic = 'force-dynamic';

import { Agents } from "@/modules/livraison/pages/Agents";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, livraisons, avances, recuperations, addAgent, updateAgent, deleteAgent, addLivraison, updateLivraison, deleteLivraison, addAvance, deleteAvance, addRecuperation, updateRecuperation, deleteRecuperation, success } = useApp();
  return <Agents agents={agents} onAddAgent={addAgent} onUpdateAgent={updateAgent} onDeleteAgent={deleteAgent} showToast={success} />;
}
