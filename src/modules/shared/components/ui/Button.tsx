// src/modules/shared/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "success" | "danger" | "warning" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

/* ─── Spinner colors by variant ─── */
const spinnerMap: Record<<ButtonVariant, string> = {
  primary:   "border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)]",
  success:   "border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)]",
  danger:    "border-white/30 border-t-white",
  warning:   "border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)]",
  secondary: "border-[var(--text-muted)]/40 border-t-[var(--text-primary)]",
  ghost:     "border-[var(--text-muted)]/40 border-t-[var(--text-primary)]",
  outline:   "border-[var(--gold)]/30 border-t-[var(--gold)]",
};

const variantMap: Record<<ButtonVariant, string> = {
  primary:
  "bg-[var(--gold)] text-[var(--bg-primary)] border-transparent shadow-[0_2px_8px_rgba(201,169,110,0.25)] hover:bg-[var(--gold-light)] hover:shadow-[0_4px_16px_rgba(201,169,110,0.35)] active:bg-[var(--gold-dark)]",
  success:
  "bg-[var(--success)] text-[var(--bg-primary)] border-transparent shadow-[0_2px_8px_rgba(52,211,153,0.25)] hover:bg-[var(--success)]/90 hover:shadow-[0_4px_16px_rgba(52,211,153,0.35)] active:bg-[var(--success)]/80",
  danger:
  "bg-[var(--danger)] text-white border-transparent shadow-[0_2px_8px_rgba(248,113,113,0.25)] hover:bg-[var(--danger)]/90 hover:shadow-[0_4px_16px_rgba(248,113,113,0.35)] active:bg-[var(--danger)]/80",
  warning:
  "bg-[var(--warning)] text-[var(--bg-primary)] border-transparent shadow-[0_2px_8px_rgba(251,191,36,0.25)] hover:bg-[var(--warning)]/90 hover:shadow-[0_4px_16px_rgba(251,191,36,0.35)] active:bg-[var(--warning)]/80",
  secondary:
  "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-active)] active:bg-[var(--bg-elevated)]",
  ghost:
  "bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] active:bg-[var(--bg-elevated)]",
  outline:
  "bg-transparent text-[var(--gold)] border-[1.5px] border-[var(--border-default)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 active:bg-[var(--gold)]/10",
};

const sizeMap: Record<<ButtonSize, string> = {
  sm: "h-8 px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "h-[38px] px-4 py-2 text-[13px] rounded-[10px] gap-1.5",
  lg: "h-11 px-5 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon = null,
  iconRight = null,
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const spinner = spinnerMap[variant];

  return (
    <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? "w-full" : "w-auto"} ${className}`}
    {...props}
    >
    {loading ? (
      <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${spinner}`} />
    ) : (
      icon
    )}
    {children}
    {iconRight}
    </button>
  );
}

export default Button;
