import { Badge } from './Badge';
import type { BadgeVariant } from './Badge';

const STATUT_CONFIG: Record<string, { variant: BadgeVariant; label: string }> = {
  // Livraison statuts
  livre:          { variant: 'success', label: 'Livre' },
  en_cours:       { variant: 'warning', label: 'En cours' },
  retourne:       { variant: 'danger',  label: 'Retourne' },
  reporte:        { variant: 'purple',  label: 'Reporte' },
  livre_partiel:  { variant: 'warning', label: 'Partiel' },
  // Paiement statuts
  paye:           { variant: 'success', label: 'Paye' },
  credit:         { variant: 'warning', label: 'Credit' },
  en_attente:     { variant: 'info',    label: 'En attente' },
  annule:         { variant: 'danger',  label: 'Annule' },
};

interface StatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUT_CONFIG[status || ''] || { variant: 'default' as BadgeVariant, label: status || 'Inconnu' };
  return <Badge variant={cfg.variant} size={size}>{cfg.label}</Badge>;
}
