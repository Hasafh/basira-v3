import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANTS = {
  primary:   { background: 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', border: 'none' },
  secondary: { background: '#F4F3EF', color: 'rgba(10,12,18,0.6)', border: '1px solid rgba(10,12,18,0.1)' },
  ghost:     { background: 'transparent', color: 'rgba(10,12,18,0.5)', border: '1px solid rgba(10,12,18,0.08)' },
  danger:    { background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' },
};

const SIZES = {
  sm: { fontSize: 11, padding: '5px 12px', borderRadius: 8 },
  md: { fontSize: 13, padding: '8px 16px', borderRadius: 10 },
  lg: { fontSize: 14, padding: '10px 22px', borderRadius: 12 },
};

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{ ...VARIANTS[variant], ...SIZES[size], fontFamily: 'Tajawal, sans-serif', fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...style }}
      {...props}
    >
      {loading ? '⏳' : children}
    </button>
  );
}

export default Button;
