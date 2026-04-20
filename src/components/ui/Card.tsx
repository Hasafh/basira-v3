import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: React.ReactNode;
}

export function Card({ children, title, actions, style, className }: CardProps) {
  return (
    <div className={className} style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: 16, padding: 20, ...style }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title && <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
