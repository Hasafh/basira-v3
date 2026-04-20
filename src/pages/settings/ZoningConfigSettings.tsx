import { useState } from 'react';
import type { ZoningConfig } from '../../lib/config/locationConfig';
import type { LandFeature } from '../../lib/types/report';

interface Props {
  configs:  ZoningConfig[];
  onAdd:    (c: ZoningConfig) => void;
  onUpdate: (code: string, updates: Partial<ZoningConfig>) => void;
  onDelete: (code: string) => void;
  onReset:  () => void;
}

const DEFAULT_FEATURES: LandFeature[] = [
  { key: 'streetWidth',    label: 'عرض الشارع',   weight: 30 },
  { key: 'mosque',         label: 'قرب مسجد',      weight: 15 },
  { key: 'school',         label: 'قرب مدرسة',     weight: 15 },
  { key: 'supermarket',    label: 'قرب سوبرماركت', weight: 15 },
  { key: 'park',           label: 'قرب حديقة',     weight: 5  },
  { key: 'metro',          label: 'قرب مترو',      weight: 5  },
  { key: 'infrastructure', label: 'البنية التحتية', weight: 15 },
];

export default function ZoningConfigSettings({
  configs, onAdd, onUpdate, onDelete, onReset,
}: Props) {
  const [selected, setSelected] = useState<string | null>(configs[0]?.code ?? null);
  const [showAdd,  setShowAdd]  = useState(false);

  const activeConfig = configs.find(c => c.code === selected);

  return (
    <div className="flex h-full" dir="rtl">

      {/* قائمة الكودات */}
      <div className="w-60 border-l bg-gray-50 p-3 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">الكودات النظامية</span>
          <button onClick={() => setShowAdd(true)} className="text-xs text-green-700 hover:underline">
            + إضافة
          </button>
        </div>

        <div className="space-y-1 flex-1 overflow-y-auto">
          {configs.map(c => (
            <button
              key={c.code}
              onClick={() => { setSelected(c.code); setShowAdd(false); }}
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all ${
                selected === c.code && !showAdd
                  ? 'bg-green-700 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <div className="font-bold">{c.code}</div>
              <div className={`text-xs truncate ${selected === c.code && !showAdd ? 'text-green-100' : 'text-gray-400'}`}>
                {c.label}
              </div>
              {c.locationFeatures && (
                <div className={`text-xs mt-0.5 ${selected === c.code && !showAdd ? 'text-green-200' : 'text-blue-500'}`}>
                  ✓ مزايا الموقع
                </div>
              )}
            </button>
          ))}
        </div>

        <button onClick={onReset} className="mt-3 text-xs text-gray-400 hover:text-gray-600 text-center py-1">
          إعادة تعيين للافتراضي
        </button>
      </div>

      {/* المحتوى */}
      <div className="flex-1 p-6 overflow-y-auto">
        {showAdd ? (
          <NewZoningForm
            onSave={(c) => { onAdd(c); setSelected(c.code); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        ) : !activeConfig ? (
          <p className="text-gray-400 text-sm">اختر كوداً للتعديل</p>
        ) : (
          <ZoningEditor
            config={activeConfig}
            onUpdate={(updates) => onUpdate(activeConfig.code, updates)}
            onDelete={() => {
              onDelete(activeConfig.code);
              setSelected(configs.find(c => c.code !== activeConfig.code)?.code ?? null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── محرر الكود (مع مزايا الموقع) ───────────────── */
function ZoningEditor({
  config, onUpdate, onDelete,
}: {
  config:   ZoningConfig;
  onUpdate: (updates: Partial<ZoningConfig>) => void;
  onDelete: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'features'>('rules');

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const weightsSum   = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const weightsSumOk = Math.abs(weightsSum - 1) < 0.01;

  const features    = config.locationFeatures?.features ?? [];
  const featureSum  = features.reduce((a, f) => a + f.weight, 0);
  const featureSumOk = features.length === 0 || Math.abs(featureSum - 100) < 0.5;

  function updateFeatureWeight(key: string, val: number) {
    onUpdate({
      locationFeatures: {
        features: features.map(f => f.key === key ? { ...f, weight: val } : f),
      },
    });
  }

  function addDefaultFeatures() {
    onUpdate({ locationFeatures: { features: DEFAULT_FEATURES } });
  }

  const tabs = [
    { id: 'rules' as const,    label: 'القواعد والأوزان' },
    { id: 'features' as const, label: `مزايا الموقع${features.length ? ` (${features.length})` : ''}` },
  ];

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{config.code}</h2>
          <p className="text-sm text-gray-500">{config.label}</p>
        </div>
        <button
          onClick={onDelete}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg"
        >
          حذف الكود
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── تبويب القواعد والأوزان ── */}
      {activeTab === 'rules' && (
        <div className="space-y-5">

          {/* الأوزان الرئيسية */}
          <section className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">الأوزان الرئيسية (مجموع = 1.0)</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(config.weights) as Array<keyof ZoningConfig['weights']>).map(key => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {key === 'streetWidth' ? 'عرض الشارع' : key === 'amenities' ? 'الخدمات' : key === 'infrastructure' ? 'البنية التحتية' : 'الموقع العام'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" max="1" step="0.05"
                      value={config.weights[key]}
                      onChange={e => onUpdate({ weights: { ...config.weights, [key]: +e.target.value } })}
                      className="w-20 border rounded-lg p-2 text-sm text-center"
                    />
                    <span className="text-xs text-gray-400">{(config.weights[key] * 100).toFixed(0)}٪</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-xs mt-2 ${weightsSumOk ? 'text-green-600' : 'text-red-500'}`}>
              المجموع: {(weightsSum * 100).toFixed(0)}٪ {weightsSumOk ? '✓' : '— يجب أن يكون 100٪'}
            </p>
          </section>

          {/* قواعد الشارع */}
          <section className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">قواعد عرض الشارع</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">الحد الأدنى (م)</label>
                <input type="number" value={config.rules.minStreetWidth}
                  onChange={e => onUpdate({ rules: { ...config.rules, minStreetWidth: +e.target.value } })}
                  className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">المثالي (م)</label>
                <input type="number" value={config.rules.idealStreetWidth}
                  onChange={e => onUpdate({ rules: { ...config.rules, idealStreetWidth: +e.target.value } })}
                  className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">أقصى أدوار</label>
                <input type="number" value={config.rules.maxFloors ?? ''}
                  onChange={e => onUpdate({ rules: { ...config.rules, maxFloors: +e.target.value || undefined } })}
                  className="w-full border rounded-lg p-2 text-sm" placeholder="—" />
              </div>
            </div>
          </section>

          {/* مزايا الأرض التلقائية */}
          <section className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1">مزايا الأرض التلقائية</h3>
            <p className="text-xs text-gray-400 mb-3">تظهر في التقرير عند تحقق الشرط</p>
            {config.landAdvantages.length === 0 ? (
              <p className="text-xs text-gray-400">لا توجد مزايا مُضافة</p>
            ) : (
              <div className="space-y-3">
                {config.landAdvantages.map((adv, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="text-xs text-gray-400 mb-1 font-mono">{adv.trigger}</div>
                    <div className="text-gray-700">{adv.advantage}</div>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      adv.weight === 'high' ? 'bg-green-100 text-green-700' : adv.weight === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {adv.weight === 'high' ? 'أهمية عالية' : adv.weight === 'medium' ? 'أهمية متوسطة' : 'أهمية منخفضة'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── تبويب مزايا الموقع ── */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {features.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-sm mb-3">لم تُحدد مزايا موقع لهذا الكود بعد</p>
              <button
                onClick={addDefaultFeatures}
                className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800"
              >
                + إضافة مزايا افتراضية
              </button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                هذه الأوزان تحدد درجة تأثير كل ميزة موقع على التقييم الإجمالي لهذا الكود.
                المجموع يجب أن يساوي 100٪.
              </div>

              <section className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">الميزة</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">الوزن ٪</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((f, i) => (
                      <tr key={f.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{f.label}</div>
                          <div className="text-xs text-gray-400 font-mono">{f.key}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number" min={0} max={100} value={f.weight}
                            onChange={e => updateFeatureWeight(f.key, Number(e.target.value))}
                            className="w-16 border rounded-lg p-1.5 text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, f.weight)}%`, background: '#15803d' }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr className={featureSumOk ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-4 py-3 font-bold text-sm">المجموع</td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${featureSumOk ? 'text-green-700' : 'text-red-600'}`}>
                        {featureSum}
                      </td>
                      <td className={`px-4 py-3 text-xs ${featureSumOk ? 'text-green-600' : 'text-red-500'}`}>
                        {featureSumOk ? '✓ صحيح' : 'يجب أن يكون 100٪'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            </>
          )}
        </div>
      )}

      <button
        onClick={save}
        className="w-full bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-800 mt-2"
      >
        {saved ? '✓ تم الحفظ' : 'حفظ التعديلات'}
      </button>
    </div>
  );
}

/* ── نموذج إضافة كود جديد ────────────────────────── */
const USAGE_OPTIONS: { value: ZoningConfig['usageType']; label: string }[] = [
  { value: 'residential', label: 'سكني' },
  { value: 'commercial',  label: 'تجاري' },
  { value: 'office',      label: 'مكتبي' },
  { value: 'mixed',       label: 'مختلط' },
];

function NewZoningForm({ onSave, onCancel }: { onSave: (c: ZoningConfig) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    code: '', label: '',
    usageType:        'residential' as ZoningConfig['usageType'],
    idealStreetWidth: 25,
    minStreetWidth:   15,
  });

  const handleSave = () => {
    if (!form.code.trim() || !form.label.trim()) return;
    const newConfig: ZoningConfig = {
      code: form.code.trim(), label: form.label.trim(), usageType: form.usageType,
      rules: { idealStreetWidth: form.idealStreetWidth, minStreetWidth: form.minStreetWidth },
      weights: { streetWidth: 0.30, amenities: 0.25, infrastructure: 0.25, location: 0.20 },
      amenityWeights: { mosque: 0.20, supermarket: 0.20, school: 0.20, park: 0.15, mall: 0.10, metro: 0.10, bus: 0.05 },
      infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
      landAdvantages: [],
      locationFeatures: { features: DEFAULT_FEATURES },
    };
    onSave(newConfig);
  };

  return (
    <div className="space-y-4 max-w-sm">
      <h2 className="text-base font-semibold">إضافة كود نظامي جديد</h2>
      <div>
        <label className="block text-xs text-gray-500 mb-1">رمز الكود</label>
        <input value={form.code} onChange={e => setForm(s => ({ ...s, code: e.target.value }))}
          placeholder="مثال: س123" className="w-full border rounded-lg p-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">الاسم</label>
        <input value={form.label} onChange={e => setForm(s => ({ ...s, label: e.target.value }))}
          placeholder="مثال: سكني فاخر" className="w-full border rounded-lg p-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">نوع الاستخدام</label>
        <select value={form.usageType}
          onChange={e => setForm(s => ({ ...s, usageType: e.target.value as ZoningConfig['usageType'] }))}
          className="w-full border rounded-lg p-2 text-sm">
          {USAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">الحد الأدنى للشارع (م)</label>
          <input type="number" value={form.minStreetWidth}
            onChange={e => setForm(s => ({ ...s, minStreetWidth: +e.target.value }))}
            className="w-full border rounded-lg p-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المثالي (م)</label>
          <input type="number" value={form.idealStreetWidth}
            onChange={e => setForm(s => ({ ...s, idealStreetWidth: +e.target.value }))}
            className="w-full border rounded-lg p-2 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave}
          className="flex-1 bg-green-700 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-800">
          إضافة
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
          إلغاء
        </button>
      </div>
    </div>
  );
}
