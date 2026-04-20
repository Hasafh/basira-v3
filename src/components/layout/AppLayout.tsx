/**
 * AppLayout — the DashboardLayout component.
 *
 * Three independent child components:
 *   Sidebar      — navigation, adapts to project/global mode via context
 *   AppHeader    — header, shows live KPIs in project mode via context
 *   AnimatedContent — Outlet wrapped in AnimatePresence for route transitions
 *
 * ProjectContextProvider wraps everything so context is available to all children.
 * The Provider itself calls useLiveAnalysis() — computing the result ONCE,
 * and sharing it down to Sidebar, AppHeader, and AnalyzerTab's live panel.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjectsStore } from '../../store';
import { useLiveAnalysis } from '../../hooks/useLiveAnalysis';
import { ProjectContext } from '../../contexts/ProjectContext';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';

/* ── Page-level transition variants ── */
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

/* ── Context provider reads from Zustand + live hook ── */
function ProjectContextBridge({ children }: { children: React.ReactNode }) {
  const location   = useLocation();
  const project    = useProjectsStore(s => s.currentProject);
  const liveResult = useLiveAnalysis();
  const isProjectMode = location.pathname.startsWith('/project/');

  return (
    <ProjectContext.Provider value={{ project, isProjectMode, liveResult }}>
      {children}
    </ProjectContext.Provider>
  );
}

/* ── Animated content outlet ── */
function AnimatedContent() {
  const location = useLocation();
  // Use pathname only (not hash) as the animation key — section changes inside a project
  // are animated by ProjectPage's own AnimatePresence, not here.
  return (
    <main className="flex-1 overflow-auto" style={{ background: '#F4F3EF' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ height: '100%' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/* ════════════════════════════════════════════════════ */
export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" dir="rtl" style={{ background: '#F4F3EF' }}>
      {/* ProjectContextBridge must be inside the Router so useLocation works */}
      <ProjectContextBridge>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <AnimatedContent />
        </div>
      </ProjectContextBridge>
    </div>
  );
}
