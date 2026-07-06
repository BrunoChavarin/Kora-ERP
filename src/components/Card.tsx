import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  style,
  onClick,
  hoverable = false
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...(hoverable && {
          transform: 'translateY(0)',
          boxShadow: 'var(--shadow-sm)',
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--shadow-md)'
          }
        }),
        ...style
      }}
    >
      {(title || subtitle) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {title && (
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </h4>
          )}
          {subtitle && (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{subtitle}</span>
          )}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
