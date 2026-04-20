import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../api';
import { useAuthStore, useProjectsStore } from '../../store';
import { useAnalysisStore } from '../../store/analysisStore';
import { useMasterDataStore } from '../../store/masterDataStore';
import { runFeasibility } from '../../engines/feasibility';
import CitySelect     from '../../components/shared/CitySelect';
import DistrictSelect from '../../components/shared/DistrictSelect';

/**
 * SafeValue — converts a number that may be null/undefined/NaN/Infinity
 * into a display string. Returns '--' for any non-finite value.
 * Usage: sv(project.result?.financials?.irr) → "12.3" or "--"
 */
function sv(v: number | null | undefined, decimals = 1): string {
  return v != null && isFinite(v) ? v.toFixed(decimals) : '--';
}

/* ── Status config ── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'مسودة',  color: 'rgba(10,12,18,0.45)', bg: 'rgba(10,12,18,0.07)' },
  active:    { label: 'نشط',    color: '#16a34a',              bg: 'rgba(34,197,94,0.10)' },
  completed: { label: 'مكتمل',  color: '#2563eb',              bg: 'rgba(37,99,235,0.10)' },
  archived:  { label: 'مؤرشف', color: '#d97706',               bg: 'rgba(245,158,11,0.10)' },
};

/* ── Quick code presets for scanner ── */
const QUICK_CODES: Record<string, { label: string; floors: number; gcr: number; landType: string }> = {
  '':     { label: 'افتراضي — شقق 4 أدوار',       floors: 4, gcr: 0.60, landType: 'سكني'  },
  'س111': { label: 'س111 — فيلا (≤ 500م²)',        floors: 3, gcr: 0.65, landType: 'سكني'  },
  'س121': { label: 'س121 — شقق 4 أدوار',           floors: 4, gcr: 0.60, landType: 'سكني'  },
  'س122': { label: 'س122 — شقق 5-9 أدوار',         floors: 9, gcr: 0.55, landType: 'سكني'  },
  'ت111': { label: 'ت111 — محلات تجارية',           floors: 2, gcr: 0.70, landType: 'تجاري' },
  'ت121': { label: 'ت121 — مكاتب ومختلط',           floors: 6, gcr: 0.60, landType: 'تجاري' },
};

/* ════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user }           = useAuthStore();
  const navigate           = useNavigate();
  const qc                 = useQueryClient();
  const { setCurrentProject } = useProjectsStore();
  const { initFormForProject } = useAnalysisStore();

  /* ── Scanner state ── */
  const [landArea,       setLandArea]       = useState('');
  const [landPricePerM2, setLandPricePerM2] = useState('');
  const [sellPricePerM2, setSellPricePerM2] = useState('');
  const [codeKey,        setCodeKey]        = useState('');
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const [buildCostPerM2, setBuildCostPerM2] = useState('2000');
  const [profitTarget,   setProfitTarget]   = useState('0.25');
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [saveName,       setSaveName]       = useState('');

  /* ── Projects ── */
  const [showModal, setShowModal] = useState(false);
  const [name, setName]           = useState('');
  const [cityId, setCityId]       = useState('');
  const [districtId, setDistrictId] = useState('');

  const { cities, districts } = useMasterDataStore();

  /* Derive location string for the API */
  const location = (() => {
    const city     = cities.find(c => c.id === cityId);
    const district = districts.find(d => d.id === districtId);
    if (district && city)  return `${district.name}، ${city.name}`;
    if (district)          return district.name;
    if (city)              return city.name;
    return '';
  })();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsAPI.list();
      return res.data?.data || res.data?.projects || [];
    },
  });

  const create = useMutation({
    mutationFn: (d: any) => projectsAPI.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false); setName(''); setCityId(''); setDistrictId('');
      const p = res.data?.data?.project || res.data?.data || res.data?.project;
      if (p?.id) { setCurrentProject(p); navigate(`/project/${p.id}#summary`); }
      else toast.success('تم إنشاء المشروع');
    },
    onError: () => toast.error('تعذّر إنشاء المشروع'),
  });

  const createFromScanner = useMutation({
    mutationFn: (d: any) => projectsAPI.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      const p = res.data?.data?.project || res.data?.data || res.data?.project;
      if (p?.id) {
        setCurrentProject(p);
        const code = QUICK_CODES[codeKey] || QUICK_CODES[''];
        initFormForProject(p.id, {
          landArea,
          landPricePerM2,
          sellPricePerM2,
          buildCostPerM2,
          profitTarget,
          floors:              String(code.floors),
          groundCoverageRatio: String(code.gcr),
          landType:            code.landType,
          zoningCode:          codeKey,
        });
        navigate(`/project/${p.id}#basics`);
      }
      setShowSaveModal(false);
      setSaveName('');
    },
    onError: () => toast.error('تعذّر إنشاء المشروع'),
  });

  /* ── Live scanner result — synchronous, no API ── */
  const scanResult = useMemo(() => {
    const la = parseFloat(landArea);
    const lp = parseFloat(landPricePerM2);
    const sp = parseFloat(sellPricePerM2);
    if (!la || !lp || !sp || la <= 0 || lp <= 0 || sp <= 0) return null;
    const code = QUICK_CODES[codeKey] || QUICK_CODES[''];
    try {
      return runFeasibility({
        landArea:              la,
        landPricePerM2:        lp,
        sellPricePerM2:        sp,
        floors:                code.floors,
        groundCoverageRatio:   code.gcr,
        buildCostPerM2:        parseFloat(buildCostPerM2) || 2000,
        softCostsPct:          0.05,
        contingencyPct:        0.05,
        bankPct:               0,
        interestRate:          0.07,
        projectDurationMonths: 24,
        operationMode:         'sell',
        profitTarget:          parseFloat(profitTarget) || 0.25,
        servicesRatio:         code.landType === 'تجاري' ? 0.20 : 0.15,
      });
    } catch {
      return null;
    }
  }, [landArea, landPricePerM2, sellPricePerM2, codeKey, buildCostPerM2, profitTarget]);

  const hasInputs    = !!(parseFloat(landArea) && parseFloat(landPricePerM2) && parseFloat(sellPricePerM2));
  const targetMargin = (parseFloat(profitTarget) || 0.25) * 100;
  const fin          = scanResult?.financials;
  const rlv          = scanResult?.rlv;
  const isBuy        = scanResult?.summary?.isBuy;

  /* Verdict styling */
  const verdictCfg = !fin ? null
    : isBuy
    ? { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  color: '#16a34a', icon: '✅', text: `الصفقة مجدية — هامش ${fin.margin.toFixed(1)}٪` }
    : fin.margin >= targetMargin * 0.85
    ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#d97706', icon: '🟡', text: `قريبة — هامش ${fin.margin.toFixed(1)}٪ (الهدف ${targetMargin.toFixed(0)}٪)` }
    : { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#dc2626', icon: '❌', text: `غير مجدية — هامش ${fin.margin.toFixed(1)}٪ أقل من الهدف ${targetMargin.toFixed(0)}٪` };

  const openProject = (p: any) => {
    setCurrentProject(p);
    navigate(`/project/${p.id}#basics`);
  };

  return (
    <div className="flex flex-col min-h-full overflow-auto" dir="rtl" style={{ background: '#F4F3EF' }}>

      {/* ════════════════════════════════════════
          QUICK-START SCANNER — Hero section
          ════════════════════════════════════════ */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-black text-xl" style={{ color: '#0A0C12' }}>
              امسح الصفقة في 30 ثانية
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
              مرحباً {user?.name ?? ''} — أدخل 3 أرقام واحصل على حكم فوري
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}>
            + مشروع جديد
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', boxShadow: '0 4px 24px rgba(184,146,74,0.08)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* ── LEFT PANEL: Inputs ── */}
            <div className="p-6" style={{ borderLeft: '1px solid rgba(10,12,18,0.06)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(10,12,18,0.4)', letterSpacing: '0.05em' }}>
                INPUTS — بيانات الأرض
              </p>

              <div className="space-y-3">
                {/* 3 primary inputs */}
                <ScannerInput
                  label="مساحة الأرض (م²)"
                  value={landArea} onChange={setLandArea}
                  placeholder="مثال: 600" accent="#2563eb"
                />
                <ScannerInput
                  label="سعر شراء الأرض (ر.س/م²)"
                  value={landPricePerM2} onChange={setLandPricePerM2}
                  placeholder="مثال: 4,000" accent="#B8924A"
                />
                <ScannerInput
                  label="سعر البيع المتوقع (ر.س/م²)"
                  value={sellPricePerM2} onChange={setSellPricePerM2}
                  placeholder="مثال: 7,500" accent="#16a34a"
                />

                {/* Building code */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                    الكود النظامي (اختياري)
                  </label>
                  <select
                    value={codeKey}
                    onChange={e => setCodeKey(e.target.value)}
                    className="w-full text-sm"
                    style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', background: 'white', outline: 'none', fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}
                  >
                    {Object.entries(QUICK_CODES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(s => !s)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors pt-1"
                  style={{ color: showAdvanced ? '#B8924A' : 'rgba(10,12,18,0.4)' }}
                >
                  {showAdvanced ? '▲' : '▼'} إعدادات متقدمة
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <ScannerInput label="تكلفة البناء (ر.س/م²)" value={buildCostPerM2} onChange={setBuildCostPerM2} placeholder="2000" accent="#7c3aed" />
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>هدف الربح</label>
                      <select value={profitTarget} onChange={e => setProfitTarget(e.target.value)}
                        className="w-full text-sm"
                        style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', background: 'white', outline: 'none', cursor: 'pointer' }}>
                        {[0.15, 0.20, 0.25, 0.30, 0.35].map(v => (
                          <option key={v} value={String(v)}>{(v * 100).toFixed(0)}٪</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: Live verdict ── */}
            <div className="p-6" style={{ background: hasInputs ? 'white' : '#FAFAF8' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(10,12,18,0.4)', letterSpacing: '0.05em' }}>
                VERDICT — الحكم الفوري
              </p>

              {!hasInputs ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: 'rgba(184,146,74,0.06)' }}>🔍</div>
                  <p className="text-sm text-center" style={{ color: 'rgba(10,12,18,0.35)' }}>
                    أدخل المساحة وسعر الأرض وسعر البيع<br />لرؤية التحليل الفوري
                  </p>
                </div>
              ) : fin ? (
                <div className="space-y-4">
                  {/* Verdict banner */}
                  {verdictCfg && (
                    <div className="rounded-xl px-4 py-3 text-sm font-bold"
                      style={{ background: verdictCfg.bg, border: `1px solid ${verdictCfg.border}`, color: verdictCfg.color }}>
                      {verdictCfg.icon} {verdictCfg.text}
                    </div>
                  )}

                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <ScanKpi label="العائد الداخلي (IRR)" value={`${fin.irr.toFixed(1)}٪`}
                      color={fin.irr >= 15 ? '#16a34a' : '#d97706'} large />
                    <ScanKpi label="هامش الربح"           value={`${fin.margin.toFixed(1)}٪`}
                      color={fin.margin >= targetMargin ? '#16a34a' : fin.margin >= targetMargin * 0.85 ? '#d97706' : '#dc2626'} large />
                    <ScanKpi label="صافي الربح"           value={`${(fin.net / 1e6).toFixed(2)}م`}
                      color="#7c3aed" />
                    <ScanKpi label="ROI"                   value={`${fin.roi.toFixed(1)}٪`}
                      color="#2563eb" />
                  </div>

                  {/* RLV signal */}
                  {rlv && (
                    <div className="rounded-xl p-3"
                      style={{
                        background: parseFloat(landPricePerM2) <= rlv.maxLandPerM2 ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                        border: `1px solid ${parseFloat(landPricePerM2) <= rlv.maxLandPerM2 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}>
                      <p className="text-xs font-semibold mb-1"
                        style={{ color: parseFloat(landPricePerM2) <= rlv.maxLandPerM2 ? '#16a34a' : '#dc2626' }}>
                        RLV — أقصى سعر شراء آمن
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black num"
                          style={{ color: parseFloat(landPricePerM2) <= rlv.maxLandPerM2 ? '#16a34a' : '#dc2626' }}>
                          {rlv.maxLandPerM2.toLocaleString()} ر.س/م²
                        </span>
                        {parseFloat(landPricePerM2) > rlv.maxLandPerM2 && (
                          <span className="text-xs" style={{ color: '#dc2626' }}>
                            ↑ {(parseFloat(landPricePerM2) - rlv.maxLandPerM2).toLocaleString()} فوق الحد
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save CTA */}
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    حفظ كمشروع كامل ←
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'rgba(10,12,18,0.35)' }}>
                  تعذّر الحساب — تحقق من المدخلات
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PROJECTS SECTION
          ════════════════════════════════════════ */}
      <div className="flex-1 px-6 pb-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }} />
          </div>
        ) : (projects as any[]).length === 0 ? (
          <EmptyState onNew={() => setShowModal(true)} />
        ) : (
          <>
            <h2 className="font-bold text-sm" style={{ color: '#0A0C12' }}>
              مشاريعك ({(projects as any[]).length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(projects as any[]).map((p: any) => (
                <ProjectCard key={p.id} project={p} onClick={() => openProject(p)} />
              ))}
              <AddCard onClick={() => setShowModal(true)} />
            </div>
          </>
        )}
      </div>

      {/* ── New Project Modal ── */}
      {showModal && (
        <Modal
          name={name}
          cityId={cityId} districtId={districtId}
          onName={setName}
          onCityChange={(id) => { setCityId(id); setDistrictId(''); }}
          onDistrictChange={setDistrictId}
          onClose={() => { setShowModal(false); setName(''); setCityId(''); setDistrictId(''); }}
          onCreate={() => create.mutate({ name, location, status: 'draft' })}
          loading={create.isPending}
        />
      )}

      {/* ── Save Scanner as Project Modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,12,18,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm animate-fadeup"
            style={{ background: 'white', borderRadius: '20px', padding: '24px' }}>
            <h2 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>حفظ كمشروع</h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
              ستنتقل للمحلل مع كل القيم المُدخلة محملة مسبقاً
            </p>

            {/* Scanner summary */}
            {fin && (
              <div className="rounded-xl p-3 mb-4 grid grid-cols-3 gap-2"
                style={{ background: '#F4F3EF' }}>
                <MiniStat l="IRR"    v={`${fin.irr.toFixed(1)}٪`}    c="#16a34a" />
                <MiniStat l="هامش"   v={`${fin.margin.toFixed(1)}٪`} c="#B8924A" />
                <MiniStat l="الربح"  v={`${(fin.net/1e6).toFixed(1)}م`} c="#7c3aed" />
              </div>
            )}

            <div className="space-y-3 mb-4">
              <Field label="اسم المشروع *" placeholder="مثال: برج العليا"
                value={saveName} onChange={setSaveName} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: '#F4F3EF', color: '#0A0C12' }}>إلغاء</button>
              <button
                disabled={!saveName || createFromScanner.isPending}
                onClick={() => createFromScanner.mutate({ name: saveName, location: '', status: 'active' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: !saveName ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg,#C9A05E,#B8924A)',
                  color: !saveName ? 'rgba(10,12,18,0.4)' : '#0A0C12',
                  cursor: !saveName ? 'not-allowed' : 'pointer',
                }}>
                {createFromScanner.isPending ? '...' : 'إنشاء وفتح ←'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scanner input ── */
function ScannerInput({ label, value, onChange, placeholder, accent }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; accent: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        style={{
          border: `1px solid ${accent}30`,
          borderRadius: '12px', padding: '11px 14px',
          fontSize: 16, fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 600, outline: 'none', color: accent,
          background: `${accent}05`,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}18`; }}
        onBlur={e => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── Scanner KPI tile ── */
function ScanKpi({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: `${color}09`, border: `1px solid ${color}22` }}>
      <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className={`font-black num ${large ? 'text-2xl' : 'text-lg'}`} style={{ color }}>{value}</p>
    </div>
  );
}

function MiniStat({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <div className="text-center">
      <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{l}</p>
      <p className="text-sm font-bold num" style={{ color: c }}>{v}</p>
    </div>
  );
}

/* ── Project Card ── */
function ProjectCard({ project: p, onClick }: { project: any; onClick: () => void }) {
  // Read ONLY from project.result (server-persisted). Never trust local store here —
  // the dashboard shows saved results, not unsaved in-progress computations.
  const f  = p.result?.financials ?? p.lastResult?.financials ?? null;
  const st = STATUS_CFG[p.status] || STATUS_CFG.draft;

  // A result is "valid" only when core metrics are finite numbers
  const hasResult = f != null && isFinite(f.irr) && isFinite(f.margin);

  return (
    <div onClick={onClick}
      className="rounded-2xl cursor-pointer transition-all"
      style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', padding: '20px' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,74,0.40)';
        (e.currentTarget as HTMLElement).style.boxShadow  = '0 4px 20px rgba(184,146,74,0.10)';
        (e.currentTarget as HTMLElement).style.transform  = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(10,12,18,0.07)';
        (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
        (e.currentTarget as HTMLElement).style.transform  = 'translateY(0)';
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(184,146,74,0.08)' }}>🏛</div>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </div>
      <h3 className="font-bold text-sm mb-0.5 truncate" style={{ color: '#0A0C12' }}>{p.name}</h3>
      {p.location && (
        <p className="text-xs mb-3 truncate" style={{ color: 'rgba(10,12,18,0.4)' }}>{p.location}</p>
      )}
      {hasResult ? (
        <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid rgba(10,12,18,0.06)' }}>
          <KpiMini label="IRR"   value={`${sv(f.irr)}٪`}    color="#16a34a" />
          <KpiMini label="هامش"  value={`${sv(f.margin)}٪`} color="#B8924A" />
          <KpiMini label="ROI"   value={`${sv(f.roi)}٪`}    color="#2563eb" />
        </div>
      ) : (
        <div className="pt-3 text-center text-xs rounded-xl py-2"
          style={{ borderTop: '1px solid rgba(10,12,18,0.06)', color: 'rgba(10,12,18,0.35)', background: '#F4F3EF' }}>
          لم يتم التحليل بعد
        </div>
      )}
    </div>
  );
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.35)' }}>{label}</p>
      <p className="text-sm font-bold num" style={{ color }}>{value}</p>
    </div>
  );
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 transition-all"
      style={{ borderColor: 'rgba(184,146,74,0.22)', color: 'rgba(184,146,74,0.5)', minHeight: 160 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,74,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,74,0.03)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,74,0.22)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      <span style={{ fontSize: 28 }}>+</span>
      <span className="text-sm font-medium">مشروع جديد</span>
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A' }}>🏗️</div>
      <div className="text-center">
        <p className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>لا توجد مشاريع بعد</p>
        <p className="text-sm" style={{ color: 'rgba(10,12,18,0.4)' }}>
          استخدم الماسح أعلاه لتقييم صفقة أو أنشئ مشروعاً الآن
        </p>
      </div>
      <button onClick={onNew}
        className="px-6 py-2.5 rounded-xl text-sm font-bold"
        style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}>
        + إنشاء مشروع
      </button>
    </div>
  );
}

function Modal({ name, cityId, districtId, onName, onCityChange, onDistrictChange, onClose, onCreate, loading }: {
  name: string; cityId: string; districtId: string;
  onName: (v: string) => void;
  onCityChange: (id: string) => void;
  onDistrictChange: (id: string) => void;
  onClose: () => void; onCreate: () => void; loading: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px',
    padding: '10px 14px', color: '#0A0C12', outline: 'none',
    fontFamily: 'Tajawal, sans-serif', fontSize: 14, width: '100%',
    background: 'white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,12,18,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md animate-fadeup"
        style={{ background: 'white', borderRadius: '20px', padding: '28px' }}>
        <h2 className="font-bold text-base mb-5" style={{ color: '#0A0C12' }}>مشروع جديد</h2>
        <div className="space-y-3">
          <Field label="اسم المشروع *" placeholder="مثال: برج العليا" value={name} onChange={onName} />

          {/* Location — structured dropdowns */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>المدينة</label>
            <CitySelect value={cityId} onChange={onCityChange} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>الحي</label>
            <DistrictSelect
              cityId={cityId} value={districtId}
              onChange={(id) => onDistrictChange(id)}
              style={inputStyle}
              allowAdd onAddRequest={(districtName) => {
                /* Quick-add: will land in the store for future use */
                const { addDistrict } = useMasterDataStore.getState();
                addDistrict({ id: Math.random().toString(36).slice(2), cityId, name: districtName, aliases: [] });
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#F4F3EF', color: '#0A0C12' }}>إلغاء</button>
          <button disabled={!name || loading} onClick={onCreate}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: !name || loading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
              color: !name || loading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
              cursor: !name || loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? '...' : 'إنشاء'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm"
        style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', color: '#0A0C12', outline: 'none', fontFamily: 'Tajawal, sans-serif' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}
