import type { Company } from '@/modules/shared/context/CompanyContext';
import { getCompanyMeta } from './company';
import { CheckIcon } from '@/modules/shared/components/ui/Icons';

interface CompanySheetProps {
  companies: Company[];
  currentCompany: Company | null;
  onSelect: (company: Company) => void;
  onClose: () => void;
}

export function CompanySheet({ companies, currentCompany, onSelect, onClose }: CompanySheetProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', width: '100%', maxWidth: 480,
        borderRadius: '18px 18px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp 0.25s ease',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 4, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
          Choisir une societe
        </div>
        {companies.map(company => {
          const meta = getCompanyMeta(company);
          const isActive = currentCompany?.id === company.id;
          return (
            <button key={company.id} onClick={() => { onSelect(company); onClose(); }} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 20px',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              border: 'none', cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.15s ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: meta.bg,
                border: `1px solid ${meta.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: meta.color, flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: 'var(--text)' }}>{company.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{meta.label}</div>
              </div>
              {isActive && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon />
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
