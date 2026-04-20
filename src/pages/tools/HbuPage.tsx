import { useState } from 'react';
import toast from 'react-hot-toast';
import { analysisAPI } from '../../api';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useAnalysisStore } from '../../store/analysisStore';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { HBU_SCENARIOS, runHBUFallback } from '../../engines/scenarios';

// HBU_SCENARIOS imported from engine

export default function HBUTab({ project }: { project: any }) {
  const { formInput, projectResults } = useAnalysis();
  const lastResult = projectResults[project?.id] ?? project?.result ?? null;
  const { landType: storeLandType } = useAnalysisStore();
  const inp = project?.input || {};

  /* Read from context — no duplicate inputs */
  const landArea      = parseFloat(String(formInput.landArea       || inp.landArea       || 0));
  const landPricePerM2= parseFloat(String(formInput.landPricePerM2 || inp.landPricePerM2 || 0));
  const streetWidth   = parseFloat(String(formInput.streetWidth    || inp.streetWidth    || 20));
  const zoningCode    = String(formInput.zoningCode || inp.zoningCode || '');
  const ctxSellPrice  = parseFloat(String(formInput.sellPricePerM2 || inp.sellPricePerM2 || 0));

  /* Filter scenarios by landType AND zoningCode prefix
     س... → residential only  |  ت... → commercial only  |  كود-X → use landType fallback */
  const landType   = storeLandType || String(formInput.landType || inp.landType || '');
  const codePrefix = zoningCode.charAt(0);
  const codeRestriction =
    codePrefix === 'س' ? 'سكني' :
    codePrefix === 'ت' ? 'تجاري' :
    null;  // 'كود-X' and unrecognised codes impose no restriction

  // Code restriction wins over landType field — it's the legally binding constraint
  const effectiveType = codeRestriction ?? (landType || null);
  const blockedByCode = codeRestriction !== null;

  const filteredScenarios = effectiveType
    ? HBU_SCENARIOS.filter(s => s.landType === effectiveType)
    : HBU_SCENARIOS;

  /* HBU-specific overrides (commercial sell price differs) */
  const [sellRes, setSellRes] = useState(String(ctxSellPrice || ''));
  const [sellCom, setSellCom] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const canRun = landArea > 0 && landPricePerM2 > 0;

  const runHBU = async () => {
    if (!canRun) { toast.error('أدخل بيانات الأرض في تبويبي الأبعاد والأساسي أولاً'); return; }
    const resSell = parseFloat(sellRes) || ctxSellPrice;
    const comSell = parseFloat(sellCom) || ctxSellPrice * 1.3;
    if (!resSell) { toast.error('أدخل سعر البيع السكني أو شغّل التحليل الأساسي'); return; }
    setLoading(true);
    try {
      const res = await analysisAPI.runHBU({
        projectId:            project.id,
        landArea,
        landPricePerM2,
        streetWidth,
        sellPriceResidential: resSell,
        sellPriceCommercial:  comSell,
        scenarios:            filteredScenarios,
        zoningCode:           zoningCode || undefined,
      });
      setResults(res.data?.data?.scenarios || res.data?.scenarios || {});
      toast.success('✅ اكتمل تحليل HBU');
    } catch {
      /* Local fallback — via HBU engine */
      const softCostsPct = parseFloat(String(formInput.softCostsPct   || inp.softCostsPct   || 0.05));
      const contingency  = parseFloat(String(formInput.contingencyPct || inp.contingencyPct || 0.05));
      const duration     = parseFloat(String(formInput.projectDurationMonths || inp.projectDurationMonths || 24));
      const localResults = runHBUFallback(
        landArea, landPricePerM2,
        filteredScenarios,
        resSell, comSell,
        softCostsPct, contingency,
        duration,
      );
      setResults(localResults);
      toast('⚠️ نتائج تقريبية', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  const sorted = filteredScenarios.filter(s => results[s.id])
    .sort((a, b) => (results[b.id]?.irr || 0) - (results[a.id]?.irr || 0));
  const best = sorted[0];
  const radarData = sorted.map(s => ({
    subject: s.label,
    IRR: Math.max(0, parseFloat((results[s.id]?.irr || 0).toFixed(1))),
    الهامش: Math.max(0, parseFloat((results[s.id]?.margin || 0).toFixed(1))),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)' }}>
        <p className="font-bold mb-0.5 text-sm" style={{ color: '#7c3aed' }}>🔍 الاستخدام الأمثل للأرض (HBU)</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          مقارنة سيناريوهات الاستخدام — البيانات تُقرأ تلقائياً من التبويبات السابقة
          {effectiveType && <span className="mr-1 px-1.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>{effectiveType} فقط</span>}
        </p>
      </div>

      {/* Zoning code restriction notice */}
      {blockedByCode && (
        <div className="rounded-xl p-3 text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', color: '#dc2626' }}>
          🚫 الكود النظامي <strong>{zoningCode}</strong> يُقيّد الاستخدام على <strong>{codeRestriction}</strong> فقط —
          {' '}السيناريوهات المخالفة محجوبة تلقائياً
        </div>
      )}

      {/* Auto-loaded data summary */}
      <div className="grid grid-cols-4 gap-3 p-4 rounded-xl" style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.07)' }}>
        {[
          { l: 'مساحة الأرض', v: landArea ? `${landArea.toLocaleString()} م²` : '—', ok: !!landArea },
          { l: 'سعر الأرض/م²', v: landPricePerM2 ? `${landPricePerM2.toLocaleString()} ر.س` : '—', ok: !!landPricePerM2 },
          { l: 'عرض الشارع', v: streetWidth ? `${streetWidth} م` : '—', ok: true },
          { l: 'الكود النظامي', v: zoningCode || 'غير محدد', ok: !!zoningCode },
        ].map(item => (
          <div key={item.l}>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>{item.l}</p>
            <p className="font-bold text-sm num" style={{ color: item.ok ? '#0A0C12' : '#dc2626' }}>{item.v}</p>
          </div>
        ))}
      </div>

      {!canRun && (
        <div className="rounded-xl p-4 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', color: '#dc2626' }}>
          ⚠️ أدخل مساحة الأرض وسعرها في تبويبي الأبعاد والأساسي أولاً
        </div>
      )}

      {/* Sell price overrides */}
      <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
        <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>💰 أسعار البيع للمقارنة</h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يستخدم سعر البيع من الأساسي افتراضياً — يمكن تعديله هنا لأغراض المقارنة فقط
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              سعر البيع السكني (ر.س/م²)
            </label>
            <input type="number" value={sellRes} onChange={e => setSellRes(e.target.value)}
              placeholder={String(ctxSellPrice || 'من الأساسي')}
              className="w-full text-sm"
              style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              سعر البيع التجاري (ر.س/م²)
            </label>
            <input type="number" value={sellCom} onChange={e => setSellCom(e.target.value)}
              placeholder={ctxSellPrice ? String(Math.round(ctxSellPrice * 1.3)) : 'أعلى من السكني عادةً'}
              className="w-full text-sm"
              style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
        <button onClick={runHBU} disabled={loading || !canRun}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading || !canRun ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #9333ea, #7c3aed)',
            color: loading || !canRun ? 'rgba(10,12,18,0.4)' : 'white',
            cursor: loading || !canRun ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '⏳ جاري تحليل السيناريوهات...' : '🔍 تحليل الاستخدام الأمثل'}
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-4 animate-fadeup">
          {best && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.07)', border: '2px solid rgba(124,58,237,0.30)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.5)' }}>الاستخدام الأمثل الموصى به</p>
              <p className="text-lg font-bold" style={{ color: '#7c3aed' }}>🏆 {best.label}</p>
              <p className="text-sm num mt-1" style={{ color: 'rgba(10,12,18,0.6)' }}>
                IRR: <strong style={{ color: '#7c3aed' }}>{results[best.id]?.irr?.toFixed(1)}٪</strong>
                {' · '}
                الهامش: <strong style={{ color: '#7c3aed' }}>{results[best.id]?.margin?.toFixed(1)}٪</strong>
                {' · '}
                صافي الربح: <strong style={{ color: '#7c3aed' }}>{(results[best.id]?.net / 1e6)?.toFixed(2)}م ر.س</strong>
              </p>
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F3EF' }}>
                  {['الاستخدام', 'IRR', 'الهامش', 'صافي الربح', 'الإيرادات', 'GFA', ''].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((sc, i) => {
                  const res   = results[sc.id];
                  const isBest = i === 0;
                  return (
                    <tr key={sc.id} style={{
                      background: isBest ? 'rgba(124,58,237,0.04)' : 'transparent',
                      borderBottom: '1px solid rgba(10,12,18,0.05)',
                      fontWeight: isBest ? 700 : 400,
                    }}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {isBest && <span style={{ fontSize: '12px' }}>🏆</span>}
                          <span style={{ color: isBest ? '#7c3aed' : '#0A0C12' }}>{sc.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 num font-bold" style={{ color: res?.irr >= 20 ? '#16a34a' : res?.irr >= 12 ? '#d97706' : '#dc2626' }}>
                        {res?.irr?.toFixed(1)}٪
                      </td>
                      <td className="py-2.5 px-3 num">{res?.margin?.toFixed(1)}٪</td>
                      <td className="py-2.5 px-3 num">{(res?.net / 1e6)?.toFixed(2)}م</td>
                      <td className="py-2.5 px-3 num">{(res?.revenue / 1e6)?.toFixed(2)}م</td>
                      <td className="py-2.5 px-3 num">{res?.gfa?.toLocaleString()} م²</td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: isBest ? 'rgba(124,58,237,0.1)' : 'rgba(10,12,18,0.04)', color: isBest ? '#7c3aed' : 'rgba(10,12,18,0.4)' }}>
                          {i + 1}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {radarData.length >= 3 && (
            <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
              <h4 className="font-bold text-xs mb-4" style={{ color: 'rgba(10,12,18,0.5)' }}>مقارنة بصرية</h4>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(10,12,18,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontFamily: 'Tajawal' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar dataKey="IRR" stroke="#B8924A" fill="rgba(184,146,74,0.2)" strokeWidth={2} />
                  <Tooltip contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
