import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { analysisAPI, projectsAPI } from '../../../api';
import { useAnalysis } from '../../../hooks/useAnalysis';
import { useAnalysisStore } from '../../../store/analysisStore';
import { calculateAreas, calculateCosts, calculateRevenue, calculateRLV } from '../../../engines/feasibility';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RLVTab({ project }: { project: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { formInput, setFormField } = useAnalysis();
  const { financingStructure } = useAnalysisStore();

  const s = project?.input || {};

  /* ── Costs form (persisted to context) ── */
  const [costs, setCosts] = useState({
    buildCostPerM2: String(formInput.buildCostPerM2 || s.buildCostPerM2 || '2000'),
    softCostsPct:   String(formInput.softCostsPct   || s.softCostsPct   || '0.05'),
    contingencyPct: String(formInput.contingencyPct || s.contingencyPct || '0.05'),
    projectName:    project?.name     || '',
    location:       project?.location || '',
  });

  /* ── RLV calculator form ── */
  const [rlvForm, setRlvForm] = useState({
    targetProfitPct:       String(formInput.profitTarget || s.profitTarget || '0.25'),
    projectDurationMonths: '24',
  });

  const [result,      setResult]      = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [savingMeta,  setSavingMeta]  = useState(false);

  /* Mode toggles: 'pct' | 'sar' for soft costs and contingency */
  const [softMode, setSoftMode]   = useState<'pct'|'sar'>('pct');
  const [contMode, setContMode]   = useState<'pct'|'sar'>('pct');
  /* Absolute SAR values (used when mode = 'sar') */
  const [softSAR, setSoftSAR]     = useState('');
  const [contSAR, setContSAR]     = useState('');

  const num = (v: string) => parseFloat(v) || 0;

  /* Read-only values from context/project */
  const landArea    = num(String(formInput.landArea    || s.landArea    || 0));
  const sellPriceM2 = num(String(formInput.sellPricePerM2 || s.sellPricePerM2 || 0));

  /* Estimated gross build area (for sar→pct conversion) */
  const floors   = num(String(formInput.floors || s.floors || 4));
  const gcr      = num(String(formInput.groundCoverageRatio || s.groundCoverageRatio || 0.6));
  const estGFA   = landArea > 0 ? landArea * floors * gcr : 0;
  const estBuild = estGFA * num(costs.buildCostPerM2);

  /* Resolve effective pct values for the engine */
  const effectiveSoftPct = softMode === 'sar' && softSAR && estBuild > 0
    ? Math.min(num(softSAR) / estBuild, 1)
    : num(costs.softCostsPct);
  const effectiveContPct = contMode === 'sar' && contSAR && estBuild > 0
    ? Math.min(num(contSAR) / estBuild, 1)
    : num(costs.contingencyPct);

  /* Persist cost fields to context when they change */
  useEffect(() => { setFormField('buildCostPerM2', costs.buildCostPerM2); }, [costs.buildCostPerM2]);
  useEffect(() => {
    setFormField('softCostsPct', String(effectiveSoftPct));
  }, [costs.softCostsPct, softSAR, softMode, estBuild]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setFormField('contingencyPct', String(effectiveContPct));
  }, [costs.contingencyPct, contSAR, contMode, estBuild]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCost = (k: string, v: string) => setCosts(f => ({ ...f, [k]: v }));
  const setRlv  = (k: string, v: string) => setRlvForm(f => ({ ...f, [k]: v }));

  /* Save project name/location */
  const saveMeta = async () => {
    if (!project?.id) return;
    setSavingMeta(true);
    try {
      await projectsAPI.patch(project.id, {
        name:     costs.projectName,
        location: costs.location,
        status:   project.status || 'draft',
        input:    { ...s },
      });
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('✅ تم حفظ بيانات المشروع');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSavingMeta(false);
    }
  };

  /* Run RLV */
  const submit = async () => {
    if (!landArea) {
      toast.error('أدخل أبعاد الأرض في تبويب الأبعاد أولاً');
      navigate(`/project/${id}#dimensions`);
      return;
    }
    if (!sellPriceM2) {
      toast.error('أدخل سعر البيع في تبويب الأساسي أولاً');
      navigate(`/project/${id}#basics`);
      return;
    }
    if (!costs.buildCostPerM2) {
      toast.error('أدخل تكلفة البناء أولاً');
      return;
    }
    setLoading(true);
    try {
      const res = await analysisAPI.runRLV({
        landArea,
        constructionCostPerM2: num(costs.buildCostPerM2),
        sellPricePerM2:        sellPriceM2,
        targetProfitPct:       num(rlvForm.targetProfitPct),
        bankPct:               financingStructure.bankPct,
        bankInterestRate:      financingStructure.bankInterestRate || 7,
        projectDurationMonths: num(rlvForm.projectDurationMonths),
        softCostsPct:          effectiveSoftPct,
        contingencyPct:        effectiveContPct,
      });
      setResult(res.data?.data || res.data);
      toast.success('✅ تم الحساب');
    } catch (e: any) {
      try {
        const floors        = parseFloat(String(s.floors || formInput.floors || 4)) || 4;
        const gcr           = parseFloat(String(s.groundCoverageRatio || formInput.groundCoverageRatio || 0.6)) || 0.6;
        const durationYears = num(rlvForm.projectDurationMonths) / 12 || 2;
        const areas         = calculateAreas(landArea, floors, gcr, 0.15, 0);
        const costResult    = calculateCosts(
          landArea, 0, areas.aboveGroundGFA, 0,
          num(costs.buildCostPerM2),
          effectiveSoftPct,
          effectiveContPct,
          financingStructure.bankPct,
          (financingStructure.bankInterestRate || 7) / 100,
          durationYears,
        );
        const revenue              = calculateRevenue(areas.sellableArea, sellPriceM2);
        const constructionExclLand = costResult.aboveGroundBuildCost + costResult.softCosts + costResult.contingency + costResult.financingCost;
        const rlv                  = calculateRLV(revenue, constructionExclLand, landArea, num(rlvForm.targetProfitPct));
        setResult({ maxLandPerM2: rlv.maxLandPerM2, maxRawLandCost: rlv.maxLandBudget });
        toast.success('✅ تم الحساب (محلي)');
      } catch {
        toast.error(e?.response?.data?.error || 'تعذّر الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  const base = result?.maxLandPerM2;
  const chartData = base ? [
    { label: '-20٪',   v: Math.round(base * 0.65), dim: true },
    { label: '-10٪',   v: Math.round(base * 0.82), dim: true },
    { label: 'الأساس', v: base,                     dim: false },
    { label: '+10٪',   v: Math.round(base * 1.18), dim: true },
    { label: '+20٪',   v: Math.round(base * 1.35), dim: true },
  ] : [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" dir="rtl">

      {/* ── Info banner ── */}
      <div className="rounded-xl p-4 text-sm"
        style={{ background: 'rgba(184,146,74,0.07)', border: '1px solid rgba(184,146,74,0.20)' }}>
        <p className="font-bold mb-0.5" style={{ color: '#B8924A' }}>💰 التكاليف ومحرك السعر العكسي (RLV)</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.55)' }}>
          أدخل تكاليف البناء هنا — ثم احسب أقصى سعر يمكن دفعه للأرض لتحقيق هدف الربح
        </p>
      </div>

      {/* ── Section 1: Project metadata + build costs ── */}
      <div style={card}>
        <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>📋 بيانات المشروع والتكاليف</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <div>
            <label style={lbl}>اسم المشروع</label>
            <input
              value={costs.projectName}
              onChange={e => setCost('projectName', e.target.value)}
              style={fld}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={lbl}>الموقع</label>
            <input
              value={costs.location}
              onChange={e => setCost('location', e.target.value)}
              style={fld}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <NF label="تكلفة البناء (ر.س/م²) *" v={costs.buildCostPerM2} onChange={v => setCost('buildCostPerM2', v)} />

          {/* Soft Costs — toggle between % and fixed SAR */}
          <CostField
            label="التكاليف الناعمة"
            mode={softMode} onToggle={() => setSoftMode(m => m === 'pct' ? 'sar' : 'pct')}
            pctValue={costs.softCostsPct}   onPctChange={v => setCost('softCostsPct', v)}
            pctOptions={[0.03, 0.05, 0.07, 0.08, 0.10]}
            sarValue={softSAR}              onSarChange={setSoftSAR}
            estBuild={estBuild}
          />

          {/* Contingency — toggle between % and fixed SAR */}
          <CostField
            label="احتياطي الطوارئ"
            mode={contMode} onToggle={() => setContMode(m => m === 'pct' ? 'sar' : 'pct')}
            pctValue={costs.contingencyPct} onPctChange={v => setCost('contingencyPct', v)}
            pctOptions={[0.03, 0.05, 0.07, 0.10]}
            sarValue={contSAR}              onSarChange={setContSAR}
            estBuild={estBuild}
          />
        </div>

        <button
          onClick={saveMeta} disabled={savingMeta}
          className="mt-4 px-5 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: savingMeta ? 'rgba(184,146,74,0.3)' : 'rgba(184,146,74,0.08)',
            color: savingMeta ? 'rgba(10,12,18,0.4)' : '#B8924A',
            border: '1px solid rgba(184,146,74,0.25)',
          }}
        >
          {savingMeta ? '⏳ جاري الحفظ...' : '💾 حفظ بيانات المشروع'}
        </button>
      </div>

      {/* ── Section 2: RLV calculator ── */}
      <div style={card}>
        <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>🏷️ حاسبة السعر العكسي (RLV)</h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يستخدم مساحة الأرض وسعر البيع من التبويبات السابقة
        </p>

        {/* Read-only source values */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl"
          style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.07)' }}>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>مساحة الأرض (من الأبعاد)</p>
            <p className="font-bold num text-sm" style={{ color: landArea ? '#0A0C12' : '#dc2626' }}>
              {landArea ? `${landArea.toLocaleString()} م²` : '— غير محدد'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>سعر البيع/م² (من الأساسي)</p>
            <p className="font-bold num text-sm" style={{ color: sellPriceM2 ? '#0A0C12' : '#dc2626' }}>
              {sellPriceM2 ? `${sellPriceM2.toLocaleString()} ر.س` : '— غير محدد'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NF label="مدة المشروع (شهر)" v={rlvForm.projectDurationMonths} onChange={v => setRlv('projectDurationMonths', v)} />

          <div>
            <label style={lbl}>هدف الربح</label>
            <select value={rlvForm.targetProfitPct} onChange={e => setRlv('targetProfitPct', e.target.value)} style={{ ...fld, background: 'white' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}>
              {[.15,.20,.25,.30].map(v => (
                <option key={v} value={String(v)}>{(v * 100).toFixed(0)}٪</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lbl}>نسبة التمويل البنكي</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.10)', minHeight: 42 }}>
              <span className="font-bold num text-sm" style={{ color: '#0A0C12' }}>
                {(financingStructure.bankPct * 100).toFixed(0)}٪
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
                من التمويل 🏦
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={submit} disabled={loading}
          className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: loading ? 'rgba(184,146,74,0.4)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
            color: loading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ جاري الحساب...' : '🏷️ احسب أقصى سعر الأرض'}
        </button>
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4 animate-fadeup">
          <div className="grid grid-cols-2 gap-4">
            <ResultCard label="أقصى سعر للأرض"         unit="ر.س / م²" value={result.maxLandPerM2?.toLocaleString()} color="#B8924A" big />
            <ResultCard label="ميزانية الأرض الإجمالية" unit="ر.س"       value={`${((result.maxRawLandCost || 0) / 1e6).toFixed(2)}م`} color="#16a34a" big />
          </div>

          {chartData.length > 0 && (
            <div style={card}>
              <h4 className="font-bold text-xs mb-4" style={{ color: 'rgba(10,12,18,0.5)' }}>
                حساسية سعر الأرض عند تغيّر سعر البيع
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={36}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`${Number(v).toLocaleString()} ر.س/م²`, 'سعر الأرض']}
                    contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid rgba(184,146,74,0.2)' }}
                  />
                  <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={!entry.dim ? '#B8924A' : 'rgba(184,146,74,0.35)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(10,12,18,0.07)',
  borderRadius: '16px',
  padding: '20px',
};

const fld: React.CSSProperties = {
  border: '1px solid rgba(10,12,18,0.12)',
  borderRadius: '12px',
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'Tajawal, sans-serif',
  fontSize: '14px',
  width: '100%',
};

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '6px',
  color: 'rgba(10,12,18,0.5)',
};

function NF({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type="number" value={v} onChange={e => onChange(e.target.value)}
        style={{ ...fld, fontFamily: 'IBM Plex Mono, monospace' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── CostField: dual-mode input — percentage OR fixed SAR ── */
function CostField({ label, mode, onToggle, pctValue, onPctChange, pctOptions, sarValue, onSarChange, estBuild }: {
  label: string;
  mode: 'pct' | 'sar';
  onToggle: () => void;
  pctValue: string;
  onPctChange: (v: string) => void;
  pctOptions: number[];
  sarValue: string;
  onSarChange: (v: string) => void;
  estBuild: number;
}) {
  const sarNum = parseFloat(sarValue) || 0;
  const equivPct = mode === 'sar' && estBuild > 0 && sarNum > 0
    ? (sarNum / estBuild * 100).toFixed(1)
    : null;

  return (
    <div>
      {/* Label + toggle button */}
      <div className="flex items-center justify-between mb-1.5">
        <label style={lbl}>{label}</label>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs px-2 py-0.5 rounded-full font-bold transition-all"
          style={{
            background: mode === 'sar' ? 'rgba(37,99,235,0.12)' : 'rgba(184,146,74,0.10)',
            color:      mode === 'sar' ? '#2563eb'               : '#B8924A',
            border:     mode === 'sar' ? '1px solid rgba(37,99,235,0.25)' : '1px solid rgba(184,146,74,0.25)',
          }}
        >
          {mode === 'pct' ? '٪ → ر.س' : 'ر.س → ٪'}
        </button>
      </div>

      {mode === 'pct' ? (
        <select
          value={pctValue}
          onChange={e => onPctChange(e.target.value)}
          style={{ ...fld, background: 'white' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          {pctOptions.map(v => (
            <option key={v} value={String(v)}>{(v * 100).toFixed(0)}٪</option>
          ))}
        </select>
      ) : (
        <div>
          <input
            type="number"
            value={sarValue}
            onChange={e => onSarChange(e.target.value)}
            placeholder="مثال: 500000"
            style={{ ...fld, fontFamily: 'IBM Plex Mono, monospace' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.10)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {equivPct !== null && (
            <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>
              ≈ {equivPct}٪ من تكلفة البناء المقدّرة
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, unit, color, big }: {
  label: string; value: any; unit: string; color: string; big?: boolean;
}) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
      <p className="text-xs mb-2" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className={`font-bold num ${big ? 'text-3xl' : 'text-xl'}`} style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.35)' }}>{unit}</p>
    </div>
  );
}
