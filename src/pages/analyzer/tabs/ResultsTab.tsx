import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useAnalysis }                          from '../../../hooks/useAnalysis';
import { useAnalysisStore }                     from '../../../store/analysisStore';
import type { AnalysisStore }                   from '../../../store/analysisStore';
import { runDefaultScenarios }                  from '../../../engines/scenarios';
import type { FeasibilityInput } from '../../../engines/feasibility/types';
import { fmt, fmtM } from '../../../utils/format';
import StressTestTab      from '../../tools/StressTestPage';
import SensitivityTab     from '../../tools/SensitivityPage';
import HBUTab             from '../../tools/HbuPage';
import AuctionTab         from '../../tools/AuctionPage';
import TimeSensitivityTab from '../../tools/TimeSensitivityPage';

/* ── Tab definitions ─────────────────────────────────────── */
const RESULT_TABS = [
  { id: 'overview',         label: 'نظرة عامة',       icon: '📊', color: '#B8924A' },
  { id: 'scenarios',        label: 'سيناريوهات',       icon: '🎭', color: '#16a34a' },
  { id: 'stress',           label: 'اختبار الضغط',    icon: '🛡️', color: '#dc2626' },
  { id: 'sensitivity',      label: 'الحساسية',         icon: '📉', color: '#2563eb' },
  { id: 'hbu',              label: 'الاستخدام الأمثل', icon: '🔍', color: '#7c3aed' },
  { id: 'auction',          label: 'دراسة المزاد',     icon: '🔨', color: '#d97706' },
  { id: 'time-sensitivity', label: 'الحساسية الزمنية', icon: '⏱️', color: '#0284c7' },
];

/* ═══════════════════════════════════════════════════════════
   ResultsTab
   ═══════════════════════════════════════════════════════════ */
export default function ResultsTab({ project }: { project: any }) {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { isAnalyzed } = useAnalysis();
  const store       = useAnalysisStore();
  const { lastResult } = store;
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');

  /* ── No analysis yet ── */
  if (!isAnalyzed && !project?.result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <div className="text-5xl">📊</div>
        <p className="text-base font-bold" style={{ color: 'rgba(10,12,18,0.6)' }}>
          لم يتم تشغيل التحليل بعد
        </p>
        <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
          شغّل التحليل الأساسي أولاً لعرض نتائج الضغط والحساسية والاستخدام الأمثل
        </p>
        <button
          onClick={() => navigate(`/project/${id}#basics`)}
          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
        >
          انتقل للمحلل ←
        </button>
      </div>
    );
  }

  const r      = lastResult || project?.result;
  const active = RESULT_TABS.find(t => t.id === activeSubTab)!;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-2 overflow-x-auto shrink-0"
        style={{ background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)', scrollbarWidth: 'none' }}
      >
        {RESULT_TABS.map(t => {
          const isActive = t.id === activeSubTab;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all"
              style={{
                background: isActive ? `${t.color}12` : 'transparent',
                color:      isActive ? t.color : 'rgba(10,12,18,0.45)',
                fontWeight: isActive ? 600 : 400,
                border:     isActive ? `1px solid ${t.color}30` : '1px solid transparent',
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-auto" style={{ background: '#F4F3EF' }}>
        {activeSubTab === 'overview'         && <OverviewTab    r={r} store={store} />}
        {activeSubTab === 'scenarios'        && <ScenariosTab   r={r} store={store} />}
        {activeSubTab === 'stress'           && <StressTestTab      project={project} />}
        {activeSubTab === 'sensitivity'      && <SensitivityTab     project={project} analysisResult={r} />}
        {activeSubTab === 'hbu'              && <HBUTab             project={project} />}
        {activeSubTab === 'auction'          && <AuctionTab         project={project} />}
        {activeSubTab === 'time-sensitivity' && <TimeSensitivityTab project={project} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OverviewTab — Charts derived solely from lastResult
   ═══════════════════════════════════════════════════════════ */
const PIE_COLORS: Record<string, string> = {
  'أرض (خام)': '#B8924A',
  'RETT 5٪':   '#f59e0b',
  'بناء':       '#2563eb',
  'ناعمة':      '#7c3aed',
  'احتياطي':    '#d97706',
  'تمويل':      '#dc2626',
};

function buildCashFlowCurve(
  landCost: number,
  constructionCost: number,
  revenue: number,
  durationMonths: number,
) {
  const months = Math.max(12, Math.min(durationMonths, 48));
  const cEnd   = Math.round(months * 0.65);  // construction ends at 65%
  const sStart = Math.round(months * 0.65);  // sales start when construction finishes

  const weights = Array.from({ length: cEnd }, (_, i) => Math.sin(((i + 1) / cEnd) * Math.PI));
  const wTotal  = weights.reduce((a, b) => a + b, 0) || 1;

  const rows: Array<{ month: number; صرف: number; إيراد: number; تراكمي: number }> = [];
  let cumulative = 0;

  // Month 0: land purchase — FIRST cash outflow
  cumulative -= landCost;
  rows.push({ month: 0, صرف: -Math.round(landCost / 1e6 * 100) / 100, إيراد: 0, تراكمي: Math.round(cumulative / 1e6 * 100) / 100 });

  for (let m = 1; m <= months; m++) {
    const cWeight     = m <= cEnd ? weights[m - 1] : 0;
    const monthlyCost = cWeight > 0 ? (constructionCost * cWeight) / wTotal : 0;
    const salesMonths = months - sStart + 1;
    const monthlyRev  = m >= sStart ? revenue / salesMonths : 0;

    cumulative += monthlyRev - monthlyCost;
    rows.push({
      month:   m,
      صرف:     -Math.round(monthlyCost / 1e6 * 100) / 100,
      إيراد:    Math.round(monthlyRev  / 1e6 * 100) / 100,
      تراكمي:  Math.round(cumulative   / 1e6 * 100) / 100,
    });
  }
  return rows;
}

function OverviewTab({ r, store }: { r: any; store: AnalysisStore }) {
  // Support both flat {financials,costs} and wrapped {feasibility:{financials,costs}} shapes
  const _r        = r?.feasibility ?? r;
  const costs      = _r?.costs;
  const financials = _r?.financials;

  /* Cost breakdown pie — RETT shown as separate slice */
  const costPieData = [
    { name: 'أرض (خام)',  value: costs?.landBasePrice ?? (costs?.landCost ? costs.landCost / 1.05 : 0) },
    { name: 'RETT 5٪',   value: costs?.rettCost      ?? (costs?.landCost ? costs.landCost * (0.05/1.05) : 0) },
    { name: 'بناء',       value: costs?.buildCost     || 0 },
    { name: 'ناعمة',      value: costs?.softCosts     || 0 },
    { name: 'احتياطي',    value: costs?.contingency   || 0 },
    { name: 'تمويل',      value: costs?.financingCost || 0 },
  ].filter(d => d.value > 0);

  /* Monthly cash flow S-curve */
  const duration  = store.lastInput?.projectDurationMonths || 24;
  const cashFlow  = useMemo(
    () => buildCashFlowCurve(
      costs?.landCost || 0,
      (costs?.totalCost || 0) - (costs?.landCost || 0),
      financials?.revenue || 0,
      duration,
    ),
    [costs?.landCost, costs?.totalCost, financials?.revenue, duration],
  );

  /* KPIs */
  const kpis = [
    { label: 'IRR',    value: `${financials?.irr?.toFixed(1)}٪`,    color: '#16a34a' },
    { label: 'هامش',  value: `${financials?.margin?.toFixed(1)}٪`,  color: '#B8924A' },
    { label: 'ROI',    value: `${financials?.roi?.toFixed(1)}٪`,    color: '#2563eb' },
    { label: 'صافي الربح', value: `${fmtM(financials?.net || 0)}م`, color: '#7c3aed' },
  ];

  if (!costs) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
        style={{ color: 'rgba(10,12,18,0.4)' }}>
        لا توجد بيانات — شغّل التحليل أولاً
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto" dir="rtl">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-4 text-center"
            style={{ background: 'white', border: `1px solid ${k.color}22`, boxShadow: `0 2px 8px ${k.color}08` }}>
            <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{k.label}</p>
            <p className="text-2xl font-bold num" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Cost Breakdown Pie */}
      <div style={chartCard}>
        <h4 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>🥧 توزيع التكاليف</h4>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={costPieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}٪`}
                labelLine={false}
              >
                {costPieData.map((entry) => (
                  <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [`${fmtM(Number(v))} مليون ر.س`, '']}
                contentStyle={{ fontFamily: 'Tajawal', borderRadius: 10, border: '1px solid rgba(184,146,74,0.2)' }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-col gap-2 shrink-0">
            {costPieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: PIE_COLORS[d.name] || '#999' }} />
                <span style={{ color: 'rgba(10,12,18,0.65)' }}>{d.name}</span>
                <span className="num font-bold" style={{ color: PIE_COLORS[d.name] || '#999' }}>
                  {fmtM(d.value)}م
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow S-curve */}
      <div style={chartCard}>
        <h4 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>
          📈 التدفق النقدي الشهري (منحنى S)
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cashFlow}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8924A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#B8924A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
            <XAxis dataKey="month" tickFormatter={v => `ش${v}`}
              tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}م`}
              tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: any, name: string) => [`${Number(v).toFixed(2)} مليون ر.س`, name]}
              contentStyle={{ fontFamily: 'Tajawal', borderRadius: 10, border: '1px solid rgba(184,146,74,0.2)' }} />
            <Bar dataKey="صرف"   fill="rgba(239,68,68,0.6)"   radius={[2, 2, 0, 0]} />
            <Area type="monotone" dataKey="تراكمي"
              stroke="#B8924A" strokeWidth={2} fill="url(#cumGrad)" dot={false} />
            <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.35)' }}>
          * مبسّط — صرف خلال مرحلة الإنشاء، إيرادات خلال مرحلة البيع
        </p>
      </div>

      {/* Revenue vs Cost bar */}
      <div style={chartCard}>
        <h4 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>⚖️ الإيراد مقابل التكلفة</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={[
            { name: 'التكلفة الإجمالية', قيمة: Math.round((costs.totalCost || 0) / 1e6 * 100) / 100, fill: '#dc2626' },
            { name: 'الإيراد',           قيمة: Math.round((financials?.revenue || 0) / 1e6 * 100) / 100, fill: '#16a34a' },
            { name: 'صافي الربح',        قيمة: Math.round((financials?.net || 0) / 1e6 * 100) / 100, fill: '#B8924A' },
          ]} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}م`} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: any) => [`${Number(v).toFixed(2)} مليون ر.س`, '']}
              contentStyle={{ fontFamily: 'Tajawal', borderRadius: 10, border: '1px solid rgba(184,146,74,0.2)' }} />
            <Bar dataKey="قيمة" radius={[6, 6, 0, 0]}>
              {[
                { fill: '#dc2626' },
                { fill: '#16a34a' },
                { fill: '#B8924A' },
              ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ScenariosTab — 3 default scenarios compared side-by-side
   ═══════════════════════════════════════════════════════════ */
function ScenariosTab({ r, store }: { r: any; store: AnalysisStore }) {
  /* Build FeasibilityInput from store state */
  const baseInput = useMemo((): FeasibilityInput | null => {
    const {
      landArea, landPricePerM2, sellPricePerM2, buildCostPerM2,
      floors, groundCoverage, softCostsPct, contingencyPct,
      financingStructure, lastInput,
    } = store;

    const la  = lastInput?.landArea          || landArea;
    const lp  = lastInput?.landPricePerM2    || landPricePerM2;
    const sp  = lastInput?.sellPricePerM2    || sellPricePerM2;
    const bc  = lastInput?.buildCostPerM2    || buildCostPerM2;
    const fl  = lastInput?.floors            || floors;
    const gcr = lastInput?.groundCoverageRatio || groundCoverage;

    if (!la || !sp || !bc) return null;

    return {
      landArea:            la,
      landPricePerM2:      lp || 0,
      floors:              fl || 4,
      groundCoverageRatio: gcr || 0.6,
      buildCostPerM2:      bc,
      sellPricePerM2:      sp,
      softCostsPct:        lastInput?.softCostsPct    || softCostsPct    || 0.05,
      contingencyPct:      lastInput?.contingencyPct  || contingencyPct  || 0.05,
      bankPct:             financingStructure.bankPct,
      interestRate:        financingStructure.bankInterestRate / 100,
      projectDurationMonths: lastInput?.projectDurationMonths || 24,
    };
  }, [store]);

  const scenarios = useMemo(
    () => baseInput ? runDefaultScenarios(baseInput) : [],
    [baseInput],
  );

  if (!baseInput || scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
        style={{ color: 'rgba(10,12,18,0.4)' }}>
        شغّل التحليل أولاً لعرض السيناريوهات
      </div>
    );
  }

  const TAG_STYLE: Record<string, { color: string; bg: string }> = {
    optimistic:  { color: '#16a34a', bg: 'rgba(34,197,94,0.08)'   },
    base:        { color: '#B8924A', bg: 'rgba(184,146,74,0.08)'  },
    pessimistic: { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'   },
    custom:      { color: '#2563eb', bg: 'rgba(37,99,235,0.08)'   },
  };

  /* Bar chart data for IRR comparison */
  const barData = scenarios.map(s => ({
    name:  s.label,
    IRR:   Math.round((s.result.financials.irr || 0) * 10) / 10,
    هامش: Math.round((s.result.financials.margin || 0) * 10) / 10,
    fill:  TAG_STYLE[s.tag].color,
  }));

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto" dir="rtl">
      <div className="rounded-xl p-3 text-xs"
        style={{ background: 'rgba(184,146,74,0.06)', border: '1px solid rgba(184,146,74,0.18)', color: 'rgba(10,12,18,0.6)' }}>
        🎭 مقارنة 3 سيناريوهات — المصدر: مدخلات التحليل الحالي
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map(s => {
          const st = TAG_STYLE[s.tag];
          const f  = s.result.financials;
          const c  = s.result.costs;
          return (
            <div key={s.tag} className="rounded-2xl p-4 space-y-3"
              style={{ background: 'white', border: `1px solid ${st.color}25`, boxShadow: `0 2px 12px ${st.color}0A` }}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm" style={{ color: st.color }}>{s.label}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: st.bg, color: st.color }}>
                  {s.tag === 'optimistic' ? '↑' : s.tag === 'pessimistic' ? '↓' : '='}
                </span>
              </div>
              {[
                { label: 'IRR',         value: f.irr    != null && isFinite(f.irr)    ? `${f.irr.toFixed(1)}٪`    : '--', color: st.color },
                { label: 'هامش',       value: f.margin != null && isFinite(f.margin) ? `${f.margin.toFixed(1)}٪` : '--', color: st.color },
                { label: 'ROI',         value: f.roi    != null && isFinite(f.roi)    ? `${f.roi.toFixed(1)}٪`    : '--', color: 'rgba(10,12,18,0.6)' },
                { label: 'صافي الربح', value: `${fmtM(f.net)} مليون`,          color: 'rgba(10,12,18,0.7)' },
                { label: 'التكلفة',    value: `${fmtM(c.totalCost)} مليون`,    color: 'rgba(10,12,18,0.5)' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1"
                  style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                  <span className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>{row.label}</span>
                  <span className="text-sm font-bold num" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div className="rounded-xl px-3 py-2 text-xs font-medium mt-1"
                style={{ background: st.bg, color: st.color }}>
                {s.result.summary.isBuy ? '✅ مجدية' : '❌ غير مجدية'}
              </div>
            </div>
          );
        })}
      </div>

      {/* IRR comparison bar chart */}
      <div style={chartCard}>
        <h4 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>📊 مقارنة IRR والهامش</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}٪`} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}٪`, name]}
              contentStyle={{ fontFamily: 'Tajawal', borderRadius: 10, border: '1px solid rgba(184,146,74,0.2)' }} />
            <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 12 }} />
            <Bar dataKey="IRR" barSize={32} radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
            <Bar dataKey="هامش" barSize={32} radius={[6, 6, 0, 0]} opacity={0.65}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Shared styles ─────────────────────────────────────── */
const chartCard: React.CSSProperties = {
  background:   'white',
  border:       '1px solid rgba(10,12,18,0.07)',
  borderRadius: '16px',
  padding:      '20px',
};
