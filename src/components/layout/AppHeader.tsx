/**
 * AppHeader — independent header component.
 *
 * Reads ProjectContext and renders two modes:
 *   - Project Mode: project name, section label, live KPIs from liveResult
 *   - Global Mode:  page title derived from route + user avatar
 *
 * This is the "Header" in the DashboardLayout triad (Sidebar, Header, Content).
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuthStore } from '../../store';
import { PROJECT_SECTIONS } from './Sidebar';

/* ── route → page title map ── */
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'الرئيسية',
  '/projects':  'مشاريعي',
  '/reports':   'التقارير',
  '/documents': 'المستندات',
  '/market':    'بيانات السوق',
  '/admin':     'الإدارة',
};

const kpiVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.88, transition: { duration: 0.12 } },
};

export default function AppHeader() {
  const { project, isProjectMode, liveResult } = useProjectContext();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  /* Active section label in project mode */
  const hash          = location.hash.replace('#', '');
  const activeSection = PROJECT_SECTIONS.find(s => s.id === hash);
  const fin           = liveResult?.financials;
  const targetMargin  = 25; // default target %

  return (
    <header
      dir="rtl"
      className="shrink-0 flex items-center px-5 gap-3"
      style={{
        background:   'white',
        borderBottom: '1px solid rgba(10,12,18,0.07)',
        minHeight:    52,
        zIndex:       10,
      }}
    >
      {/* ── Project Mode ── */}
      {isProjectMode && project ? (
        <>
          {/* Section breadcrumb */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {activeSection && (
              <span className="text-base" aria-hidden>{activeSection.icon}</span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: '#0A0C12' }}>
                {activeSection?.label || project.name}
              </p>
              {activeSection && (
                <p className="text-xs truncate" style={{ color: 'rgba(10,12,18,0.4)' }}>
                  {project.name}
                </p>
              )}
            </div>
          </div>

          {/* Live KPIs — animate in when liveResult becomes available */}
          <AnimatePresence mode="wait">
            {fin ? (
              <motion.div key="live-kpis"
                variants={kpiVariants} initial="initial" animate="animate" exit="exit"
                className="flex items-center gap-2 shrink-0"
              >
                <LiveKpi
                  label="IRR"
                  value={`${fin.irr.toFixed(1)}٪`}
                  color={fin.irr >= 15 ? '#16a34a' : fin.irr >= 8 ? '#d97706' : '#dc2626'}
                />
                <LiveKpi
                  label="هامش"
                  value={`${fin.margin.toFixed(1)}٪`}
                  color={fin.margin >= targetMargin ? '#16a34a' : fin.margin >= targetMargin * 0.85 ? '#d97706' : '#dc2626'}
                />
                <LiveKpi
                  label="صافي"
                  value={`${(fin.net / 1e6).toFixed(2)}م`}
                  color="#7c3aed"
                />
                {/* Live indicator */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.22)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ background: '#16a34a', boxShadow: '0 0 5px rgba(22,163,74,0.6)' }} />
                  <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>مباشر</span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="no-kpis"
                variants={kpiVariants} initial="initial" animate="animate" exit="exit"
                className="shrink-0"
              >
                <span className="text-xs" style={{ color: 'rgba(10,12,18,0.3)' }}>
                  أدخل البيانات لرؤية المؤشرات حياً
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* ── Global Mode ── */
        <>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>
              {ROUTE_LABELS[location.pathname] || 'بصيرة'}
            </p>
          </div>
          {/* User avatar + logout */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium" style={{ color: '#0A0C12' }}>{user?.name}</p>
              <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
                {user?.role === 'admin' ? 'مدير النظام' : 'محلل'}
              </p>
            </div>
            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}
              title="خروج"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(184,146,74,0.12)')}
            >
              {user?.name?.charAt(0) || 'م'}
            </button>
          </div>
        </>
      )}
    </header>
  );
}

function LiveKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-2.5 py-1 rounded-lg"
      style={{ background: `${color}0f`, border: `1px solid ${color}22`, minWidth: 48 }}>
      <p style={{ fontSize: 9, color: 'rgba(10,12,18,0.4)', lineHeight: 1 }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.4 }}>
        {value}
      </p>
    </div>
  );
}
