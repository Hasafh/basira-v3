import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, style, ...props }: SelectProps) {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,12,18,0.55)' }}>{label}</label>}
      <select style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', background: '#FAFAF8', color: '#0A0C12', width: '100%', ...style }} {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default Select;
