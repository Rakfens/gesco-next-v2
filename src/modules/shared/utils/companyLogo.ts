// companyLogo.ts — source de vérité unique pour les logos par société
import { type Company } from '@/modules/shared/types';

export const getLogoPath = (company: Company | null): string => {
  if (!company) return '/logos/aterinay/logo.png';
  if (company.logo_url) return String(company.logo_url);
  const slug = company.slug || '';
  if (slug === 'pomanay') return '/logos/pomanay/logo.png';
  if (slug === 'zazatiana') return '/logos/zazatiana/logo.png';
  return '/logos/aterinay/logo.png';
};

interface CompanyMeta {
  label: string;
  color: string;
  icon: string;
  bg: string;
}

export const getCompanyMeta = (company: Company | null): CompanyMeta => {
  if (!company) return { label: 'Livraison', color: 'var(--blue)', icon: 'LIV', bg: 'var(--blue-dim)' };
  if (company.slug === 'pomanay') return { label: 'Boutique', color: 'var(--purple)', icon: 'POM', bg: 'var(--purple-dim)' };
  if (company.slug === 'zazatiana') return { label: 'Bébé', color: 'var(--pink)', icon: 'ZAZ', bg: 'rgba(244,114,182,0.12)' };
  return { label: 'Livraison', color: 'var(--blue)', icon: 'LIV', bg: 'var(--blue-dim)' };
};
