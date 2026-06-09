"use client";

// useAppState.ts — persiste page ET société active dans sessionStorage
// sessionStorage survit à la réduction iOS Safari (contrairement à la mémoire React)

const PAGE_KEY = "ht_page";
const COMPANY_KEY = "ht_company_id";

export function saveAppState(page: string, companyId: string): void {
  try {
    if (page) sessionStorage.setItem(PAGE_KEY, page);
    if (companyId) sessionStorage.setItem(COMPANY_KEY, companyId);
  } catch (_) {}
}

export function loadSavedPage(): string {
  try {
    return sessionStorage.getItem(PAGE_KEY) || "dashboard";
  } catch (_) {
    return "dashboard";
  }
}

export function loadSavedCompanyId(): string | null {
  try {
    return sessionStorage.getItem(COMPANY_KEY) || null;
  } catch (_) {
    return null;
  }
}

export function clearAppState(): void {
  try {
    sessionStorage.removeItem(PAGE_KEY);
    sessionStorage.removeItem(COMPANY_KEY);
  } catch (_) {}
}
