import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, style, ...props }: InputProps) {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,12,18,0.55)' }}>{label}</label>}
      <input
        style={{ border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(10,12,18,0.12)'}`, borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', background: '#FAFAF8', color: '#0A0C12', width: '100%', boxSizing: 'border-box', ...style }}
        {...props}
      />
      {hint  && !error && <span style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 10, color: '#dc2626' }}>{error}</span>}
    </div>
  );
}

export default Input;
