import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Portal/Overlay for toasts */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              pointerEvents: 'auto',
              background: '#ffffff',
              borderLeft: `4px solid ${
                toast.type === 'success'
                  ? 'var(--success)'
                  : toast.type === 'warning'
                  ? 'var(--warning)'
                  : toast.type === 'danger'
                  ? 'var(--danger)'
                  : 'var(--brand-primary)'
              }`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              minWidth: '280px',
              maxWidth: '380px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              animation: 'fadeIn 0.2s ease-out forwards',
              fontFamily: 'var(--font-sans)'
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{toast.title}</span>
            {toast.message && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {toast.message}
              </span>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
