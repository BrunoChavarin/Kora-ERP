import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, onFocus, onBlur, value, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.type === 'number' && (value === 0 || value === '0')) {
      e.target.select();
    }
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // If focused and value is 0, render empty string so user can type freely without a sticky 0
  const displayValue = props.type === 'number' && isFocused && (value === 0 || value === '0')
    ? ''
    : value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
