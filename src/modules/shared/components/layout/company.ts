import type { Company } from "@/modules/shared/context/CompanyContext";

export interface CompanyMeta {
  label: string;
  color: string;
  icon: string;
  bg: string;
}

export function getCompanyMeta(c: Company | null): CompanyMeta {
  if (!c) return { label: "Gestion", color: "var(--accent)", icon: "HT", bg: "var(--accent-dim)" };
  if (c.slug === "pomanay")
    return { label: "Boutique", color: "var(--purple)", icon: "PM", bg: "var(--purple-dim)" };
  if (c.slug === "zazatiana")
    return { label: "Bebe", color: "var(--pink)", icon: "ZT", bg: "rgba(236,72,153,0.08)" };
  return { label: "Livraison", color: "var(--accent)", icon: "AT", bg: "var(--accent-dim)" };
}

export function getLogoSrc(c: Company | null): string {
  if (!c) return "/logos/aterinay/logo.png";
  if (c.slug === "pomanay") return "/logos/pomanay/logo.png";
  if (c.slug === "zazatiana") return "/logos/zazatiana/logo.png";
  return "/logos/aterinay/logo.png";
}
