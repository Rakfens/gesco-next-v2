"use client";

import { Recuperation } from "@/modules/livraison/pages/Recuperation";
import { useApp } from "@/modules/shared/context/AppContext";

export default function Page() {
  const { agents, success } = useApp();
  return <Recuperation agents={agents} showToast={success} />;
}
