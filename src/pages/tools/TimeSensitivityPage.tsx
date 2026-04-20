import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analysisAPI } from '../../api';
import { useAnalysis } from '../../hooks/useAnalysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { runTimingRows, runDelayRows } from '../../engines/scenarios';

const DURATIONS      = [12, 18, 24, 30, 36, 42, 48, 60];
const DELAY_MONTHS   = [0, 3, 6, 12, 18, 24];

export default function TimeSensitivityTab({ project }: { project: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projectResults, isAnalyzed, financingStructure } = useAnalysis();
  const r = projectResults[project?.id] ?? project?.result ?? null;
  const f = r?.financials;
  const c = r?.costs;
  const inp = project?.input || {};

  const [form, setForm] = useState({
    totalCost:        '',
    baseRevenue:      '',
    baseNet:          '',
    bankAmount:       '0',
    bankInterestRate: '7',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(fr => ({ ...fr, [k]: v }));
  const num = (v: string) => parseFloat(v) || 0;

  // Sync form when analysisResult becomes available
  useEffect(() => {
    if (f || c) {
      const tc = c?.totalCost || 0;
      const bankAmt = financingStructure.bankPct > 0 && tc > 0
        ? Math.round(financingStructure.bankPct * tc)
        : 0;
      setForm(prev => ({
        ...prev,
        totalCost:        String(tc   || prev.totalCost),
        baseRevenue:      String(f?.revenue   || prev.baseRevenue),
        baseNet:          String(f?.net       || prev.baseNet),
        bankAmount:       bankAmt > 0 ? String(bankAmt) : prev.bankAmount,
        bankInterestRate: financingStructure.bankInterestRate > 0
          ? String(financingStructure.bankInterestRate)
          : prev.bankInterestRate,
      }));
    }
  }, [r, project?.result]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (!form.totalCost && !f?.net) { toast.error('شغّل التحليل أولاً لتعبئة البيانات'); return; }
    setLoading(true);
    try {
      const res = await analysisAPI.runTimeSensitivity({
        projectId:        project.id,
        totalCost:        num(form.totalCost),
        baseRevenue:      num(form.baseRevenue),
        baseNet:          num(form.baseNet),
        bankAmount:       num(form.bankAmount),
        bankInterestRate: num(form.bankInterestRate),
        durations:        DURATIONS,
      });
      setResult(res.data?.data || res.data);
      toast.success('✅ اكتمل التحليل الزمني');
    } catch {
      // Local fallback — via timing engine
      const totalCost = num(form.totalCost) || c?.totalCost || 1;
      const baseNet   = num(form.baseNet)   || f?.net       || 0;
      const bankAmt   = num(form.bankAmount);

      const rows = runTimingRows(
        totalCost, baseNet, num(form.baseRevenue),
        bankAmt, num(form.bankInterestRate),
        DURATIONS,
      );

      setResult({ rows, isApproximate: true });
      toast('⚠️ نتائج تقريبية', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAnalyzed && !r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <div className="text-4xl">⏱️</div>
        <p className="text-sm font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
          شغّل تحليلاً من المحلل أولاً
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يحتاج التحليل الزمني إلى التكاليف والإيرادات من التحليل الأساسي
        </p>
        <button
          onClick={() => navigate(`/project/${id}#basics`)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
        >
          ← اذهب للمحلل
        </button>
      </div>
    );
  }

  const rows: any[] = result?.rows || [];
  const baseMonths   = num(form.totalCost) > 0 ? (inp?.projectDurationMonths || 24) : 24;
  const optimal      = rows.reduce((best: any, row: any) =>
    (row.irr > (best?.irr || 0)) ? row : best, null);

  /* ── Delay impact table — via timing engine ── */
  const bankAmt      = num(form.bankAmount);
  const baseNet      = num(form.baseNet)    || f?.net       || 0;
  const totalCostNum = num(form.totalCost)  || c?.totalCost || 0;

  const delayRows = runDelayRows(
    baseNet, totalCostNum,
    bankAmt, num(form.bankInterestRate),
    baseMonths, DELAY_MONTHS,
  );

  const maxSafeDelay = delayRows.filter(r => r.status === 'safe').slice(-1)[0]?.delayM ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.20)' }}>
        <p className="font-bold mb-0.5 text-sm" style={{ color: '#0284c7' }}>الحساسية الزمنية</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          كيف يتأثر العائد (IRR) بمدة المشروع من 12 إلى 60 شهراً؟
        </p>
      </div>

      <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { l: 'إجمالي التكاليف (ر.س)',  k: 'totalCost' },
            { l: 'الإيرادات (ر.س)',         k: 'baseRevenue' },
            { l: 'صافي الربح (ر.س)',        k: 'baseNet' },
            { l: 'مبلغ التمويل البنكي (ر.س)', k: 'bankAmount' },
            { l: 'معدل الفائدة ٪',          k: 'bankInterestRate' },
          ].map(fi => (
            <div key={fi.k}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{fi.l}</label>
              <input type="number" value={(form as any)[fi.k]} onChange={e => set(fi.k, e.target.value)}
                className="w-full text-sm"
                style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
        </div>
        <button onClick={run} disabled={loading}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading ? 'rgba(14,165,233,0.3)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: loading ? 'rgba(10,12,18,0.4)' : 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '⏳ جاري الحساب...' : '⏱️ تشغيل التحليل الزمني'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4 animate-fadeup">
          {result.isApproximate && (
            <p className="text-xs" style={{ color: '#d97706' }}>⚠️ نتائج تقريبية</p>
          )}

          {optimal && (
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(14,165,233,0.07)', border: '2px solid rgba(14,165,233,0.25)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.5)' }}>المدة الزمنية المثلى</p>
              <p className="text-lg font-bold" style={{ color: '#0284c7' }}>
                ⭐ {optimal.months} شهراً — IRR: {optimal.irr?.toFixed(1)}٪
              </p>
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
            <h4 className="font-bold text-xs mb-4" style={{ color: 'rgba(10,12,18,0.5)' }}>IRR مقابل مدة المشروع</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
                <XAxis dataKey="months" tickFormatter={v => `${v}ش`} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}٪`} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}${name === 'irr' ? '٪' : ' ر.س'}`, name === 'irr' ? 'IRR' : 'صافي الربح']}
                  labelFormatter={l => `مدة: ${l} شهر`}
                  contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid rgba(14,165,233,0.2)' }}
                />
                <ReferenceLine x={baseMonths} stroke="rgba(184,146,74,0.6)" strokeDasharray="4 4"
                  label={{ value: 'المدة الحالية', fill: '#B8924A', fontSize: 10, fontFamily: 'Tajawal' }} />
                <Line type="monotone" dataKey="irr" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4, fill: '#0284c7' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F3EF' }}>
                  {['المدة', 'IRR', 'الهامش', 'صافي الربح', 'فائدة البنك', ''].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const isBase    = row.months === baseMonths;
                  const isOptimal = row.months === optimal?.months;
                  return (
                    <tr key={row.months} style={{
                      background: isOptimal ? 'rgba(14,165,233,0.05)' : isBase ? 'rgba(184,146,74,0.04)' : 'transparent',
                      borderBottom: '1px solid rgba(10,12,18,0.05)',
                      fontWeight: isOptimal || isBase ? 700 : 400,
                    }}>
                      <td className="py-2.5 px-3 num">
                        {row.months} شهر
                        {isBase && <span className="mr-1 text-xs" style={{ color: '#B8924A' }}>(الحالي)</span>}
                        {isOptimal && !isBase && <span className="mr-1 text-xs" style={{ color: '#0284c7' }}>⭐</span>}
                      </td>
                      <td className="py-2.5 px-3 num font-bold"
                        style={{ color: row.irr >= 20 ? '#16a34a' : row.irr >= 12 ? '#d97706' : '#dc2626' }}>
                        {row.irr?.toFixed(1)}٪
                      </td>
                      <td className="py-2.5 px-3 num">{row.margin?.toFixed(1)}٪</td>
                      <td className="py-2.5 px-3 num">{((row.adjNet || 0) / 1e6).toFixed(2)}م</td>
                      <td className="py-2.5 px-3 num" style={{ color: '#dc2626' }}>
                        {((row.bankInterest || 0) / 1e6).toFixed(2)}م
                      </td>
                      <td className="py-2.5 px-3">
                        {isOptimal ? (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(14,165,233,0.1)', color: '#0284c7' }}>الأمثل</span>
                        ) : isBase ? (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(184,146,74,0.1)', color: '#B8924A' }}>الحالي</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delay impact table ── */}
      {(result || (bankAmt > 0 && totalCostNum > 0)) && (
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.20)' }}>
            <p className="font-bold text-sm mb-0.5" style={{ color: '#0284c7' }}>⏳ جدول تحمّل التأخير</p>
            {maxSafeDelay > 0 ? (
              <p className="text-xs" style={{ color: 'rgba(10,12,18,0.6)' }}>
                المشروع يتحمل تأخيراً حتى <strong style={{ color: '#16a34a' }}>{maxSafeDelay} شهر</strong> قبل أن يتعذّر السداد (DSCR &lt; 1.25)
              </p>
            ) : (
              <p className="text-xs" style={{ color: '#dc2626' }}>⚠️ أي تأخير يؤثر على القدرة على السداد</p>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F3EF' }}>
                  {['التأخير', 'تكلفة إضافية', 'IRR الجديد', 'DSCR', 'الحالة'].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delayRows.map(row => {
                  const statusConfig = ({
                    safe:   { icon: '✅', color: '#16a34a', bg: 'transparent' },
                    warn:   { icon: '⚠️', color: '#d97706', bg: 'rgba(245,158,11,0.04)' },
                    danger: { icon: '❌', color: '#dc2626', bg: 'rgba(239,68,68,0.04)' },
                  } as const)[row.status as 'safe' | 'warn' | 'danger'] ?? { icon: '—', color: '#64748b', bg: 'transparent' };
                  return (
                    <tr key={row.delayM} style={{ background: statusConfig.bg, borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                      <td className="py-2.5 px-3 num font-medium">
                        {row.delayM === 0 ? 'أساسي' : `+${row.delayM} شهر`}
                      </td>
                      <td className="py-2.5 px-3 num" style={{ color: row.addCost > 0 ? '#dc2626' : 'rgba(10,12,18,0.45)' }}>
                        {row.addCost > 0 ? `${(row.addCost / 1000).toFixed(0)}k ر.س` : '—'}
                      </td>
                      <td className="py-2.5 px-3 num font-bold" style={{ color: row.irr >= 20 ? '#16a34a' : row.irr >= 12 ? '#d97706' : '#dc2626' }}>
                        {row.irr?.toFixed(1)}٪
                      </td>
                      <td className="py-2.5 px-3 num" style={{ color: row.dscr === null ? 'rgba(10,12,18,0.4)' : row.dscr >= 1.25 ? '#16a34a' : row.dscr >= 1.0 ? '#d97706' : '#dc2626' }}>
                        {row.dscr !== null ? row.dscr.toFixed(2) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-sm">{statusConfig.icon}</span>
                        <span className="text-xs mr-1" style={{ color: statusConfig.color }}>
                          {row.status === 'safe' ? 'آمن' : row.status === 'warn' ? 'تحذير' : 'خطر'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
