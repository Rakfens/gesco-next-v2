// @ts-nocheck
// modules/shared/components/common/Modal.jsx
import { useEffect } from 'react';
import { COLORS } from '../../utils/constants';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizes = {
    small: { maxWidth: 400 },
    medium: { maxWidth: 550 },
    large: { maxWidth: 700 },
    xlarge: { maxWidth: 900 }
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleOverlayClick}
    >
      <div 
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 16,
          width: '100%',
          maxWidth: sizes[size].maxWidth,
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
      >
        {(title || showCloseButton) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)'
          }}>
            {title && (
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: '0 8px',
                  lineHeight: 1
                }}
              >
                Fermer
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

// Modal de confirmation
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmer', cancelText = 'Annuler' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <p style={{ color: 'var(--text)', marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button style={{ ...btn('var(--card2)', 'var(--card2)'), padding: '8px 16px' }} onClick={onClose}>
          {cancelText}
        </button>
        <button style={{ ...btn('var(--red)', 'var(--red2)'), padding: '8px 16px' }} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

// Modal de formulaire simple
export const FormModal = ({ isOpen, onClose, title, onSubmit, children, submitText = 'Enregistrer' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={onSubmit}>
        {children}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" style={{ ...btn('var(--card2)', 'var(--card2)'), padding: '10px 20px' }} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" style={{ ...btn('var(--green)', 'var(--green2)'), padding: '10px 20px' }}>
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
};