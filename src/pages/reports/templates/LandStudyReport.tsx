/* ── LandStudyReport (دراسة الأرض) ──
   Pure presentational component — reads only from ReportData, no calculations.
   Focuses on regulation, land classification, setbacks, and BNM.
*/
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '2px solid #16a34a', marginBottom: 14 }}>
      <div>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>بصيرة</span>
        <span style={{ display: 'block', fontSize: 7, color: '#aaa', letterSpacing: 2 }}>BASIRA ANALYTICS</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: 0 }}>دراسة الأرض والكود النظامي</p>
        {p && <p style={{ fontSize: 9, color: '#888', margin: 0 }}>{p}</p>}
      </div>
      <p style={{ fontSize: 9, color: '#aaa' }}>{date}</p>
    </div>
  );
}

function PFtr({ page }: { page?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 6, marginTop: 18 }}>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>🔒 سري للاستخدام الداخلي</p>
      <p style={{ fontSize: 7, color: '#bbb', margin: 0 }}>{page || ''} · بصيرة للتحليل العقاري</p>
    </div>
  );
}

function SecTitle({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 10px' }}>
      <div style={{ width: 4, height: 16, background: '#16a34a', borderRadius: 2 }} />
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{title}</h3>
    </div>
  );
}

function TR({ l, v, bold }: { l: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '7px 10px', fontSize: 11, color: '#777', background: '#FAFAF8', width: '45%' }}>{l}</td>
      <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: bold ? 700 : 500, color: bold ? '#16a34a' : '#0A0C12', fontFamily: 'IBM Plex Mono, monospace' }}>{v}</td>
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

/* ── Setback diagram (top view, text-based) ── */
function SetbackDiagram({ s }: { s: { north: number; south: number; east: number; west: number } }) {
  const box = (label: string, val: number) => (
    <div style={{ textAlign: 'center', padding: '6px 10px', background: '#F4F3EF', borderRadius: 8, minWidth: 64 }}>
      <p style={{ fontSize: 9, color: '#888', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', margin: 0, fontFamily: 'IBM Plex Mono' }}>{val} م</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 0' }}>
      {box('شمال', s.north)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {box('غرب', s.west)}
        <div style={{ width: 80, height: 60, border: '2px dashed rgba(22,163,74,0.4)', borderRadius: 8, background: 'rgba(22,163,74,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, margin: 0 }}>الأرض</p>
        </div>
        {box('شرق', s.east)}
      </div>
      {box('جنوب', s.south)}
    </div>
  );
}

/* ── Pure report component ── */
export default function LandStudyReport({ data }: { data: ReportData | null }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
        <p className="text-4xl">🗺️</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.5)' }}>أدخل بيانات الأرض لعرض الدراسة</p>
      </div>
    );
  }

  const { projectName: pname, projectLocation: ploc, date, input, areas, financials: f, costs: c, rlv, regulation } = data;

  return (
    <div dir="rtl" className="report-content" style={{ background: '#F4F3EF', padding: '0 0 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      {/* Toolbar */}
      <div className="no-print" style={{ padding: '10px 24px', background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)', display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', cursor: 'pointer', border: 'none' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* ══ غلاف ══ */}
        <div className="rpt-card no-break" style={{ background: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>بصيرة</p>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', letterSpacing: 3 }}>BASIRA ANALYTICS</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{date}</p>
          </div>
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0C12', margin: '0 0 6px' }}>دراسة الأرض والكود النظامي</h1>
            <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, margin: '0 0 24px' }}>Land Study & Zoning Analysis</p>
            <div style={{ border: '1.5px solid rgba(22,163,74,0.3)', borderRadius: 10, padding: '16px 32px', display: 'inline-block' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0A0C12', margin: '0 0 4px' }}>{pname}</p>
              {ploc && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>📍 {ploc}</p>}
            </div>
          </div>
          <div style={{ padding: '10px 28px', borderTop: '1px solid #f0f0f0', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>🔒 سري للاستخدام الداخلي</p>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>منصة بصيرة</p>
          </div>
        </div>

        {/* ══ ص 2: بيانات الأرض + الكود + الارتدادات ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Land data */}
            <div className="no-break">
              <SecTitle title="بيانات الأرض" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="الموقع"               v={ploc || '—'} />
                  <TR l="مساحة الأرض"          v={`${N(input.landArea)} م²`} bold />
                  <TR l="عرض الشارع"           v={`${input.streetWidth} م`} />
                  <TR l="نوع الأرض"            v={input.landType} />
                  <TR l="الاستخدام المقترح"     v={input.usageType} />
                  <TR l="الكود النظامي"         v={input.zoningCode || '—'} bold />
                  <TR l="عدد الأدوار المقترح"   v={`${input.floors} أدوار`} />
                  <TR l="أدوار البدروم"         v={`${input.basementFloors} أدوار`} />
                  <TR l="نسبة البناء"           v={`${(input.gcr * 100).toFixed(0)}٪`} />
                </tbody>
              </table>
            </div>

            {/* Regulation summary */}
            <div className="no-break">
              {regulation ? (
                <>
                  <SecTitle title="الكود النظامي المطبَّق" />
                  <div style={{ background: regulation.isValid ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)', border: `1.5px solid ${regulation.isValid ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '12px', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: regulation.isValid ? '#16a34a' : '#dc2626', margin: '0 0 4px' }}>
                      {regulation.isValid ? '✅' : '❌'} {regulation.codeLabel}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(10,12,18,0.5)', margin: 0 }}>{regulation.classification}</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <TR l="الاستخدامات المسموحة" v={regulation.allowedUses.join('، ')} />
                      <TR l="الحد الأقصى للأدوار"   v={`${regulation.maxFloors} أدوار`} bold />
                      <TR l="نسبة البناء المسموحة"   v={`${(regulation.gcr * 100).toFixed(0)}٪`} />
                      <TR l="مساحة البناء الفعلية"   v={`${N(regulation.effectiveBuildArea)} م²`} bold />
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <SecTitle title="المساحات المحسوبة" />
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <TR l="مساحة البناء الكلية"     v={areas ? `${N(areas.grossBuildArea)} م²` : '—'} bold />
                      <TR l="المساحة القابلة للبيع"    v={areas ? `${N(areas.sellableArea)} م²` : '—'} bold />
                      <TR l="نسبة البناء الفعلية"      v={areas ? `${(areas.gcr * 100).toFixed(0)}٪` : '—'} />
                      <TR l="الوحدات المتوقعة"         v={areas ? `~${areas.estimatedUnits} وحدة` : '—'} />
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Setbacks */}
          {regulation && (
            <div className="no-break" style={{ marginTop: 20 }}>
              <SecTitle title="الارتدادات النظامية" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <SetbackDiagram s={regulation.setbacks} />
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <TR l="الارتداد الشمالي" v={`${regulation.setbacks.north} م`} bold />
                    <TR l="الارتداد الجنوبي" v={`${regulation.setbacks.south} م`} />
                    <TR l="الارتداد الشرقي"  v={`${regulation.setbacks.east} م`} />
                    <TR l="الارتداد الغربي"  v={`${regulation.setbacks.west} م`} />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings & Errors */}
          {regulation && (regulation.warnings.length > 0 || regulation.errors.length > 0) && (
            <div className="no-break" style={{ marginTop: 16 }}>
              {regulation.errors.map((e, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>❌ {e}</p>
                </div>
              ))}
              {regulation.warnings.map((w, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: '#d97706', margin: 0 }}>⚠️ {w}</p>
                </div>
              ))}
            </div>
          )}

          <PFtr page="صفحة 1" />
        </div>

        {/* ══ ص 3: المساحات + BNM + الجدوى ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          {/* Area KPIs */}
          {areas && (
            <div className="no-break">
              <SecTitle title="ملخص المساحات" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                <KPI l="مساحة الأرض"            v={`${N(areas.landArea)} م²`}        c="#B8924A" />
                <KPI l="مساحة البناء الكلية"     v={`${N(areas.grossBuildArea)} م²`}  c="#2563eb" />
                <KPI l="المساحة القابلة للبيع"   v={`${N(areas.sellableArea)} م²`}    c="#16a34a" />
                <KPI l="الوحدات المتوقعة"        v={`~${areas.estimatedUnits} وحدة`}  c="#7c3aed" />
              </div>
            </div>
          )}

          {/* BNM */}
          {rlv && (
            <div className="no-break" style={{ marginTop: 16 }}>
              <SecTitle title="Buy-No-More™ — الحد الأقصى المقبول لسعر الأرض" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                <KPI l="الحد الأقصى المطلق" v={`${N(rlv.maxLandPerM2)} ر.س/م²`} c="#dc2626" />
                <KPI l="السعر الحالي"        v={`${N(input.landPricePerM2)} ر.س/م²`} c="#B8924A" />
                <KPI l="هامش الأمان"         v={`${rlv.safetyMarginPct.toFixed(1)}٪`}
                  c={rlv.safetyMarginPct >= 15 ? '#16a34a' : rlv.safetyMarginPct >= 5 ? '#d97706' : '#dc2626'}
                  sub={rlv.safetyMarginPct >= 15 ? 'جيد جداً' : rlv.safetyMarginPct >= 5 ? 'مقبول' : 'ضعيف'} />
              </div>
            </div>
          )}

          {/* Financial summary */}
          {f && c && (
            <div className="no-break" style={{ marginTop: 16 }}>
              <SecTitle title="الملخص المالي للأرض" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <TR l="سعر الأرض/م²"           v={`${N(input.landPricePerM2)} ر.س`} />
                    <TR l="تكلفة الأرض الإجمالية"   v={M(c.landCost)} bold />
                    <TR l="تكلفة البناء الإجمالية"  v={M(c.buildCost)} />
                    <TR l="إجمالي تكلفة المشروع"    v={M(c.totalCost)} bold />
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <TR l="إجمالي الإيرادات المتوقعة" v={M(f.revenue)} bold />
                    <TR l="صافي الربح"               v={M(f.net)} bold />
                    <TR l="هامش الربح"               v={P(f.margin)} />
                    <TR l="IRR"                       v={P(f.irr)} bold />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inputs summary for record */}
          <div className="no-break" style={{ marginTop: 20 }}>
            <SecTitle title="ملخص مدخلات الدراسة" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { l: 'سعر البيع/م²',      v: `${N(input.sellPricePerM2)} ر.س` },
                { l: 'تكلفة البناء/م²',   v: `${N(input.buildCostPerM2)} ر.س` },
                { l: 'نسبة المصاريف الناعمة', v: P(input.softCostsPct * 100) },
                { l: 'الاحتياطي',          v: P(input.contingencyPct * 100) },
                { l: 'التمويل البنكي',      v: P(input.bankPct * 100) },
                { l: 'مدة المشروع',         v: `${input.projectDurationMonths} شهر` },
              ].map(item => (
                <div key={item.l} style={{ padding: '8px 12px', background: '#FAFAF8', borderRadius: 8, border: '1px solid rgba(10,12,18,0.07)' }}>
                  <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.45)', margin: '0 0 2px' }}>{item.l}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', fontFamily: 'IBM Plex Mono', margin: 0 }}>{item.v}</p>
                </div>
              ))}
            </div>
          </div>

          <PFtr page="صفحة 2" />
        </div>

      </div>
    </div>
  );
}
