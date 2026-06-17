// src/modules/shared/components/ui/StatCard.tsx
import type { ReactNode } from "react";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  sub?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  color?: string;
  loading?: boolean;
  className?: string;
}

const colorClassesMap: Record<string, {
  iconBg: string;
  iconText: string;
  gradient: string;
}> = {
  blue:     { iconBg: "bg-[var(--info)]/10",     iconText: "text-[var(--info)]",     gradient: "bg-gradient-to-r from-[var(--info)] to-[var(--violet)]" },
  green:    { iconBg: "bg-[var(--success)]/10",  iconText: "text-[var(--success)]",  gradient: "bg-gradient-to-r from-[var(--success)] to-emerald-600" },
  red:      { iconBg: "bg-[var(--danger)]/10",    iconText: "text-[var(--danger)]",    gradient: "bg-gradient-to-r from-[var(--danger)] to-red-600" },
  orange:   { iconBg: "bg-[var(--warning)]/10",   iconText: "text-[var(--warning)]",   gradient: "bg-gradient-to-r from-[var(--warning)] to-amber-600" },
  purple:   { iconBg: "bg-[var(--violet)]/10",   iconText: "text-[var(--violet)]",   gradient: "bg-gradient-to-r from-[var(--violet)] to-violet-600" },
  cyan:     { iconBg: "bg-[var(--info)]/10",      iconText: "text-[var(--info)]",      gradient: "bg-gradient-to-r from-[var(--info)] to-sky-500" },
  teal:     { iconBg: "bg-teal-500/10",           iconText: "text-teal-400",           gradient: "bg-gradient-to-r from-teal-400 to-teal-600" },
  accent:   { iconBg: "bg-[var(--gold)]/10",      iconText: "text-[var(--gold)]",      gradient: "bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold-dark)]" },
  success:  { iconBg: "bg-[var(--success)]/10",   iconText: "text-[var(--success)]",   gradient: "bg-gradient-to-r from-[var(--success)] to-emerald-600" },
  warning:  { iconBg: "bg-[var(--warning)]/10",   iconText: "text-[var(--warning)]",   gradient: "bg-gradient-to-r from-[var(--warning)] to-amber-600" },
  danger:   { iconBg: "bg-[var(--danger)]/10",     iconText: "text-[var(--danger)]",     gradient: "bg-gradient-to-r from-[var(--danger)] to-red-600" },
  info:     { iconBg: "bg-[var(--info)]/10",       iconText: "text-[var(--info)]",       gradient: "bg-gradient-to-r from-[var(--info)] to-sky-500" },
  accent2:  { iconBg: "bg-[var(--violet)]/10",     iconText: "text-[var(--violet)]",     gradient: "bg-gradient-to-r from-[var(--violet)] to-violet-600" },
};

function resolveColorClasses(color: string) {
  return colorClassesMap[color] || {
    iconBg: "bg-[var(--bg-elevated)]",
    iconText: "text-[var(--text-muted)]",
    gradient: "bg-gradient-to-r from-[var(--text-muted)] to-[var(--text-faint)]",
  };
}

export function StatCard({
  title,
  label,
  value,
  subtitle,
  sub,
  icon,
  trend,
  color = "accent",
  loading = false,
  className = "",
}: StatCardProps) {
  const c = resolveColorClasses(color);
  const subText = subtitle || sub;
  const displayTitle = title || label;

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-sm)] ${className}`}>
      <div className="animate-pulse bg-[var(--bg-elevated)] mb-3 h-3 w-3/5 rounded" />
      <div className="animate-pulse bg-[var(--bg-elevated)] mb-2 h-7 w-2/5 rounded" />
      <div className="animate-pulse bg-[var(--bg-elevated)] h-2.5 w-4/5 rounded" />
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-active)] hover:shadow-[var(--shadow-md)] hover:bg-[var(--bg-card-hover)] ${className}`}>
    {/* Top gradient line */}
    <div className={`absolute left-0 right-0 top-0 h-[3px] ${c.gradient}`} />

    <div className="mb-3.5 flex items-start justify-between">
    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
    {displayTitle}
    </span>
    {icon && (
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} ${c.iconText}`}>
      {icon}
      </div>
    )}
    </div>

    <div className="text-[28px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
    {value}
    </div>

    {(subText || trend) && (
      <div className="mt-2 flex items-center gap-1.5">
      {trend && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend.value >= 0 ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}>
        {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
        </span>
      )}
      {subText && <span className="text-xs text-[var(--text-faint)]">{subText}</span>}
      </div>
    )}
    </div>
  );
}

export default StatCard;
