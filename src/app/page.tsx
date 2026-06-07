"use client";

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}

export const dynamic = "force-dynamic";
