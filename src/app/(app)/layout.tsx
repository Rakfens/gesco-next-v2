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
    { key: "produits",   label: "Produits",         href: "/commerce/produits", icon: "box" },
    { key: "categories", label: "Catégories",       href: "/commerce/categories", icon: "tags" },
    { key: "clients",    label: "Clients",           href: "/commerce/clients", icon: "users" },
    { key: "stock",      label: "Stock",            href: "/commerce/stock", icon: "warehouse" },
    { key: "inventaire", label: "Inventaire",       href: "/commerce/inventaire", icon: "list" },
    { key: "depenses",   label: "Dépenses",         href: "/commerce/depenses", icon: "wallet" },
    { key: "rapports",   label: "Rapports",         href: "/commerce/rapports", icon: "document" },
  ],
};

// ─── SVG Icons ──────────────────────────────────────────────────
const Icons = {
  grid: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
  truck: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>),
  clock: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
  user: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  chart: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>),
  users: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  refresh: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.74" /></svg>),
  cash: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
  cart: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>),
  box: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>),
  tags: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" /><path d="M6 9h.01" /></svg>),
  warehouse: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" /><path d="M6 18h12" /><path d="M6 14h12" /></svg>),
  list: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>),
  wallet: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>),
  document: () => (<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>),
  chevronDown: () => (<svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>),
  logout: () => (<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  menu: () => (<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>),
};

const getCompanyMeta = (c) => {
  if (!c) return { label: "Gestion", color: "#6366f1", icon: "HT" };
  if (c.slug === "pomanay") return { label: "Boutique", color: "#10b981", icon: "PM" };
  if (c.slug === "zazatiana") return { label: "Bébé", color: "#ec4899", icon: "ZT" };
  return { label: "Livraison", color: "#6366f1", icon: "AT" };
};

// ─── Company Switcher Sheet ────────────────────────────────────
function CompanySheet({ companies, currentCompany, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card border border-border shadow-2xl" onClick={e => e.stopPropagation()} style={{ animation: "slideUp 0.25s ease" }}>
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-muted-foreground/30" />
        <div className="px-5 pt-4 pb-2 text-sm font-semibold text-muted-foreground">Choisir une société</div>
        {companies.map(company => {
          const meta = getCompanyMeta(company);
          const isActive = currentCompany?.id === company.id;
          return (
            <button key={company.id} onClick={() => { onSelect(company); onClose(); }}
              className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors border-b border-border last:border-0 ${isActive ? "bg-accent/10" : "hover:bg-accent/5"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: meta.color + "15", color: meta.color }}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${isActive ? "text-foreground" : "text-foreground/80"}`}>{company.name}</div>
                <div className="text-xs text-muted-foreground">{meta.label}</div>
              </div>
              {isActive && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              )}
            </button>
          );
        })}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    })();
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const navItems = currentCompany?.type === "service" ? NAV_CONFIG.service : (currentCompany?.type === "commerce" ? NAV_CONFIG.commerce : []);
  const meta = getCompanyMeta(currentCompany);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar header with company */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ background: meta.color + "15", color: meta.color }}>
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{currentCompany?.name || "GesCo"}</div>
              <div className="text-[10px] text-muted-foreground">{meta.label}</div>
            </div>
          </div>
          {companies?.length > 1 && (
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-accent/10" style={{ color: meta.color }}>
              <Icons.chevronDown />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              {Icons[item.icon]?.()}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t px-4 py-3 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Données sécurisées
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          {isMobile && (
            <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Icons.menu />
            </button>
          )}
          <div className="hidden lg:block" />
          <div className="relative">
            <button type="button" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent" onClick={() => setUserMenuOpen(p => !p)}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "?"}
              </span>
              <span className="hidden sm:block">{userEmail ?? "Utilisateur"}</span>
              <Icons.chevronDown />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-card py-1 shadow-lg">
                  <button type="button" className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent" onClick={handleLogout}>
                    <Icons.logout /> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
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
