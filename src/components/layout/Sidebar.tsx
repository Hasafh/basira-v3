import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsAPI } from '../../api';
import { useAuthStore, useProjectsStore } from '../../store';
import { useAnalysisStore } from '../../store/analysisStore';

/* ══════════════════════════════════════════════════════
   Project workspace sections — single source of truth.
   These IDs are used by both Sidebar and ProjectPage.
══════════════════════════════════════════════════════ */
export const PROJECT_SECTIONS = [
  /* ── Summary ── */
  { id: 'summary',     group: 'overview',  groupLabel: 'نظرة عامة',           label: 'ملخص المشروع', icon: '⚡' },
  /* ── Inputs ── */
  { id: 'dimensions',  group: 'inputs',    groupLabel: 'بيانات الإدخال',       label: 'الأبعاد',       icon: '📐' },
  { id: 'basics',      group: 'inputs',    groupLabel: 'بيانات الإدخال',       label: 'الأساسي',       icon: '⚙️' },
  { id: 'costs',       group: 'inputs',    groupLabel: 'بيانات الإدخال',       label: 'التكاليف',      icon: '💰' },
  { id: 'finance',     group: 'inputs',    groupLabel: 'بيانات الإدخال',       label: 'التمويل',       icon: '🏦' },
  { id: 'marketdata',  group: 'inputs',    groupLabel: 'بيانات الإدخال',       label: 'بيانات السوق',  icon: '📂' },
  /* ── Analysis ── */
  { id: 'results',     group: 'analysis',  groupLabel: 'التحليل والسيناريوهات', label: 'النتائج',       icon: '📊' },
  { id: 'sensitivity', group: 'analysis',  groupLabel: 'التحليل والسيناريوهات', label: 'الحساسية',      icon: '📈' },
  { id: 'timing',      group: 'analysis',  groupLabel: 'التحليل والسيناريوهات', label: 'الزمنية',       icon: '⏱️' },
  { id: 'hbu',         group: 'analysis',  groupLabel: 'التحليل والسيناريوهات', label: 'HBU',            icon: '🎯' },
  { id: 'stress',      group: 'analysis',  groupLabel: 'التحليل والسيناريوهات', label: 'اختبار الضغط',   icon: '🛡️' },
  /* ── Reports ── */
  { id: 'advisory',    group: 'docs',      groupLabel: 'التقارير والوثائق',     label: 'الاستشاري',     icon: '🏛️' },
  { id: 'reports',     group: 'docs',      groupLabel: 'التقارير والوثائق',     label: 'تقارير PDF',    icon: '📋' },
  /* ── History ── */
  { id: 'history',     group: 'history',   groupLabel: 'السجل',                label: 'سجل الإصدارات', icon: '🕐' },
] as const;

export type ProjectSectionId = typeof PROJECT_SECTIONS[number]['id'];

/* ── Status config ── */
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'مسودة',  color: 'rgba(255,255,255,0.35)' },
  active:    { label: 'نشط',    color: '#4ade80'                 },
  completed: { label: 'مكتمل',  color: '#60a5fa'                 },
  archived:  { label: 'مؤرشف', color: '#fbbf24'                  },
};

/* ════════════════════════════════════════════════════ */
export default function Sidebar() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { user, logout } = useAuthStore();
  const { currentProject } = useProjectsStore();
  const { lastResult, isAnalyzed } = useAnalysisStore();
  const [projectsOpen, setProjectsOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsAPI.list();
      return res.data?.data || res.data?.projects || [];
    },
  });

  const inProject = location.pathname.startsWith('/project/');
  const projectId = inProject ? location.pathname.split('/project/')[1] : null;
  const hash      = location.hash.replace('#', '') as ProjectSectionId;
  const activeSection = PROJECT_SECTIONS.find(s => s.id === hash)?.id || 'summary';
  const is = (path: string) => location.pathname === path;

  const { formInput, financingStructure } = useAnalysisStore();

  /* ── Financials — support flat {financials} and wrapped {feasibility:{financials}} shapes ── */
  const _raw = lastResult || currentProject?.result;
  const fin  = _raw?.financials ?? _raw?.feasibility?.financials ?? null;

  /* ── Tab completion indicators (input group only) ── */
  const tabDone: Record<string, boolean> = {
    dimensions: !!(formInput.landArea && parseFloat(formInput.landArea) > 0),
    basics:     !!(isAnalyzed || currentProject?.result),
    costs:      !!(formInput.buildCostPerM2 && parseFloat(formInput.buildCostPerM2) > 0 && parseFloat(formInput.buildCostPerM2) !== 2000),
    finance:    !!(financingStructure.bankPct > 0 || financingStructure.partnerPct > 0),
    marketdata: false,
  };

  const goSection = (id: ProjectSectionId) =>
    navigate(`/project/${projectId}#${id}`, { replace: true });

  return (
    <aside
      dir="rtl"
      className="w-56 flex flex-col shrink-0 h-screen sticky top-0"
      style={{ background: '#0A0C12', borderLeft: '1px solid rgba(184,146,74,0.12)' }}
    >
      {/* ── Brand ── */}
      <div
        className="px-5 py-5 cursor-pointer select-none shrink-0"
        style={{ borderBottom: '1px solid rgba(184,146,74,0.10)' }}
        onClick={() => navigate(inProject ? '/projects' : '/dashboard')}
      >
        <p className="text-2xl font-black" style={{ color: '#B8924A', letterSpacing: '-0.5px' }}>بصيرة</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(184,146,74,0.5)' }}>منصة الذكاء العقاري</p>
      </div>

      {/* ════════════════════════════════════════
          PROJECT MODE — takes over entirely
          ════════════════════════════════════════ */}
      {inProject && currentProject ? (
        <>
          {/* Project identity strip */}
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(184,146,74,0.10)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold truncate" style={{ color: '#B8924A', maxWidth: 140 }}>
                {currentProject.name}
              </p>
              {(() => {
                const s = STATUS_CFG[currentProject.status] || STATUS_CFG.draft;
                return (
                  <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: s.color, border: `1px solid ${s.color}33`, fontSize: 10 }}>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            {currentProject.location && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{currentProject.location}</p>
            )}
            {/* Live KPIs if analyzed */}
            {fin && (isAnalyzed || currentProject.result) && (
              <div className="flex gap-2 mt-2">
                <MiniKpi label="IRR" value={fin.irr != null && isFinite(fin.irr) ? `${fin.irr.toFixed(1)}٪` : '--'} good={(fin.irr ?? 0) >= 15} />
                <MiniKpi label="هامش" value={fin.margin != null && isFinite(fin.margin) ? `${fin.margin.toFixed(1)}٪` : '--'} good={(fin.margin ?? 0) >= 25} />
              </div>
            )}
          </div>

          {/* Project navigation */}
          <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
            {(['overview', 'inputs', 'analysis', 'docs', 'history'] as const).map(group => {
              const items = PROJECT_SECTIONS.filter(s => s.group === group);
              const groupLabel = items[0]?.groupLabel;
              return (
                <div key={group} className="mb-1">
                  <p className="text-xs px-4 pt-3 pb-1 font-semibold"
                    style={{ color: 'rgba(184,146,74,0.4)', letterSpacing: '0.04em' }}>
                    {groupLabel}
                  </p>
                  {items.map(sec => {
                    const active     = sec.id === activeSection;
                    const done       = tabDone[sec.id];
                    const isOptional = sec.id === 'dimensions';
                    return (
                      <button
                        key={sec.id}
                        onClick={() => goSection(sec.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-all text-right"
                        style={{
                          background:  active ? 'rgba(184,146,74,0.12)' : 'transparent',
                          color:       active ? '#B8924A' : 'rgba(255,255,255,0.5)',
                          fontWeight:  active ? 600 : 400,
                          borderRight: active ? '3px solid #B8924A' : '3px solid transparent',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 13 }}>{sec.icon}</span>
                        <span className="leading-tight flex-1 text-right">
                          {sec.label}
                          {isOptional && !done && (
                            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', marginRight: 3 }}> — اختياري</span>
                          )}
                        </span>
                        {/* completion check for input tabs */}
                        {done && !active && (
                          <span style={{ color: '#4ade80', fontSize: 10, marginRight: 'auto' }}>✓</span>
                        )}
                        {active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#B8924A' }} />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Exit to projects */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderTop: '1px solid rgba(184,146,74,0.08)' }}>
            <button
              onClick={() => navigate('/projects')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              ← جميع المشاريع
            </button>
          </div>
        </>
      ) : (
        /* ════════════════════════════════════════
           GLOBAL MODE — standard nav
           ════════════════════════════════════════ */
        <>
          {/* Project selector */}
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(184,146,74,0.10)' }}>
            <p className="text-xs mb-1.5 px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>المشروع الحالي</p>
            <button
              onClick={() => setProjectsOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all"
              style={{
                background: 'rgba(184,146,74,0.10)',
                border: '1px solid rgba(184,146,74,0.20)',
                color: currentProject ? '#B8924A' : 'rgba(255,255,255,0.4)',
              }}
            >
              <span className="truncate text-right">{currentProject?.name || 'اختر مشروعاً'}</span>
              <ChevronIcon open={projectsOpen} />
            </button>

            {projectsOpen && (
              <div className="mt-1 rounded-xl overflow-hidden animate-fadeup"
                style={{ background: '#131621', border: '1px solid rgba(184,146,74,0.15)', maxHeight: '220px', overflowY: 'auto' }}>
                {(projects as any[]).length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>لا توجد مشاريع</p>
                ) : (
                  (projects as any[]).map((p: any) => (
                    <button key={p.id}
                      onClick={() => { setProjectsOpen(false); navigate(`/project/${p.id}#summary`); }}
                      className="w-full text-right px-3 py-2.5 text-sm transition-all block"
                      style={{
                        color:      currentProject?.id === p.id ? '#B8924A' : 'rgba(255,255,255,0.65)',
                        background: currentProject?.id === p.id ? 'rgba(184,146,74,0.08)' : 'transparent',
                        borderBottom: '1px solid rgba(184,146,74,0.06)',
                      }}
                      onMouseEnter={e => { if (currentProject?.id !== p.id) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (currentProject?.id !== p.id) (e.currentTarget as any).style.background = 'transparent'; }}
                    >
                      <p className="font-medium truncate">{p.name}</p>
                      {p.location && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.location}</p>}
                    </button>
                  ))
                )}
                <button onClick={() => { setProjectsOpen(false); navigate('/projects'); }}
                  className="w-full text-right px-3 py-2.5 text-xs transition-all"
                  style={{ color: '#B8924A', borderTop: '1px solid rgba(184,146,74,0.12)', background: 'rgba(184,146,74,0.05)' }}>
                  + مشروع جديد
                </button>
              </div>
            )}
          </div>

          {/* Global nav */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
            <SectionLabel label="الرئيسية" />
            <NavBtn path="/dashboard" label="لوحة التحكم"  icon={<GridIcon   active={is('/dashboard')} />} active={is('/dashboard')} navigate={navigate} />
            <NavBtn path="/projects"  label="مشاريعي"      icon={<FolderIcon active={is('/projects')}  />} active={is('/projects')}  navigate={navigate} />

            <SectionLabel label="التقارير" />
            <NavBtn path="/reports"   label="التقارير"     icon={<ChartIcon active={is('/reports')}   />} active={is('/reports')}   navigate={navigate} />
            <NavBtn path="/documents" label="المستندات"    icon={<DocIcon   active={is('/documents')} />} active={is('/documents')} navigate={navigate} />

            <SectionLabel label="أدوات" />
            <NavBtn path="/market"        label="بيانات السوق"   icon={<MarketIcon   active={is('/market')}        />} active={is('/market')}        navigate={navigate} />
            <NavBtn path="/tools/auction" label="دراسة المزاد"   icon={<AuctionIcon  active={is('/tools/auction')} />} active={is('/tools/auction')} navigate={navigate} />
            <NavBtn path="/admin"         label="الإدارة"         icon={<SettingsIcon active={is('/admin')}         />} active={is('/admin')}         navigate={navigate} />

            <SectionLabel label="الإعدادات" />
            <NavBtn path="/settings/master-data"      label="البيانات الأساسية" icon={<MasterDataIcon active={is('/settings/master-data')}      />} active={is('/settings/master-data')}      navigate={navigate} />
            <NavBtn path="/settings/zoning-config"    label="أكواد البناء"      icon={<ZoningIcon     active={is('/settings/zoning-config')}    />} active={is('/settings/zoning-config')}    navigate={navigate} />
            <NavBtn path="/settings/location-scoring" label="تقييم الموقع"      icon={<LocationIcon   active={is('/settings/location-scoring')} />} active={is('/settings/location-scoring')} navigate={navigate} />
          </nav>
        </>
      )}

      {/* ── User footer — always visible ── */}
      <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid rgba(184,146,74,0.10)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'rgba(184,146,74,0.15)', color: '#B8924A' }}>
            {user?.name?.charAt(0) || 'م'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{user?.name}</p>
            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              className="text-xs transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              خروج
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Helpers ── */
function MiniKpi({ label, value, good }: { label: string; value: string; good: boolean }) {
  const color = good ? '#4ade80' : '#fbbf24';
  return (
    <div className="flex-1 text-center px-1 py-1 rounded-lg"
      style={{ background: `${color}12`, border: `1px solid ${color}22` }}>
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="text-xs px-3 pt-3 pb-1 font-medium" style={{ color: 'rgba(184,146,74,0.4)' }}>{label}</p>;
}

function NavBtn({ path, label, icon, active, navigate }: {
  path: string; label: string; icon: React.ReactNode; active: boolean; navigate: (p: string) => void;
}) {
  return (
    <button
      onClick={() => navigate(path)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-right"
      style={{
        background: active ? 'rgba(184,146,74,0.12)' : 'transparent',
        color:      active ? '#B8924A' : 'rgba(255,255,255,0.5)',
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as any).style.background = 'transparent'; }}
    >
      {icon}
      <span>{label}</span>
      {active && <span className="mr-auto w-1.5 h-1.5 rounded-full" style={{ background: '#B8924A' }} />}
    </button>
  );
}

/* ── Icons ── */
function GridIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={c} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={c} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={c} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={c} />
    </svg>
  );
}
function FolderIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4.5A1.5 1.5 0 013.5 3h2.586a1 1 0 01.707.293L8 4.5H12.5A1.5 1.5 0 0114 6v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12V4.5z"
        stroke={c} strokeWidth="1.4" fill="none" />
    </svg>
  );
}
function ChartIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5.5 7.5L8.5 9.5L12 5L14 7" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="2" y1="14" x2="14" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function DocIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="1" width="8" height="11" rx="1.5" stroke={c} strokeWidth="1.4" />
      <path d="M3 12l3 3h5a1.5 1.5 0 001.5-1.5V12" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="5.5" y1="5" x2="10.5" y2="5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="7.5" x2="9" y2="7.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function MarketIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 13L5 9L8 11L11 7L14 9" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="4" r="2" fill={c} />
      <path d="M12.5 4H3" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M11.2 4.8l1.4-1.4M3.4 12.6l1.4-1.4"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AuctionIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 13h10M8 10V13M5 4L2 7l1.5 1.5L6 6M10 2L13 5l-5 5-3-3z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ZoningIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="8" width="4" height="6" rx="1" stroke={c} strokeWidth="1.4" />
      <rect x="6" y="5" width="4" height="9" rx="1" stroke={c} strokeWidth="1.4" />
      <rect x="10" y="2" width="4" height="12" rx="1" stroke={c} strokeWidth="1.4" />
    </svg>
  );
}
function LocationIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5z"
        stroke={c} strokeWidth="1.4" fill="none" />
      <circle cx="8" cy="6" r="1.5" fill={c} />
    </svg>
  );
}
function MasterDataIcon({ active }: { active: boolean }) {
  const c = active ? '#B8924A' : 'rgba(255,255,255,0.4)';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="3" rx="1" stroke={c} strokeWidth="1.4" />
      <rect x="1" y="6.5" width="14" height="3" rx="1" stroke={c} strokeWidth="1.4" />
      <rect x="1" y="11" width="14" height="3" rx="1" stroke={c} strokeWidth="1.4" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
      <path d="M3 5L7 9L11 5" stroke="rgba(184,146,74,0.6)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
