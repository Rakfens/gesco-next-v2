// @ts-nocheck
// companyLogo.js — source de vérité unique pour les logos par société
// Les logos sont dans /public/logos/{slug}/logo.png

export const getLogoPath = (company) => {
  if (!company) return '/logos/aterinay/logo.png';
  if (company.logo_url) return company.logo_url; // logo custom uploadé
  const slug = company.slug || '';
  if (slug === 'pomanay')  return '/logos/pomanay/logo.png';
  if (slug === 'zazatiana') return '/logos/zazatiana/logo.png';
  // Aterinay et tout service de livraison
  return '/logos/aterinay/logo.png';
};

export const getCompanyMeta = (company) => {
  if (!company) return { label:'Livraison', color:'var(--blue)', icon:'LIV', bg:'var(--blue-dim)' };
  if (company.slug === 'pomanay')  return { label:'Boutique', color:'var(--purple)', icon:'POM', bg:'var(--purple-dim)' };
  if (company.slug === 'zazatiana') return { label:'Bébé',    color:'var(--pink)',   icon:'ZAZ', bg:'rgba(244,114,182,0.12)' };
  return { label:'Livraison', color:'var(--blue)', icon:'LIV', bg:'var(--blue-dim)' };
};
