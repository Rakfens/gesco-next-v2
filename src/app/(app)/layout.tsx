// src/app/(app)/layout.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { CompanySheet } from "@/modules/shared/components/layout/CompanySheet";
import { getCompanyMeta } from "@/modules/shared/components/layout/company";
import { NAV_CONFIG } from "@/modules/shared/components/layout/navConfig";
import { AppProvider } from "@/modules/shared/context/AppContext";
import { CompanyProvider, useCompany } from "@/modules/shared/context/CompanyContext";

/* ─── Icons ─── */
const SvgIcon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d={d} />
  </svg>
);

const NavIcon = ({ icon }: { icon: string }) => {
  const icons: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    truck: "M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M9 17a2 2 0 004 0m0 0h6a2 2 0 002-2v-4M5 17a2 2 0 000 4m14 0a2 2 0 000-4",
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    chart: "M18 20V10M12 20V4M6 20v-6",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
    refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9",
    cash: "M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19",
    cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z",
    box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7L12 12l8.7-5M12 22V12",
    package: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-2M21 12v7a2 2 0 01-2 2h-2",
    document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  };
  return <SvgIcon d={icons[icon] || icons.grid} />;
};

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <line x1="3" y1="6" x2="21" y2="6" />
  <line x1="3" y1="12" x2="21" y2="12" />
  <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Layout Content ─── */
function LayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  const navItems =
  currentCompany?.type === "service"
  ? NAV_CONFIG.service
  : currentCompany?.type === "commerce"
  ? NAV_CONFIG.commerce
  : [];

  const meta = getCompanyMeta(currentCompany);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const activeItem = navItems.find((i) => isActive(i.href));
  const pageTitle = activeItem?.label || "Tableau de bord";

  return (
    <div className="flex h-screen font-sans bg-[var(--bg-primary)]">
    {/* Mobile Overlay */}
    <div
    className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-all duration-300 lg:hidden ${
      sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
    onClick={() => setSidebarOpen(false)}
    />

    {/* ═══════════════════════════════════════
      SIDEBAR
      ═══════════════════════════════════════ */}
      <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] border-r border-[var(--border-default)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      >
      {/* Brand */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-[var(--border-default)]">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold-dark)] flex items-center justify-center text-lg font-black text-[var(--bg-primary)] shadow-[var(--shadow-gold)]">
      G
      </div>
      <div>
      <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight">GesCo</div>
      <div className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">Aterinay Services</div>
      </div>
      </div>

      {/* Company Selector */}
      {currentCompany && (
        <div className="py-3.5 px-[18px]">
        <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-active)] group"
        >
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[var(--gold)] to-[var(--violet)] flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-md">
        {meta.icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
        <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
        {currentCompany.name}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">{meta.label}</div>
        </div>
        {companies && companies.length > 1 && (
          <ChevronDownIcon />
        )}
        </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
          key={item.href}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
            active
            ? "bg-[var(--gold)]/10 text-[var(--gold)] font-semibold shadow-[var(--shadow-gold)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          }`}
          >
          <span
          className={`transition-colors duration-200 ${
            active ? "text-[var(--gold)]" : "text-[var(--text-faint)] group-hover:text-[var(--text-secondary)]"
          }`}
          >
          <NavIcon icon={item.icon} />
          </span>
          <span className="truncate">{item.label}</span>
          {active && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold-glow)] shrink-0" />
          )}
          </Link>
        );
      })}
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-[var(--border-default)] py-4 px-5">
      <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 py-2 px-3.5 rounded-lg bg-[var(--danger)]/[0.06] border border-[var(--danger)]/[0.1] text-[var(--danger)] text-xs font-medium cursor-pointer w-full transition-all duration-200 hover:bg-[var(--danger)]/[0.12] active:scale-[0.98]"
      >
      <LogoutIcon />
      Déconnexion
      </button>
      </div>
      </aside>

      {/* ═══════════════════════════════════════
        MAIN AREA
        ═══════════════════════════════════════ */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-7 bg-[var(--bg-secondary)]/60 backdrop-blur-xl border-b border-[var(--border-default)] sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
        {/* Mobile Menu Toggle */}
        <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-1.5 rounded-lg flex lg:hidden hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
        >
        <MenuIcon />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] min-w-0">
        <span className="text-[var(--gold)] font-semibold truncate">
        {currentCompany?.name || "GesCo"}
        </span>
        <span className="text-[var(--text-faint)]">/</span>
        <span className="text-[var(--text-primary)] font-semibold truncate">
        {pageTitle}
        </span>
        </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 py-[5px] pl-1.5 pr-3.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--violet)] flex items-center justify-center text-xs font-extrabold text-[var(--bg-primary)]">
        A
        </div>
        <span className="text-[13px] font-semibold text-[var(--text-primary)] hidden sm:inline">
        Admin
        </span>
        </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-7 bg-[var(--bg-primary)]">
        <div className="animate-fade-up max-w-[1600px] mx-auto">
        {children}
        </div>
        </main>
        </div>

        {/* Company Sheet Modal */}
        {sheetOpen && (
          <CompanySheet
          companies={companies}
          currentCompany={currentCompany}
          onSelect={switchCompany}
          onClose={() => setSheetOpen(false)}
          />
        )}
        </div>
  );
}

/* ─── App Layout Wrapper ─── */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
    <AppProvider>
    <LayoutContent>{children}</LayoutContent>
    </AppProvider>
    </CompanyProvider>
  );
}
