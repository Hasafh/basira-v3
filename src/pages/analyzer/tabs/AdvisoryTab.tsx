import { useMemo, useState } from 'react';
import { calculateReadiness, calculateConfidence, getMarketInsight, getReportUsage } from '../../../lib/engines/confidenceEngine';
import type { AdvisoryRequiredInputs, EvidenceSourceType } from '../../../lib/types/report';
import { ReadinessPanel } from '../../../components/advisory/ReadinessPanel';
import { ComparablesInput } from '../../../components/advisory/ComparablesInput';
import { FundingDrawer } from '../../../components/report/FundingDrawer';
import { useAnalysisStore } from '../../../store/analysisStore';

const SOURCE_LABELS: Record<EvidenceSourceType, string> = {
  government:          'حكومي — وزارة العدل',
  certified_appraisal: 'تقييم معتمد RICS',
  broker_data:         'وسيط عقاري',
  internal_excel:      'Excel داخلي',
  manual_input:        'إدخال يدوي',
};

const ZONING_LABELS = {
  official: 'وثيقة نظامية رسمية',
  manual:   'إدخال يدوي موثّق',
};

interface Props {
  project: any;
}

const DEFAULT_ADVISORY: AdvisoryRequiredInputs = {
  valuationReport:    false,
  comparableProjects: [],
  marketDataSource:   null,
  zoningDocument:     null,
  contractorQuotes:   0,
  landLegalStatus:    false,
};

export default function AdvisoryTab({ project }: Props) {
  const { projectResults, projectAdvisoryInputs, setAdvisoryInputs, saveProjectSnapshot, formInput } = useAnalysisStore();
  const result = projectResults[project?.id] ?? project?.result ?? null;

  const [showFundingDrawer, setShowFundingDrawer] = useState(false);

  /* ── Read from store (survives navigation + refresh) ── */
  const inputs: AdvisoryRequiredInputs =
    projectAdvisoryInputs[project?.id] ?? DEFAULT_ADVISORY;

  const set = <K extends keyof AdvisoryRequiredInputs>(key: K, val: AdvisoryRequiredInputs[K]) =>
    setAdvisoryInputs(project.id, { ...inputs, [key]: val });

  /* ── Engine outputs — reactive, no manual trigger ── */
  const gate       = useMemo(() => calculateReadiness(inputs), [inputs]);
  const confidence = useMemo(() => calculateConfidence(inputs), [inputs]);
  const insight    = useMemo(() => getMarketInsight(confidence, inputs.comparableProjects), [confidence, inputs.comparableProjects]);
  const usage      = useMemo(() => getReportUsage(confidence.grade), [confidence.grade]);

  /* ── Indicative report — always available from existing result ── */
  const fin  = result?.financials ?? result?.feasibility?.financials ?? null;
  const costs = result?.costs     ?? result?.feasibility?.costs      ?? null;
  const areas = result?.areas     ?? result?.feasibility?.areas      ?? null;

  const sv = (v: number | null | undefined, d = 1) =>
    v != null && isFinite(v) ? v.toFixed(d) : '--';

  const handleGenerateAdvisory = () => {
    if (confidence.total < 60) return;
    saveProjectSnapshot({
      projectId:         project.id,
      timestamp:         new Date(),
      landPrice:         parseFloat(formInput.landPricePerM2  ?? '0') || 0,
      sellPrice:         parseFloat(formInput.sellPricePerM2  ?? '0') || 0,
      buildCost:         parseFloat(formInput.buildCostPerM2  ?? '0') || 0,
      confidence,
      readinessScore:    gate.readinessScore,
      grade:             confidence.grade,
      predictedIRR:      fin?.irr  ?? 0,
      predictedNPV:      fin?.npv  ?? 0,
      predictedDuration: parseFloat(formInput.projectDurationMonths ?? '24') || 24,
    });
    window.open(`/report/advisory/${project.id}`, '_blank');
  };

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6" dir="rtl">

      {/* ════════════════════════════════════════════════════
          TIER COMPARISON BANNER
          ════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Indicative */}
        <div className="rounded-2xl p-4"
          style={{ background: 'white', border: '1px solid rgba(10,12,18,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />
            <p className="font-bold text-sm" style={{ color: '#2563eb' }}>التقرير الاسترشادي</p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
              متاح الآن
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
            للاستخدام الداخلي — مبني على بيانات النظام فقط
          </p>
          <ul className="mt-2 space-y-0.5 text-xs" style={{ color: 'rgba(10,12,18,0.55)' }}>
            <li>✓ IRR / NPV / هامش الربح</li>
            <li>✓ تحليل السيناريوهات</li>
            <li>✓ مؤشرات الامتثال النظامي</li>
            <li style={{ color: 'rgba(10,12,18,0.3)' }}>✗ غير مقبول للبنك أو المستثمر الخارجي</li>
          </ul>
        </div>

        {/* Advisory */}
        <div className="rounded-2xl p-4"
          style={{ background: 'white', border: `1px solid ${gate.passed ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.15)'}` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full"
              style={{ background: gate.passed ? '#16a34a' : '#dc2626' }} />
            <p className="font-bold text-sm"
              style={{ color: gate.passed ? '#16a34a' : '#dc2626' }}>
              التقرير الاستشاري
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: gate.passed ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                color:      gate.passed ? '#16a34a'               : '#dc2626',
              }}>
              {gate.passed ? `${confidence.total}٪ ثقة` : `محجوب — ${gate.missingFields.length} ناقص`}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
            للبنك والمستثمر — يستلزم مستندات موثّقة
          </p>
          <ul className="mt-2 space-y-0.5 text-xs" style={{ color: 'rgba(10,12,18,0.55)' }}>
            <li>✓ كل مزايا الاسترشادي</li>
            <li>✓ تقييم سعري موثّق بالمقارنات</li>
            <li>✓ تحليل مصادر البيانات وموثوقيتها</li>
            <li>✓ تصنيف رسمي: مشروط / استثماري</li>
          </ul>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          INDICATIVE SUMMARY — always shown
          ════════════════════════════════════════════════════ */}
      {fin ? (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid rgba(10,12,18,0.08)' }}>
          <div className="px-5 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(10,12,18,0.06)', background: 'rgba(37,99,235,0.03)' }}>
            <span style={{ color: '#2563eb' }}>📊</span>
            <p className="font-bold text-sm" style={{ color: '#2563eb' }}>ملخص التقرير الاسترشادي</p>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'IRR',          value: `${sv(fin.irr)}٪`,    color: '#16a34a' },
              { label: 'هامش الربح',   value: `${sv(fin.margin)}٪`, color: '#B8924A' },
              { label: 'ROI',          value: `${sv(fin.roi)}٪`,    color: '#2563eb' },
              { label: 'صافي الربح',   value: fin.net != null ? `${(fin.net / 1e6).toFixed(2)}م` : '--', color: '#7c3aed' },
            ].map(k => (
              <div key={k.label} className="text-center rounded-xl p-3"
                style={{ background: `${k.color}08`, border: `1px solid ${k.color}22` }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{k.label}</p>
                <p className="text-xl font-black num" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          {areas && costs && (
            <div className="px-5 pb-4 grid grid-cols-3 gap-3 text-xs">
              {[
                { label: 'مساحة البيع',   value: `${Math.round(areas.sellableArea ?? 0).toLocaleString()} م²` },
                { label: 'التكلفة الكلية', value: `${((costs.totalCost ?? 0) / 1e6).toFixed(2)} م ر.س` },
                { label: 'الإيراد الكلي',  value: `${((fin.revenue ?? 0) / 1e6).toFixed(2)} م ر.س` },
              ].map(r => (
                <div key={r.label} className="rounded-lg p-2 text-center"
                  style={{ background: 'rgba(10,12,18,0.03)', border: '1px solid rgba(10,12,18,0.06)' }}>
                  <p style={{ color: 'rgba(10,12,18,0.4)' }}>{r.label}</p>
                  <p className="font-bold num mt-0.5" style={{ color: '#0A0C12' }}>{r.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center"
          style={{ background: 'white', border: '1px solid rgba(10,12,18,0.08)' }}>
          <p className="text-sm" style={{ color: 'rgba(10,12,18,0.4)' }}>
            شغّل التحليل الأساسي أولاً لعرض ملخص التقرير الاسترشادي
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          ADVISORY INPUTS — Quality Gate
          ════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Checklist inputs */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm" style={{ color: '#0A0C12' }}>
            متطلبات التقرير الاستشاري
          </h3>

          {/* Valuation report */}
          <CheckRow
            label="تقييم عقاري معتمد من مقيّم مرخص"
            checked={inputs.valuationReport}
            onChange={v => set('valuationReport', v)}
            weight="حاسم"
          />

          {/* Market data source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
              مصدر بيانات السوق
            </label>
            <select
              value={inputs.marketDataSource ?? ''}
              onChange={e => set('marketDataSource', (e.target.value || null) as EvidenceSourceType | null)}
              className="w-full text-sm p-2.5 rounded-xl"
              style={{ border: '1px solid rgba(10,12,18,0.12)', background: 'white', color: '#0A0C12' }}
            >
              <option value="">— اختر المصدر —</option>
              {(Object.entries(SOURCE_LABELS) as [EvidenceSourceType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Zoning document */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
              الكود النظامي — نوع التوثيق
            </label>
            <div className="flex gap-2">
              {(['official', 'manual'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => set('zoningDocument', opt)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: inputs.zoningDocument === opt ? 'rgba(37,99,235,0.10)' : 'rgba(10,12,18,0.04)',
                    border:     inputs.zoningDocument === opt ? '1px solid rgba(37,99,235,0.30)' : '1px solid rgba(10,12,18,0.09)',
                    color:      inputs.zoningDocument === opt ? '#2563eb'                         : 'rgba(10,12,18,0.5)',
                  }}
                >
                  {ZONING_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Contractor quotes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
              عدد عروض المقاولين (الحد الأدنى 3)
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => set('contractorQuotes', n)}
                  className="w-10 h-9 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: inputs.contractorQuotes === n
                      ? (n >= 3 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)')
                      : 'rgba(10,12,18,0.04)',
                    border:     inputs.contractorQuotes === n
                      ? (n >= 3 ? '1px solid rgba(22,163,74,0.30)' : '1px solid rgba(220,38,38,0.25)')
                      : '1px solid rgba(10,12,18,0.09)',
                    color:      inputs.contractorQuotes === n
                      ? (n >= 3 ? '#16a34a' : '#dc2626')
                      : 'rgba(10,12,18,0.5)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Legal status */}
          <CheckRow
            label="إقرار خلو الأرض من النزاعات القانونية"
            checked={inputs.landLegalStatus}
            onChange={v => set('landLegalStatus', v)}
            weight="إلزامي"
          />
        </div>

        {/* Right: Comparables */}
        <div className="space-y-4">
          <ComparablesInput
            value={inputs.comparableProjects}
            onChange={v => setAdvisoryInputs(project.id, { ...inputs, comparableProjects: v })}
          />

          {/* Market Insight */}
          {insight.signal !== 'blocked' && (
            <div className="rounded-xl p-3"
              style={{
                background: insight.signal === 'reliable'
                  ? 'rgba(22,163,74,0.05)' : 'rgba(217,119,6,0.05)',
                border: insight.signal === 'reliable'
                  ? '1px solid rgba(22,163,74,0.18)' : '1px solid rgba(217,119,6,0.18)',
              }}>
              <p className="text-xs font-bold"
                style={{ color: insight.signal === 'reliable' ? '#16a34a' : '#d97706' }}>
                {insight.signal === 'reliable' ? '✓' : '~'} {insight.message}
              </p>
              {insight.detail && (
                <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.5)' }}>
                  {insight.detail}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          READINESS PANEL — Gate + Generate button
          ════════════════════════════════════════════════════ */}
      <ReadinessPanel
        gate={gate}
        confidence={confidence}
        onGenerate={handleGenerateAdvisory}
      />

      {/* ════════════════════════════════════════════════════
          FUNDING FILE BUTTON
          ════════════════════════════════════════════════════ */}
      {gate.passed && (
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(15,61,46,0.04), rgba(15,61,46,0.08))', border: '1px solid rgba(15,61,46,0.15)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-sm" style={{ color: '#0F3D2E' }}>🏦 الملف التمويلي</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                تقرير جاهز للتقديم للبنك أو المستثمر — يشمل DSCR وجدول الديون والتدفقات الشهرية
              </p>
            </div>
            <button
              onClick={() => setShowFundingDrawer(true)}
              className="shrink-0 font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #0F3D2E, #1A6B4A)',
                color: 'white', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(15,61,46,0.30)',
                fontFamily: 'Cairo, Tajawal, sans-serif',
              }}
            >
              🏦 إصدار ملف تمويلي
            </button>
          </div>
        </div>
      )}

      {/* Funding Drawer */}
      {showFundingDrawer && (
        <FundingDrawer
          project={project}
          result={result}
          formInput={formInput}
          confidence={confidence.total}
          irr={fin?.irr ?? undefined}
          onClose={() => setShowFundingDrawer(false)}
        />
      )}

    </div>
  );
}

/* ── CheckRow ── */
function CheckRow({
  label, checked, onChange, weight,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  weight: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all"
      style={{
        background: checked ? 'rgba(22,163,74,0.06)' : 'rgba(10,12,18,0.03)',
        border:     checked ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(10,12,18,0.09)',
      }}
    >
      <span
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
        style={{
          background: checked ? '#16a34a' : 'white',
          border:     checked ? 'none'    : '1.5px solid rgba(10,12,18,0.25)',
        }}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </span>
      <span className="flex-1 text-xs font-medium text-right" style={{ color: '#0A0C12' }}>
        {label}
      </span>
      <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'rgba(10,12,18,0.06)', color: 'rgba(10,12,18,0.4)' }}>
        {weight}
      </span>
    </button>
  );
}
