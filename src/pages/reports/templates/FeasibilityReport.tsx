/* ── FeasibilityReport ──
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '2px solid #B8924A', marginBottom: 14 }}>
      <div>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#B8924A', lineHeight: 1 }}>بصيرة</span>
        <span style={{ display: 'block', fontSize: 7, color: '#aaa', letterSpacing: 2 }}>BASIRA ANALYTICS</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0C12', margin: 0 }}>دراسة جدوى شراء الأرض</p>
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
      <div style={{ width: 4, height: 16, background: '#B8924A', borderRadius: 2 }} />
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0A0C12', margin: 0 }}>{title}</h3>
    </div>
  );
}

function TR({ l, v, bold }: { l: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '7px 10px', fontSize: 11, color: '#777', background: '#FAFAF8', width: '45%' }}>{l}</td>
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

/* ── Pure report component ── */
export default function FeasibilityReport({ data }: { data: ReportData | null }) {
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();
  const pid = currentProject?.id;

  if (!data || !data.financials) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <p className="text-4xl">📋</p>
        <p className="font-bold text-sm" style={{ color: 'rgba(10,12,18,0.5)' }}>شغّل التحليل أولاً لعرض دراسة الجدوى</p>
        {pid && (
          <button
            onClick={() => navigate(`/project/${pid}#basics`)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', border: 'none', cursor: 'pointer' }}
          >
            ← انتقل إلى التحليل
          </button>
        )}
      </div>
    );
  }

  const { projectName: pname, projectLocation: ploc, date, input, financials: f, costs: c, rlv, summary, scenarios } = data;
  const safetyColor = (pct: number) => pct >= 15 ? '#16a34a' : pct >= 5 ? '#d97706' : '#dc2626';

  return (
    <div dir="rtl" className="report-content" style={{ background: '#F4F3EF', padding: '0 0 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT }} />

      {/* Toolbar */}
      <div className="no-print" style={{ padding: '10px 24px', background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)', display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12', cursor: 'pointer', border: 'none' }}>
          🖨️ طباعة / PDF
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px' }}>

        {/* ══ غلاف ══ */}
        <div className="rpt-card no-break" style={{ background: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#0A0C12,#1a1c24)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#B8924A', margin: 0, lineHeight: 1 }}>بصيرة</p>
              <p style={{ fontSize: 8, color: 'rgba(184,146,74,0.5)', margin: '2px 0 0', letterSpacing: 3 }}>BASIRA ANALYTICS</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{date}</p>
          </div>
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0C12', margin: '0 0 6px' }}>دراسة جدوى شراء الأرض</h1>
            <p style={{ fontSize: 13, color: '#B8924A', fontWeight: 600, margin: '0 0 24px' }}>Buy-No-More™ Analysis</p>
            <div style={{ border: '1.5px solid rgba(184,146,74,0.3)', borderRadius: 10, padding: '16px 32px', display: 'inline-block' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0A0C12', margin: '0 0 4px' }}>{pname}</p>
              {ploc && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>📍 {ploc}</p>}
            </div>
          </div>
          <div style={{ padding: '10px 28px', borderTop: '1px solid #f0f0f0', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>🔒 سري للاستخدام الداخلي</p>
            <p style={{ fontSize: 9, color: '#bbb', margin: 0 }}>منصة بصيرة</p>
          </div>
        </div>

        {/* ══ ص 2: بيانات الأرض + مؤشرات الجدوى ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="no-break">
              <SecTitle title="بيانات الأرض" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="الموقع"               v={ploc || '—'} />
                  <TR l="مساحة الأرض"          v={`${N(input.landArea)} م²`} bold />
                  <TR l="الكود النظامي"         v={input.zoningCode} />
                  <TR l="نوع الأرض"            v={input.landType} />
                  <TR l="الاستخدام"             v={input.usageType} />
                  <TR l="سعر الأرض/م²"         v={`${N(input.landPricePerM2)} ر.س`} />
                  <TR l="تكلفة الأرض الكلية"   v={`${N(input.landArea * input.landPricePerM2)} ر.س`} bold />
                  <TR l="سعر البيع/م²"         v={`${N(input.sellPricePerM2)} ر.س`} />
                </tbody>
              </table>
            </div>
            <div className="no-break">
              <SecTitle title="مؤشرات الجدوى" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <TR l="IRR"                v={P(f.irr)} bold />
                  <TR l="هامش الربح"         v={P(f.margin)} bold />
                  <TR l="ROI"                v={P(f.roi)} />
                  <TR l="صافي الربح"         v={M(f.net)} bold />
                  <TR l="إجمالي الإيرادات"   v={M(f.revenue)} />
                  <TR l="إجمالي التكاليف"    v={M(c?.totalCost)} />
                </tbody>
              </table>
            </div>
          </div>

          <PFtr page="صفحة 1" />
        </div>

        {/* ══ ص 3: BNM + سيناريوهات + توصية ══ */}
        <div className="rpt-card pg-break" style={{ background: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <PHdr p={pname} date={date} />

          {/* BNM Analysis */}
          {rlv && (
            <div className="no-break">
              <SecTitle title="Buy-No-More™ — الحد الأقصى المقبول للأرض" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                <KPI l="الحد الأقصى المطلق" v={`${N(rlv.maxLandPerM2)} ر.س/م²`} c="#dc2626" />
                <KPI l="السعر الحالي"        v={`${N(input.landPricePerM2)} ر.س/م²`} c="#B8924A" />
                <KPI l="هامش الأمان"         v={`${rlv.safetyMarginPct.toFixed(1)}٪`}
                  c={safetyColor(rlv.safetyMarginPct)}
                  sub={rlv.safetyMarginPct >= 15 ? 'جيد جداً' : rlv.safetyMarginPct >= 5 ? 'مقبول' : 'ضعيف — تحذير'} />
              </div>
              {/* Bar */}
              <div style={{ background: '#F4F3EF', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginBottom: 5 }}>
                  <span>صفر</span><span>السعر الحالي</span><span>الحد الأقصى</span>
                </div>
                <div style={{ height: 10, background: '#e5e5e5', borderRadius: 5, position: 'relative' }}>
                  <div style={{
                    height: '100%', borderRadius: 5,
                    background: rlv.safetyMarginPct >= 10 ? '#16a34a' : '#d97706',
                    width: `${Math.min(100, (input.landPricePerM2 / (rlv.maxLandPerM2 || 1)) * 100)}%`,
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div className="no-break" style={{ marginTop: 20 }}>
              <SecTitle title="تحليل السيناريوهات (±20٪ سعر البيع)" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['السيناريو', 'IRR', 'هامش الربح', 'صافي الربح', 'التقييم'].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#888', borderBottom: '2px solid #B8924A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((sc, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i === 1 ? 'rgba(184,146,74,0.04)' : i === 0 ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)' }}>
                      <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? '#B8924A' : '#444' }}>{sc.label}</td>
                      <td style={{ padding: '9px 10px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: sc.irr >= 15 ? '#16a34a' : sc.irr >= 8 ? '#d97706' : '#dc2626' }}>{P(sc.irr)}</td>
                      <td style={{ padding: '9px 10px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>{P(sc.margin)}</td>
                      <td style={{ padding: '9px 10px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>{M(sc.net)}</td>
                      <td style={{ padding: '9px 10px', fontSize: 11, color: sc.irr >= 15 ? '#16a34a' : '#d97706' }}>
                        {sc.irr >= 15 ? '✅ مجدٍ' : sc.irr >= 8 ? '⚠️ مقبول' : '❌ غير مجدٍ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recommendation */}
          {summary && (
            <div className="no-break" style={{ marginTop: 20 }}>
              <SecTitle title="توصية النظام النهائية" />
              <div style={{
                borderRadius: 12, padding: '16px 20px',
                background: summary.isBuy ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                border: `2px solid ${summary.isBuy ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{summary.isBuy ? '✅' : '❌'}</span>
                  <p style={{ fontSize: 15, fontWeight: 800, color: summary.isBuy ? '#16a34a' : '#dc2626', margin: 0 }}>
                    {summary.decision}
                  </p>
                </div>
                {summary.reasons.length > 0 && (
                  <ul style={{ margin: 0, paddingRight: 16 }}>
                    {summary.reasons.map((reason, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <PFtr page="صفحة 2" />
        </div>

      </div>
    </div>
  );
}
