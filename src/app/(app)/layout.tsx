// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CompanyProvider, useCompany } from "@/modules/shared/context/CompanyContext";

export const dynamic = "force-dynamic";

// ─── Navigation config by company type ──────────────────────────
const NAV_CONFIG = {
  service: [
    { key: "dashboard",    label: "Tableau de bord", href: "/livraison/dashboard", icon: "grid" },
    { key: "livraison",    label: "Livraison",       href: "/livraison/livraisons", icon: "truck" },
    { key: "historique",   label: "Historique",      href: "/livraison/historique", icon: "clock" },
    { key: "gerant",       label: "Gérant",          href: "/livraison/gerant", icon: "user" },
    { key: "recap",        label: "Récap",           href: "/livraison/recap", icon: "chart" },
    { key: "agents",       label: "Agents",          href: "/livraison/agents", icon: "users" },
    { key: "recuperation", label: "Récupération",    href: "/livraison/recuperation", icon: "refresh" },
  ],
  commerce: [
    { key: "dashboard",  label: "Tableau de bord", href: "/commerce/dashboard", icon: "grid" },
    { key: "ventes",     label: "Ventes",           href: "/commerce/ventes", icon: "cash" },
    { key: "achats",     label: "Achats",           href: "/commerce/achats", icon: "cart" },
    { key: "stock",      label: "Stock",            href: "/commerce/stock", icon: "box" },
    { key: "inventaire", label: "Inventaire",       href: "/commerce/inventaire", icon: "list" },
    { key: "depenses",   label: "Dépenses",         href: "/commerce/depenses", icon: "wallet" },
    { key: "rapports",   label: "Rapports",         href: "/commerce/rapports", icon: "document" },
  ],
};

// ─── Icons (identiques à l'app d'origine) ───────────────────────
const Moon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const Sun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const NavIcons = {
  grid: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
  truck: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>),
  clock: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  user: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  chart: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>),
  users: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  refresh: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.74" /></svg>),
  cash: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
  cart: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>),
  box: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>),
  tags: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" /><path d="M6 9h.01" /></svg>),
  warehouse: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" /><path d="M6 18h12" /><path d="M6 14h12" /></svg>),
  list: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>),
  wallet: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>),
  document: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>),
};

// ─── Company Meta (identique à l'app d'origine) ──────────────────
const getCompanyMeta = (c) => {
  if (!c) return { label: "Gestion", color: "var(--accent)", icon: "HT", bg: "var(--accent-dim)" };
  if (c.slug === "pomanay")  return { label: "Boutique", color: "var(--purple)", icon: "PM", bg: "var(--purple-dim)" };
  if (c.slug === "zazatiana") return { label: "Bébé", color: "var(--pink)", icon: "ZT", bg: "rgba(236,72,153,0.08)" };
  return { label: "Livraison", color: "var(--accent)", icon: "AT", bg: "var(--accent-dim)" };
};

const getLogoSrc = (c) => {
  if (!c) return "/logos/aterinay/logo.png";
  if (c.slug === "pomanay")  return "/logos/pomanay/logo.png";
  if (c.slug === "zazatiana") return "/logos/zazatiana/logo.png";
  return "/logos/aterinay/logo.png";
};

// ─── Company Switcher Sheet (style app d'origine) ──────────────
function CompanySheet({ companies, currentCompany, onSelect, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--card)", width: "100%", maxWidth: 480,
        borderRadius: "18px 18px 0 0",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "var(--shadow-lg)",
        animation: "fadeUp 0.25s ease",
      }}>
        <div style={{ width: 36, height: 4, background: "var(--border2)", borderRadius: 4, margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 8px", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
          Choisir une société
        </div>
        {companies.map(company => {
          const meta = getCompanyMeta(company);
          const isActive = currentCompany?.id === company.id;
          return (
            <button key={company.id} onClick={() => { onSelect(company); onClose(); }} style={{
              display: "flex", alignItems: "center", gap: 14,
              width: "100%", padding: "14px 20px",
              background: isActive ? "var(--accent-dim)" : "transparent",
              border: "none", cursor: "pointer",
              borderBottom: "1px solid var(--border)",
              transition: "background 0.15s ease",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: meta.bg,
                border: `1px solid ${meta.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: meta.color, flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: "var(--text)" }}>{company.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{meta.label}</div>
              </div>
              {isActive && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [logoError, setLogoError] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("ht_theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ht_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }, [theme]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const navItems = currentCompany?.type === "service"
    ? NAV_CONFIG.service
    : (currentCompany?.type === "commerce" ? NAV_CONFIG.commerce : []);

  const meta = getCompanyMeta(currentCompany);
  const logoSrc = getLogoSrc(currentCompany);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderColor: "var(--border)" }}>
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b px-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{currentCompany?.name || "HT-GesCom"}</div>
              <div className="text-[10px]" style={{ color: meta.color }}>{meta.label}</div>
            </div>
          </div>
          {companies?.length > 1 && (
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:opacity-80" style={{ color: meta.color, background: meta.bg }}>
              <ChevronDown />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.href) ? "" : "hover:opacity-80"}`}
              style={isActive(item.href)
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text2)" }
              }>
              {NavIcons[item.icon]?.()}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t px-4 py-3 text-[10px] flex items-center gap-1.5" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Données sécurisées · v3.0
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ═══ HEADER (style app d'origine) ═══ */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "var(--header-h)",
          padding: "0 16px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, zIndex: 100,
          gap: 12,
        }}>
          {/* Left: Menu (mobile) + Logo + Company */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button type="button" onClick={() => setSidebarOpen(true)} style={{
                background: "none", border: "none", color: "var(--text2)", cursor: "pointer",
                padding: 4, display: "flex",
              }}>
                <MenuIcon />
              </button>
            )}

            {/* Logo société */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, overflow: "hidden",
              border: "1px solid var(--border)", background: "var(--card2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {!logoError
                ? <img src={logoSrc} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} onError={() => setLogoError(true)} />
                : <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.icon}</span>
              }
            </div>

            {/* Nom + badge */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentCompany?.name || "HT-GesCom"}
                </span>
                {companies?.length > 0 && (
                  <button onClick={() => setSheetOpen(true)} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 100,
                    background: meta.bg, border: `1px solid ${meta.color}20`,
                    color: meta.color, cursor: "pointer",
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>
                    {meta.label}
                    {companies.length > 1 && <ChevronDown />}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Aterinay Services</div>
            </div>
          </div>

          {/* Right: Theme + Logout */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button onClick={toggleTheme} title={theme === "dark" ? "Mode clair" : "Mode sombre"} style={{
              width: 36, height: 36, border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--card)", color: "var(--text2)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <button onClick={handleLogout} title="Déconnexion" style={{
              width: 36, height: 36, border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--card)", color: "var(--muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LogoutIcon />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={isMobile ? "mobile-main" : ""} style={{
          flex: 1, overflow: "auto",
          padding: isMobile ? undefined : "24px",
          background: "var(--bg)",
        }}>
          {children}
        </main>
      </div>

      {/* Company Switcher Sheet */}
      {sheetOpen && (
        <CompanySheet companies={companies} currentCompany={currentCompany} onSelect={switchCompany} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <LayoutContent>{children}</LayoutContent>
    </CompanyProvider>
  );
}
