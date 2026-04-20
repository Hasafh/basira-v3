import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analysisAPI } from '../../../api';
import { useAnalysisStore } from '../../../store/analysisStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart, Bar, Line } from 'recharts';
import { calculateLandCost, RETT_RATE } from '../../../engines/feasibility';
import { fmt } from '../../../utils/format';

export default function DryPowderTab({ project }: { project: any }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { financingStructure, setFinancingStructure, projectResults, formInput } = useAnalysisStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* Total cost — use per-project result, fall back to saved project result */
  const r    = projectResults[project?.id] ?? project?.result ?? null;
  const cost = r?.costs ?? r?.feasibility?.costs ?? null;
  const totalCostRaw = cost?.totalCost || 0;

  /* Land cost — prefer result (already includes RETT) over manual calculation */
  const landPricePerM2 = parseFloat(formInput.landPricePerM2 as string) || project?.input?.landPricePerM2 || 0;
  const landArea       = parseFloat(formInput.landArea       as string) || project?.input?.landArea       || 0;

  // If analysis result has landCost (incl. RETT), use it. Otherwise compute manually.
  const lc = cost?.landCost
    ? Math.round(cost.landCost)
    : (landPricePerM2 && landArea)
      ? Math.round(calculateLandCost(landArea, landPricePerM2, RETT_RATE))
      : 0;

  // RETT breakdown for display
  const landBase = cost?.landBasePrice ?? (landArea * landPricePerM2);
  const rettAmt  = cost?.rettCost      ?? (landBase * RETT_RATE);

  /* Local financing inputs (display as %, store as 0-1) */
  const [fin, setFinLocal] = useState({
    selfPct:             String(Math.round(financingStructure.selfPct    * 100)),
    bankPct:             String(Math.round(financingStructure.bankPct    * 100)),
    partnerPct:          String(Math.round(financingStructure.partnerPct * 100)),
    bankInterestRate:    String(financingStructure.bankInterestRate),
    bankYears:           String(financingStructure.bankYears),
    bankLTV:             String(financingStructure.bankLTV),
    gracePeriodMonths:   String(financingStructure.gracePeriodMonths),
    penaltyRate:         String(financingStructure.penaltyRate),
    loanDelayPenaltyPct: String(financingStructure.loanDelayPenaltyPct ?? 0),
    // Module 2 — Loan Lifecycle
    loanStartMonth:      String(financingStructure.loanStartMonth ?? 1),
    loanTranches:        String(financingStructure.loanTranches    ?? 3),
    capitalizeInterest:  String(financingStructure.capitalizeInterest ?? false),
  });

  const setFin = (k: string, v: string) => setFinLocal(f => ({ ...f, [k]: v }));

  /* Sync to store on change */
  useEffect(() => {
    setFinancingStructure({
      selfPct:             (parseFloat(fin.selfPct)    || 0) / 100,
      bankPct:             (parseFloat(fin.bankPct)    || 0) / 100,
      partnerPct:          (parseFloat(fin.partnerPct) || 0) / 100,
      bankInterestRate:    parseFloat(fin.bankInterestRate)    || 7,
      bankYears:           parseFloat(fin.bankYears)           || 2,
      bankLTV:             parseFloat(fin.bankLTV)             || 70,
      gracePeriodMonths:   parseFloat(fin.gracePeriodMonths)   || 0,
      penaltyRate:         parseFloat(fin.penaltyRate)         || 2,
      loanDelayPenaltyPct: parseFloat(fin.loanDelayPenaltyPct) || 0,
      loanStartMonth:      parseFloat(fin.loanStartMonth)      || 1,
      loanTranches:        parseFloat(fin.loanTranches)        || 3,
      capitalizeInterest:  fin.capitalizeInterest === 'true',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fin]);

  /* Financing sum validation */
  const finSum = (parseFloat(fin.selfPct) || 0) + (parseFloat(fin.bankPct) || 0) + (parseFloat(fin.partnerPct) || 0);
  const finValid = Math.abs(finSum - 100) < 1;

  /* Detect financing changes after last analysis run */
  const initialBankPct = useRef(String(Math.round(financingStructure.bankPct * 100)));
  const [finChangedAfterAnalysis, setFinChangedAfterAnalysis] = useState(false);
  const hasAnalysis = !!(projectResults[project?.id] ?? project?.result);
  useEffect(() => {
    if (hasAnalysis && fin.bankPct !== initialBankPct.current) {
      setFinChangedAfterAnalysis(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fin.bankPct, fin.selfPct, fin.partnerPct]);

  /* Dry powder form */
  const [form, setForm] = useState({
    cashAndEquivalents:  '',
    workInProgressCosts: '',
    newProjectLandCost:  String(lc || ''),
    duration:            '18',
  });

  // Keep land cost in sync with live formInput (user may update price/area in AnalyzerTab)
  useEffect(() => {
    if (lc > 0) setForm(f => ({ ...f, newProjectLandCost: String(lc) }));
  }, [lc]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const num = (v: string) => parseFloat(v) || 0;

  const submit = async () => {
    if (!form.cashAndEquivalents) { toast.error('يجب إدخال النقد المتوفر'); return; }
    setLoading(true);
    try {
      const res = await analysisAPI.runDryPowder({
        cashAndEquivalents:  num(form.cashAndEquivalents),
        workInProgressCosts: num(form.workInProgressCosts),
        newProjectTotalCost: totalCostRaw,
        newProjectLandCost:  num(form.newProjectLandCost),
        bankPct:             financingStructure.bankPct,
        partnerPct:          financingStructure.partnerPct,
        totalCost:           totalCostRaw,
        duration:            num(form.duration),
        bankInterestRate:    financingStructure.bankInterestRate,
      });
      setResult(res.data?.data || res.data);
      toast.success('✅ تم الحساب');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الحساب');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = !result ? null : result.acquisitionStatus === 'green'
    ? { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', color: '#16a34a', icon: '✅', label: 'السيولة تغطي المشروع مع هامش أمان' }
    : result.acquisitionStatus === 'orange'
    ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#d97706', icon: '🟡', label: 'تحتاج تمويلاً إضافياً' }
    : { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#dc2626', icon: '🔴', label: 'السيولة غير كافية' };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" dir="rtl">
      <div className="rounded-xl p-4 text-sm"
        style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
        <p className="font-bold mb-0.5" style={{ color: '#2563eb' }}>🏦 هيكل التمويل والسيولة الحرة (Dry Powder)</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          حدّد هيكل التمويل أولاً — ثم احسب قدرتك على تمويل مشاريع جديدة
        </p>
      </div>

      {/* ── Financing Structure ── */}
      <div style={card}>
        <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>🏦 هيكل التمويل</h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يُطبّق على التحليل الرئيسي تلقائياً — مجموع النسب يجب أن يساوي 100٪
        </p>

        {/* Percentages */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          {([
            { k: 'selfPct',    label: 'تمويل ذاتي ٪',   color: '#16a34a' },
            { k: 'bankPct',    label: 'تمويل بنكي ٪',    color: '#2563eb' },
            { k: 'partnerPct', label: 'مساهمون ٪',       color: '#7c3aed' },
          ] as const).map(({ k, label, color }) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
              <input
                type="number" min="0" max="100" step="1"
                value={fin[k]}
                onChange={e => setFin(k, e.target.value)}
                className="w-full text-sm"
                style={{ border: `1px solid ${color}44`, borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', color }}
                onFocus={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 0 3px ${color}18`; }}
                onBlur={e => { e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs mb-4"
          style={{ color: finValid ? '#16a34a' : '#dc2626' }}>
          <span>{finValid ? '✅' : '⚠️'}</span>
          <span>المجموع: {finSum.toFixed(0)}٪ {finValid ? '(صحيح)' : '— يجب أن يساوي 100٪'}</span>
        </div>

        {/* Re-run banner — shown when financing changed after analysis */}
        {finChangedAfterAnalysis && hasAnalysis && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span style={{ color: '#92400e', fontWeight: 600 }}>تغيّر هيكل التمويل — أعِد التحليل لتحديث نتائج البنك</span>
            </div>
            <button
              onClick={() => navigate(`/project/${id ?? project?.id}#basics`)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#92400e', border: '1px solid rgba(245,158,11,0.35)', cursor: 'pointer' }}
            >
              أعِد التحليل →
            </button>
          </div>
        )}

        {/* Bank details — shown only when bankPct > 0 */}
        {parseFloat(fin.bankPct) > 0 && (
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
            <p className="text-xs font-semibold" style={{ color: '#2563eb' }}>تفاصيل القرض البنكي</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { k: 'bankInterestRate', label: 'معدل الفائدة ٪',  placeholder: '7'  },
                { k: 'bankYears',        label: 'مدة القرض (سنة)', placeholder: '2'  },
                { k: 'bankLTV',          label: 'LTV ٪',            placeholder: '70' },
              ] as const).map(({ k, label, placeholder }) => (
                <div key={k}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
                  <input
                    type="number" min="0" step="any"
                    value={fin[k]} placeholder={placeholder}
                    onChange={e => setFin(k, e.target.value)}
                    className="w-full text-sm"
                    style={{ border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              ))}
            </div>

            {/* Module 2 — Loan Lifecycle controls */}
            <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(37,99,235,0.10)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#2563eb' }}>⏱ جدولة صرف القرض</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                    شهر بدء الصرف
                  </label>
                  <input type="number" min="0" max="12" step="1"
                    value={fin.loanStartMonth}
                    onChange={e => setFin('loanStartMonth', e.target.value)}
                    className="w-full text-sm"
                    style={{ border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                    عدد الشرائح
                  </label>
                  <select value={fin.loanTranches} onChange={e => setFin('loanTranches', e.target.value)}
                    style={{ border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: '14px', width: '100%', background: 'white' }}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} شريحة{n===1?' (دفعة واحدة)':n===3?' (موصى به)':''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                    رسملة الفوائد
                  </label>
                  <select value={fin.capitalizeInterest} onChange={e => setFin('capitalizeInterest', e.target.value)}
                    style={{ border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', fontSize: '14px', width: '100%', background: 'white' }}>
                    <option value="false">لا — أُسدِّد شهرياً</option>
                    <option value="true">نعم — تُضاف للأصل</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Settings toggle */}
            <button
              onClick={() => setShowAdvanced(s => !s)}
              className="flex items-center gap-2 text-xs font-medium mt-1 transition-colors"
              style={{ color: showAdvanced ? '#2563eb' : 'rgba(10,12,18,0.4)' }}
            >
              {showAdvanced ? '▲' : '▼'} إعدادات متقدمة
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {([
                  { k: 'gracePeriodMonths',   label: 'فترة سماح (شهر)',                    placeholder: '0' },
                  { k: 'penaltyRate',         label: 'مكافأة السداد المبكر ٪ (خصم فائدة)', placeholder: '2' },
                  { k: 'loanDelayPenaltyPct', label: 'غرامة تأخير سداد القرض ٪',          placeholder: '0' },
                ] as const).map(({ k, label, placeholder }) => (
                  <div key={k}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
                    <input
                      type="number" min="0" step="any"
                      value={fin[k]} placeholder={placeholder}
                      onChange={e => setFin(k, e.target.value)}
                      className="w-full text-sm"
                      style={{ border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Capital Stack (Phase 3) ── */}
      {totalCostRaw > 0 && (
        <CapitalStack fs={financingStructure} totalCost={totalCostRaw} revenue={r?.financials?.revenue ?? r?.feasibility?.financials?.revenue ?? 0} />
      )}

      {/* ── Module 2: Loan Lifecycle Chart ── */}
      {financingStructure.bankPct > 0 && totalCostRaw > 0 && (
        <LoanLifecycleSection
          fs={financingStructure}
          totalCost={totalCostRaw}
          projectMonths={Math.round((financingStructure.bankYears || 2) * 12)}
        />
      )}

      {/* ── Dry Powder Calculation ── */}
      <div style={card}>
        <h3 className="font-bold text-sm mb-3" style={{ color: '#0A0C12' }}>💧 حساب السيولة الحرة</h3>

        {/* Total cost — read-only from store */}
        {totalCostRaw > 0 && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(184,146,74,0.06)', border: '1px solid rgba(184,146,74,0.18)' }}>
            <span className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>التكلفة الإجمالية للمشروع (من التحليل)</span>
            <span className="font-black num" style={{ color: '#B8924A' }}>{fmt(totalCostRaw)} ر.س</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-4">
          <Inp label="النقد المتوفر (ر.س) *"          k="cashAndEquivalents"  form={form} set={set} />
          <Inp label="WIP — مشاريع قائمة (ر.س)"       k="workInProgressCosts" form={form} set={set} />
          <div>
            <Inp label="قيمة الأرض الجديدة (ر.س شاملاً RETT)" k="newProjectLandCost" form={form} set={set} />
            {lc > 0 && (
              <div className="mt-1.5 flex gap-3 text-xs px-1" style={{ color: 'rgba(10,12,18,0.45)' }}>
                <span>سعر الأرض: <strong className="num">{fmt(landBase)}</strong></span>
                <span>+</span>
                <span>RETT 5٪: <strong className="num" style={{ color: '#dc2626' }}>{fmt(rettAmt)}</strong></span>
              </div>
            )}
          </div>
          <Inp label="مدة التطوير (شهر)"               k="duration"            form={form} set={set} />
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
            color: loading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '⏳ جاري الحساب...' : '💧 احسب السيولة الحرة'}
        </button>
      </div>

      {result && statusInfo && (
        <div className="space-y-4 animate-fadeup">
          <div className="rounded-xl p-4 text-sm font-medium"
            style={{ background: statusInfo.bg, border: `1px solid ${statusInfo.border}`, color: statusInfo.color }}>
            {statusInfo.icon} {result.statusConfig?.[result.acquisitionStatus]?.message || statusInfo.label}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { l: 'النقد المتوفر',  v: (result.cashAndEquivalents||0)/1e6, c: '#0A0C12' },
              { l: 'WIP',            v: (result.workInProgressCosts||0)/1e6, c: '#d97706' },
              { l: 'Dry Powder',     v: (result.dryPowder||0)/1e6,           c: '#2563eb' },
            ].map(i => (
              <div key={i.l} style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{i.l}</p>
                <p className="text-xl font-bold num" style={{ color: i.c }}>{i.v.toFixed(2)}م</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.3)' }}>ر.س</p>
              </div>
            ))}
          </div>

          {result.sCurve?.length > 0 && (
            <div style={card}>
              <h4 className="font-bold text-xs mb-4" style={{ color: 'rgba(10,12,18,0.5)' }}>
                منحنى S — التدفق النقدي التراكمي
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={result.sCurve}>
                  <defs>
                    <linearGradient id="scurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8924A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#B8924A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
                  <XAxis dataKey="month" tickFormatter={v => `ش${v}`} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v/1e6).toFixed(1)}م`} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`${Number(v).toLocaleString()} ر.س`, 'التدفق التراكمي']}
                    contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid rgba(184,146,74,0.2)' }}
                  />
                  <ReferenceLine y={0} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cumulative"
                    stroke="#B8924A" strokeWidth={2} fill="url(#scurveGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Capital Stack — Phase 3 Advanced Financing Layer
   ════════════════════════════════════════════════════════ */

interface CapitalStackProps {
  fs: import('../../../store/analysisStore').FinancingStructure;
  totalCost: number;
  revenue: number;
}

function CapitalStack({ fs, totalCost, revenue }: CapitalStackProps) {
  const [showAmortTable, setShowAmortTable] = useState(false);

  const selfAmt    = fs.selfPct    * totalCost;
  const bankAmt    = fs.bankPct    * totalCost;
  const partnerAmt = fs.partnerPct * totalCost;

  /* Amortization */
  const principal = bankAmt;
  const r         = (fs.bankInterestRate / 100) / 12;
  const n         = fs.bankYears * 12;
  const monthlyPayment = (principal > 0 && r > 0 && n > 0)
    ? principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : 0;
  const totalPayments   = monthlyPayment * n;
  const totalInterest   = totalPayments - principal;
  // Early repayment reward — reduces interest owed (treated as a discount, not a penalty)
  const earlyRepayReward = fs.penaltyRate > 0 ? totalInterest * (fs.penaltyRate / 100) : 0;
  const effectiveTotalInterest = totalInterest - earlyRepayReward;

  /* Loan payment delay penalty — financial burden imposed by bank */
  const loanDelayPenalty = bankAmt > 0 && fs.loanDelayPenaltyPct > 0
    ? bankAmt * (fs.loanDelayPenaltyPct / 100)
    : 0;

  /* DSCR — Debt Service Coverage Ratio
     = (projected annual income) / (annual debt service)
     Annual income = total project revenue / loan duration in years
     DSCR ≥ 1.2 = acceptable for RE development */
  const annualDebtService     = monthlyPayment * 12;
  const projectedAnnualIncome = revenue > 0 && fs.bankYears > 0 ? revenue / fs.bankYears : 0;
  const dscr    = annualDebtService > 0 && projectedAnnualIncome > 0
    ? projectedAnnualIncome / annualDebtService
    : 0;
  const dscrOk  = dscr >= 1.2;

  /* 12-month amortization schedule */
  const amortRows: Array<{
    month: number; openBal: number; interest: number; principalPaid: number; closeBal: number;
  }> = [];
  if (principal > 0 && r > 0 && monthlyPayment > 0) {
    let bal = principal;
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interest      = bal * r;
      const principalPaid = Math.max(0, monthlyPayment - interest);
      const newBal        = Math.max(0, bal - principalPaid);
      amortRows.push({ month: i, openBal: bal, interest, principalPaid, closeBal: newBal });
      bal = newBal;
      if (bal < 1) break;
    }
  }

  /* LTV check */
  const ltvPct = fs.bankPct * 100;
  const ltvOk  = ltvPct <= fs.bankLTV;

  /* Stack segments */
  const segments = [
    { label: 'ذاتي',    pct: fs.selfPct,    amt: selfAmt,    color: '#16a34a' },
    { label: 'بنكي',    pct: fs.bankPct,    amt: bankAmt,    color: '#2563eb' },
    { label: 'مساهمون', pct: fs.partnerPct, amt: partnerAmt, color: '#7c3aed' },
  ].filter(s => s.pct > 0);

  return (
    <div style={card}>
      <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>
        📊 هيكل رأس المال (Capital Stack)
      </h3>

      {/* Stacked bar */}
      <div className="flex rounded-xl overflow-hidden mb-3" style={{ height: 32 }}>
        {segments.map(seg => (
          <div
            key={seg.label}
            style={{ width: `${seg.pct * 100}%`, background: seg.color, transition: 'width 0.4s' }}
            className="flex items-center justify-center"
          >
            {seg.pct >= 0.12 && (
              <span className="text-white text-xs font-bold">{(seg.pct * 100).toFixed(0)}٪</span>
            )}
          </div>
        ))}
      </div>

      {/* Legend + amounts */}
      <div className="flex flex-wrap gap-3 mb-4">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-xs" style={{ color: 'rgba(10,12,18,0.55)' }}>{seg.label}</span>
            <span className="text-xs font-bold num" style={{ color: seg.color }}>
              {fmtM(seg.amt)}م
            </span>
          </div>
        ))}
      </div>

      {/* LTV warning */}
      {fs.bankPct > 0 && !ltvOk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
          ⚠️ التمويل البنكي ({ltvPct.toFixed(0)}٪) يتجاوز حد LTV المُعتمد ({fs.bankLTV}٪)
        </div>
      )}
      {fs.bankPct > 0 && ltvOk && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.20)', color: '#16a34a' }}>
          ✅ التمويل البنكي ضمن حد LTV ({fs.bankLTV}٪)
        </div>
      )}

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StackKpi label="إجمالي حقوق الملكية" value={fmtM(selfAmt + partnerAmt) + 'م'} color="#0A0C12" />
        <StackKpi label="حصة المطوّر"          value={fmtM(selfAmt) + 'م'}              color="#16a34a" />
        {fs.partnerPct > 0 && (
          <StackKpi label="حصة المساهمين"      value={fmtM(partnerAmt) + 'م'}           color="#7c3aed" />
        )}
        {fs.bankPct > 0 && (
          <StackKpi label="مبلغ القرض"         value={fmtM(bankAmt) + 'م'}              color="#2563eb" />
        )}
        {fs.bankPct > 0 && dscr > 0 && (
          <StackKpi
            label={`DSCR ${dscrOk ? '✅' : '⚠️'}`}
            value={dscr.toFixed(2) + '×'}
            color={dscrOk ? '#16a34a' : '#d97706'}
          />
        )}
      </div>

      {/* Amortization panel */}
      {fs.bankPct > 0 && monthlyPayment > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#2563eb' }}>
            📅 جدول السداد (إطفاء القرض)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StackKpi label="القسط الشهري"         value={fmt(Math.round(monthlyPayment)) + ' ر.س'}    color="#2563eb" />
            <StackKpi label="إجمالي الفوائد"       value={fmtM(totalInterest) + 'م'}                  color="#d97706" />
            <StackKpi label="إجمالي المدفوعات"     value={fmtM(totalPayments) + 'م'}                  color="#0A0C12" />
            <StackKpi label={`المدة (${n} شهر)`}   value={`${fs.bankYears} سنة`}                     color="rgba(10,12,18,0.5)" />
            {earlyRepayReward > 0 && (
              <StackKpi label="🏆 مكافأة السداد المبكر"       value={`↓ ${fmtM(earlyRepayReward)}م`}        color="#16a34a" />
            )}
            {earlyRepayReward > 0 && (
              <StackKpi label="الفوائد الفعلية (بعد الخصم)"  value={fmtM(effectiveTotalInterest) + 'م'}    color="#16a34a" />
            )}
            {loanDelayPenalty > 0 && (
              <StackKpi label="⚠️ غرامة تأخير سداد القرض"    value={`+${fmtM(loanDelayPenalty)}م`}         color="#dc2626" />
            )}
          </div>
          {fs.gracePeriodMonths > 0 && (
            <p className="mt-2 text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
              * فترة السماح: {fs.gracePeriodMonths} شهر — الفوائد تتراكم خلالها
            </p>
          )}
          {loanDelayPenalty > 0 && (
            <div className="mt-3 px-3 py-2.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', color: '#dc2626' }}>
              🏦 عبء تمويلي — غرامة تأخير السداد ({fs.loanDelayPenaltyPct}٪ من قيمة القرض):
              <span className="font-black mr-1 num">{fmtM(loanDelayPenalty)}م ر.س</span>
              <span className="block mt-0.5 font-normal" style={{ color: 'rgba(220,38,38,0.65)' }}>
                تُضاف للتكلفة الإجمالية عند حساب الجدوى
              </span>
            </div>
          )}

          {/* 12-month amortization schedule */}
          {amortRows.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowAmortTable(s => !s)}
                className="flex items-center gap-2 text-xs font-medium mb-2 transition-colors"
                style={{ color: '#2563eb' }}
              >
                {showAmortTable ? '▲' : '▼'} جدول الأقساط الشهرية (أول {amortRows.length} شهر)
              </button>
              {showAmortTable && (
                <div className="overflow-x-auto rounded-xl"
                  style={{ border: '1px solid rgba(37,99,235,0.15)' }}>
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(37,99,235,0.06)' }}>
                        {['الشهر', 'الرصيد الافتتاحي', 'القسط', 'الفائدة', 'الأصل', 'الرصيد الختامي'].map(h => (
                          <th key={h} className="py-2 px-2.5 text-right font-semibold"
                            style={{ color: '#2563eb', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {amortRows.map((row, i) => (
                        <tr key={i}
                          style={{
                            borderTop: '1px solid rgba(37,99,235,0.08)',
                            background: i % 2 === 0 ? 'white' : 'rgba(37,99,235,0.02)',
                          }}>
                          <td className="py-1.5 px-2.5 font-bold num" style={{ color: '#2563eb' }}>{row.month}</td>
                          <td className="py-1.5 px-2.5 num" style={{ color: 'rgba(10,12,18,0.55)' }}>{fmt(Math.round(row.openBal))}</td>
                          <td className="py-1.5 px-2.5 num font-medium" style={{ color: '#0A0C12' }}>{fmt(Math.round(row.interest + row.principalPaid))}</td>
                          <td className="py-1.5 px-2.5 num" style={{ color: '#d97706' }}>{fmt(Math.round(row.interest))}</td>
                          <td className="py-1.5 px-2.5 num" style={{ color: '#16a34a' }}>{fmt(Math.round(row.principalPaid))}</td>
                          <td className="py-1.5 px-2.5 num" style={{ color: 'rgba(10,12,18,0.55)' }}>{fmt(Math.round(row.closeBal))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODULE 2 — Loan Lifecycle Section
   Shows tranched disbursement + balance + cumulative interest
   over the full loan term with capitalize-interest support.
══════════════════════════════════════════════════════ */

interface LoanMonth {
  month:      number;   // month number (1-based)
  disburse:   number;   // amount disbursed this month (new tranche)
  balance:    number;   // outstanding principal
  interest:   number;   // interest charged this month
  payment:    number;   // principal+interest payment this month
  cumInterest: number;  // cumulative interest paid so far
}

function buildLoanSchedule(params: {
  bankAmt:           number;
  loanStartMonth:    number;
  loanTranches:      number;
  projectMonths:     number;
  annualRate:        number;   // decimal e.g. 0.07
  gracePeriodMonths: number;
  capitalizeInterest: boolean;
}): LoanMonth[] {
  const {
    bankAmt, loanStartMonth, loanTranches, projectMonths,
    annualRate, gracePeriodMonths, capitalizeInterest,
  } = params;

  const monthlyRate  = annualRate / 12;
  const trancheAmt   = bankAmt / Math.max(1, loanTranches);
  // Spread tranches evenly starting at loanStartMonth
  const trancheMonths = Array.from({ length: loanTranches }, (_, i) =>
    loanStartMonth + Math.round(i * (projectMonths / loanTranches))
  );

  let balance = 0;
  let cumInterest = 0;
  const rows: LoanMonth[] = [];

  for (let m = 1; m <= projectMonths; m++) {
    // Disburse tranche if this is a tranche month
    const disburse = trancheMonths.includes(m) ? trancheAmt : 0;
    balance += disburse;

    const interest = balance * monthlyRate;
    let payment = 0;

    if (m <= gracePeriodMonths) {
      // Grace period
      if (capitalizeInterest) {
        // Add interest to principal — compound effect
        balance += interest;
      } else {
        // Interest-only payment
        payment = interest;
        cumInterest += interest;
      }
    } else {
      // Repayment phase — standard amortization payment
      // Recalculate remaining months for amortization
      const remainingMonths = Math.max(1, projectMonths - m + 1);
      if (monthlyRate > 0 && balance > 0) {
        payment = balance * (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
                  (Math.pow(1 + monthlyRate, remainingMonths) - 1);
        payment = Math.min(payment, balance + interest);
      } else {
        payment = balance / remainingMonths;
      }
      const principalPaid = Math.max(0, payment - interest);
      balance = Math.max(0, balance - principalPaid);
      cumInterest += interest;
    }

    rows.push({ month: m, disburse, balance, interest, payment, cumInterest });
  }

  return rows;
}

function LoanLifecycleSection({
  fs, totalCost, projectMonths,
}: {
  fs: import('../../../store/analysisStore').FinancingStructure;
  totalCost: number;
  projectMonths: number;
}) {
  const bankAmt = fs.bankPct * totalCost;
  const schedule = buildLoanSchedule({
    bankAmt,
    loanStartMonth:     fs.loanStartMonth   ?? 1,
    loanTranches:       fs.loanTranches      ?? 3,
    projectMonths:      Math.max(6, projectMonths),
    annualRate:         (fs.bankInterestRate ?? 7) / 100,
    gracePeriodMonths:  fs.gracePeriodMonths ?? 0,
    capitalizeInterest: fs.capitalizeInterest ?? false,
  });

  const totalInterestModel = schedule[schedule.length - 1]?.cumInterest ?? 0;
  const peakBalance        = Math.max(...schedule.map(r => r.balance));
  const chartData          = schedule.map(r => ({
    month:    r.month,
    رصيد:     Math.round(r.balance / 1e3) / 1e3,    // millions
    فائدة:    Math.round(r.interest / 1e3) / 1e3,   // millions
    صرف:      r.disburse > 0 ? Math.round(r.disburse / 1e3) / 1e3 : null,
  }));

  return (
    <div style={card}>
      <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>
        📈 دورة حياة القرض (Loan Lifecycle)
      </h3>
      <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
        صرف بـ {fs.loanTranches ?? 3} شرائح · بدء الشهر {fs.loanStartMonth ?? 1} ·
        {fs.capitalizeInterest ? ' رسملة الفوائد: نعم' : ' دفع فوائد شهرية'}
        {(fs.gracePeriodMonths ?? 0) > 0 ? ` · سماح ${fs.gracePeriodMonths} شهر` : ''}
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StackKpi label="مبلغ القرض"           value={fmtM(bankAmt) + 'م'}           color="#2563eb" />
        <StackKpi label="أقصى رصيد قائم"       value={fmtM(peakBalance) + 'م'}       color="#7c3aed" />
        <StackKpi label="إجمالي الفوائد (نموذج)" value={fmtM(totalInterestModel) + 'م'} color="#d97706" />
      </div>

      {/* Lifecycle chart */}
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={chartData} margin={{ right: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
          <XAxis dataKey="month" tickFormatter={v => `ش${v}`}
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `${v.toFixed(1)}م`}
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: any, name: string) => [`${Number(v).toFixed(2)}م ر.س`, name]}
            contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid rgba(37,99,235,0.2)', fontSize: 12 }}
            labelFormatter={l => `الشهر ${l}`}
          />
          {/* Disburse bars */}
          <Bar dataKey="صرف" fill="rgba(37,99,235,0.55)" radius={[3,3,0,0]} />
          {/* Balance line */}
          <Line type="monotone" dataKey="رصيد" stroke="#2563eb" strokeWidth={2} dot={false} />
          {/* Interest line */}
          <Line type="monotone" dataKey="فائدة" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3 text-xs" style={{ color: 'rgba(10,12,18,0.45)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(37,99,235,0.55)' }} />
          شرائح الصرف
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2" style={{ borderColor: '#2563eb' }} />
          الرصيد القائم
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: '#d97706' }} />
          الفائدة الشهرية
        </span>
      </div>

      {fs.capitalizeInterest && (
        <div className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.20)', color: '#dc2626' }}>
          ⚠️ رسملة الفوائد مُفعّلة — الفوائد تُضاف للأصل وتتراكب (compound). التكلفة الفعلية أعلى من الجدول البسيط.
        </div>
      )}
    </div>
  );
}

function fmtM(v: number) {
  return (v / 1e6).toFixed(2);
}

function StackKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.07)' }}>
      <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className="text-sm font-bold num" style={{ color }}>{value}</p>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(10,12,18,0.07)',
  borderRadius: '16px',
  padding: '20px',
};

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
