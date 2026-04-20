interface BnmBoxProps {
  maxBid: number;
  currentPrice: number;
  safetyMarginPct: number;
  label?: string;
}

import { fmt } from '../../utils/format';

export function BnmBox({ maxBid, currentPrice, safetyMarginPct, label = 'Buy-No-More™' }: BnmBoxProps) {
  const isSafe = safetyMarginPct >= 15;
  return (
    <div style={{ background: isSafe ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)', border: `2px solid ${isSafe ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 14, padding: '16px 20px' }} dir="rtl">
      <p style={{ fontSize: 11, fontWeight: 700, color: '#B8924A', marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.45)', margin: '0 0 3px' }}>السعر الحالي</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#B8924A', fontFamily: 'IBM Plex Mono' }}>{fmt(currentPrice)}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.45)', margin: '0 0 3px' }}>الحد الأقصى</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#dc2626', fontFamily: 'IBM Plex Mono' }}>{fmt(maxBid)}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.45)', margin: '0 0 3px' }}>هامش الأمان</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: isSafe ? '#16a34a' : '#dc2626', fontFamily: 'IBM Plex Mono' }}>{safetyMarginPct.toFixed(1)}٪</p>
        </div>
      </div>
    </div>
  );
}

export default BnmBox;
