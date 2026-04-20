/**
 * ProjectPage — pure content renderer.
 *
 * The header is handled by AppHeader (reads ProjectContext).
 * The sidebar navigation is handled by Sidebar (reads ProjectContext).
 * This component's sole responsibility:
 *   1. Load the project and push it into the store (→ context)
 *   2. Determine the active section from URL hash
 *   3. Render the correct tab component, animated via AnimatePresence
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { projectsAPI } from '../../api';
import { useProjectsStore } from '../../store';
import { useAnalysisStore } from '../../store/analysisStore';
import type { AnalysisVersion } from '../../store/projectStore';
import { PROJECT_SECTIONS, type ProjectSectionId } from '../../components/layout/Sidebar';
import DimensionsTab  from '../analyzer/tabs/DimensionsTab';
import AnalyzerTab    from '../analyzer/tabs/AnalyzerTab';
import RLVTab         from '../analyzer/tabs/RlvTab';
import DryPowderTab    from '../analyzer/tabs/DryPowderTab';
import MarketDataTab   from '../analyzer/tabs/MarketDataTab';
import ResultsTab     from '../analyzer/tabs/ResultsTab';
import HBUTab         from '../tools/HbuPage';
import SensitivityTab from '../tools/SensitivityPage';
import TimingTab      from '../tools/TimeSensitivityPage';
import StressTestTab  from '../tools/StressTestPage';
import AdvisoryTab    from '../analyzer/tabs/AdvisoryTab';

const ReportsPage = lazy(() => import('../reports/ReportsPage'));

/* ── Section transition variants ── */
const sectionVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, x: 10, transition: { duration: 0.12 } },
};

/* ════════════════════════════════════════════ */
export default function ProjectPage() {
  const { id }   = useParams<{ id: string }>();
  const location = useLocation();
  const { setCurrentProject } = useProjectsStore();

  /* Active section from URL hash */
  const hash          = location.hash.replace('#', '') as ProjectSectionId;
  const validIds      = PROJECT_SECTIONS.map(s => s.id);
  const activeSection = (validIds.includes(hash) ? hash : 'summary') as ProjectSectionId;
  const { projectResults, initFormForProject } = useAnalysisStore();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await projectsAPI.get(id!);
      return res.data?.data?.project ?? res.data?.data ?? res.data?.project ?? res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!project) return;
    setCurrentProject(project);
    // Central initialization: server data is used as DEFAULTS.
    // Any data the user previously entered (projectInputs[project.id]) wins over defaults.
    // This ensures all tabs see the correct data regardless of which tab is opened first.
    const s = (v: any) => v != null ? String(v) : '';
    const inp = project.input || {};
    initFormForProject(project.id, {
      landArea:               s(inp.landArea),
      landType:               s(inp.landType)              || 'سكني',
      usageType:              s(inp.usageType)             || '',
      streetWidth:            s(inp.streetWidth),
      floors:                 s(inp.floors)                || '4',
      basementFloors:         s(inp.basementFloors)        || '0',
      groundCoverageRatio:    s(inp.groundCoverageRatio)   || '0.6',
      landPricePerM2:         s(inp.landPricePerM2),
      buildCostPerM2:         s(inp.buildCostPerM2)        || '2000',
      sellPricePerM2:         s(inp.sellPricePerM2),
      profitTarget:           s(inp.profitTarget)          || '0.25',
      operationMode:          s(inp.operationMode)         || 'sell',
      softCostsPct:           s(inp.softCostsPct)          || '0.05',
      contingencyPct:         s(inp.contingencyPct)        || '0.05',
      projectDurationMonths:  s(inp.projectDurationMonths) || '24',
      zoningCode:             s(inp.zoningCode),
      manualNetSellableArea:  s(inp.manualNetSellableArea) || '',
      servicesAreaPct:        s(inp.servicesAreaPct)       || '0.15',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  if (isLoading) return <Spinner />;
  if (error || !project) return <ErrorView />;

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 overflow-auto"
        >
          {activeSection === 'summary'     && <ProjectSummary project={project} />}
          {activeSection === 'dimensions'  && <DimensionsTab  project={project} />}
          {activeSection === 'basics'      && <AnalyzerTab    project={project} />}
          {activeSection === 'costs'       && <RLVTab         project={project} />}
          {activeSection === 'finance'     && <DryPowderTab    project={project} />}
          {activeSection === 'marketdata'  && <MarketDataTab   project={project} />}
          {activeSection === 'results'     && <ResultsTab     project={project} />}
          {activeSection === 'hbu'         && <HBUTab         project={project} />}
          {activeSection === 'sensitivity' && (
            <SensitivityTab project={project} analysisResult={projectResults[project.id] ?? project?.result} />
          )}
          {activeSection === 'timing'      && <TimingTab    project={project} />}
          {activeSection === 'stress'      && <StressTestTab project={project} />}
          {activeSection === 'advisory'    && <AdvisoryTab    project={project} />}
          {activeSection === 'reports'     && (
            <Suspense fallback={<Spinner />}><ReportsPage /></Suspense>
          )}
          {activeSection === 'history'     && <ProjectHistorySection projectId={id!} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Project Summary Section
══════════════════════════════════════════════════════ */
function ProjectSummary({ project }: { project: any }) {
  const navigate = useNavigate();
  const id = project.id;
  const { dimensionsData } = useProjectsStore();
  const { isAnalyzed, formInput } = useAnalysisStore();
  const { projectResults } = useAnalysisStore();
  const raw = projectResults[project.id] ?? project?.result ?? null;
  // Support both flat {financials,costs,...} and wrapped {feasibility:{financials,...}} shapes
  const fin = raw?.financials ?? raw?.feasibility?.financials ?? null;
  const sv = (v: number | null | undefined, d = 1) =>
    v != null && isFinite(v) ? v.toFixed(d) : '--';

  const checks = [
    { label: 'الأساسي',    done: !!(isAnalyzed || project?.result),                                             hint: 'سعر الأرض والبيع والأدوار',      href: '#basics'     },
    { label: 'التكاليف',   done: !!(formInput.buildCostPerM2 && parseFloat(formInput.buildCostPerM2) !== 2000), hint: 'تكلفة البناء والمصاريف',          href: '#costs'      },
    { label: 'التمويل',    done: !!(formInput.bankPct && parseFloat(formInput.bankPct) > 0),                    hint: 'نسبة التمويل البنكي إن وجد',      href: '#finance'    },
    { label: 'الأبعاد ⊕', done: !!(dimensionsData?.landArea || project?.input?.landArea),                      hint: 'احسب المساحة من حدود الأرض (اختياري)', href: '#dimensions' },
  ];
  const doneCnt = checks.filter(c => c.done).length;

  const tiles = [
    { id: 'basics',      icon: '⚙️', label: 'الإدخال',        desc: 'سعر الأرض، البيع، والأدوار'              },
    { id: 'results',     icon: '📊', label: 'النتائج',         desc: fin ? `IRR ${sv(fin.irr)}٪` : 'في انتظار التحليل' },
    { id: 'sensitivity', icon: '📈', label: 'الحساسية',        desc: 'تأثير تغير الأسعار على الربح'           },
    { id: 'history',     icon: '🕐', label: 'السجل',           desc: 'إصدارات التحليل المحفوظة'               },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Header card */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black" style={{ color: '#0A0C12' }}>{project.name}</h2>
            {project.location && (
              <p className="text-sm mt-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{project.location}</p>
            )}
            <p className="text-xs mt-2" style={{ color: 'rgba(10,12,18,0.3)' }}>
              أُنشئ {new Date(project.createdAt || project.created_at || Date.now()).toLocaleDateString('ar-SA')}
            </p>
          </div>
          {/* SVG progress ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(10,12,18,0.08)" strokeWidth="4" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#B8924A" strokeWidth="4"
                  strokeDasharray={`${(doneCnt / 4) * 138.2} 138.2`} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: '#B8924A' }}>{doneCnt}/4</span>
            </div>
            <span className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>اكتمال</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {checks.map(c => (
            <button key={c.href} onClick={() => navigate(`/project/${id}${c.href}`)}
              title={c.hint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: c.done ? 'rgba(34,197,94,0.08)' : 'rgba(184,146,74,0.06)',
                color:      c.done ? '#16a34a' : 'rgba(10,12,18,0.5)',
                border:     `1px solid ${c.done ? 'rgba(34,197,94,0.22)' : 'rgba(184,146,74,0.18)'}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#B8924A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.done ? 'rgba(34,197,94,0.22)' : 'rgba(184,146,74,0.18)'; }}
            >
              <span>{c.done ? '✓' : '→'}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Financial snapshot or CTA */}
      {fin ? (
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {[
            { label: 'IRR',        val: `${sv(fin.irr)}٪`,                                                   color: '#16a34a', bg: 'rgba(34,197,94,0.08)'  },
            { label: 'هامش الربح', val: `${sv(fin.margin)}٪`,                                                color: '#B8924A', bg: 'rgba(184,146,74,0.08)' },
            { label: 'ROI',        val: `${sv(fin.roi)}٪`,                                                   color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
            { label: 'صافي الربح', val: fin.net != null && isFinite(fin.net) ? `${(fin.net/1e6).toFixed(2)}م ر.س` : '--', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4 text-center"
              style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(10,12,18,0.5)' }}>{k.label}</p>
              <p className="text-xl font-bold num" style={{ color: k.color }}>{k.val}</p>
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(184,146,74,0.05)', border: '1px dashed rgba(184,146,74,0.25)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'rgba(10,12,18,0.5)' }}>
            ابدأ بإدخال بيانات الأرض — النتائج تظهر فورياً أثناء الكتابة
          </p>
          <button onClick={() => navigate(`/project/${id}#basics`)}
            className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#C9A05E,#B8924A)', color: '#0A0C12' }}>
            🔍 بدء التحليل ←
          </button>
        </div>
      )}

      {/* Quick tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((q, i) => (
          <motion.button key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            onClick={() => navigate(`/project/${id}#${q.id}`)}
            className="rounded-xl p-4 text-right transition-all"
            style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}
            whileHover={{ borderColor: 'rgba(184,146,74,0.35)', scale: 1.01 }}
          >
            <p style={{ fontSize: 20, marginBottom: 6 }}>{q.icon}</p>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#0A0C12' }}>{q.label}</p>
            <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{q.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   History Section
══════════════════════════════════════════════════════ */
function ProjectHistorySection({ projectId }: { projectId: string }) {
  const { analysisHistory, setLastInput } = useProjectsStore();
  const { setAnalysis, initFormForProject } = useAnalysisStore();
  const versions: AnalysisVersion[] = analysisHistory[projectId] || [];
  const [expanded, setExpanded] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 320 }} dir="rtl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <p style={{ fontSize: 52, textAlign: 'center', marginBottom: 12 }}>🕐</p>
          <p className="text-sm font-medium text-center mb-1" style={{ color: 'rgba(10,12,18,0.5)' }}>
            لا توجد إصدارات محفوظة بعد
          </p>
          <p className="text-xs text-center" style={{ color: 'rgba(10,12,18,0.35)' }}>
            كل مرة تُشغّل فيها التحليل يُحفظ هنا تلقائياً
          </p>
        </motion.div>
      </div>
    );
  }

  const restore = (v: AnalysisVersion) => {
    setAnalysis(v.result, v.inputs);
    setLastInput(v.inputs);
    initFormForProject(projectId, Object.fromEntries(
      Object.entries(v.inputs).map(([k, val]) => [k, String(val ?? '')])
    ));
    window.location.hash = '#basics';
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-3" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-sm" style={{ color: '#0A0C12' }}>🕐 سجل الإصدارات ({versions.length})</h2>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>آخر 20 تحليل — محفوظ تلقائياً</p>
      </div>

      {versions.map((v, idx) => {
        const fin    = v.result?.financials || v.result?.feasibility?.financials;
        const isBuy  = v.result?.summary?.isBuy ?? v.result?.feasibility?.summary?.isBuy;
        const isOpen = expanded === v.id;
        const date   = new Date(v.timestamp);

        return (
          <motion.div key={v.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}
          >
            <button onClick={() => setExpanded(isOpen ? null : v.id)}
              className="w-full flex items-center gap-3 p-4 text-right transition-all"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,146,74,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(184,146,74,0.10)', color: '#B8924A' }}>
                v{v.versionNum}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: '#0A0C12' }}>
                  {date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })} — {date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {v.inputs?.landArea && (
                  <p className="text-xs truncate" style={{ color: 'rgba(10,12,18,0.4)' }}>
                    {Number(v.inputs.landArea).toLocaleString()} م²
                    {v.inputs.landPricePerM2 ? ` · ${Number(v.inputs.landPricePerM2).toLocaleString()} ر.س/م²` : ''}
                  </p>
                )}
              </div>
              {fin && (
                <div className="flex gap-1.5 shrink-0">
                  <VKpi l="IRR"  v={fin.irr    != null && isFinite(fin.irr)    ? `${fin.irr.toFixed(1)}٪`    : '--'} ok={(fin.irr    ?? 0) >= 15} />
                  <VKpi l="هامش" v={fin.margin != null && isFinite(fin.margin) ? `${fin.margin.toFixed(1)}٪` : '--'} ok={(fin.margin ?? 0) >= 25} />
                </div>
              )}
              {isBuy !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: isBuy ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: isBuy ? '#16a34a' : '#dc2626' }}>
                  {isBuy ? '✅' : '❌'}
                </span>
              )}
              <span style={{ color: 'rgba(10,12,18,0.3)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(10,12,18,0.06)' }}>
                    {fin && (
                      <div className="grid grid-cols-4 gap-3 pt-3 mb-3">
                        {[
                          { l: 'IRR',  v: fin.irr    != null && isFinite(fin.irr)    ? `${fin.irr.toFixed(1)}٪`         : '--', c: '#16a34a' },
                          { l: 'هامش', v: fin.margin != null && isFinite(fin.margin) ? `${fin.margin.toFixed(1)}٪`      : '--', c: '#B8924A' },
                          { l: 'ROI',  v: fin.roi    != null && isFinite(fin.roi)    ? `${fin.roi.toFixed(1)}٪`         : '--', c: '#2563eb'  },
                          { l: 'صافي', v: fin.net    != null && isFinite(fin.net)    ? `${(fin.net/1e6).toFixed(2)}م`   : '--', c: '#7c3aed' },
                        ].map(k => (
                          <div key={k.l} className="rounded-xl p-2.5 text-center"
                            style={{ background: '#F4F3EF', border: `1px solid ${k.c}15` }}>
                            <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.4)' }}>{k.l}</p>
                            <p className="text-sm font-bold num" style={{ color: k.c }}>{k.v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => restore(v)}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.20)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,146,74,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(184,146,74,0.08)')}>
                      ↩ استعادة هذا الإصدار
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Helpers ── */
function VKpi({ l, v, ok }: { l: string; v: string; ok: boolean }) {
  const c = ok ? '#16a34a' : '#d97706';
  return (
    <div className="text-center px-2 py-1 rounded-lg" style={{ background: `${c}0d`, border: `1px solid ${c}20` }}>
      <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.4)' }}>{l}</p>
      <p style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: 'IBM Plex Mono, monospace' }}>{v}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <motion.div
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2"
        style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }}
      />
    </div>
  );
}

function ErrorView() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" dir="rtl">
      <p className="text-sm" style={{ color: '#dc2626' }}>تعذّر تحميل المشروع</p>
      <button onClick={() => navigate('/projects')}
        className="px-4 py-2 rounded-xl text-sm"
        style={{ background: '#F4F3EF', color: '#0A0C12' }}>
        ← العودة للمشاريع
      </button>
    </div>
  );
}
