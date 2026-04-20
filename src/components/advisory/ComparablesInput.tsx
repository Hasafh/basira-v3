import { useState } from 'react';
import type { ComparableProject, EvidenceSourceType, VerificationMethod } from '../../lib/types/report';
import CitySelect     from '../shared/CitySelect';
import DistrictSelect from '../shared/DistrictSelect';
import { useMasterDataStore } from '../../store/masterDataStore';

interface Props {
  value: ComparableProject[];
  onChange: (projects: ComparableProject[]) => void;
}

const SOURCE_LABELS: Record<EvidenceSourceType, string> = {
  government:          'حكومي — وزارة العدل',
  certified_appraisal: 'تقييم معتمد RICS',
  broker_data:         'وسيط عقاري',
  internal_excel:      'Excel داخلي',
  manual_input:        'إدخال يدوي',
};

const METHOD_LABELS: Record<VerificationMethod, string> = {
  document:    'مستند رسمي',
  field_visit: 'زيارة ميدانية',
  third_party: 'طرف ثالث',
  unverified:  'غير موثق',
};

const EMPTY: ComparableProject = {
  name: '', location: '',
  sellPricePerSqm: 0, soldUnitsPercent: 0,
  deliveryMonths: 0, sourceType: 'broker_data',
  verification: { verified: false, method: 'unverified' },
};

export function ComparablesInput({ value, onChange }: Props) {
  const [adding, setAdding]   = useState(false);
  const [draft, setDraft]     = useState<ComparableProject>(EMPTY);
  const [draftCityId, setDraftCityId] = useState('');

  const { cities, districts } = useMasterDataStore();

  const handleDistrictChange = (districtId: string) => {
    const district = districts.find(d => d.id === districtId);
    const city     = cities.find(c => c.id === draftCityId);
    const location = district && city
      ? `${district.name}، ${city.name}`
      : district?.name ?? city?.name ?? '';
    setDraft(d => ({ ...d, location }));
  };

  const handleCityChange = (cityId: string) => {
    setDraftCityId(cityId);
    const city = cities.find(c => c.id === cityId);
    setDraft(d => ({ ...d, location: city?.name ?? '' }));
  };

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.sellPricePerSqm) return;
    onChange([...value, { ...draft }]);
    setDraft(EMPTY);
    setDraftCityId('');
    setAdding(false);
  };

  const handleRemove = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx));

  const met = value.length >= 3;

  return (
    <div className="space-y-3" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: '#0A0C12' }}>
          المشاريع المنافسة
          <span className="mr-2 text-xs px-2 py-0.5 rounded-full"
            style={{
              background: met ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
              color:      met ? '#16a34a'               : '#dc2626',
            }}>
            {value.length} / 3 حد أدنى
          </span>
        </span>
        <button
          onClick={() => setAdding(true)}
          className="text-xs font-medium"
          style={{ color: '#2563eb' }}
        >
          + إضافة مشروع
        </button>
      </div>

      {/* Existing comparables */}
      {value.map((p, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(10,12,18,0.03)', border: '1px solid rgba(10,12,18,0.07)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#0A0C12' }}>{p.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              {p.location && `${p.location} · `}
              <span className="num font-medium">{p.sellPricePerSqm.toLocaleString()}</span> ر.س/م²
              {p.soldUnitsPercent > 0 && ` · مبيعات ${p.soldUnitsPercent}٪`}
              {` · ${SOURCE_LABELS[p.sourceType]}`}
            </p>
            {p.verification && (
              <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: p.verification.verified ? 'rgba(22,163,74,0.10)' : 'rgba(10,12,18,0.05)',
                  color:      p.verification.verified ? '#16a34a'               : 'rgba(10,12,18,0.4)',
                }}>
                {p.verification.verified ? `✓ ${METHOD_LABELS[p.verification.method]}` : 'غير موثق'}
              </span>
            )}
          </div>
          <button
            onClick={() => handleRemove(i)}
            className="text-xs flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(220,38,38,0.7)' }}
          >
            حذف
          </button>
        </div>
      ))}

      {/* Add form */}
      {adding && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <p className="text-xs font-bold" style={{ color: '#2563eb' }}>مشروع جديد</p>

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="اسم المشروع"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              className="text-sm p-2 rounded-lg"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            />
            {/* Location — city + district dropdowns */}
            <CitySelect
              value={draftCityId}
              onChange={handleCityChange}
              className="text-sm p-2 rounded-lg"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            />
            <DistrictSelect
              cityId={draftCityId}
              value=""
              onChange={(id) => handleDistrictChange(id)}
              placeholder="اختر الحي"
              className="col-span-2 text-sm p-2 rounded-lg"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            />
            {draft.location && (
              <p className="col-span-2 text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
                الموقع: {draft.location}
              </p>
            )}
            <input
              type="number"
              placeholder="سعر البيع ر.س/م² *"
              value={draft.sellPricePerSqm || ''}
              onChange={e => setDraft(d => ({ ...d, sellPricePerSqm: +e.target.value }))}
              className="text-sm p-2 rounded-lg num"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            />
            <input
              type="number"
              placeholder="نسبة المبيعات ٪"
              value={draft.soldUnitsPercent || ''}
              onChange={e => setDraft(d => ({ ...d, soldUnitsPercent: +e.target.value }))}
              className="text-sm p-2 rounded-lg num"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            />
            <select
              value={draft.sourceType}
              onChange={e => setDraft(d => ({ ...d, sourceType: e.target.value as EvidenceSourceType }))}
              className="col-span-2 text-sm p-2 rounded-lg"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
            >
              {(Object.entries(SOURCE_LABELS) as [EvidenceSourceType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Verification */}
          <div className="rounded-lg p-3 space-y-2"
            style={{ background: 'rgba(10,12,18,0.03)', border: '1px solid rgba(10,12,18,0.08)' }}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{
                  background: draft.verification?.verified ? '#16a34a' : 'white',
                  border:     draft.verification?.verified ? 'none'    : '1.5px solid rgba(10,12,18,0.25)',
                }}
                onClick={() => setDraft(d => ({
                  ...d,
                  verification: { ...d.verification!, verified: !d.verification?.verified, method: d.verification?.method ?? 'unverified' },
                }))}
              >
                {draft.verification?.verified && <span className="text-white text-xs font-bold">✓</span>}
              </span>
              <span className="text-xs font-medium" style={{ color: '#0A0C12' }}>بيانات موثقة فعلياً</span>
            </label>
            {draft.verification?.verified && (
              <select
                value={draft.verification.method}
                onChange={e => setDraft(d => ({
                  ...d,
                  verification: { ...d.verification!, method: e.target.value as VerificationMethod },
                }))}
                className="w-full text-xs p-2 rounded-lg"
                style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white' }}
              >
                {(Object.entries(METHOD_LABELS) as [VerificationMethod, string][])
                  .filter(([k]) => k !== 'unverified')
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setDraft(EMPTY); }}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: 'rgba(10,12,18,0.5)', background: 'rgba(10,12,18,0.06)' }}
            >
              إلغاء
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.name.trim() || !draft.sellPricePerSqm}
              className="text-xs px-4 py-1.5 rounded-lg font-bold text-white transition-all"
              style={{
                background: (draft.name.trim() && draft.sellPricePerSqm)
                  ? '#2563eb'
                  : 'rgba(37,99,235,0.3)',
                cursor: (draft.name.trim() && draft.sellPricePerSqm) ? 'pointer' : 'not-allowed',
              }}
            >
              إضافة
            </button>
          </div>
        </div>
      )}

      {!met && !adding && (
        <p className="text-xs text-center py-1" style={{ color: 'rgba(220,38,38,0.7)' }}>
          أضف {3 - value.length} مشاريع إضافية للوصول للحد الأدنى المطلوب
        </p>
      )}
    </div>
  );
}
