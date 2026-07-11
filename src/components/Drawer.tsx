import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, footer, maxWidth }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end'
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
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Drawer Body */}
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth || '460px',
          height: '100%',
          background: '#ffffff',
          boxShadow: 'var(--shadow-premium)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          position: 'relative',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

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
              gap: '12px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
