/* ── ShareholderInstitutionalReport ──
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
      <span style={{ color: 'rgba(10,12,18,0.35)' }}>سري للاستخدام الداخلي · للمستثمرين المؤسسيين</span>
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

const RISKS = [
  { risk: 'تأخر البيع أو انخفاض الطلب',  likelihood: 'متوسط', impact: 'عالٍ',   mitig: 'تحفيز المبيعات مبكراً + تخفيض مرحلي للسعر' },
  { risk: 'ارتفاع تكاليف البناء',          likelihood: 'متوسط', impact: 'متوسط',  mitig: 'عقود ثابتة السعر مع المقاولين' },
  { risk: 'تغيّر سعر الفائدة البنكية',     likelihood: 'منخفض', impact: 'منخفض',  mitig: 'تثبيت سعر الفائدة (Fixed Rate)' },
  { risk: 'تأخر الرخص والموافقات',         likelihood: 'منخفض', impact: 'متوسط',  mitig: 'التقديم المبكر + تخصيص احتياطي زمني 3 أشهر' },
];

/* ── Pure report component ── */
export default function ShareholdersAReport({ data }: { data: ReportData | null }) {
  if (!data || !data.institutional) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
        <p className="text-4xl">🏛</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.6)' }}>شغّل التحليل الأساسي أولاً</p>
      </div>
    );
  }

  const { projectName: projName, projectLocation, date, institutional: inst, input } = data;
  const { partnerPct, devPct, partnerEquity, devEquity, preferredReturn, netAfterPreferred, partnerTotal, investorIRR, equityMultiple, capitalCalls } = inst;
  const PREFERRED_RETURN_PCT = 8;

  return (
    <div dir="rtl" style={{ background: '#F4F3EF', padding: 24, fontFamily: 'Tajawal, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 10, background: '#0A0C12', color: 'white', border: 'none', cursor: 'pointer' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      {/* PAGE 1 — Cover */}
      <div className="rpt-card pg-sim">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 500, justifyContent: 'center' }}>
          <div style={{ background: 'rgba(37,99,235,0.07)', borderRadius: 999, padding: '8px 18px', fontSize: 11, color: '#2563eb', letterSpacing: '0.08em', marginBottom: 32, fontWeight: 700 }}>
            🏛 &nbsp; تقرير المساهمين المؤسسيين
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#0A0C12', margin: 0, lineHeight: 1.3 }}>فرصة استثمار مؤسسي</h1>
          <p style={{ fontSize: 16, color: '#B8924A', marginTop: 10, fontWeight: 600 }}>{projName}</p>
          {projectLocation && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>📍 {projectLocation}</p>}
          <div style={{ width: 64, height: 3, background: 'linear-gradient(90deg, #C9A05E, #B8924A)', borderRadius: 2, margin: '24px auto' }} />
          <p style={{ fontSize: 12, color: 'rgba(10,12,18,0.45)', marginBottom: 8 }}>تاريخ الإعداد: {date}</p>
          <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.35)', maxWidth: 400 }}>
            وثيقة سرية مخصصة للمستثمرين المؤسسيين المؤهلين فقط
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 40, width: '100%', maxWidth: 540 }}>
            <KPI label="رأس المال المطلوب"  value={fmtM(partnerEquity)} color="#2563eb" sub="مليون ريال" />
            <KPI label="IRR للمستثمر"        value={pct(investorIRR)}   color="#16a34a" sub="سنوياً (تقديري)" />
            <KPI label="مضاعف رأس المال"     value={`${equityMultiple.toFixed(2)}×`} color="#B8924A" sub="إجمالي العائد / رأس المال" />
          </div>
        </div>
        <PFtr page={1} total={3} />
      </div>

      {/* PAGE 2 — Ownership + Waterfall */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '0 24px 8px' }}>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>هيكل الملكية والحوكمة</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'rgba(184,146,74,0.06)', border: '2px solid rgba(184,146,74,0.25)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', marginBottom: 6 }}>حصة المستثمرين المؤسسيين</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#B8924A', margin: 0 }}>{(partnerPct * 100).toFixed(0)}٪</p>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.55)', marginTop: 8 }}>رأس المال: {fmtM(partnerEquity)}</p>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.06)', border: '2px solid rgba(37,99,235,0.25)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', marginBottom: 6 }}>حصة المطور (الشريك العامل)</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#2563eb', margin: 0 }}>{(devPct * 100).toFixed(0)}٪</p>
                <p style={{ fontSize: 11, color: 'rgba(10,12,18,0.55)', marginTop: 8 }}>رأس المال: {fmtM(devEquity)}</p>
              </div>
            </div>
            <div style={{ height: 14, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${partnerPct * 100}%`, background: '#B8924A' }} />
              <div style={{ width: `${devPct * 100}%`, background: '#2563eb' }} />
            </div>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>هيكل توزيع الأرباح (Waterfall)</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['المرحلة', 'الوصف', 'المبلغ (ر.س)', 'المستفيد']} head />
                <TR cols={['1 — استرداد رأس المال', 'أولوية مطلقة قبل أي توزيع', fmt(partnerEquity), 'المستثمرون']} />
                <TR cols={[`2 — Preferred Return ${PREFERRED_RETURN_PCT}٪`, `${PREFERRED_RETURN_PCT}٪ سنوياً × ${(input.projectDurationMonths / 12).toFixed(1)} سنة`, fmt(preferredReturn), 'المستثمرون']} alt />
                <TR cols={['3 — توزيع الأرباح المتبقية', `${(partnerPct * 100).toFixed(0)}٪ / ${(devPct * 100).toFixed(0)}٪`, fmt(netAfterPreferred), 'المستثمرون / المطور']} />
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'rgba(22,163,74,0.07)', border: '2px solid rgba(22,163,74,0.25)', marginTop: 10 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>إجمالي عائد المستثمر</p>
                <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)' }}>Preferred Return + حصة الأرباح</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', fontFamily: 'IBM Plex Mono' }}>{fmtM(partnerTotal)}</p>
            </div>
          </div>

          <div className="no-break">
            <SecTitle>ملخص العائد للمستثمر المؤسسي</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <KPI label="رأس المال المستثمر" value={fmtM(partnerEquity)}    color="#64748b" sub="مليون ريال" />
              <KPI label="إجمالي العائد"       value={fmtM(partnerTotal)}     color="#B8924A" sub="مليون ريال" />
              <KPI label="IRR (تقديري)"         value={pct(investorIRR)}       color="#16a34a" sub="سنوياً" />
              <KPI label="مضاعف رأس المال"      value={`${equityMultiple.toFixed(2)}×`} color="#7c3aed" sub="MOIC" />
            </div>
          </div>
        </div>
        <PFtr page={2} total={3} />
      </div>

      {/* PAGE 3 — Capital Call + Risk + Exit */}
      <div className="rpt-card pg-break">
        <PHdr project={projName} date={date} />
        <div style={{ padding: '0 24px 8px' }}>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>جدول استدعاء رأس المال (Capital Call)</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['الشريحة', 'النسبة', 'المبلغ (ر.س)', 'التوقيت', 'الشرط']} head />
                {capitalCalls.map((call, i) => (
                  <TR key={i} cols={[call.tranche, `${call.pct}٪`, fmt(call.amount), call.months === 0 ? 'الآن' : `بعد ${call.months} شهر`, call.condition]} alt={i % 2 === 1} />
                ))}
                <TR cols={['الإجمالي', '100٪', fmt(partnerEquity), `${input.projectDurationMonths} شهر`, '—']} />
              </tbody>
            </table>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>مصفوفة المخاطر والتخفيف</SecTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TR cols={['المخاطرة', 'الاحتمال', 'التأثير', 'آلية التخفيف']} head />
                {RISKS.map((r, i) => (
                  <TR key={i} cols={[r.risk, r.likelihood, r.impact, r.mitig]} alt={i % 2 === 1} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="no-break" style={{ marginBottom: 20 }}>
            <SecTitle>آليات الخروج وضمانات المستثمر</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { title: 'بيع الوحدات بالتجزئة',  desc: 'البيع المباشر للمستخدمين النهائيين مع توزيع عائد فوري عند كل عملية بيع', icon: '🏠' },
                { title: 'بيع المشروع بالجملة',    desc: 'بيع المشروع كاملاً لمستثمر مؤسسي أو صندوق عقاري بعد اكتمال البناء', icon: '🏢' },
                { title: 'التحويل للإيجار',         desc: 'تأجير الوحدات غير المباعة وإعادة التمويل عبر REIT أو بنك عقاري', icon: '📋' },
                { title: 'حق الاسترداد المبكر',     desc: 'حق المستثمر في الخروج بعد سنة واحدة بسعر السوق إذا لم يُحقق المشروع أهدافه', icon: '🔄' },
              ].map(ex => (
                <div key={ex.title} style={{ padding: '12px 14px', background: '#FAFAF8', border: '1px solid rgba(10,12,18,0.07)', borderRadius: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', marginBottom: 4 }}>{ex.icon} {ex.title}</p>
                  <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.55)', lineHeight: 1.6 }}>{ex.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="no-break" style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
            <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.45)', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#dc2626' }}>إخلاء المسؤولية:</strong> هذه الوثيقة إعلامية فقط ولا تُعدّ عرضاً للبيع أو دعوة للاستثمار.
              الأرقام المالية تقديرية وتستند إلى بيانات السوق المتاحة. يُنصح بمراجعة مستشار مالي ومحامٍ قبل اتخاذ أي قرار استثماري.
            </p>
          </div>
        </div>
        <PFtr page={3} total={3} />
      </div>
    </div>
  );
}
