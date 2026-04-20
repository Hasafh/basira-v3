import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAnalysis } from '../../../hooks/useAnalysis';
import { useProjectsStore } from '../../../store';
import { aiAPI } from '../../../api';

/* ─── formatters ─── */
const N  = (n?: number) => n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
const M  = (n?: number) => n != null ? `${(n / 1e6).toFixed(2)} م ر.س` : '—';
const P  = (n?: number) => n != null ? `${n.toFixed(1)}٪` : '—';
const TODAY = new Date().toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });

/* ─── print CSS ─── */
const PRINT = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: white !important; font-size: 10pt; }
  body * { visibility: hidden; }
  .report-content, .report-content * { visibility: visible; }
  .report-content { position: absolute; inset-inline-start: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .pg-break { page-break-before: always !important; break-before: page !important; }
  .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  .rpt-card { box-shadow: none !important; border: 1px solid #e5e5e5 !important; }
}`;

/* ─── shared print layout helpers ─── */
function PHdr({ t, p }: { t: string; p?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '2px solid #B8924A', marginBottom: 14 }}>
      <div>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#B8924A', lineHeight: 1 }}>بصيرة</span>
        <span style={{ display: 'block', fontSize: 7, color: '#aaa', letterSpacing: 2 }}>BASIRA ANALYTICS</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{t}</p>
        {p && <p style={{ fontSize: 9, color: '#888', margin: 0 }}>{p}</p>}
      </div>
      <p style={{ fontSize: 9, color: '#aaa' }}>{TODAY}</p>
    </div>
  );
}

function PFtr({ page }: { page?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 6, marginTop: 18 }}>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>🔒 سري — لاستخدام المطور والمستثمرين المعتمدين فقط</p>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>{page || ''} · بصيرة للتحليل العقاري</p>
    </div>
  );
}

function SecTitle({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 10px' }}>
      <div style={{ width: 4, height: 16, background: '#B8924A', borderRadius: 2 }} />
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{title}</h3>
    </div>
  );
}

function TR({ l, v, bold }: { l: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '7px 10px', fontSize: 11, color: '#777', background: '#FAFAF8', width: '42%' }}>{l}</td>
      <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: bold ? 700 : 500, color: bold ? '#B8924A' : '#0A0C12', fontFamily: 'IBM Plex Mono, monospace' }}>{v}</td>
    </tr>
  );
}

function KPI({ l, v, c, sub }: { l: string; v: string; c: string; sub?: string }) {
  return (
    <div className="no-break" style={{ background: `${c}09`, border: `1px solid ${c}28`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, color: '#888', margin: '0 0 3px' }}>{l}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>{v}</p>
      {sub && <p style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function MainReport() {
  const { projectResults, formInput, isAnalyzed } = useAnalysis();
  const { currentProject } = useProjectsStore();

  const r    = projectResults?.[currentProject?.id ?? ''] ?? currentProject?.result ?? null;
  const f    = r?.financials;
  const c    = r?.costs;
  const a    = r?.areas;
  const inp  = currentProject?.input || formInput;

  useEffect(() => {
    console.log('[MainReport] data loaded:', { r, f, c, a, inp, isAnalyzed });
  }, [r]);

  /* derived values */
  const landArea       = parseFloat(String(a?.landArea       || inp.landArea       || 0));
  const floors         = parseFloat(String(inp.floors        || 3));
  const basement       = parseFloat(String(inp.basementFloors|| 0));
  const landPriceM2    = parseFloat(String(inp.landPricePerM2|| 0));
  const sellPriceM2    = parseFloat(String(inp.sellPricePerM2|| 0));
  const buildCostM2    = parseFloat(String(inp.buildCostPerM2|| 0));
  const duration       = parseFloat(String(inp.projectDurationMonths || 24));
  const bankPct        = parseFloat(String(formInput.bankPct || inp.bankPct || 0));
  const totalCost      = c?.totalCost  || 0;
  const revenue        = f?.revenue    || 0;
  const net            = f?.net        || 0;
  const irr            = f?.irr        || 0;
  const margin         = f?.margin     || 0;
  const roi            = f?.roi        || 0;
  const gfa            = a?.totalBuildArea  || 0;
  const nla            = a?.sellableArea    || 0;
  const maxBid         = r?.rlv?.maxLandPerM2;
  const safetyMargin   = maxBid && landPriceM2 ? ((maxBid - landPriceM2) / maxBid * 100) : null;
  const hurdleRate     = 0.08;
  const npv            = f ? net - totalCost * hurdleRate * (duration / 12) : null;
  const unitsEst       = nla > 0 && landArea > 0 ? Math.round(nla / 150) : null;
  const gcr            = a?.groundCoverageRatio || parseFloat(String(inp.groundCoverageRatio || 0));

  /* cost rows */
  const costRows = [
    { l: 'تكلفة الأرض',     v: c?.landCost,    note: `${N(landPriceM2)} ر.س/م²` },
    { l: 'تكلفة البناء',    v: c?.buildCost,   note: `${N(buildCostM2)} ر.س/م²` },
    { l: 'التكاليف الناعمة', v: c?.softCosts,   note: 'تصميم، تراخيص، إشراف' },
    { l: 'احتياطي الطوارئ',  v: c?.contingency, note: '' },
    { l: 'خدمات ومرافق',     v: c?.servicesCost,note: '' },
  ].filter(r => r.v);

  const [summary, setSummary] = useState(currentProject?.result?.executiveSummary || '');
  const [gen, setGen] = useState(false);

  const generate = async () => {
    if (!f) { toast.error('شغّل التحليل أولاً'); return; }
    setGen(true);
    try {
      const prompt = `اكتب ملخصاً تنفيذياً احترافياً للمشروع العقاري:
المشروع: ${currentProject?.name || 'مشروع'} | الموقع: ${currentProject?.location || 'الرياض'}
IRR: ${P(irr)} | هامش الربح: ${P(margin)} | صافي الربح: ${M(net)} | مدة المشروع: ${duration} شهر
إجمالي التكاليف: ${M(totalCost)} | الإيرادات: ${M(revenue)}
اكتب 3 فقرات: الفرصة، المؤشرات المالية، التوصية. لغة عربية فصيحة.`;
      const res = await aiAPI.chat({ message: prompt, projectId: currentProject?.id, history: [] });
      setSummary(res.data?.data?.message || res.data?.message || '');
      toast.success('✅ تم توليد الملخص');
    } catch { toast.error('تعذّر التوليد'); }
    finally { setGen(false); }
  };

  if (!isAnalyzed && !r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
        <p className="text-4xl">📊</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.5)' }}>شغّل التحليل الأساسي أولاً</p>
      </div>
    );
  }

  const pname = currentProject?.name || 'المشروع';
  const ploc  = currentProject?.location || '';

  return (
    <div dir="rtl" className="report-content" style={{ background: '#F4F3EF', padding: '0 0 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      {/* ── Toolbar ── */}
      <div className="no-print" style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => window.print()}
          style={{ padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', cursor: 'pointer', border: 'none' }}>
          🖨️ طباعة / PDF
        </button>
        <span style={{ fontSize: 11, color: '#999' }}>التقرير الشامل — {pname}</span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* ══════ صفحة الغلاف ══════ */}
        <div className="rpt-card no-break" style={{ background: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden', minHeight: 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          {/* Top bar */}
          <div style={{ background: 'linear-gradient(135deg,#0A0C12,#1a1c24)', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#B8924A', margin: 0, lineHeight: 1 }}>بصيرة</p>
              <p style={{ fontSize: 9, color: 'rgba(184,146,74,0.6)', margin: '3px 0 0', letterSpacing: 3 }}>BASIRA ANALYTICS</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{TODAY}</p>
          </div>
          {/* Cover body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ width: 50, height: 3, background: '#B8924A', borderRadius: 2, marginBottom: 20 }} />
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0A0C12', margin: '0 0 6px', lineHeight: 1.3 }}>تقرير الجدوى الاستثمارية</h1>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#B8924A', margin: '0 0 30px' }}>الشاملة</h2>
            <div style={{ border: '1.5px solid rgba(184,146,74,0.35)', borderRadius: 12, padding: '20px 40px', minWidth: 280 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0C12', margin: '0 0 6px' }}>{pname}</p>
              {ploc && <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px' }}>📍 {ploc}</p>}
              {f && <p style={{ fontSize: 13, fontWeight: 700, color: '#B8924A', margin: 0 }}>IRR: {P(irr)} · هامش: {P(margin)}</p>}
            </div>
            <div style={{ width: 50, height: 3, background: '#B8924A', borderRadius: 2, marginTop: 24 }} />
          </div>
          {/* Bottom */}
          <div style={{ padding: '14px 30px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', background: '#FAFAF8' }}>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>🔒 سري — للمطور والمستثمرين المعتمدين فقط</p>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>إعداد: منصة بصيرة للتحليل العقاري الذكي</p>
          </div>
        </div>

        {/* ══════ صفحة 2: الملخص التنفيذي ══════ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr t="تقرير الجدوى الاستثمارية الشاملة" p={pname} />

          <SecTitle title="الملخص التنفيذي" />
          <div className="no-print" style={{ marginBottom: 10 }}>
            <button onClick={generate} disabled={gen}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: gen ? 'rgba(184,146,74,0.2)' : 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', cursor: gen ? 'not-allowed' : 'pointer', border: 'none' }}>
              {gen ? '⏳' : '🤖'} توليد بـ AI
            </button>
          </div>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={5}
            placeholder="اضغط 'توليد بـ AI' أو اكتب الملخص هنا..."
            style={{ width: '100%', border: '1px solid rgba(10,12,18,0.10)', borderRadius: 10, padding: '10px 12px', fontFamily: 'Tajawal, sans-serif', fontSize: 13, lineHeight: 1.9, resize: 'none', outline: 'none', color: '#0A0C12', background: '#FAFAF8' }} />

          {/* KPIs grid */}
          {f && (
            <>
              <SecTitle title="المؤشرات المالية الرئيسية" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                <KPI l="معدل العائد (IRR)" v={P(irr)} c="#16a34a" sub={irr >= 20 ? 'ممتاز' : irr >= 12 ? 'جيد' : 'منخفض'} />
                <KPI l="هامش الربح" v={P(margin)} c="#B8924A" sub="من الإيراد" />
                <KPI l="العائد على الاستثمار" v={P(roi)} c="#2563eb" sub="ROI" />
                <KPI l="صافي الربح" v={M(net)} c="#7c3aed" sub="إجمالي" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
                <KPI l="إجمالي التكاليف" v={M(totalCost)} c="#dc2626" />
                <KPI l="إجمالي الإيرادات" v={M(revenue)} c="#0284c7" />
                {npv != null && <KPI l="صافي القيمة الحالية" v={M(npv)} c={npv > 0 ? '#16a34a' : '#dc2626'} sub="NPV" />}
                {safetyMargin != null && <KPI l="هامش الأمان (BNM)" v={`${safetyMargin.toFixed(1)}٪`} c={safetyMargin >= 10 ? '#16a34a' : '#d97706'} />}
              </div>
            </>
          )}
          <PFtr page="صفحة 1" />
        </div>

        {/* ══════ صفحة 3: بيانات الأرض + المساحات ══════ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr t="تقرير الجدوى الاستثمارية الشاملة" p={pname} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Land data */}
            <div className="no-break">
              <SecTitle title="بيانات الأرض" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="اسم المشروع"    v={pname} />
                  <TR l="الموقع"          v={ploc || '—'} />
                  <TR l="مساحة الأرض"    v={`${N(landArea)} م²`} bold />
                  <TR l="سعر الأرض/م²"  v={`${N(landPriceM2)} ر.س`} />
                  <TR l="تكلفة الأرض الكلية" v={N(c?.landCost || landArea * landPriceM2) + ' ر.س'} bold />
                  <TR l="الكود النظامي"  v={String(inp.zoningCode || '—')} />
                  <TR l="نوع الأرض"      v={String(inp.landType || '—')} />
                  <TR l="الاستخدام"       v={String(inp.usageType || '—')} />
                  <TR l="عرض الشارع"     v={`${String(inp.streetWidth || '—')} م`} />
                </tbody>
              </table>
            </div>

            {/* Areas */}
            <div className="no-break">
              <SecTitle title="المساحات" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="مساحة البناء الكلية (GFA)" v={`${N(gfa)} م²`} bold />
                  <TR l="المساحة القابلة للبيع (NLA)" v={`${N(nla)} م²`} bold />
                  <TR l="نسبة البناء من الأرض" v={gcr ? `${(gcr * 100).toFixed(0)}٪` : '—'} />
                  <TR l="عدد الأدوار" v={`${floors} أدوار`} />
                  <TR l="أدوار القبو" v={`${basement} أدوار`} />
                  <TR l="سعر البيع/م²" v={`${N(sellPriceM2)} ر.س`} />
                  <TR l="تكلفة البناء/م²" v={`${N(buildCostM2)} ر.س`} />
                  {unitsEst && <TR l="الوحدات المتوقعة" v={`~${unitsEst} وحدة`} />}
                </tbody>
              </table>
            </div>
          </div>

          {/* Costs table */}
          {costRows.length > 0 && (
            <div className="no-break" style={{ marginTop: 20 }}>
              <SecTitle title="جدول التكاليف التفصيلي" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['البند', 'المبلغ (ر.س)', '٪ من الكلي', 'ملاحظة'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#888', borderBottom: '2px solid #B8924A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costRows.map(row => (
                    <tr key={row.l} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: '#444', fontWeight: 500 }}>{row.l}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#0A0C12' }}>{N(row.v)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: '#888', fontFamily: 'IBM Plex Mono, monospace' }}>{totalCost > 0 && row.v ? `${((row.v / totalCost) * 100).toFixed(1)}٪` : '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: '#aaa' }}>{row.note}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(184,146,74,0.05)', borderTop: '2px solid rgba(184,146,74,0.3)' }}>
                    <td style={{ padding: '10px', fontWeight: 700, fontSize: 12 }}>إجمالي التكاليف</td>
                    <td style={{ padding: '10px', fontWeight: 700, fontSize: 14, color: '#B8924A', fontFamily: 'IBM Plex Mono, monospace' }}>{N(totalCost)}</td>
                    <td style={{ padding: '10px', fontWeight: 700, fontSize: 12, color: '#B8924A' }}>100٪</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <PFtr page="صفحة 2" />
        </div>

        {/* ══════ صفحة 4: الإيرادات + التوصية ══════ */}
        {f && (
          <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <PHdr t="تقرير الجدوى الاستثمارية الشاملة" p={pname} />

            {/* Revenue table */}
            <div className="no-break">
              <SecTitle title="الإيرادات والأرباح" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="إجمالي الإيرادات المتوقعة" v={`${N(revenue)} ر.س`} />
                  <TR l="إجمالي التكاليف" v={`${N(totalCost)} ر.س`} />
                  <TR l="صافي الربح" v={`${N(net)} ر.س`} bold />
                  <TR l="هامش الربح الصافي" v={P(margin)} bold />
                  <TR l="العائد على الاستثمار (ROI)" v={P(roi)} />
                  <TR l="مدة المشروع" v={`${duration} شهر`} />
                  {npv != null && <TR l="صافي القيمة الحالية (NPV)" v={`${M(npv)}`} bold />}
                  <TR l="معدل العائد الداخلي (IRR)" v={P(irr)} bold />
                </tbody>
              </table>
            </div>

            {/* Buy-No-More */}
            {maxBid && (
              <div className="no-break" style={{ marginTop: 20 }}>
                <SecTitle title="تحليل Buy-No-More™ — الحد الأقصى المقبول للأرض" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  <KPI l="الحد الأقصى المطلق" v={`${N(maxBid)} ر.س/م²`} c="#dc2626" />
                  <KPI l="السعر الحالي" v={`${N(landPriceM2)} ر.س/م²`} c="#B8924A" />
                  {safetyMargin != null && (
                    <KPI l="هامش الأمان" v={`${safetyMargin.toFixed(1)}٪`} c={safetyMargin >= 15 ? '#16a34a' : safetyMargin >= 5 ? '#d97706' : '#dc2626'} sub={safetyMargin >= 15 ? 'ممتاز' : safetyMargin >= 5 ? 'مقبول' : 'ضعيف'} />
                  )}
                </div>
              </div>
            )}

            {/* System recommendation */}
            {r?.summary && (
              <div className="no-break" style={{ marginTop: 20 }}>
                <SecTitle title="توصية النظام النهائية" />
                <div style={{
                  borderRadius: 12, padding: '16px 20px',
                  background: r.summary.isBuy ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `2px solid ${r.summary.isBuy ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{r.summary.isBuy ? '✅' : '❌'}</span>
                    <p style={{ fontSize: 15, fontWeight: 800, color: r.summary.isBuy ? '#16a34a' : '#dc2626', margin: 0 }}>
                      {r.summary.decision}
                    </p>
                  </div>
                  {r.summary.reasons?.length > 0 && (
                    <ul style={{ margin: 0, paddingRight: 16 }}>
                      {r.summary.reasons.map((reason: string, i: number) => (
                        <li key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <PFtr page="صفحة 3" />
          </div>
        )}

      </div>
    </div>
  );
}
