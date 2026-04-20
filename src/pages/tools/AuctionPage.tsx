import { useState } from 'react';
import toast from 'react-hot-toast';
import { analysisAPI } from '../../api';
import { useAnalysis } from '../../hooks/useAnalysis';
import { runAuctionFallback } from '../../engines/scenarios';

export default function AuctionTab({ project }: { project: any }) {
  const { formInput, lastResult } = useAnalysis();
  const inp = project?.input || {};
  const f   = lastResult?.financials;
  const c   = lastResult?.costs;

  /* Read shared values from context */
  const ctxLandArea     = parseFloat(String(formInput.landArea     || inp.landArea     || 0));
  const ctxBuildCost    = parseFloat(String(formInput.buildCostPerM2 || inp.buildCostPerM2 || 2000));
  const ctxSellPrice    = parseFloat(String(formInput.sellPricePerM2 || inp.sellPricePerM2 || 0));
  const ctxBankPct      = parseFloat(String(formInput.bankPct       || inp.bankPct       || 0));
  const ctxSoftCosts    = parseFloat(String(formInput.softCostsPct  || inp.softCostsPct  || 0.05));
  const ctxContingency  = parseFloat(String(formInput.contingencyPct|| inp.contingencyPct|| 0.05));
  const ctxFloors       = parseFloat(String(formInput.floors        || inp.floors        || 3));
  const ctxGcr          = parseFloat(String(formInput.groundCoverageRatio || inp.groundCoverageRatio || 0.6));
  const ctxProfitTarget = parseFloat(String(formInput.profitTarget  || inp.profitTarget  || 0.25));

  const [form, setForm] = useState({
    auctionStartingPrice:  '',
    targetProfitPct:       String(ctxProfitTarget || 0.25),
    auctionPremiumPct:     '5',
    competitorsBid:        '',
    projectDurationMonths: '24',
    bankInterestRate:      '7',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const num = (v: string) => parseFloat(v) || 0;

  const run = async () => {
    if (!ctxLandArea) { toast.error('أدخل أبعاد الأرض في تبويب الأبعاد أولاً'); return; }
    if (!ctxSellPrice) { toast.error('أدخل سعر البيع في تبويب الأساسي أولاً'); return; }
    setLoading(true);
    try {
      const res = await analysisAPI.runAuction({
        projectId:            project.id,
        landArea:             ctxLandArea,
        buildCostPerM2:       ctxBuildCost,
        sellPricePerM2:       ctxSellPrice,
        targetProfitPct:      num(form.targetProfitPct),
        bankPct:              ctxBankPct,
        bankInterestRate:     num(form.bankInterestRate),
        projectDurationMonths:num(form.projectDurationMonths),
        auctionPremiumPct:    num(form.auctionPremiumPct) / 100,
        competitorsBid:       num(form.competitorsBid) || undefined,
        softCostsPct:         ctxSoftCosts,
        contingencyPct:       ctxContingency,
        auctionStartingPrice: num(form.auctionStartingPrice) || undefined,
      });
      setResult(res.data?.data || res.data);
      toast.success('✅ اكتمل تحليل المزاد');
    } catch {
      /* Local fallback — via auction engine */
      toast('⚠️ Auction endpoint غير متاح — نتائج تقريبية', { icon: '⚠️' });
      setResult(runAuctionFallback(
        ctxLandArea,
        ctxGcr,
        ctxFloors,
        ctxBuildCost,
        ctxSellPrice,
        ctxBankPct,
        ctxSoftCosts,
        ctxContingency,
        num(form.targetProfitPct),
        num(form.auctionStartingPrice),
        num(form.auctionPremiumPct) / 100,
        num(form.projectDurationMonths),
        num(form.bankInterestRate),
      ));
    } finally {
      setLoading(false);
    }
  };

  const bids = result ? [
    { id: 'conservative', label: 'محافظ',  icon: '🛡️', color: '#16a34a', desc: 'احتمال فوز مرتفع، هامش ربح أعلى' },
    { id: 'moderate',     label: 'معتدل',  icon: '⚖️', color: '#B8924A', desc: 'توازن بين الفوز والربحية' },
    { id: 'aggressive',   label: 'عدواني', icon: '⚡', color: '#dc2626', desc: 'احتمال فوز أقل، هامش ربح منخفض' },
  ] : [];

  const safetyColor = result?.safetyMargin >= 15 ? '#16a34a' : result?.safetyMargin >= 5 ? '#d97706' : '#dc2626';
  const dscrOk = result?.dscr == null || result?.dscr >= 1.25;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="rounded-xl p-4" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)' }}>
        <p className="font-bold mb-0.5 text-sm" style={{ color: '#b45309' }}>🔨 دراسة المزاد العقاري</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          يستخدم مساحة الأرض وتكلفة البناء وسعر البيع من التبويبات السابقة تلقائياً
        </p>
      </div>

      {/* Source data summary */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.07)' }}>
        {[
          { l: 'مساحة الأرض', v: ctxLandArea ? `${ctxLandArea.toLocaleString()} م²` : '—', ok: !!ctxLandArea },
          { l: 'سعر البيع/م²', v: ctxSellPrice ? `${ctxSellPrice.toLocaleString()} ر.س` : '—', ok: !!ctxSellPrice },
          { l: 'تكلفة البناء/م²', v: `${ctxBuildCost.toLocaleString()} ر.س`, ok: true },
        ].map(item => (
          <div key={item.l}>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>{item.l}</p>
            <p className="font-bold text-sm num" style={{ color: item.ok ? '#0A0C12' : '#dc2626' }}>{item.v}</p>
          </div>
        ))}
      </div>

      {/* Auction-specific inputs */}
      <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
        <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>⚙️ بيانات المزاد</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { l: 'السعر الابتدائي للمزاد (ر.س/م²)', k: 'auctionStartingPrice' },
            { l: 'مدة المشروع (شهر)',                 k: 'projectDurationMonths' },
            { l: 'علاوة الاستعجال ٪',                 k: 'auctionPremiumPct' },
            { l: 'معدل الفائدة البنكية ٪',             k: 'bankInterestRate' },
            { l: 'تقدير عطاء المنافس (اختياري)',       k: 'competitorsBid' },
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
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>هدف الربح</label>
            <select value={form.targetProfitPct} onChange={e => set('targetProfitPct', e.target.value)}
              className="w-full text-sm"
              style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', background: 'white' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}>
              {[.15,.20,.25,.30,.35].map(v => <option key={v} value={v}>{v*100}٪</option>)}
            </select>
          </div>
        </div>
        <button onClick={run} disabled={loading}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #d97706, #b45309)',
            color: loading ? 'rgba(10,12,18,0.4)' : 'white', cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '⏳ جاري الحساب...' : '🔨 احسب عطاء المزاد'}
        </button>
      </div>

      {result && (
        <div className="space-y-4 animate-fadeup">
          {result.isApproximate && <p className="text-xs" style={{ color: '#d97706' }}>⚠️ نتائج تقريبية</p>}

          {/* Key indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="الحد الأقصى المطلق" value={`${result.maxLandPerM2?.toLocaleString()}`} unit="ر.س/م²" color="#dc2626" />
            <KpiCard label="نقطة التعادل" value={`${result.breakEvenPerM2?.toLocaleString()}`} unit="ر.س/م²" color="#d97706" />
            {result.safetyMargin !== null && result.safetyMargin !== undefined && (
              <KpiCard label="هامش الأمان" value={`${result.safetyMargin?.toFixed(1)}٪`} unit="من الحد الأقصى" color={safetyColor} />
            )}
            {result.dscr !== null && result.dscr !== undefined && (
              <KpiCard label="DSCR" value={result.dscr?.toFixed(2)} unit={result.dscr >= 1.25 ? '✅ > 1.25' : '❌ < 1.25'} color={dscrOk ? '#16a34a' : '#dc2626'} />
            )}
          </div>

          {/* Recommendation */}
          {result.recommend && (
            <div className="rounded-xl p-4 text-sm font-bold"
              style={{
                background: result.safetyMargin >= 15 ? 'rgba(34,197,94,0.08)' : result.safetyMargin >= 5 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${result.safetyMargin >= 15 ? 'rgba(34,197,94,0.3)' : result.safetyMargin >= 5 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: result.safetyMargin >= 15 ? '#16a34a' : result.safetyMargin >= 5 ? '#d97706' : '#dc2626',
              }}>
              {result.safetyMargin >= 15 ? '✅' : result.safetyMargin >= 5 ? '⚠️' : '❌'} {result.recommend}
            </div>
          )}

          {/* Bid cards */}
          <div className="grid grid-cols-3 gap-4">
            {bids.map(bid => {
              const data = result[bid.id];
              if (!data) return null;
              return (
                <div key={bid.id} className="rounded-2xl p-5" style={{ background: 'white', border: `2px solid ${bid.color}33` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: '18px' }}>{bid.icon}</span>
                    <span className="font-bold text-sm" style={{ color: bid.color }}>{bid.label}</span>
                  </div>
                  <p className="text-2xl font-bold num mb-1" style={{ color: bid.color }}>{data.perM2?.toLocaleString()}</p>
                  <p className="text-xs mb-3" style={{ color: 'rgba(10,12,18,0.45)' }}>ر.س / م²</p>
                  <p className="text-xs num" style={{ color: 'rgba(10,12,18,0.5)' }}>الإجمالي: {(data.total / 1e6)?.toFixed(2)}م ر.س</p>
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full" style={{ background: '#F4F3EF' }}>
                      <div className="h-full rounded-full" style={{ width: `${data.probability}%`, background: bid.color }} />
                    </div>
                    <p className="text-xs mt-1 num" style={{ color: 'rgba(10,12,18,0.4)' }}>احتمال الفوز: {data.probability}٪</p>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'rgba(10,12,18,0.45)' }}>{bid.desc}</p>
                </div>
              );
            })}
          </div>

          {form.competitorsBid && num(form.competitorsBid) > 0 && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
              <p className="font-bold mb-1" style={{ color: '#2563eb' }}>مقارنة مع عطاء المنافس</p>
              <p style={{ color: 'rgba(10,12,18,0.6)' }}>
                عطاء المنافس المقدَّر: <strong className="num">{Number(form.competitorsBid).toLocaleString()} ر.س/م²</strong>
                {num(form.competitorsBid) < (result.moderate?.perM2 || 0)
                  ? ' — عطاؤك المعتدل أعلى، احتمال فوز جيد'
                  : ' — عطاء المنافس مرتفع، راجع الاستراتيجية'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
      <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className="text-xl font-bold num" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.35)' }}>{unit}</p>
    </div>
  );
}
