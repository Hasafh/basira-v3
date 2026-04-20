import { useState } from 'react';
import { marketAPI } from '../../api';
import { fmt } from '../../utils/format';
import { useMasterDataStore } from '../../store/masterDataStore';

/* ── Map city ID → LAND_PRICES key ── */
const CITY_ID_TO_KEY: Record<string, string> = {
  riyadh: 'الرياض',
  jeddah: 'جدة',
  dammam: 'الدمام / الخبر',
  khobar: 'الدمام / الخبر',
};

/* ── Static reference data (Saudi market benchmarks) ── */
const LAND_PRICES: Record<string, { area: string; min: number; max: number; avg: number; unit: string }[]> = {
  الرياض: [
    { area: 'النرجس',        min: 1800, max: 2800, avg: 2300, unit: 'ر.س/م²' },
    { area: 'الملقا',        min: 2200, max: 3400, avg: 2800, unit: 'ر.س/م²' },
    { area: 'حي الياسمين',   min: 1600, max: 2400, avg: 2000, unit: 'ر.س/م²' },
    { area: 'العليا / العقيق', min: 4000, max: 7000, avg: 5500, unit: 'ر.س/م²' },
    { area: 'المونسية',      min: 1200, max: 1900, avg: 1550, unit: 'ر.س/م²' },
    { area: 'الدرعية',       min: 900,  max: 1600, avg: 1250, unit: 'ر.س/م²' },
  ],
  جدة: [
    { area: 'الشاطئ',         min: 3500, max: 6000, avg: 4800, unit: 'ر.س/م²' },
    { area: 'الروضة',         min: 2800, max: 4500, avg: 3600, unit: 'ر.س/م²' },
    { area: 'النزهة',         min: 1800, max: 3000, avg: 2400, unit: 'ر.س/م²' },
    { area: 'أم السلم',       min: 1400, max: 2200, avg: 1800, unit: 'ر.س/م²' },
    { area: 'الزهراء',        min: 2200, max: 3800, avg: 3000, unit: 'ر.س/م²' },
  ],
  'الدمام / الخبر': [
    { area: 'الشاطئ الشرقي',  min: 2500, max: 4000, avg: 3200, unit: 'ر.س/م²' },
    { area: 'التعاون',        min: 1500, max: 2500, avg: 2000, unit: 'ر.س/م²' },
    { area: 'الفيصلية',       min: 1200, max: 2000, avg: 1600, unit: 'ر.س/م²' },
    { area: 'الراكة',         min: 1800, max: 2800, avg: 2300, unit: 'ر.س/م²' },
  ],
};

const BUILD_COSTS: { type: string; desc: string; min: number; max: number; avg: number; icon: string }[] = [
  { type: 'فيلا سكنية',           desc: 'تشطيب متوسط، ارتفاع 2 أدوار',  min: 1600, max: 2200, avg: 1900, icon: '🏠' },
  { type: 'فيلا راقية',           desc: 'تشطيب فاخر، ارتفاع 2-3 أدوار', min: 2400, max: 3500, avg: 2900, icon: '🏡' },
  { type: 'شقق سكنية (منخفض)',    desc: 'عمارة ≤ 4 أدوار',               min: 1400, max: 1900, avg: 1650, icon: '🏢' },
  { type: 'شقق سكنية (متوسط)',    desc: 'عمارة 5-10 أدوار',              min: 1700, max: 2300, avg: 2000, icon: '🏬' },
  { type: 'تجاري / مكاتب',        desc: 'بناء تجاري متعدد الطوابق',      min: 2000, max: 3000, avg: 2500, icon: '🏗️' },
  { type: 'مستودعات / صناعي',     desc: 'هيكل خفيف أو ثقيل',            min: 800,  max: 1400, avg: 1100, icon: '🏭' },
];

const MARKET_INDICATORS = [
  { label: 'متوسط عائد الإيجار (سكني)', value: '5.5 — 7.5٪',  note: 'الرياض وجدة',          icon: '📊', color: '#16a34a' },
  { label: 'نسبة التمويل البنكي المتاحة', value: 'حتى 70٪',   note: 'لمشاريع البناء والتطوير', icon: '🏦', color: '#2563eb' },
  { label: 'سعر الفائدة السائد (SAIBOR)', value: '≈ 5.5 — 6٪', note: '2025 — متغير',          icon: '📈', color: '#d97706' },
  { label: 'متوسط مدة إنجاز الفيلا',      value: '12 — 18 شهراً', note: 'حسب المقاول والمواصفات', icon: '⏱️', color: '#7c3aed' },
  { label: 'رسوم التسجيل العقاري',         value: '2.5٪',       note: 'من قيمة الصفقة',        icon: '📋', color: '#0891b2' },
  { label: 'نسبة التكاليف الناعمة',        value: '5 — 10٪',    note: 'تصميم، ترخيص، إشراف',  icon: '📐', color: '#dc2626' },
];

export default function MarketPage() {
  const masterCities = useMasterDataStore(s => s.cities);
  const [cityId, setCityId]       = useState<string>('riyadh');
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [apiData, setApiData]     = useState<any>(null);

  const cityKey  = CITY_ID_TO_KEY[cityId] ?? masterCities.find(c => c.id === cityId)?.name ?? '';
  const landRows = LAND_PRICES[cityKey] ?? [];

  const tryFetchLandPrices = async () => {
    setApiStatus('loading');
    try {
      const res = await marketAPI.getLandPrices(cityKey);
      setApiData(res.data?.data || res.data);
      setApiStatus('done');
    } catch {
      setApiStatus('error');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ color: '#0A0C12' }}>📈 بيانات السوق العقاري</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.45)' }}>
          أسعار مرجعية للأراضي وتكاليف البناء ومؤشرات السوق السعودي
        </p>
      </div>

      {/* Market indicators */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0A0C12' }}>مؤشرات السوق</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MARKET_INDICATORS.map(ind => (
            <div key={ind.label} style={card}>
              <div className="flex items-start gap-2">
                <span className="text-xl">{ind.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.5)' }}>{ind.label}</p>
                  <p className="font-bold text-sm num" style={{ color: ind.color }}>{ind.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.35)' }}>{ind.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Land prices by city */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-sm font-bold" style={{ color: '#0A0C12' }}>أسعار الأراضي المرجعية</h2>
          <div className="flex items-center gap-2">
            <select
              value={cityId}
              onChange={e => { setCityId(e.target.value); setApiStatus('idle'); setApiData(null); }}
              style={{ ...fieldStyle, minWidth: 140 }}
            >
              {masterCities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={tryFetchLandPrices}
              disabled={apiStatus === 'loading'}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid rgba(184,146,74,0.25)',
                background: apiStatus === 'loading' ? 'rgba(184,146,74,0.08)' : 'rgba(184,146,74,0.1)',
                color: '#B8924A',
                cursor: apiStatus === 'loading' ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {apiStatus === 'loading' ? '⏳' : '🔄 تحديث من API'}
            </button>
          </div>
        </div>

        {apiStatus === 'error' && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}>
            ⚠️ تعذّر الاتصال بالـ API — تُعرض البيانات المرجعية المحلية
          </div>
        )}
        {apiStatus === 'done' && apiData && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(22,163,74,0.06)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)' }}>
            ✅ تم تحديث البيانات من الخادم
          </div>
        )}

        {landRows.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '32px 16px', color: 'rgba(10,12,18,0.4)', fontSize: 14 }}>
            لا توجد بيانات مرجعية لهذه المدينة بعد
            <p style={{ fontSize: 12, marginTop: 6 }}>يمكن إضافة أحياء المدينة من <a href="/settings/master-data" style={{ color: '#B8924A' }}>إعدادات البيانات الأساسية</a></p>
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F3EF' }}>
                  {['الحي / المنطقة', 'الأدنى (ر.س/م²)', 'الأعلى (ر.س/م²)', 'المتوسط (ر.س/م²)'].map(h => (
                    <th key={h} className="text-right py-3 px-4 text-xs font-semibold" style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {landRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                    <td className="py-3 px-4 font-medium text-sm" style={{ color: '#0A0C12' }}>{row.area}</td>
                    <td className="py-3 px-4 num text-sm" style={{ color: '#2563eb' }}>{fmt(row.min)}</td>
                    <td className="py-3 px-4 num text-sm" style={{ color: '#dc2626' }}>{fmt(row.max)}</td>
                    <td className="py-3 px-4 num text-sm font-bold" style={{ color: '#B8924A' }}>{fmt(row.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: 'rgba(10,12,18,0.35)' }}>
          * بيانات مرجعية تقريبية للتخطيط المبدئي — يُوصى بالتحقق من صفقات مماثلة حديثة
        </p>
      </div>

      {/* Build costs */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0A0C12' }}>تكاليف البناء (ر.س / م² مبني)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BUILD_COSTS.map(item => (
            <div key={item.type} style={card}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#0A0C12' }}>{item.type}</p>
                    <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{item.desc}</p>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-black text-base num" style={{ color: '#B8924A' }}>{fmt(item.avg)}</p>
                  <p className="text-xs num" style={{ color: 'rgba(10,12,18,0.4)' }}>
                    {fmt(item.min)} — {fmt(item.max)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(10,12,18,0.35)' }}>
          * تكاليف البناء تشمل الهيكل والتشطيب دون الأرض — تتفاوت حسب المواصفات والمقاول
        </p>
      </div>

    </div>
  );
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(10,12,18,0.07)',
  borderRadius: 16,
  padding: 16,
};

const fieldStyle: React.CSSProperties = {
  border: '1px solid rgba(10,12,18,0.12)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  background: 'white',
  color: '#0A0C12',
};
