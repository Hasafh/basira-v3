import type { RegulationResult } from '../../engines/regulation';

interface Props {
  result: RegulationResult | null;
}

export function RegulationSummary({ result }: Props) {
  if (!result) return null;
  return (
    <div dir="rtl" style={{ background: result.isValid ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${result.isValid ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: result.isValid ? '#16a34a' : '#dc2626', marginBottom: result.errors.length > 0 ? 8 : 0 }}>
        {result.isValid ? '✅ مطابق للأنظمة' : '❌ يوجد مخالفات'}
      </p>
      {result.errors.map((v, i) => (
        <p key={i} style={{ fontSize: 11, color: '#dc2626', margin: '2px 0' }}>• {v}</p>
      ))}
      {result.warnings.map((w, i) => (
        <p key={i} style={{ fontSize: 11, color: '#d97706', margin: '2px 0' }}>⚠️ {w}</p>
      ))}
    </div>
  );
}

export default RegulationSummary;
