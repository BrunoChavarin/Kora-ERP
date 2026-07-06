import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-primary)',
          fontSize: '14px',
          outline: 'none',
          fontFamily: 'var(--font-sans)',
          transition: 'border-color var(--transition-fast)',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
          ...style
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};
