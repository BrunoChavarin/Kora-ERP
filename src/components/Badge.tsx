import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'var(--success-light)', color: 'var(--success)' };
      case 'warning':
        return { bg: 'var(--warning-light)', color: 'var(--warning)' };
      case 'danger':
        return { bg: 'var(--danger-light)', color: 'var(--danger)' };
      default:
        return { bg: 'rgba(37, 99, 235, 0.08)', color: 'var(--brand-primary)' };
    }
  };

  const { bg, color } = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: bg,
        color: color,
        textTransform: 'capitalize',
        fontFamily: 'var(--font-sans)'
      }}
    >
      {children}
    </span>
  );
};
