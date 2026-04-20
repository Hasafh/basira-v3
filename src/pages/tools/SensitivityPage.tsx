import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analysisAPI } from '../../api';
import { useAnalysis } from '../../hooks/useAnalysis';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { buildSensitivityMatrix } from '../../engines/scenarios';
import { runFeasibility } from '../../engines/feasibility';

const sv = (v: number | null | undefined, d = 1) =>
  v != null && isFinite(v) ? v.toFixed(d) : '--';

const VARIATIONS = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
const INPUTS_TO_TEST = [
  { key: 'sellPricePerM2',   label: 'سعر البيع',     field: 'sellPricePerM2' },
  { key: 'buildCostPerM2',   label: 'تكلفة البناء',  field: 'buildCostPerM2' },
  { key: 'landPricePerM2',   label: 'سعر الأرض',     field: 'landPricePerM2' },
];

export default function SensitivityTab({ project, analysisResult }: { project: any; analysisResult: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projectResults, lastInput, isAnalyzed } = useAnalysis();
  const r = projectResults[project?.id] ?? analysisResult ?? project?.result ?? null;
  const inp = Object.keys(lastInput).length > 0 ? lastInput : (project?.input || {});

  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<any>(null);
  const [activeInput, setActiveInput] = useState('sellPricePerM2');

  const canRun = !!(inp.landArea && inp.sellPricePerM2 && inp.landPricePerM2);

  const runSensitivity = async () => {
    if (!canRun) { toast.error('شغّل التحليل الأساسي أولاً'); return; }
    setLoading(true);
    try {
      // Try dedicated endpoint first
      const res = await analysisAPI.runSensitivity({
        projectId:   project.id,
        baseInputs:  inp,
        variations:  VARIATIONS,
        targetInputs: INPUTS_TO_TEST.map(i => i.field),
      });
      setMatrix(res.data?.data || res.data);
      toast.success('✅ اكتمل تحليل الحساسية');
    } catch {
      // Fallback: run actual runFeasibility for each variation — exact results, not linear
      if (!r?.financials) { toast.error('لا توجد بيانات تحليل. شغّل تبويب التحليل أولاً'); setLoading(false); return; }

      // Build base FeasibilityInput from lastInput
      const feasBase = {
        landArea:              Number(inp.landArea)             || 0,
        landPricePerM2:        Number(inp.landPricePerM2)       || 0,
        floors:                Number(inp.floors)               || 4,
        basementFloors:        Number(inp.basementFloors)       || 0,
        groundCoverageRatio:   Number(inp.groundCoverageRatio)  || 0.6,
        buildCostPerM2:        Number(inp.buildCostPerM2)       || 2000,
        sellPricePerM2:        Number(inp.sellPricePerM2)       || 0,
        softCostsPct:          Number(inp.softCostsPct)         || 0.05,
        contingencyPct:        Number(inp.contingencyPct)       || 0.05,
        bankPct:               Number(inp.bankPct)              || 0,
        interestRate:          0.07,
        projectDurationMonths: Number(inp.projectDurationMonths)|| 24,
        operationMode:         (inp.operationMode as any)       || 'sell',
        profitTarget:          Number(inp.profitTarget)         || 0.25,
      };

      const matrix: Record<string, any[]> = {};
      for (const { key } of INPUTS_TO_TEST) {
        const baseVal = (feasBase as any)[key] as number;
        matrix[key] = VARIATIONS.map(pct => {
          const override = { [key]: baseVal * (1 + pct / 100) };
          const res = runFeasibility({ ...feasBase, ...override });
          return { pct, irr: res.financials.irr, margin: res.financials.margin, net: res.financials.net };
        });
      }

      setMatrix({ matrix, baseIRR: r.financials.irr, baseMargin: r.financials.margin, isApproximate: false });
      toast.success('✅ تحليل حساسية محلي دقيق');
    } finally {
      setLoading(false);
    }
  };

  const activeData = matrix?.matrix?.[activeInput] || [];

  // Tornado data — impact of ±20% on each input
  const tornadoData = matrix ? INPUTS_TO_TEST.map(({ key, label }) => {
    const data = matrix.matrix?.[key] || [];
    const low  = data.find((d: any) => d.pct === -20)?.irr ?? 0;
    const high = data.find((d: any) => d.pct === 20)?.irr  ?? 0;
    return { label, low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10, range: Math.abs(high - low) };
  }).sort((a, b) => b.range - a.range) : [];

  if (!isAnalyzed && !r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <div className="text-4xl">📉</div>
        <p className="text-sm font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>
          شغّل تحليلاً من المحلل أولاً
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
          يحتاج تحليل الحساسية إلى نتائج التحليل الأساسي (IRR، الهامش، صافي الربح)
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
    <div className="p-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      {/* Banner */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
        <p className="font-bold mb-0.5 text-sm" style={{ color: '#2563eb' }}>تحليل الحساسية</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          كيف تتأثر العوائد عند تغيير سعر البيع أو التكاليف أو سعر الأرض؟
        </p>
      </div>

      {!r && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <span style={{ color: '#d97706' }}>💡 شغّل تبويب التحليل أولاً للحصول على النتائج الأساسية</span>
        </div>
      )}

      {/* Base KPIs */}
      {r?.financials && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'IRR الأساسي',    v: sv(r.financials.irr,    1) + '٪', c: '#16a34a' },
            { l: 'الهامش الأساسي', v: sv(r.financials.margin, 1) + '٪', c: '#B8924A' },
            { l: 'صافي الربح',     v: sv(r.financials.net != null ? r.financials.net / 1e6 : null, 2) + 'م', c: '#7c3aed' },
          ].map(k => (
            <div key={k.l} className="rounded-xl p-4 text-center"
              style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{k.l}</p>
              <p className="text-xl font-bold num" style={{ color: k.c }}>{k.v}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={runSensitivity} disabled={loading || !r}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
        style={{
          background: !r || loading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
          color: !r || loading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
          cursor: !r || loading ? 'not-allowed' : 'pointer',
        }}>
        {loading ? '⏳ جاري الحساب...' : '📊 تشغيل تحليل الحساسية'}
      </button>

      {matrix && (
        <div className="space-y-5 animate-fadeup">
          {matrix.isApproximate && (
            <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)', color: '#d97706' }}>
              ⚠️ النتائج تقريبية (حساب محلي) — للدقة الكاملة تأكد من تفعيل endpoint الحساسية في الباك اند
            </div>
          )}

          {/* Tornado Chart */}
          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
            <h4 className="font-bold text-xs mb-4" style={{ color: 'rgba(10,12,18,0.5)' }}>
              🌪️ مخطط تورنادو — تأثير ±20٪ على IRR
            </h4>
            <div className="space-y-3">
              {tornadoData.map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: '#0A0C12' }}>{d.label}</span>
                    <span className="text-xs num" style={{ color: 'rgba(10,12,18,0.45)' }}>
                      {d.low}٪ ← → {d.high}٪
                    </span>
                  </div>
                  <div className="relative h-6 rounded-full overflow-hidden" style={{ background: '#F4F3EF' }}>
                    <div
                      className="absolute h-full rounded-full"
                      style={{
                        right: `${50 - (d.low / (matrix.baseIRR || 1)) * 25}%`,
                        left: `${50 - (d.high / (matrix.baseIRR || 1)) * 25}%`,
                        background: d.range > 5 ? '#B8924A' : 'rgba(184,146,74,0.5)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs num font-bold" style={{ color: 'white', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
                        {d.range.toFixed(1)}٪ نطاق
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitivity Matrix */}
          <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
            <div className="flex gap-2 mb-4">
              {INPUTS_TO_TEST.map(i => (
                <button key={i.key} onClick={() => setActiveInput(i.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: activeInput === i.key ? 'rgba(184,146,74,0.12)' : '#F4F3EF',
                    color:      activeInput === i.key ? '#B8924A' : 'rgba(10,12,18,0.55)',
                    border:     activeInput === i.key ? '1px solid rgba(184,146,74,0.30)' : '1px solid transparent',
                  }}>
                  {i.label}
                </button>
              ))}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F3EF' }}>
                  {['التغيير ٪', 'IRR', 'الهامش', 'صافي الربح', 'الحكم'].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium"
                      style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeData.map((row: any, i: number) => {
                  const isBase  = row.pct === 0;
                  const isGood  = row.irr > (matrix.baseIRR || 20);
                  const isBad   = row.irr < 10;
                  return (
                    <tr key={i}
                      style={{
                        background:  isBase ? 'rgba(184,146,74,0.06)' : 'transparent',
                        borderBottom: '1px solid rgba(10,12,18,0.05)',
                        fontWeight:  isBase ? 700 : 400,
                      }}>
                      <td className="py-2.5 px-3 num font-bold"
                        style={{ color: row.pct > 0 ? '#16a34a' : row.pct < 0 ? '#dc2626' : '#B8924A' }}>
                        {row.pct > 0 ? '+' : ''}{row.pct}٪
                        {isBase && ' (الأساس)'}
                      </td>
                      <td className="py-2.5 px-3 num font-bold"
                        style={{ color: isBad ? '#dc2626' : isGood ? '#16a34a' : '#0A0C12' }}>
                        {row.irr?.toFixed(1)}٪
                      </td>
                      <td className="py-2.5 px-3 num">{row.margin?.toFixed(1)}٪</td>
                      <td className="py-2.5 px-3 num">{(row.net / 1e6)?.toFixed(2)}م</td>
                      <td className="py-2.5 px-3 text-xs">
                        {row.irr >= 20 ? <Chip c="green" l="مقبول" />
                          : row.irr >= 12 ? <Chip c="amber" l="حدّي" />
                          : <Chip c="red" l="ضعيف" />}
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

function Chip({ c, l }: { c: 'green' | 'amber' | 'red'; l: string }) {
  const map = {
    green: { bg: 'rgba(34,197,94,0.1)',  color: '#16a34a' },
    amber: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
    red:   { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
  };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: map[c].bg, color: map[c].color }}>
      {l}
    </span>
  );
}
