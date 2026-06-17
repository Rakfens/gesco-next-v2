// src/modules/shared/components/ui/Modal.tsx
import { useEffect, type MouseEvent, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

/* ─── Modal ─── */
interface ModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  onOpenChange,
  title,
  children,
  width = 480,
  footer,
}: ModalProps) {
  const handleClose = onClose || (onOpenChange ? () => onOpenChange(false) : undefined);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm animate-fade-in"
    onClick={handleClose}
    >
    <div
    className="w-full max-h-[90vh] overflow-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] animate-scale-in"
    style={{ maxWidth: width }}
    onClick={(e: MouseEvent) => e.stopPropagation()}
    >
    {title && (
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
      <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
      {handleClose && (
        <button
        type="button"
        onClick={handleClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-faint)] transition-all duration-150 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
        >
        <CloseIcon size={14} />
        </button>
      )}
      </div>
    )}
    <div className="p-5">{children}</div>
    {footer && (
      <div className="flex justify-end gap-2 rounded-b-2xl border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-3">
      {footer}
      </div>
    )}
    </div>
    </div>
  );
}

export default Modal;

/* ─── Sous-composants ─── */
interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-[var(--border-default)] px-5 py-4">
    <div>
    <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
    {subtitle && (
      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>
    )}
    </div>
    {onClose && (
      <button
      type="button"
      onClick={onClose}
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-faint)] transition-all duration-150 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] shrink-0 ml-3"
      >
      <CloseIcon size={14} />
      </button>
    )}
    </div>
  );
}

interface ModalTitleProps {
  children: ReactNode;
}

export function ModalTitle({ children }: ModalTitleProps) {
  return (
    <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
    {children}
    </h3>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 rounded-b-2xl border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-3">
    {children}
    </div>
  );
}
