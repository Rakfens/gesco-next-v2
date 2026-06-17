// src/modules/shared/components/ui/Card.tsx
import type { MouseEventHandler, ReactNode } from "react";

/* ─── Card ─── */
interface CardProps {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  hover?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
  xl: "p-7",
};

export function Card({
  children,
  padding = "md",
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  const paddingClass = typeof padding === "string" ? paddingMap[padding] : "";
  const inlinePadding = typeof padding === "number" ? padding : undefined;

  return (
    <div
    onClick={onClick}
    style={inlinePadding !== undefined ? { padding: inlinePadding } : undefined}
    className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] transition-all duration-200 ease-out ${
      hover
      ? "hover:border-[var(--border-active)] hover:shadow-[var(--shadow-md)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
      : ""
    } ${onClick ? "cursor-pointer" : ""} ${paddingClass} ${className}`}
    >
    {children}
    </div>
  );
}

/* ─── SectionHeader ─── */
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 ${className}`}>
    <div>
    <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
    {title}
    </h2>
    {subtitle && (
      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>
    )}
    </div>
    {action}
    </div>
  );
}

/* ─── CardHeader ─── */
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
    {children}
    </div>
  );
}

/* ─── CardTitle ─── */
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={`text-sm font-bold tracking-tight text-[var(--text-primary)] ${className}`}>
    {children}
    </h3>
  );
}

/* ─── CardContent ─── */
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

/* ─── CardFooter ─── */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-3 flex justify-end gap-2 border-t border-[var(--border-default)] pt-3 ${className}`}>
    {children}
    </div>
  );
}

export default Card;
