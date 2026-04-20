interface KpiCardProps {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}

export function KpiCard({ label, value, color = '#B8924A', sub }: KpiCardProps) {
  return (
    <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.4)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

export default KpiCard;
