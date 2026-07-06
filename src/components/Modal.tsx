import React, { useEffect } from 'react';
import { Portal } from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const width = size === 'sm' ? '400px' : size === 'lg' ? '800px' : '550px';

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        />

        {/* Modal Container */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-premium)',
            width: '100%',
            maxWidth: width,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100000,
            maxHeight: 'calc(100vh - 64px)',
            position: 'relative',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: 'var(--text-tertiary)'
              }}
            >
              &times;
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderBottomLeftRadius: 'var(--radius-lg)',
                borderBottomRightRadius: 'var(--radius-lg)'
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};
