import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
