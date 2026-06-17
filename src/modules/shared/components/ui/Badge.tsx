// src/modules/shared/components/ui/Badge.tsx
import type { ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "danger" | "warning" | "info" | "purple";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantMap: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
    dot: "bg-[var(--text-faint)]",
  },
  primary: {
    container: "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/15",
    dot: "bg-[var(--gold)]",
  },
  success: {
    container: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/15",
    dot: "bg-[var(--success)]",
  },
  danger: {
    container: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/15",
    dot: "bg-[var(--danger)]",
  },
  warning: {
    container: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/15",
    dot: "bg-[var(--warning)]",
  },
  info: {
    container: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/15",
    dot: "bg-[var(--info)]",
  },
  purple: {
    container: "bg-[var(--violet)]/10 text-[var(--violet)] border-[var(--violet)]/15",
    dot: "bg-[var(--violet)]",
  },
};

const sizeMap = {
  sm: "px-2 py-[3px] text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  const v = variantMap[variant];
  const s = sizeMap[size];

  return (
    <span
    className={`inline-flex items-center rounded-full border font-semibold leading-none ${v.container} ${s} ${className}`}
    >
    {dot && (
      <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${v.dot} ${variant === "default" ? "" : "shadow-[0_0_6px_currentColor]"}`} />
    )}
    <span className="truncate">{children}</span>
    </span>
  );
}

export type { BadgeVariant };
export default Badge;
