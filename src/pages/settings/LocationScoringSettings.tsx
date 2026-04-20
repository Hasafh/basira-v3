import { useState } from 'react';
import type { LocationConfig, CodeFeatureConfig } from '../../lib/types/report';

interface Props {
  config:       LocationConfig;
  onSave:       (c: LocationConfig) => void;
  onReset:      () => void;
  zoningCodes?: string[];
}

type WeightKey = keyof LocationConfig['weights'];

const WEIGHT_LABELS: Record<WeightKey, string> = {
  zoningFit:      'ملاءمة التصنيف العمراني',
  accessibility:  'إمكانية الوصول (عرض الشارع)',
  amenities:      'الخدمات والمرافق',
  infrastructure: 'البنية التحتية',
};

export default function LocationScoringSettings({ config, onSave, onReset, zoningCodes }: Props) {
  const [draft, setDraft]               = useState<LocationConfig>(JSON.parse(JSON.stringify(config)));
  const [selectedCode, setSelectedCode] = useState<string>(() => {
    const codes = Object.keys(config.landFeaturesByCode ?? {});
    return codes[0] ?? '';
  });

  const totalWeights = Object.values(draft.weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(totalWeights - 100) < 0.5;

  const featuresByCode = draft.landFeaturesByCode ?? {};
  const allCodes       = Array.from(new Set([
    ...Object.keys(featuresByCode),
    ...(zoningCodes ?? []),
  ]));

  const codeConfig: CodeFeatureConfig | undefined = featuresByCode[selectedCode];
  const featureTotal = codeConfig?.features.reduce((a, f) => a + f.weight, 0) ?? 0;
  const featureValid = codeConfig ? Math.abs(featureTotal - 100) < 0.5 : true;

  function setWeight(key: WeightKey, val: number) {
    setDraft(d => ({ ...d, weights: { ...d.weights, [key]: val } }));
  }

  function setUsageRule(
    usage: keyof LocationConfig['usageRules'],
    field: 'minStreetWidth' | 'idealStreetWidth',
    val: number,
  ) {
    setDraft(d => ({
      ...d,
      usageRules: { ...d.usageRules, [usage]: { ...d.usageRules[usage], [field]: val } },
    }));
  }

  function setFeatureWeight(code: string, featureKey: string, val: number) {
    setDraft(d => {
      const entry = d.landFeaturesByCode?.[code];
      if (!entry) return d;
      return {
        ...d,
        landFeaturesByCode: {
          ...d.landFeaturesByCode,
          [code]: {
            ...entry,
            features: entry.features.map(f =>
              f.key === featureKey ? { ...f, weight: val } : f,
            ),
          },
        },
      };
    });
  }

  function setStreetRule(code: string, field: 'min' | 'ideal', val: number) {
    setDraft(d => {
      const entry = d.landFeaturesByCode?.[code];
      if (!entry) return d;
      return {
        ...d,
        landFeaturesByCode: {
          ...d.landFeaturesByCode,
          [code]: { ...entry, streetRules: { ...entry.streetRules, [field]: val } },
        },
      };
    });
  }

  function addCodeConfig(code: string) {
    if (!code || featuresByCode[code]) return;
    setDraft(d => ({
      ...d,
      landFeaturesByCode: {
        ...d.landFeaturesByCode,
        [code]: {
          streetRules: { min: 15, ideal: 25 },
          features: [
            { key: 'streetWidth',    label: 'عرض الشارع',   weight: 30 },
            { key: 'infrastructure', label: 'البنية التحتية', weight: 25 },
            { key: 'mosque',         label: 'قرب مسجد',       weight: 15 },
            { key: 'supermarket',    label: 'قرب سوبرماركت',   weight: 15 },
            { key: 'school',         label: 'قرب مدرسة',       weight: 15 },
          ],
        },
      },
    }));
    setSelectedCode(code);
  }

  const canSave = weightsValid && featureValid;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', direction: 'rtl' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>إعدادات تقييم الموقع</h2>

      {/* ── الأوزان العامة ── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>أوزان المعايير العامة (المجموع = 100)</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {(Object.keys(draft.weights) as WeightKey[]).map(key => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 230, fontSize: 14 }}>{WEIGHT_LABELS[key]}</span>
              <input
                type="number" min={0} max={100} value={draft.weights[key]}
                onChange={e => setWeight(key, Number(e.target.value))}
                style={{ width: 72, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: '#6b7280' }}>%</span>
            </label>
          ))}
        </div>
        {!weightsValid && (
          <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>
            مجموع الأوزان = {totalWeights}، يجب أن يساوي 100
          </p>
        )}
      </section>

      {/* ── قواعد الاستخدام ── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>قواعد الاستخدام (عرض الشارع بالمتر)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>الاستخدام</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>الحد الأدنى</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>المثالي</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(draft.usageRules) as (keyof LocationConfig['usageRules'])[]).map(usage => {
              const LABELS = { residential: 'سكني', commercial: 'تجاري', office: 'مكتبي' };
              return (
                <tr key={usage} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>{LABELS[usage]}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <input type="number" min={0} value={draft.usageRules[usage].minStreetWidth}
                      onChange={e => setUsageRule(usage, 'minStreetWidth', Number(e.target.value))}
                      style={{ width: 64, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <input type="number" min={0} value={draft.usageRules[usage].idealStreetWidth}
                      onChange={e => setUsageRule(usage, 'idealStreetWidth', Number(e.target.value))}
                      style={{ width: 64, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── مزايا الأرض حسب الكود ── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>مزايا الأرض حسب الكود النظامي</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          خصّص الأوزان لكل ميزة حسب الكود — المجموع يجب أن يساوي 100٪ لكل كود.
        </p>

        {/* Code selector */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>الكود:</label>
          <select
            value={selectedCode}
            onChange={e => setSelectedCode(e.target.value)}
            style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, minWidth: 120 }}
          >
            {allCodes.length === 0 && <option value="">— لا توجد أكواد —</option>}
            {allCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          {/* Add a code not in the list */}
          {zoningCodes?.filter(c => !featuresByCode[c]).map(code => (
            <button
              key={code}
              onClick={() => addCodeConfig(code)}
              style={{
                padding: '4px 12px', background: '#f0fdf4', color: '#065f46',
                border: '1px solid #86efac', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              }}
            >
              + إضافة {code}
            </button>
          ))}
        </div>

        {/* Street rules for selected code */}
        {codeConfig && (
          <>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>قواعد الشارع لكود {selectedCode}:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                الحد الأدنى
                <input type="number" min={0} value={codeConfig.streetRules.min}
                  onChange={e => setStreetRule(selectedCode, 'min', Number(e.target.value))}
                  style={{ width: 60, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 13 }}
                />
                م
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                المثالي
                <input type="number" min={0} value={codeConfig.streetRules.ideal}
                  onChange={e => setStreetRule(selectedCode, 'ideal', Number(e.target.value))}
                  style={{ width: 60, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 13 }}
                />
                م
              </label>
            </div>

            {/* Feature weights table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>الميزة</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>الوزن (%)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>الشريط</th>
                </tr>
              </thead>
              <tbody>
                {codeConfig.features.map(f => (
                  <tr key={f.key} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 12px' }}>{f.label}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number" min={0} max={100} value={f.weight}
                        onChange={e => setFeatureWeight(selectedCode, f.key, Number(e.target.value))}
                        style={{ width: 64, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 13 }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, width: '100%' }}>
                        <div style={{ height: 6, width: `${f.weight}%`, background: '#2563eb', borderRadius: 3, transition: 'width 0.2s' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>المجموع</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: featureValid ? '#065f46' : '#dc2626' }}>
                    {featureTotal}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: featureValid ? '#065f46' : '#dc2626' }}>
                    {featureValid ? '✓ صحيح' : 'يجب أن يكون 100٪'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {allCodes.length === 0 && (
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 20 }}>
            لا توجد أكواد نظامية مُهيّأة. أضف أكواداً من إعدادات التصنيف العمراني أولاً.
          </p>
        )}
      </section>

      {/* ── الأزرار ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => onSave(draft)}
          disabled={!canSave}
          style={{
            padding: '8px 20px',
            background: canSave ? '#2563eb' : '#93c5fd',
            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed', fontSize: 14,
          }}
        >
          حفظ الإعدادات
        </button>
        <button
          onClick={() => { onReset(); setDraft(JSON.parse(JSON.stringify(config))); }}
          style={{
            padding: '8px 20px', background: '#f3f4f6', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          استعادة الافتراضي
        </button>
      </div>
    </div>
  );
}
