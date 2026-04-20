interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export function Badge({ label, color = '#B8924A', bg = 'rgba(184,146,74,0.1)' }: BadgeProps) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 999, padding: '2px 8px' }}>
      {label}
    </span>
  );
}

export default Badge;
