import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  ...props
}) => {
  const getStyles = () => {
    let background = 'var(--brand-primary)';
    let color = '#ffffff';
    let border = 'none';
    let hoverBg = 'var(--brand-primary-hover)';

    if (variant === 'secondary') {
      background = 'var(--bg-secondary)';
      color = 'var(--text-primary)';
      hoverBg = 'var(--bg-tertiary)';
    } else if (variant === 'outline') {
      background = 'transparent';
      color = 'var(--text-primary)';
      border = '1px solid var(--border-primary)';
      hoverBg = 'var(--bg-secondary)';
    } else if (variant === 'danger') {
      background = 'var(--danger)';
      color = '#ffffff';
      hoverBg = '#dc2626';
    }

    let padding = '8px 16px';
    let fontSize = '14px';

    if (size === 'sm') {
      padding = '4px 8px';
      fontSize = '12px';
    } else if (size === 'lg') {
      padding = '12px 24px';
      fontSize = '16px';
    }

    return {
      background,
      color,
      border,
      padding,
      fontSize,
      borderRadius: 'var(--radius-sm)',
      fontWeight: 500,
      cursor: loading || props.disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'var(--font-sans)',
      transition: 'all var(--transition-fast)',
      opacity: props.disabled || loading ? 0.6 : 1,
      outline: 'none',
      ':hover': {
        background: hoverBg
      },
      ...style
    };
  };

  return (
    <button style={getStyles()} disabled={props.disabled || loading} {...props}>
      {loading && (
        <svg
          style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && <span>{icon}</span>}
      {children}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
