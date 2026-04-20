/* ── BankReport ──
   Pure presentational component — reads only from ReportData, no calculations.
*/
import { useNavigate } from 'react-router-dom';
import { useProjectsStore } from '../../../store';
import type { ReportData } from '../../../engines/reports/types';

const N  = (n?: number | null) => n != null ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
const M  = (n?: number | null) => n != null ? `${(n / 1e6).toFixed(2)} م ر.س` : '—';
const P  = (n?: number | null) => n != null ? `${n.toFixed(1)}٪` : '—';

const PRINT = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: white !important; font-size: 10pt; }
  .no-print { display: none !important; }
  .pg-break { page-break-before: always !important; break-before: page !important; }
  .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  .rpt-card { box-shadow: none !important; }
  body * { visibility: hidden; }
  .report-content, .report-content * { visibility: visible; }
  .report-content { position: absolute; left: 0; top: 0; width: 100%; }
}`;

function PHdr({ p, date }: { p?: string; date: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '2px solid #1d4ed8', marginBottom: 14 }}>
      <div>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>بصيرة</span>
        <span style={{ display: 'block', fontSize: 7, color: '#aaa', letterSpacing: 2 }}>BASIRA ANALYTICS</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: 0 }}>طلب تمويل عقاري</p>
        {p && <p style={{ fontSize: 9, color: '#888', margin: 0 }}>{p}</p>}
      </div>
      <p style={{ fontSize: 9, color: '#aaa' }}>{date}</p>
    </div>
  );
}

function PFtr({ page }: { page?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 6, marginTop: 18 }}>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>سري للاستخدام الداخلي · جميع الأرقام بالريال السعودي</p>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>{page || ''} · بصيرة للتحليل العقاري</p>
    </div>
  );
}

function SecTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 10px' }}>
      <div style={{ width: 4, height: 16, background: '#1d4ed8', borderRadius: 2 }} />
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: 9, color: '#888', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function TR({ l, v, bold }: { l: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '7px 10px', fontSize: 11, color: '#777', background: '#FAFAF8', width: '45%' }}>{l}</td>
      <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: bold ? 700 : 500, color: bold ? '#1d4ed8' : '#0A0C12', fontFamily: 'IBM Plex Mono, monospace' }}>{v}</td>
    </tr>
  );
}

function KPI({ l, v, c, sub }: { l: string; v: string; c: string; sub?: string }) {
  return (
    <div className="no-break" style={{ background: `${c}09`, border: `1px solid ${c}28`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, color: '#888', margin: '0 0 3px' }}>{l}</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: c, fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>{v}</p>
      {sub && <p style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

/* ── Pure report component ── */
export default function BankReport({ data }: { data: ReportData | null }) {
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();
  const pid = currentProject?.id;

  if (!data || !data.financials) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <p className="text-4xl">🏦</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.5)' }}>شغّل التحليل الأساسي أولاً</p>
        {pid && (
          <button
            onClick={() => navigate(`/project/${pid}#basics`)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            ← انتقل إلى التحليل
          </button>
        )}
      </div>
    );
  }
  if (!data.bank) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <p className="text-4xl">🏦</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.5)' }}>لم يُحدَّد تمويل بنكي للمشروع</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>حدد نسبة التمويل البنكي في تبويب التمويل لتوليد هذا التقرير</p>
        {pid && (
          <button
            onClick={() => navigate(`/project/${pid}#finance`)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            ← اضبط التمويل البنكي
          </button>
        )}
      </div>
    );
  }

  const { projectName: pname, projectLocation: ploc, date, input, financials: f, costs: c, bank } = data;
  const { bankAmount, bankRate, monthlyPayment, totalRepayment, totalInterest, ltc, ltv, dscr, llcr, successScore, annualDSCR, drawdown, stressTests } = bank;

  return (
    <div dir="rtl" className="report-content" style={{ background: '#F4F3EF', padding: '0 0 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      <div className="no-print" style={{ padding: '10px 24px', background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)', display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', cursor: 'pointer', border: 'none' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* ══ غلاف رسمي ══ */}
        <div className="rpt-card no-break" style={{ background: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>بصيرة</p>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', letterSpacing: 3 }}>BASIRA ANALYTICS</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{date}</p>
          </div>
          <div style={{ padding: '40px 30px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#888', letterSpacing: 1, marginBottom: 8 }}>طـلب تمويـل عقـاري</p>
            <div style={{ width: 50, height: 3, background: '#1d4ed8', borderRadius: 2, margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0C12', margin: '0 0 6px' }}>{pname}</h1>
            {ploc && <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>📍 {ploc}</p>}
            <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'right', border: '1px solid rgba(29,78,216,0.2)', borderRadius: 12, padding: '16px 24px' }}>
              <div>
                <p style={{ fontSize: 9, color: '#aaa', margin: '0 0 2px' }}>قيمة التمويل المطلوب</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: 0, fontFamily: 'IBM Plex Mono' }}>{M(bankAmount)}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, color: '#aaa', margin: '0 0 2px' }}>نسبة التمويل (LTC)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: 0, fontFamily: 'IBM Plex Mono' }}>{ltc.toFixed(0)}٪</p>
              </div>
              <div>
                <p style={{ fontSize: 9, color: '#aaa', margin: '0 0 2px' }}>المطور</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{pname}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, color: '#aaa', margin: '0 0 2px' }}>مدة المشروع</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{input.projectDurationMonths} شهراً</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 30px', borderTop: '1px solid #f0f0f0', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>سري للاستخدام الداخلي</p>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>منصة بصيرة للتحليل العقاري الذكي</p>
          </div>
        </div>

        {/* ══ ص 2: بيانات المشروع + التمويل ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="no-break">
              <SecTitle title="بيانات المشروع" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="اسم المشروع"       v={pname} />
                  <TR l="الموقع"             v={ploc || '—'} />
                  <TR l="نوع المشروع"        v={input.usageType} />
                  <TR l="مساحة الأرض"       v={`${N(input.landArea)} م²`} />
                  <TR l="إجمالي التكاليف"   v={`${N(c?.totalCost)} ر.س`} bold />
                  <TR l="إجمالي الإيرادات"  v={`${N(f.revenue)} ر.س`} />
                  <TR l="صافي الربح"        v={`${N(f.net)} ر.س`} bold />
                  <TR l="مدة التطوير"        v={`${input.projectDurationMonths} شهراً`} />
                </tbody>
              </table>
            </div>
            <div className="no-break">
              <SecTitle title="بيانات الضمان والتمويل" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="قيمة الأرض (ضمان)"       v={`${N(input.landArea * input.landPricePerM2)} ر.س`} />
                  <TR l="قيمة القرض المطلوب"      v={`${N(bankAmount)} ر.س`} bold />
                  <TR l="نسبة التمويل (LTC)"       v={`${ltc.toFixed(1)}٪`} />
                  <TR l="نسبة القرض للقيمة (LTV)" v={`${ltv.toFixed(1)}٪`} />
                  <TR l="معدل الفائدة"              v={`${(bankRate * 100).toFixed(0)}٪ سنوياً`} />
                  <TR l="القسط الشهري"              v={`${N(monthlyPayment)} ر.س`} />
                  <TR l="إجمالي الفائدة"            v={`${N(totalInterest)} ر.س`} />
                  <TR l="إجمالي المبلغ المُسدَّد"   v={`${N(totalRepayment)} ر.س`} bold />
                </tbody>
              </table>
            </div>
          </div>

          <PFtr page="صفحة 1" />
        </div>

        {/* ══ ص 3: مؤشرات البنك + جدول السداد ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          <SecTitle title="مؤشرات الجدارة الائتمانية" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            <KPI l="LTC — نسبة التمويل"   v={`${ltc.toFixed(1)}٪`} c={ltc <= 65 ? '#16a34a' : ltc <= 70 ? '#d97706' : '#dc2626'} sub={ltc <= 65 ? '✅ ممتاز' : ltc <= 70 ? '⚠️ مقبول' : '❌ مرتفع'} />
            <KPI l="LTV — القرض للقيمة"   v={`${ltv.toFixed(1)}٪`} c={ltv <= 60 ? '#16a34a' : ltv <= 70 ? '#d97706' : '#dc2626'} sub={ltv <= 60 ? '✅ ممتاز' : '⚠️ مقبول'} />
            <KPI l="DSCR — تغطية الدين"   v={dscr?.toFixed(2) || 'N/A'} c={!dscr || dscr >= 1.25 ? '#16a34a' : '#dc2626'} sub={dscr ? (dscr >= 1.25 ? '✅ > 1.25' : '❌ < 1.25') : 'لا توجد ديون'} />
            <KPI l="LLCR — تغطية القرض"   v={llcr?.toFixed(2) || 'N/A'} c={!llcr || llcr >= 1.0 ? '#16a34a' : '#dc2626'} sub={llcr ? (llcr >= 1.0 ? '✅ > 1.0' : '❌ < 1.0') : 'لا ينطبق'} />
          </div>

          <div style={{ background: 'rgba(29,78,216,0.05)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#555', margin: 0, lineHeight: 1.8 }}>
              • LTC يجب أن يكون ≤ 70٪ للمشاريع السكنية · LTV يجب ≤ 70٪ · DSCR يجب ≥ 1.25 للموافقة · LLCR يجب ≥ 1.0
            </p>
          </div>

          {annualDSCR.length > 0 && (
            <div className="no-break">
              <SecTitle title="جدول خدمة الدين السنوي" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['السنة', 'خدمة الدين السنوية', 'الدخل الصافي المتوقع', 'DSCR', 'الحالة'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#888', borderBottom: '2px solid #1d4ed8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {annualDSCR.map(row => (
                    <tr key={row.year} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 11 }}>السنة {row.year}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#dc2626' }}>{N(row.debtService)} ر.س</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#16a34a' }}>{N(row.netIncome)} ر.س</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 700, color: !row.dscr || row.dscr >= 1.25 ? '#16a34a' : '#dc2626' }}>
                        {row.dscr?.toFixed(2) || 'N/A'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 10 }}>
                        {!row.dscr || row.dscr >= 1.25 ? '✅ مقبول' : '❌ ضعيف'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PFtr page="صفحة 2" />
        </div>

        {/* ══ ص 4: Drawdown + Stress + توصية ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          {drawdown.length > 0 && (
            <div className="no-break">
              <SecTitle title="جدول الصرف التدريجي (Drawdown)" sub="بالتنسيق مع مراحل البناء الفعلية" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['#', 'المرحلة', 'النسبة', 'مبلغ الصرف (ر.س)', 'الشرط', 'الشهر المتوقع'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#888', borderBottom: '2px solid #1d4ed8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drawdown.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1d4ed8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>{d.stage}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: '#1d4ed8' }}>{d.pct}٪</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>{N(d.amount)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: '#666' }}>{d.condition}</td>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: '#888', fontFamily: 'IBM Plex Mono' }}>شهر {d.months}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(29,78,216,0.05)', borderTop: '2px solid rgba(29,78,216,0.2)' }}>
                    <td /><td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>الإجمالي</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11, color: '#1d4ed8', fontFamily: 'IBM Plex Mono' }}>100٪</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, color: '#1d4ed8', fontFamily: 'IBM Plex Mono' }}>{N(bankAmount)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Stress Tests */}
          <div className="no-break" style={{ marginTop: 20 }}>
            <SecTitle title="اختبار الضغط البنكي" sub="قدرة المشروع على السداد في أسوأ السيناريوهات" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {stressTests.map(s => (
                <div key={s.label} style={{ borderRadius: 10, padding: '14px', background: s.bg, border: `1.5px solid ${s.bc}` }}>
                  <p style={{ fontSize: 10, color: '#666', margin: '0 0 8px', fontWeight: 600 }}>{s.label}</p>
                  <table style={{ width: '100%', fontSize: 11 }}>
                    <tbody>
                      {s.extra > 0 && <tr><td style={{ color: '#888' }}>تكلفة إضافية</td><td style={{ fontFamily: 'IBM Plex Mono', color: '#dc2626', fontWeight: 700 }}>{M(s.extra)}</td></tr>}
                      <tr><td style={{ color: '#888' }}>صافي الربح</td><td style={{ fontFamily: 'IBM Plex Mono', color: s.net > 0 ? '#0A0C12' : '#dc2626', fontWeight: 700 }}>{M(s.net)}</td></tr>
                      <tr><td style={{ color: '#888' }}>DSCR</td><td style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, color: !s.dscr || s.dscr >= 1.25 ? '#16a34a' : '#dc2626' }}>{s.dscr?.toFixed(2) || 'N/A'}</td></tr>
                    </tbody>
                  </table>
                  <p style={{ fontSize: 10, color: s.color, fontWeight: 700, margin: '8px 0 0' }}>{s.verdict}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final recommendation */}
          <div className="no-break" style={{ marginTop: 20 }}>
            <SecTitle title="خلاصة وتوصية البنك" />
            <div style={{
              borderRadius: 12, padding: '18px 22px',
              background: successScore >= 75 ? 'rgba(34,197,94,0.08)' : successScore >= 55 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              border: `2px solid ${successScore >= 75 ? 'rgba(34,197,94,0.35)' : successScore >= 55 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: successScore >= 75 ? '#16a34a' : successScore >= 55 ? '#d97706' : '#dc2626', margin: '0 0 6px' }}>
                    {successScore >= 75 ? '✅ قابل للتمويل' : successScore >= 55 ? '⚠️ قابل بشروط' : '❌ يحتاج مراجعة'}
                  </p>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                    LTC: {ltc.toFixed(1)}٪ · LTV: {ltv.toFixed(1)}٪ · DSCR: {dscr?.toFixed(2) || 'N/A'} · فائدة: {(bankRate * 100).toFixed(0)}٪
                  </p>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 16px' }}>
                  <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px' }}>نسبة النجاح المقدّرة</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: successScore >= 75 ? '#16a34a' : successScore >= 55 ? '#d97706' : '#dc2626', margin: 0, fontFamily: 'IBM Plex Mono' }}>{successScore}٪</p>
                </div>
              </div>
            </div>
          </div>

          <PFtr page="صفحة 3" />
        </div>

      </div>
    </div>
  );
}
