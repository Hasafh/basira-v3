/* ── ShareholderIndividualReport ──
   Pure presentational component — reads only from ReportData, no calculations.
*/
import type { ReportData } from '../../../engines/reports/types';
import { fmt, fmtM, pct } from '../../../utils/format';

const PRINT = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .pg-break { page-break-before: always; }
  .no-break { page-break-inside: avoid; }
  .rpt-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; margin-bottom: 0 !important; }
  body { background: white !important; }
}
@media screen {
  .rpt-card { max-width: 860px; margin: 0 auto 24px; background: white; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); overflow: hidden; }
  .pg-sim { min-height: 297mm; }
}`;

function PHdr({ project, date }: { project?: string; date: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '2px solid #0A0C12', marginBottom: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: '#0A0C12' }}>
        بصيرة <span style={{ fontWeight: 300, color: '#B8924A' }}>/ BASIRA ANALYTICS</span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)' }}>{project || 'مشروع'}</div>
      <div style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)' }}>{date}</div>
    </div>
  );
}

function PFtr({ page, total }: { page: number; total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid rgba(10,12,18,0.08)', marginTop: 16, fontSize: 9 }}>
      <span style={{ color: 'rgba(10,12,18,0.35)' }}>سري للاستخدام الداخلي · للمستثمرين الأفراد</span>
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

/* ── Pure report component ── */
export default function ShareholdersBReport({ data }: { data: ReportData | null }) {
  if (!data || !data.individual) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
        <p className="text-4xl">👤</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.6)' }}>شغّل التحليل الأساسي أولاً</p>
      </div>
    );
  }

  const { projectName: projName, projectLocation, date, individual: ind, financials: f, costs: c, input } = data;
  const { investorEquity, devEquity, investorProfit, investorTotal, investorIRR, equityMultiple, breakEvenPerM2, safetyMarginPct, priceAboveBE, milestones } = ind;
  const durationYears = (input.projectDurationMonths / 12).toFixed(1);

  return (
    <div dir="rtl" style={{ background: '#F4F3EF', padding: 24, fontFamily: 'Tajawal, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 10, background: '#0A0C12', color: 'white', border: 'none', cursor: 'pointer' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      {/* PAGE 1 — Cover "تدفع X تحصل Y" */}
      <div className="rpt-card pg-sim">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '40px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 480, justifyContent: 'center' }}>
          <div style={{ background: 'rgba(184,146,74,0.07)', borderRadius: 999, padding: '8px 18px', fontSize: 11, color: '#B8924A', letterSpacing: '0.08em', marginBottom: 28, fontWeight: 700 }}>
            👤 &nbsp; تقرير المساهمين الأفراد
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0A0C12', margin: 0, lineHeight: 1.3 }}>فرصة استثمار عقاري</h1>
          <p style={{ fontSize: 15, color: '#B8924A', marginTop: 8, fontWeight: 600 }}>{projName}</p>
          {projectLocation && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>📍 {projectLocation}</p>}
          <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg, #C9A05E, #B8924A)', borderRadius: 2, margin: '20px auto' }} />
          <div style={{ background: 'white', border: '2px solid rgba(184,146,74,0.3)', borderRadius: 20, padding: '28px 32px', maxWidth: 500, width: '100%', marginTop: 12 }}>
            <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.4)', marginBottom: 20, letterSpacing: '0.06em' }}>باختصار شديد</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.5)', marginBottom: 4 }}>تدفع</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#B8924A', fontFamily: 'IBM Plex Mono', margin: 0 }}>{fmtM(investorEquity)}</p>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)', marginTop: 2 }}>مليون ريال</p>
              </div>
              <div style={{ fontSize: 28, color: 'rgba(10,12,18,0.15)' }}>◀</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.4)', marginBottom: 4 }}>خلال</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: 'rgba(10,12,18,0.3)', margin: 0 }}>{input.projectDurationMonths} شهر</p>
              </div>
              <div style={{ fontSize: 28, color: 'rgba(10,12,18,0.15)' }}>◀</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.5)', marginBottom: 4 }}>تحصل</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#16a34a', fontFamily: 'IBM Plex Mono', margin: 0 }}>{fmtM(investorTotal)}</p>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.4)', marginTop: 2 }}>مليون ريال</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(10,12,18,0.07)' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', margin: 0 }}>ربحك</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', fontFamily: 'IBM Plex Mono', margin: '2px 0' }}>{fmtM(investorProfit)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', margin: 0 }}>عائد سنوي</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#B8924A', fontFamily: 'IBM Plex Mono', margin: '2px 0' }}>{investorIRR.toFixed(1)}٪</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', margin: 0 }}>مضاعف</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', fontFamily: 'IBM Plex Mono', margin: '2px 0' }}>{equityMultiple.toFixed(2)}×</p>
              </div>
            </div>
          </div>
        </div>
        <PFtr page={1} total={3} />
      </div>

      {/* PAGE 2 — 70/30 + Financials + Break-even */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '0 24px 8px' }}>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>هيكل التوزيع (70٪ مساهمون — 30٪ مطور)</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'rgba(184,146,74,0.06)', border: '2px solid rgba(184,146,74,0.25)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', marginBottom: 6 }}>حصة المساهمين</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#B8924A', margin: 0 }}>70٪</p>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.55)', marginTop: 6 }}>رأس مال: {fmtM(investorEquity)}</p>
                <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>ربح: {fmtM(investorProfit)}</p>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.06)', border: '2px solid rgba(37,99,235,0.25)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', marginBottom: 6 }}>حصة المطور</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#2563eb', margin: 0 }}>30٪</p>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.55)', marginTop: 6 }}>رأس مال: {fmtM(devEquity)}</p>
              </div>
            </div>
            <div style={{ height: 12, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '70%', background: '#B8924A' }} />
              <div style={{ width: '30%', background: '#2563eb' }} />
            </div>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>الأرقام المالية</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['البند', 'المبلغ (ر.س)', 'ملاحظة']} head />
                <TR cols={['إجمالي الإيرادات', fmt(f?.revenue), fmtM(f?.revenue)]} />
                <TR cols={['إجمالي التكاليف', fmt(c?.totalCost), fmtM(c?.totalCost)]} alt />
                <TR cols={['صافي الربح الكلي', fmt(f?.net), fmtM(f?.net)]} />
                <TR cols={['رأس مال المساهمين (70٪)', fmt(investorEquity), fmtM(investorEquity)]} alt />
                <TR cols={['حصة المساهمين من الربح', fmt(investorProfit), `70٪ × ${fmtM(f?.net)}`]} />
                <TR cols={['إجمالي عائد المساهمين', fmt(investorTotal), fmtM(investorTotal)]} alt />
              </tbody>
            </table>
          </div>

          <div className="no-break">
            <SecTitle>سعر الدخول العادل ونقطة التعادل</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
              <KPI label="سعر الأرض الحالي"    value={`${fmt(input.landPricePerM2)} ر.س`}   color="#B8924A" sub="/ م²" />
              <KPI label="الحد الأقصى للشراء"  value={data.rlv ? `${fmt(data.rlv.maxLandPerM2)} ر.س` : '—'} color="#dc2626" sub="Buy-No-More™" />
              <KPI label="سعر تعادل المبيعات"  value={`${fmt(breakEvenPerM2)} ر.س`}   color="#16a34a" sub="/ م²" />
            </div>
            {(safetyMarginPct !== null || priceAboveBE !== null) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {safetyMarginPct !== null && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: safetyMarginPct >= 15 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${safetyMarginPct >= 15 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: '0 0 2px' }}>{safetyMarginPct >= 15 ? '✅' : '⚠️'} هامش أمان سعر الأرض</p>
                    <p style={{ fontSize: 14, fontWeight: 900, color: safetyMarginPct >= 15 ? '#16a34a' : '#dc2626', fontFamily: 'IBM Plex Mono', margin: 0 }}>{safetyMarginPct.toFixed(1)}٪</p>
                  </div>
                )}
                {priceAboveBE !== null && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: priceAboveBE >= 10 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${priceAboveBE >= 10 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: '0 0 2px' }}>{priceAboveBE >= 10 ? '✅' : '⚠️'} سعر البيع فوق التعادل بـ</p>
                    <p style={{ fontSize: 14, fontWeight: 900, color: priceAboveBE >= 10 ? '#16a34a' : '#dc2626', fontFamily: 'IBM Plex Mono', margin: 0 }}>{priceAboveBE.toFixed(1)}٪</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <PFtr page={2} total={3} />
      </div>

      {/* PAGE 3 — Timeline + Risks + KPIs + Disclaimer */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '0 24px 8px' }}>

          <div className="no-break" style={{ marginBottom: 24 }}>
            <SecTitle>الجدول الزمني للمشروع</SecTitle>
            <div style={{ position: 'relative', paddingRight: 20 }}>
              <div style={{ position: 'absolute', right: 10, top: 16, bottom: 16, width: 2, background: 'rgba(184,146,74,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {milestones.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: i === milestones.length - 1 ? '#B8924A' : 'white', border: '2px solid rgba(184,146,74,0.4)', zIndex: 1 }}>
                      {m.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0C12', margin: 0 }}>{m.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', margin: 0 }}>{m.month === 0 ? 'الشهر الأول' : `الشهر ${m.month}`}</p>
                    </div>
                    {m.money && (
                      <div style={{ padding: '4px 10px', borderRadius: 8, background: m.money.startsWith('+') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${m.money.startsWith('+') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}` }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: m.money.startsWith('+') ? '#16a34a' : '#dc2626', fontFamily: 'IBM Plex Mono', margin: 0 }}>{m.money}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>ما الذي قد يؤثر على عائدك؟</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '📉', risk: 'انخفاض أسعار البيع', impact: 'تأثير عالٍ',   desc: 'إذا انخفضت الأسعار 20٪ قد ينخفض العائد للنصف' },
                { icon: '⏰', risk: 'تأخر الإنجاز',        impact: 'تأثير متوسط', desc: 'كل 6 أشهر تأخر تعني تأخر توزيع العائد' },
                { icon: '🏦', risk: 'ارتفاع الفائدة',      impact: 'تأثير منخفض', desc: 'يؤثر على تكلفة التمويل البنكي فقط' },
                { icon: '🏗', risk: 'ارتفاع تكاليف البناء', impact: 'تأثير متوسط', desc: 'عقود ثابتة تحمي من هذه المخاطر' },
              ].map(r => (
                <div key={r.risk} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#FAFAF8', border: '1px solid rgba(10,12,18,0.06)', borderRadius: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: '0 0 2px' }}>{r.risk}</p>
                    <p style={{ fontSize: 9, color: '#d97706', fontWeight: 600, margin: '0 0 3px' }}>{r.impact}</p>
                    <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>ملخص أرقامك كمستثمر</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <KPI label="رأس مالك"           value={fmtM(investorEquity)} color="#64748b" sub="مليون ريال" />
              <KPI label="ستحصل على"          value={fmtM(investorTotal)}  color="#16a34a" sub="مليون ريال" />
              <KPI label="عائد سنوي (تقديري)" value={pct(investorIRR)}     color="#B8924A" />
              <KPI label="مدة الاستثمار"      value={`${input.projectDurationMonths} شهر`} color="#7c3aed" sub={`${durationYears} سنة`} />
            </div>
          </div>

          <div className="no-break" style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
            <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#dc2626' }}>إخلاء المسؤولية:</strong> هذه الوثيقة إعلامية فقط ولا تُعدّ عرضاً للبيع أو دعوة للاستثمار.
              الأرقام تقديرية وقابلة للتغيّر. يُنصح بمراجعة مستشار مالي قبل اتخاذ أي قرار استثماري.
            </p>
          </div>
        </div>
        <PFtr page={3} total={3} />
      </div>
    </div>
  );
}
