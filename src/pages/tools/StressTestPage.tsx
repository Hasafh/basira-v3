import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Note: useParams needed for id, useNavigate for tab navigation
import toast from 'react-hot-toast';
import { analysisAPI } from '../../api';
import { useAnalysis } from '../../hooks/useAnalysis';
import { runStressTest } from '../../engines/scenarios';

export default function StressTestTab({ project }: { project: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projectResults, formInput, isAnalyzed } = useAnalysis();
  const r = projectResults[project?.id] ?? project?.result ?? null;
  const f = r?.financials;
  const c = r?.costs;
  const a = r?.areas;

  const [form, setForm] = useState({
    baseRevenue:           '',
    baseCosts:             '',
    baseNet:               '',
    sellPricePerM2:        '',
    nla:                   '',
    totalCost:             '',
    projectDurationMonths: '24',
    bankAmount:            '0',
    bankInterestRate:      '7',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(fr => ({ ...fr, [k]: v }));
  const num = (v: string) => parseFloat(v) || 0;

  // Sync form whenever result becomes available
  useEffect(() => {
    if (f || c || a) {
      setForm(prev => ({
        ...prev,
        baseRevenue:    String(f?.revenue   || prev.baseRevenue),
        baseCosts:      String(c?.totalCost || prev.baseCosts),
        baseNet:        String(f?.net       || prev.baseNet),
        sellPricePerM2: String(formInput.sellPricePerM2 || project?.input?.sellPricePerM2 || prev.sellPricePerM2),
        nla:            String(a?.sellableArea || a?.nla || prev.nla),
        totalCost:      String(c?.totalCost || prev.totalCost),
      }));
    }
  }, [r, project?.result, formInput.sellPricePerM2]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setLoading(true);
    try {
      const res = await analysisAPI.runStressTest({
        baseRevenue:           num(form.baseRevenue),
        baseCosts:             num(form.baseCosts),
        baseNet:               num(form.baseNet),
        sellPricePerM2:        num(form.sellPricePerM2),
        nla:                   num(form.nla),
        totalCost:             num(form.totalCost),
        projectDurationMonths: num(form.projectDurationMonths),
        bankAmount:            num(form.bankAmount),
        bankInterestRate:      num(form.bankInterestRate),
      });
      setResult(res.data?.data || res.data);
      toast.success('✅ تم الحساب');
    } catch (e: any) {
      try {
        const localResult = runStressTest(
          num(form.baseRevenue),
          num(form.baseCosts),
          num(form.baseNet),
          num(form.sellPricePerM2),
          num(form.nla),
          num(form.projectDurationMonths),
          num(form.bankAmount),
          num(form.bankInterestRate),
        );
        setResult(localResult);
        toast.success('✅ تم الحساب (محلي)');
      } catch {
        toast.error(e?.response?.data?.error || 'تعذّر الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAnalyzed && !r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <div className="text-4xl">🛡️</div>
        <p className="text-sm font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
          شغّل تحليلاً من المحلل أولاً
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يحتاج اختبار الضغط إلى نتائج التحليل الأساسي (IRR، الإيرادات، التكاليف)
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" dir="rtl">
      {/* Banner */}
      <div className="rounded-xl p-4 text-sm"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <p className="font-bold mb-0.5" style={{ color: '#dc2626' }}>مصفوفة اختبار الضغط</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          تأثير هبوط أسعار البيع والتأخير الزمني على ربحية المشروع
        </p>
      </div>

      <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'إجمالي الإيرادات (ر.س)',   k: 'baseRevenue' },
            { label: 'إجمالي التكاليف (ر.س)',     k: 'baseCosts' },
            { label: 'صافي الربح (ر.س)',           k: 'baseNet' },
            { label: 'سعر البيع (ر.س/م²)',         k: 'sellPricePerM2' },
            { label: 'المساحة القابلة للبيع NLA', k: 'nla' },
            { label: 'مدة المشروع (شهر)',          k: 'projectDurationMonths' },
          ].map(fi => (
            <Inp key={fi.k} label={fi.label} k={fi.k} form={form} set={set} />
          ))}
        </div>
        <button
          onClick={submit} disabled={loading}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
            color: loading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ جاري الحساب...' : '🛡️ تشغيل اختبار الضغط'}
        </button>
      </div>

      {result && (
        <div className="space-y-4 animate-fadeup">
          {result.breakEvenPricePerM2 > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="سعر التعادل" value={result.breakEvenPricePerM2?.toLocaleString()} unit="ر.س / م²" color="#dc2626" />
              <StatCard label="هامش الأمان السعري" value={`${result.priceDropTolerance?.toFixed(1)}٪`} unit="قبل الخسارة" color="#16a34a" />
            </div>
          )}

          {result.priceDropScenarios?.length > 0 && (
            <TableCard title="📉 سيناريوهات هبوط الأسعار">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['الهبوط', 'الإيرادات', 'الربح', 'الهامش', 'IRR'].map(h => (
                      <th key={h} className="text-right py-2.5 px-3 text-xs font-medium"
                        style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.priceDropScenarios.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                      <td className="py-2.5 px-3 num font-bold" style={{ color: '#dc2626' }}>{row.dropPct}٪</td>
                      <td className="py-2.5 px-3 num">{((row.adjRevenue||0)/1e6).toFixed(2)}م</td>
                      <td className="py-2.5 px-3 num font-bold"
                        style={{ color: (row.adjNet||0) < 0 ? '#dc2626' : '#16a34a' }}>
                        {((row.adjNet||0)/1e6).toFixed(2)}م
                      </td>
                      <td className="py-2.5 px-3 num">{row.adjMargin?.toFixed(1)}٪</td>
                      <td className="py-2.5 px-3 num">{row.adjIRR?.toFixed(1)}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}

          {result.delayScenarios?.length > 0 && (
            <TableCard title="⏱️ تأثير التأخير الزمني">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F4F3EF' }}>
                    {['التأخير', 'تكلفة إضافية', 'الربح المعدَّل', 'الهامش'].map(h => (
                      <th key={h} className="text-right py-2.5 px-3 text-xs font-medium"
                        style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.delayScenarios.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                      <td className="py-2.5 px-3 num font-bold" style={{ color: '#d97706' }}>{row.delayMonths} شهر</td>
                      <td className="py-2.5 px-3 num" style={{ color: '#dc2626' }}>
                        {((row.additionalCost||0)/1e6).toFixed(2)}م
                      </td>
                      <td className="py-2.5 px-3 num font-bold"
                        style={{ color: (row.adjustedNet||0) < 0 ? '#dc2626' : '#16a34a' }}>
                        {((row.adjustedNet||0)/1e6).toFixed(2)}م
                      </td>
                      <td className="py-2.5 px-3 num">{row.adjustedMargin?.toFixed(1)}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}
        </div>
      )}
    </div>
  );
}

function Inp({ label, k, form, set }: { label: string; k: string; form: any; set: (k: string, v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <input type="number" value={form[k]} onChange={e => set(k, e.target.value)}
        className="w-full text-sm"
        style={{
          border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px',
          padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: any; unit: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
      <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className="text-2xl font-bold num" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.35)' }}>{unit}</p>
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px', overflowX: 'auto' }}>
      <h4 className="font-bold text-xs mb-3" style={{ color: 'rgba(10,12,18,0.5)' }}>{title}</h4>
      {children}
    </div>
  );
}
