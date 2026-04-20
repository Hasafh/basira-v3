import { useState, useEffect, useRef, type ReactNode } from 'react';
import type {
  ReportBuilderData,
  ReportTarget,
  ReportUnitRow,
  ProfitDistributionConfig,
  ComparableProject,
  GateResult,
  ConfidenceBreakdown,
} from '../../lib/types/report';
import {
  generateProjectBrief,
  generateAdvantages,
  generatePricingAnalysis,
} from '../../lib/narrative/narrativeGenerators';
import { calculateDistribution } from '../../lib/engines/distributionEngine';
import {
  generateExecutiveSummary,
  type SummaryTarget,
} from '../../lib/engines/executiveSummaryEngine';
import { getLandAdvantages } from '../../lib/engines/locationScoringEngine';
import type { ZoningConfig } from '../../lib/config/locationConfig';

/* ── Types ─────────────────────────────────────── */
export interface DrawerProps {
  projectId:    string;
  project:      any;
  result:       any;
  formInput:    Record<string, string>;
  comparables:  ComparableProject[];
  confidence:   ConfidenceBreakdown;
  gate:         GateResult;
  initialData:  ReportBuilderData;
  zoningConfigs: ZoningConfig[];
  onSave:       (data: ReportBuilderData) => void;
  onExport:     (data: ReportBuilderData) => void;
  onClose:      () => void;
}

/* ── Constants ──────────────────────────────────── */
const TARGET_OPTIONS: { id: ReportTarget; icon: string; label: string; desc: string }[] = [
  { id: 'internal',      icon: '🏢', label: 'داخلي',         desc: 'للاستخدام الداخلي فقط'   },
  { id: 'bank',          icon: '🏦', label: 'بنك',           desc: 'طلب تمويل عقاري'          },
  { id: 'individual',    icon: '👤', label: 'مستثمر فرد',     desc: 'عرض فرصة استثمارية'       },
  { id: 'institutional', icon: '🏛️', label: 'مستثمر مؤسسي',  desc: 'صندوق أو شركة استثمارية' },
];

const DEFAULT_DIST: ProfitDistributionConfig = {
  bankFinancingPercent:        60,
  developerCapitalPercent:     30,
  investorCapitalPercent:      70,
  developerFeeOnConstruction:  5,
  developerProfitSharePercent: 20,
  bankInterestRate:            7,
};

export const DEFAULT_BUILDER_DATA: ReportBuilderData = {
  projectBrief:       '',
  projectAdvantages:  '',
  pricingAnalysis:    '',
  executiveSummary:   '',
  unitTypes:          [],
  distributionConfig: null,
  target:             null,
  targetName:         '',
  investorOwnCapital: 0,
};

/* ── Main component ─────────────────────────────── */
export function ReportBuilderDrawer({
  project, result, formInput, comparables,
  confidence, gate, initialData, zoningConfigs, onSave, onExport, onClose,
}: DrawerProps) {
  const [data,        setData]        = useState<ReportBuilderData>(initialData);
  const [openSection, setOpenSection] = useState<string>('executive');
  const mountedRef = useRef(false);

  const num = (k: string, fb = 0) => parseFloat(formInput?.[k] ?? '') || fb;

  /* financials object for executive summary engine */
  const financials = {
    irr:          result?.financials?.irr     ?? undefined,
    netMargin:    result?.financials?.margin  ?? undefined,
    netProfit:    result?.financials?.net     ?? undefined,
    totalRevenue: result?.financials?.revenue ?? undefined,
    totalCost:    result?.costs?.totalCost    ?? undefined,
    dscr:         result?.financials?.dscr    ?? undefined,
    paybackMonths: result?.financials?.paybackMonths ?? undefined,
    sensitivityLevel: (result?.sensitivity?.level ?? undefined) as 'low' | 'medium' | 'high' | undefined,
  };

  const summaryInput = {
    project: {
      name:          project?.name,
      location:      project?.location,
      usageType:     formInput?.usageType || formInput?.landType,
      landArea:      result?.areas?.landArea || num('landArea') || undefined,
      floorsCount:   num('floors', 4),
      totalUnits:    result?.unitMix?.totalUnits,
      durationMonths: num('projectDurationMonths', 24),
      sellPricePerSqm: num('sellPricePerM2') || undefined,
      streetWidth:   num('streetWidth') || undefined,
    },
    financials,
    comparables,
    confidence: confidence.total,
    target: (data.target ?? 'internal') as SummaryTarget,
  };

  /* auto-generate on first open */
  useEffect(() => {
    if (initialData.projectBrief) return;
    const generated: Partial<ReportBuilderData> = {
      projectBrief: generateProjectBrief({
        location:       project?.location,
        landArea:       result?.areas?.landArea || num('landArea'),
        usageType:      formInput?.usageType || formInput?.landType,
        floorsCount:    num('floors', 4),
        totalUnits:     result?.unitMix?.totalUnits,
        durationMonths: num('projectDurationMonths', 24),
      }),
      projectAdvantages: generateAdvantages(
        { streetWidth: num('streetWidth'), floorsCount: num('floors', 4), durationMonths: num('projectDurationMonths', 24), buildCostPerSqm: num('buildCostPerM2') },
        { netMargin: result?.financials?.margin, irr: result?.financials?.irr },
      ),
      pricingAnalysis: generatePricingAnalysis(num('sellPricePerM2'), comparables),
      distributionConfig: DEFAULT_DIST,
      unitTypes: result?.unitMix?.units?.map((u: any, i: number) => ({
        id:               String(i),
        typeName:         u.category ?? '',
        areaSqm:          u.avgAreaM2 ?? 0,
        count:            u.count ?? 0,
        sellPricePerUnit: (u.avgAreaM2 ?? 0) * (u.pricePerM2 ?? 0),
        totalRevenue:     (u.count ?? 0) * (u.avgAreaM2 ?? 0) * (u.pricePerM2 ?? 0),
      })) ?? [],
    };
    setData(prev => ({ ...prev, ...generated }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* auto-generate executive summary when target changes (or on first open with no summary) */
  useEffect(() => {
    if (!data.target) return;
    if (data.executiveSummary) return;
    setData(prev => ({
      ...prev,
      executiveSummary: generateExecutiveSummary({ ...summaryInput, target: data.target as SummaryTarget }),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.target]);

  /* auto-save on every change (skip first render) */
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    onSave(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const update = (partial: Partial<ReportBuilderData>) =>
    setData(prev => ({ ...prev, ...partial }));

  const regen = (field: 'projectBrief' | 'projectAdvantages' | 'pricingAnalysis') => {
    const v =
      field === 'projectBrief'
        ? generateProjectBrief({ location: project?.location, landArea: result?.areas?.landArea || num('landArea'), usageType: formInput?.usageType || formInput?.landType, floorsCount: num('floors', 4), totalUnits: result?.unitMix?.totalUnits, durationMonths: num('projectDurationMonths', 24) })
        : field === 'projectAdvantages'
        ? generateAdvantages({ streetWidth: num('streetWidth'), floorsCount: num('floors', 4), durationMonths: num('projectDurationMonths', 24), buildCostPerSqm: num('buildCostPerM2') }, { netMargin: result?.financials?.margin, irr: result?.financials?.irr })
        : generatePricingAnalysis(num('sellPricePerM2'), comparables);
    update({ [field]: v } as Partial<ReportBuilderData>);
  };

  const regenSummary = () => {
    if (!data.target) return;
    update({ executiveSummary: generateExecutiveSummary({ ...summaryInput, target: data.target as SummaryTarget }) });
  };

  /* completion */
  const done = [!!data.projectBrief, !!data.projectAdvantages, !!data.target, data.unitTypes.length > 0, !!data.distributionConfig];
  const completionPct = Math.round(done.filter(Boolean).length / done.length * 100);

  /* export guard */
  const canExport = !data.target ? false : data.target === 'internal' ? true : data.target === 'bank' ? gate.passed : true;
  const exportWarning =
    data.target === 'bank' && !gate.passed ? 'يتطلب التصدير للبنك اكتمال جميع المتطلبات الإلزامية'
    : (data.target === 'individual' || data.target === 'institutional') && confidence.total < 60
    ? `درجة الثقة ${confidence.total}% — يُنصح برفعها قبل الإرسال`
    : null;

  const gradeColor = confidence.total >= 80 ? '#15803d' : confidence.total >= 60 ? '#d97706' : '#dc2626';
  const tog = (id: string) => setOpenSection(p => p === id ? '' : id);

  const toneBadge =
    confidence.total >= 80 ? { label: 'نبرة: قوية',    cls: 'bg-green-100 text-green-700' }
    : confidence.total >= 60 ? { label: 'نبرة: متوازنة', cls: 'bg-amber-100 text-amber-700' }
    : { label: 'نبرة: حذرة', cls: 'bg-gray-100 text-gray-500' };

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-r overflow-hidden" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-800">تحويل إلى تقرير استثماري</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ثقة: <span style={{ color: gradeColor, fontWeight: 600 }}>{confidence.total}%</span>
            {' · '}اكتمال {completionPct}%
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">

        {/* ── الملخص التنفيذي ── */}
        <Acc id="executive" title="📋 الملخص التنفيذي" open={openSection === 'executive'} onToggle={() => tog('executive')}>
          <div className="mb-2">
            {data.target && (
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toneBadge.cls}`}>
                  {toneBadge.label}
                </span>
                <span className="text-xs text-gray-400">مولّد حسب الجهة ودرجة الثقة</span>
              </div>
            )}

            {!data.target && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                اختر الجهة المستهدفة أولاً لتوليد الملخص
              </p>
            )}

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">نص الملخص</label>
              <button
                onClick={regenSummary}
                disabled={!data.target}
                className="text-xs text-green-600 hover:text-green-800 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                ↺ إعادة توليد
              </button>
            </div>
            <textarea
              rows={8}
              value={data.executiveSummary}
              onChange={e => update({ executiveSummary: e.target.value })}
              placeholder={data.target ? 'سيظهر الملخص هنا...' : 'اختر الجهة المستهدفة أولاً'}
              className="w-full border rounded-lg p-3 text-sm resize-y leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />

            {data.target === 'bank' && (data.executiveSummary).includes('ننصح') && (
              <p className="text-xs text-red-500 mt-1">⚠ تجنب كلمة "ننصح" في تقارير البنك</p>
            )}
          </div>
        </Acc>

        <Acc id="narrative"    title="📝 نبذة ومزايا المشروع"  open={openSection === 'narrative'}    onToggle={() => tog('narrative')}>
          <NarrativeSection data={data} update={update} regen={regen}
            landAdvantages={getLandAdvantages(
              {
                zoningCode:  formInput?.regulatoryCode || formInput?.zoningCode,
                usageType:   formInput?.usageType || formInput?.landType,
                streetWidth: parseFloat(formInput?.streetWidth ?? '0') || undefined,
                floorsCount: parseFloat(formInput?.floors ?? '0') || undefined,
                landArea:    result?.areas?.landArea || parseFloat(formInput?.landArea ?? '0') || undefined,
              },
              zoningConfigs,
            )}
          />
        </Acc>
        <Acc id="units"        title="🏠 مكونات الوحدات"        open={openSection === 'units'}        onToggle={() => tog('units')}>
          <UnitsSection data={data} update={update} />
        </Acc>
        <Acc id="distribution" title="💰 توزيع الأرباح"         open={openSection === 'distribution'} onToggle={() => tog('distribution')}>
          <DistributionSection data={data} update={update} result={result} formInput={formInput} />
        </Acc>
        <Acc id="audience"     title="🎯 الجهة المستهدفة"        open={openSection === 'audience'}     onToggle={() => tog('audience')}>
          <AudienceSection data={data} update={update} exportWarning={exportWarning} />
        </Acc>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-5 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">إغلاق</button>
          <button
            onClick={() => canExport && onExport(data)}
            disabled={!canExport}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${canExport ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {!data.target ? 'اختر الجهة أولاً' : canExport ? `تصدير — ${TARGET_OPTIONS.find(t => t.id === data.target)?.label ?? ''}` : 'أكمل المتطلبات'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Accordion wrapper ──────────────────────────── */
function Acc({ title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-b">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 text-right hover:bg-gray-50 transition-colors">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`} style={{ display: 'inline-block' }}>▾</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

/* ── القسم ١: النبذة والمزايا ────────────────────── */
function NarrativeSection({ data, update, regen, landAdvantages }: {
  data:   ReportBuilderData;
  update: (p: Partial<ReportBuilderData>) => void;
  regen:  (f: 'projectBrief' | 'projectAdvantages' | 'pricingAnalysis') => void;
  landAdvantages: { advantage: string; weight: 'high' | 'medium' | 'low' }[];
}) {
  const fields: { key: 'projectBrief' | 'projectAdvantages' | 'pricingAnalysis'; label: string; rows: number }[] = [
    { key: 'projectBrief',      label: 'نبذة المشروع',  rows: 3 },
    { key: 'projectAdvantages', label: 'مزايا المشروع',  rows: 4 },
    { key: 'pricingAnalysis',   label: 'تحليل الأسعار', rows: 3 },
  ];
  return (
    <>
      {fields.map(f => (
        <div key={f.key} className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">{f.label}</label>
            <button onClick={() => regen(f.key)} className="text-xs text-green-600 hover:underline">↺ إعادة توليد</button>
          </div>
          <textarea
            rows={f.rows}
            value={data[f.key]}
            onChange={e => update({ [f.key]: e.target.value } as Partial<ReportBuilderData>)}
            className="w-full border rounded-lg p-2.5 text-sm resize-y focus:ring-2 focus:ring-green-500 focus:border-transparent leading-relaxed"
          />
          {f.key === 'projectAdvantages' && landAdvantages.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-gray-400">مزايا من الكود النظامي — اضغط للإضافة:</p>
              {landAdvantages.map((adv, i) => (
                <div key={i}
                  onClick={() => {
                    if (!data.projectAdvantages?.includes(adv.advantage)) {
                      update({ projectAdvantages: (data.projectAdvantages || '') +
                        (data.projectAdvantages ? '\n' : '') + `✓ ${adv.advantage}` });
                    }
                  }}
                  className="flex items-start gap-2 text-xs cursor-pointer hover:bg-green-50 rounded p-1.5 border border-transparent hover:border-green-200 transition-all"
                >
                  <span className={adv.weight === 'high' ? 'text-green-600' : adv.weight === 'medium' ? 'text-amber-500' : 'text-gray-400'}>✓</span>
                  <span className="text-gray-600 flex-1">{adv.advantage}</span>
                  <span className="text-gray-300 text-[10px] flex-shrink-0">+ إضافة</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ── القسم ٢: الوحدات ────────────────────────────── */
function UnitsSection({ data, update }: {
  data:   ReportBuilderData;
  update: (p: Partial<ReportBuilderData>) => void;
}) {
  const setUnits = (units: ReportUnitRow[]) => update({ unitTypes: units });
  return (
    <>
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {['نوع الوحدة', 'مساحة م²', 'العدد', 'السعر ر.س', 'الإيراد', ''].map(h => (
                <th key={h} className="p-2 text-right font-medium text-gray-600 border-b whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.unitTypes.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-1">
                  <input value={u.typeName} placeholder="شقة 3 غرف"
                    onChange={e => setUnits(data.unitTypes.map(x => x.id === u.id ? { ...x, typeName: e.target.value } : x))}
                    className="w-24 p-1 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-green-400 rounded" />
                </td>
                {(['areaSqm', 'count', 'sellPricePerUnit'] as const).map(field => (
                  <td key={field} className="p-1">
                    <input type="number" value={(u as any)[field] || ''}
                      onChange={e => setUnits(data.unitTypes.map(x => {
                        if (x.id !== u.id) return x;
                        const next = { ...x, [field]: +e.target.value };
                        next.totalRevenue = next.count * next.sellPricePerUnit;
                        return next;
                      }))}
                      className="w-16 p-1 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-green-400 rounded" />
                  </td>
                ))}
                <td className="p-1 text-xs text-green-700 font-medium whitespace-nowrap">
                  {u.totalRevenue > 0 ? (u.totalRevenue / 1e6).toFixed(2) + 'م' : '—'}
                </td>
                <td className="p-1">
                  <button onClick={() => setUnits(data.unitTypes.filter(x => x.id !== u.id))} className="text-red-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => setUnits([...data.unitTypes, { id: Date.now().toString(), typeName: '', areaSqm: 0, count: 0, sellPricePerUnit: 0, totalRevenue: 0 }])}
        className="text-xs text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
      >
        + إضافة نوع وحدة
      </button>
    </>
  );
}

/* ── القسم ٣: التوزيع ────────────────────────────── */
function DistributionSection({ data, update, result, formInput }: {
  data:      ReportBuilderData;
  update:    (p: Partial<ReportBuilderData>) => void;
  result:    any;
  formInput: Record<string, string>;
}) {
  const cfg = data.distributionConfig ?? DEFAULT_DIST;
  const netProfit = result?.financials?.net ?? 0;
  const preview = netProfit > 0
    ? calculateDistribution(cfg, {
        netProfit,
        constructionCost: result?.costs?.totalBuildCost ?? 0,
        totalCost:        result?.costs?.totalCost      ?? 0,
        durationMonths:   parseFloat(formInput?.projectDurationMonths ?? '24') || 24,
      })
    : null;

  const fields: { id: keyof ProfitDistributionConfig; label: string }[] = [
    { id: 'bankFinancingPercent',        label: 'تمويل البنك %'               },
    { id: 'developerCapitalPercent',     label: 'حصة المطور من رأس المال %'   },
    { id: 'investorCapitalPercent',      label: 'حصة المستثمرين %'            },
    { id: 'developerFeeOnConstruction',  label: 'رسوم المطور على البناء %'    },
    { id: 'developerProfitSharePercent', label: 'حصة المطور من الأرباح %'     },
    { id: 'bankInterestRate',            label: 'سعر الفائدة %'               },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map(f => (
          <div key={f.id}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input type="number" value={cfg[f.id]}
              onChange={e => update({ distributionConfig: { ...cfg, [f.id]: +e.target.value } })}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
        ))}
      </div>
      {preview && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'المطور',       value: preview.developerConstructionFee + preview.developerProfitShare, roi: preview.developerROI, color: '#15803d' },
            { label: 'المستثمرون',   value: preview.investorProfitShare,                                    roi: preview.investorROI,   color: '#d97706' },
            { label: 'البنك (فائدة)', value: preview.bankInterestCost,                                      roi: null,                  color: '#6b7280' },
          ].map(c => (
            <div key={c.label} className="bg-gray-50 rounded-lg p-2 border text-center">
              <div className="text-xs text-gray-400 mb-1">{c.label}</div>
              <div className="text-sm font-semibold" style={{ color: c.color }}>{(c.value / 1e6).toFixed(2)}م</div>
              {c.roi != null && <div className="text-xs text-gray-400 mt-0.5">ROI {c.roi.toFixed(0)}%</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── القسم ٤: الجهة المستهدفة ──────────────────── */
function AudienceSection({ data, update, exportWarning }: {
  data:          ReportBuilderData;
  update:        (p: Partial<ReportBuilderData>) => void;
  exportWarning: string | null;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {TARGET_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => update({ target: opt.id, executiveSummary: '' })}
            className={`flex items-start gap-2 p-3 rounded-xl border-2 text-right transition-all
              ${data.target === opt.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
          >
            <span className="text-lg">{opt.icon}</span>
            <div>
              <div className="text-xs font-medium text-gray-800">{opt.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {data.target && (
        <input type="text" value={data.targetName}
          onChange={e => update({ targetName: e.target.value })}
          placeholder={data.target === 'bank' ? 'اسم البنك — مثال: بنك الرياض' : 'اسم الجهة (اختياري)'}
          className="w-full border rounded-lg p-2.5 text-sm mb-2 focus:ring-2 focus:ring-green-500" />
      )}

      {(data.target === 'individual' || data.target === 'institutional') && (
        <div className="mb-2">
          <label className="block text-xs text-gray-500 mb-1">رأس المال الخاص المستثمر ر.س</label>
          <input type="number" value={data.investorOwnCapital || ''}
            onChange={e => update({ investorOwnCapital: +e.target.value })}
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500" placeholder="0" />
        </div>
      )}

      {exportWarning && (
        <div className={`mt-2 p-2.5 rounded-lg text-xs ${data.target === 'bank' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          {exportWarning}
        </div>
      )}
    </>
  );
}
