interface MetricRowProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function MetricRow({ label, value, sub, color = '#0A0C12' }: MetricRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
      <span style={{ fontSize: 12, color: 'rgba(10,12,18,0.55)' }}>{label}</span>
      <div style={{ textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>{value}</span>
        {sub && <span style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)', marginRight: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}

export default MetricRow;
