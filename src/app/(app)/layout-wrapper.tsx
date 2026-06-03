// @ts-nocheck
"use client";

import { CompanyProvider } from "@/modules/shared/context/CompanyContext";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CompanyProvider>{children}</CompanyProvider>;
}
