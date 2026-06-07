"use client";

import dynamic from "next/dynamic";

const PageComponent = dynamic(() => import("@/modules/livraison/pages/Recuperation") as any, {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div>Chargement...</div>
    </div>
  ),
});

export default function Page() {
  return <PageComponent />;
}
