"use client";

import { Gerant } from "@/modules/livraison/pages/Gerant";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, livraisons, avances, recuperations, addAgent, updateAgent, deleteAgent, addLivraison, updateLivraison, deleteLivraison, addAvance, deleteAvance, addRecuperation, updateRecuperation, deleteRecuperation, success } = useApp();
  return <Gerant livraisons={livraisons} commissionGerant={500} onUpdateCommission={async () => success('Commission mise à jour')} showToast={success} />;
}
