// @ts-nocheck
// useAppState.js — persiste page ET société active dans sessionStorage
// sessionStorage survit à la réduction iOS Safari (contrairement à la mémoire React)

const PAGE_KEY    = 'ht_page';
const COMPANY_KEY = 'ht_company_id';

export function saveAppState(page, companyId) {
  try {
    if (page)      sessionStorage.setItem(PAGE_KEY, page);
    if (companyId) sessionStorage.setItem(COMPANY_KEY, companyId);
  } catch (_) {}
}

export function loadSavedPage() {
  try { return sessionStorage.getItem(PAGE_KEY) || 'dashboard'; }
  catch (_) { return 'dashboard'; }
}

export function loadSavedCompanyId() {
  try { return sessionStorage.getItem(COMPANY_KEY) || null; }
  catch (_) { return null; }
}

export function clearAppState() {
  try { sessionStorage.removeItem(PAGE_KEY); sessionStorage.removeItem(COMPANY_KEY); }
  catch (_) {}
}
