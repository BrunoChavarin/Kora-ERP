import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
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
          cursor: 'pointer',
          ...style
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};
