import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAnalysis } from '../../../hooks/useAnalysis';
import { useProjectsStore } from '../../../store';
import { aiAPI } from '../../../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

import { fmt, fmtM, pct, today as todayFn } from '../../../utils/format';
const today = todayFn();

/* ── Print CSS ── */
const PRINT = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .pg-break { page-break-before: always !important; break-before: page !important; }
  body * { visibility: hidden; }
  .report-content, .report-content * { visibility: visible; }
  .report-content { position: absolute; left: 0; top: 0; width: 100%; }
  .no-break { page-break-inside: avoid; }
  .rpt-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; margin-bottom: 0 !important; }
  body { background: white !important; }
}
@media screen {
  .rpt-card { max-width: 860px; margin: 0 auto 24px; background: white; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); overflow: hidden; }
  .pg-sim { min-height: 297mm; }
}
`;

/* ── Shared layout helpers ── */
function PHdr({ project }: { project?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '2px solid #0A0C12', marginBottom: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: '#0A0C12', letterSpacing: '0.02em' }}>
        بصيرة <span style={{ fontWeight: 300, color: '#B8924A' }}>/ BASIRA ANALYTICS</span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', textAlign: 'center' }}>{project || 'مشروع'}</div>
      <div style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)' }}>{today}</div>
    </div>
  );
}

function PFtr({ page, total, label }: { page: number; total: number; label?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid rgba(10,12,18,0.08)', marginTop: 16, fontSize: 9 }}>
      <span style={{ color: 'rgba(10,12,18,0.35)' }}>سري — للمطور فقط · {label || 'الدراسة المالية الداخلية'}</span>
      <span style={{ color: '#B8924A', fontWeight: 700 }}>صفحة {page} من {total}</span>
    </div>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#B8924A', borderBottom: '1.5px solid rgba(184,146,74,0.25)', paddingBottom: 6, marginBottom: 12, letterSpacing: '0.04em' }}>
      {children}
    </div>
  );
}

function TR({ cols, head, alt }: { cols: (string | number)[]; head?: boolean; alt?: boolean }) {
  return (
    <tr style={{ background: head ? '#0A0C12' : alt ? 'rgba(10,12,18,0.025)' : 'white' }}>
      {cols.map((c, i) => head
        ? <th key={i} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'white', textAlign: i === 0 ? 'right' : 'center', borderBottom: '2px solid #B8924A' }}>{c}</th>
        : <td key={i} style={{ padding: '7px 10px', fontSize: 10, color: i === 0 ? '#0A0C12' : 'rgba(10,12,18,0.7)', textAlign: i === 0 ? 'right' : 'center', borderBottom: '1px solid rgba(10,12,18,0.06)' }}>{c}</td>
      )}
    </tr>
  );
}

function KPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="no-break" style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.4)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

/* ── Main component ── */
export default function InternalReport() {
  const { projectResults, formInput, isAnalyzed } = useAnalysis();
  const { currentProject } = useProjectsStore();

  const r   = projectResults?.[currentProject?.id ?? ''] ?? currentProject?.result ?? null;
  const f   = r?.financials;
  const c   = r?.costs;
  const a   = r?.areas;
  const inp = currentProject?.input || formInput;

  console.log('[InternalReport] data:', { r, f, c, a, inp, isAnalyzed });

  const totalCost  = c?.totalCost  || 0;
  const revenue    = f?.revenue    || 0;
  const net        = f?.net        || 0;
  const bankPct    = parseFloat(String(formInput.bankPct || inp?.bankPct || 0));
  const bankAmount = totalCost * bankPct;
  const duration   = parseFloat(String(inp?.projectDurationMonths || 24));
  const selfPct    = 1 - bankPct;
  const hurdleRate = 0.08;
  const durationYears = duration / 12;
  const npv = f ? net - totalCost * hurdleRate * durationYears : null;

  /* Break-even */
  const breakEvenRevenue    = totalCost;
  const breakEvenPricePerM2 = a?.sellableArea
    ? breakEvenRevenue / a.sellableArea
    : (parseFloat(String(inp?.sellPricePerM2 || 0)) * (revenue > 0 ? 1 - net / revenue : 1));
  const marginAboveBE = revenue > 0 ? ((revenue - breakEvenRevenue) / revenue * 100) : 0;

  /* Cash flow chart */
  const cashflows: { month: number; cumulative: number; net: number }[] = f?.cashflows?.length
    ? f.cashflows.map((cf: any, i: number) => ({ month: i + 1, cumulative: cf.cumulative ?? cf.amount, net: cf.amount || 0 }))
    : Array.from({ length: Math.max(1, duration) }, (_, i) => {
        const progress = (i + 1) / duration;
        const scurve   = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const costSoFar = -totalCost * scurve;
        const revSoFar  = i >= duration * 0.6 ? revenue * ((i - duration * 0.6) / (duration * 0.4)) : 0;
        return { month: i + 1, cumulative: costSoFar + revSoFar, net: revSoFar - Math.abs(costSoFar) * 0.05 };
      });

  /* Sensitivity — 4 variables */
  const sensVars = f ? [
    { l: 'سعر البيع (+20٪ / -20٪)',     low: net * 0.6,  base: net, high: net * 1.4,  impact: 40 },
    { l: 'تكلفة البناء (+10٪ / -10٪)',  low: net * 1.2,  base: net, high: net * 0.7,  impact: 30 },
    { l: 'سعر الفائدة (+2٪ / -2٪)',     low: net * 1.05, base: net, high: net * 0.9,  impact: 15 },
    { l: 'مدة البيع (+6 أشهر / -6م)',   low: net * 1.1,  base: net, high: net * 0.8,  impact: 15 },
  ] : [];

  /* Alt investments comparison */
  const projectIRR = f?.irr || (totalCost > 0 ? (net / totalCost) * (12 / Math.max(1, duration)) * 100 : 0);
  const altReturns = [
    { l: 'ودائع بنكية',     irr: 3,           color: '#64748b' },
    { l: 'صناديق متوازنة',  irr: 8,           color: '#2563eb' },
    { l: 'عقار تجاري',      irr: 12,          color: '#7c3aed' },
    { l: 'هذا المشروع',     irr: projectIRR,  color: '#B8924A' },
  ];
  const maxIRR = Math.max(...altReturns.map(a => a.irr), 1);

  /* Waterfall */
  const PREF_RATE = 0.08;
  const equityRequired  = totalCost * selfPct;
  const preferredReturn = equityRequired * PREF_RATE * durationYears;
  const netAfterPref    = Math.max(0, net - preferredReturn);
  const devSplit        = netAfterPref * 0.5;
  const eqSplit         = netAfterPref * 0.5;
  const investorTotal   = preferredReturn + eqSplit;

  /* Payback period estimate */
  const paybackMonths = cashflows.findIndex(cf => cf.cumulative >= 0);
  const paybackLabel  = paybackMonths >= 0 ? `${paybackMonths + 1} شهر` : `${(duration * 0.8).toFixed(0)} شهر (تقديري)`;

  const [summary, setSummary]    = useState('');
  const [genLoading, setGenLoad] = useState(false);

  const generateSummary = async () => {
    if (!f) { toast.error('شغّل التحليل أولاً'); return; }
    setGenLoad(true);
    try {
      const prompt = `اكتب ملخصاً تنفيذياً للدراسة المالية الداخلية للمطور:
المشروع: ${currentProject?.name || 'مشروع'}
IRR: ${pct(f.irr)} — هامش: ${pct(f.margin)} — صافي: ${fmtM(net)}
NPV (عند عائق 8٪): ${fmtM(npv || 0)} — نقطة التعادل: ${fmt(breakEvenPricePerM2)} ر.س/م²
التمويل البنكي: ${(bankPct * 100).toFixed(0)}٪ — المدة: ${duration} شهر
ركّز على: مستوى الربحية مقارنة بالبدائل، هامش الأمان، وأهم 3 مخاطر.`;
      const res = await aiAPI.chat({ message: prompt, projectId: currentProject?.id, history: [] });
      setSummary(res.data?.data?.message || res.data?.message || '');
      toast.success('✅ تم توليد الملخص');
    } catch { toast.error('تعذّر توليد الملخص'); }
    finally { setGenLoad(false); }
  };

  if (!isAnalyzed && !r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
        <p className="text-4xl">📊</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.6)' }}>شغّل التحليل الأساسي أولاً</p>
      </div>
    );
  }

  const projName = currentProject?.name || 'مشروع';

  return (
    <div dir="rtl" className="report-content" style={{ background: '#F4F3EF', padding: 24, fontFamily: 'Tajawal, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      {/* No-print toolbar */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 10, background: '#0A0C12', color: 'white', border: 'none', cursor: 'pointer' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      {/* ═══════════════════════════════════════
          PAGE 1 — Cover
      ═══════════════════════════════════════ */}
      <div className="rpt-card pg-sim">
        <PHdr project={projName} />
        <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, textAlign: 'center' }}>
          {/* Lock badge */}
          <div style={{ background: 'rgba(10,12,18,0.06)', borderRadius: 999, padding: '8px 18px', fontSize: 11, color: 'rgba(10,12,18,0.5)', letterSpacing: '0.08em', marginBottom: 32 }}>
            🔒 &nbsp; سـري — للمطور فقط
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0A0C12', margin: 0, lineHeight: 1.3 }}>الدراسة المالية الداخلية</h1>
          <p style={{ fontSize: 16, color: '#B8924A', marginTop: 10, fontWeight: 600 }}>{projName}</p>
          <div style={{ width: 64, height: 3, background: 'linear-gradient(90deg, #C9A05E, #B8924A)', borderRadius: 2, margin: '24px auto' }} />
          <p style={{ fontSize: 12, color: 'rgba(10,12,18,0.45)', marginBottom: 8 }}>تاريخ الإعداد: {today}</p>
          <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.35)', maxWidth: 400 }}>
            هذه الوثيقة سرية تحتوي على تفاصيل مالية حساسة مخصصة للمطور حصراً
          </p>
          {/* Summary KPIs on cover */}
          {f && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 40, width: '100%', maxWidth: 520 }}>
              <KPI label="معدل العائد الداخلي" value={pct(f.irr)} color="#16a34a" sub={f.irr >= 20 ? 'ممتاز' : f.irr >= 12 ? 'جيد' : 'منخفض'} />
              <KPI label="هامش الربح الصافي"   value={pct(f.margin)} color="#B8924A" sub="من الإيرادات" />
              <KPI label="صافي الربح"           value={fmtM(net)} color="#2563eb" sub="مليون ريال" />
            </div>
          )}
        </div>
        <PFtr page={1} total={3} />
      </div>

      {/* ═══════════════════════════════════════
          PAGE 2 — Executive Summary + KPIs + Cash flow
      ═══════════════════════════════════════ */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} />
        <div style={{ padding: '0 24px 8px' }}>

          {/* Executive Summary */}
          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>الملخص التنفيذي</SecTitle>
            <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={generateSummary} disabled={genLoading}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: genLoading ? 'rgba(184,146,74,0.2)' : 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {genLoading ? '⏳ جارٍ التوليد...' : '🤖 توليد بـ AI'}
              </button>
            </div>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
              placeholder="الدراسة المالية الداخلية — التقييم الشامل للمطور..."
              style={{ width: '100%', border: '1px solid rgba(10,12,18,0.10)', borderRadius: 12, padding: '10px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, fontSize: 12, color: '#0A0C12', background: '#FAFAF8', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* KPIs table */}
          {f && (
            <div className="no-break" style={{ marginBottom: 20 }}>
              <SecTitle>المؤشرات المالية الرئيسية</SecTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                <KPI label="IRR" value={pct(f.irr)} color="#16a34a" sub={f.irr >= 20 ? 'ممتاز' : f.irr >= 12 ? 'جيد' : 'منخفض'} />
                <KPI label="NPV (عائق 8٪)" value={fmtM(npv ?? 0)} color={npv && npv > 0 ? '#B8924A' : '#dc2626'} sub={npv && npv > 0 ? 'موجب ✅' : 'سالب ❌'} />
                <KPI label="هامش الربح" value={pct(f.margin)} color="#2563eb" sub="من الإيراد" />
                <KPI label="فترة الاسترداد" value={paybackLabel} color="#7c3aed" sub="تقديري" />
              </div>
            </div>
          )}

          {/* Financial table */}
          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>ملخص التدفقات المالية</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['البند', 'القيمة (ر.س)', 'الملاحظة']} head />
                <TR cols={['إجمالي الإيرادات', fmt(revenue), fmtM(revenue)]} />
                <TR cols={['إجمالي التكاليف', fmt(totalCost), fmtM(totalCost)]} alt />
                <TR cols={['صافي الربح', fmt(net), fmtM(net)]} />
                <TR cols={['التمويل البنكي', fmt(bankAmount), `${(bankPct*100).toFixed(0)}٪ من التكاليف`]} alt />
                <TR cols={['رأس المال الذاتي', fmt(equityRequired), `${(selfPct*100).toFixed(0)}٪ من التكاليف`]} />
              </tbody>
            </table>
          </div>

          {/* Cash flow chart */}
          {cashflows.length > 0 && (
            <div className="no-break">
              <SecTitle>التدفق النقدي التراكمي</SecTitle>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={cashflows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
                  <XAxis dataKey="month" tickFormatter={v => `ش${v}`} tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v/1e6).toFixed(1)}م`} tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v: any) => [`${(Number(v)/1e6).toFixed(2)} م ر.س`, 'التدفق التراكمي']}
                    contentStyle={{ fontFamily: 'Tajawal', borderRadius: 10, border: '1px solid rgba(184,146,74,0.2)', fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="cumulative" stroke="#B8924A" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <PFtr page={2} total={3} />
      </div>

      {/* ═══════════════════════════════════════
          PAGE 3 — Break-even + Sensitivity + Alt + Waterfall
      ═══════════════════════════════════════ */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} />
        <div style={{ padding: '0 24px 8px' }}>

          {/* Break-even */}
          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>نقطة التعادل (Break-even)</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
              <KPI label="سعر التعادل / م²"     value={`${fmt(breakEvenPricePerM2)} ر.س`} color="#d97706" />
              <KPI label="تكلفة التعادل الكلية"  value={fmtM(breakEvenRevenue)} color="#dc2626" />
              <KPI label="هامش فوق التعادل"      value={`${marginAboveBE.toFixed(1)}٪`} color="#16a34a" />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['المؤشر', 'القيمة']} head />
                <TR cols={['سعر البيع المستهدف / م²', `${fmt(parseFloat(String(inp?.sellPricePerM2 || 0)))} ر.س`]} />
                <TR cols={['سعر التعادل / م²', `${fmt(breakEvenPricePerM2)} ر.س`]} alt />
                <TR cols={['فائض الأمان / م²', `${fmt(Math.max(0, parseFloat(String(inp?.sellPricePerM2 || 0)) - breakEvenPricePerM2))} ر.س`]} />
              </tbody>
            </table>
          </div>

          {/* Sensitivity */}
          {sensVars.length > 0 && (
            <div className="no-break" style={{ marginBottom: 20 }}>
              <SecTitle>تحليل الحساسية — 4 متغيرات رئيسية</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sensVars.map((sv, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0A0C12' }}>{sv.l}</span>
                    <div style={{ height: 10, borderRadius: 999, background: '#F4F3EF', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', borderRadius: 999, width: `${Math.min(100, sv.impact * 2.5)}%`, background: '#B8924A', opacity: 0.75 }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', textAlign: 'left' }}>تأثير {sv.impact}٪</span>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <tbody>
                  <TR cols={['المتغير', 'سيناريو منخفض', 'القاعدة', 'سيناريو مرتفع']} head />
                  {sensVars.map((sv, i) => (
                    <TR key={i} cols={[sv.l, fmtM(sv.low), fmtM(sv.base), fmtM(sv.high)]} alt={i % 2 === 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Alt investment comparison */}
          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>مقارنة بالاستثمارات البديلة</SecTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {altReturns.map(alt => (
                <div key={alt.l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, width: 120, flexShrink: 0, color: 'rgba(10,12,18,0.65)' }}>{alt.l}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#F4F3EF' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(100, (alt.irr / maxIRR) * 100)}%`, background: alt.color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, width: 45, textAlign: 'left', color: alt.color, fontFamily: 'IBM Plex Mono' }}>{alt.irr.toFixed(1)}٪</span>
                </div>
              ))}
            </div>
          </div>

          {/* Waterfall distribution */}
          <div className="no-break">
            <SecTitle>توزيع الأرباح (Waterfall)</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['المرحلة', 'المبلغ (ر.س)', 'النسبة', 'الملاحظة']} head />
                <TR cols={['استرداد رأس المال', fmt(totalCost), '100٪', 'أولوية مطلقة']} />
                <TR cols={['عائد مفضّل 8٪ سنوياً', fmt(preferredReturn), '—', `${durationYears.toFixed(1)} سنة`]} alt />
                <TR cols={['توزيع الأرباح المتبقية', fmt(netAfterPref), '50 / 50', 'ملاك / مطور']} />
                <TR cols={['إجمالي عائد المستثمر', fmt(investorTotal), '—', fmtM(investorTotal)]} />
              </tbody>
            </table>
          </div>
        </div>
        <PFtr page={3} total={3} />
      </div>
    </div>
  );
}
