import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, Component, type ReactNode, type ErrorInfo } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error, i: ErrorInfo) { console.error('[Basira ErrorBoundary]', e, i); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', direction: 'ltr', color: '#dc2626' }}>
          <h2>Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{err.message}\n{err.stack}</pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Clear Storage & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useProjectsStore } from './store';
import { useAnalysisStore } from './store/analysisStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectFlow from './components/flow/ProjectFlow';
import AIChat from './components/AIChat';

const ReportsPage        = lazy(() => import('./pages/reports/ReportsPage'));
const AdvisoryReportPage = lazy(() => import('./pages/reports/AdvisoryReportPage'));
const DocumentsPage      = lazy(() => import('./pages/tools/PdfExtractPage'));
const AdminPage          = lazy(() => import('./pages/admin/AdminPage'));
const MarketPage         = lazy(() => import('./pages/market/MarketPage'));
const AuctionPage        = lazy(() => import('./pages/tools/AuctionPage'));
const HbuPage            = lazy(() => import('./pages/tools/HbuPage'));
const SensitivityPage    = lazy(() => import('./pages/tools/SensitivityPage'));
const StressTestPage     = lazy(() => import('./pages/tools/StressTestPage'));
const TimeSensitivityPage    = lazy(() => import('./pages/tools/TimeSensitivityPage'));
const ZoningConfigSettings    = lazy(() => import('./pages/settings/ZoningConfigSettings'));
const LocationScoringSettings = lazy(() => import('./pages/settings/LocationScoringSettings'));
const MasterDataPage          = lazy(() => import('./pages/settings/MasterDataPage'));

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Guard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Guard><AppLayout /></Guard>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"   element={<DashboardPage />} />
              <Route path="projects"    element={<ProjectsPage />} />
              <Route path="project/:id" element={<ProjectFlow />} />
              <Route path="reports"     element={<Suspense fallback={null}><ReportsPage /></Suspense>} />
              <Route path="documents"   element={<Suspense fallback={null}><DocumentsPage /></Suspense>} />
              <Route path="admin"       element={<Suspense fallback={null}><AdminPage /></Suspense>} />
              <Route path="market"      element={<Suspense fallback={null}><MarketPage /></Suspense>} />
              <Route path="tools/auction"     element={<Suspense fallback={null}><ToolPage Page={AuctionPage} /></Suspense>} />
              <Route path="tools/hbu"         element={<Suspense fallback={null}><ToolPage Page={HbuPage} /></Suspense>} />
              <Route path="tools/sensitivity" element={<Suspense fallback={null}><ToolPage Page={SensitivityPage} /></Suspense>} />
              <Route path="tools/stress"      element={<Suspense fallback={null}><ToolPage Page={StressTestPage} /></Suspense>} />
              <Route path="tools/timing"      element={<Suspense fallback={null}><ToolPage Page={TimeSensitivityPage} /></Suspense>} />
              <Route path="settings/zoning-config"    element={<Suspense fallback={null}><ZoningSettingsPage /></Suspense>} />
              <Route path="settings/location-scoring" element={<Suspense fallback={null}><LocationSettingsPage /></Suspense>} />
              <Route path="settings/master-data"      element={<Suspense fallback={null}><MasterDataPage /></Suspense>} />
            </Route>
            <Route path="report/advisory/:id" element={<Guard><Suspense fallback={null}><AdvisoryReportPage /></Suspense></Guard>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          <AIChatWrapper />
        </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Tajawal, sans-serif',
            fontSize: '14px',
            background: '#0A0C12',
            color: '#F4F3EF',
            border: '1px solid rgba(184,146,74,0.3)',
          },
          success: { iconTheme: { primary: '#B8924A', secondary: '#0A0C12' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 4000,
        }}
      />
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AIChatWrapper() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <AIChat />;
}

function ToolPage({ Page }: { Page: React.ComponentType<any> }) {
  const { currentProject } = useProjectsStore();
  return <Page project={currentProject} analysisResult={currentProject?.result} />;
}

function LocationSettingsPage() {
  const { locationConfig, setLocationConfig, resetLocationConfig, zoningConfigs } = useAnalysisStore();
  return (
    <LocationScoringSettings
      config={locationConfig}
      onSave={setLocationConfig}
      onReset={resetLocationConfig}
      zoningCodes={zoningConfigs.map(z => z.code)}
    />
  );
}

function ZoningSettingsPage() {
  const {
    zoningConfigs,
    addZoningConfig,
    updateZoningConfig,
    deleteZoningConfig,
    resetZoningConfigs,
  } = useAnalysisStore();
  return (
    <ZoningConfigSettings
      configs={zoningConfigs}
      onAdd={addZoningConfig}
      onUpdate={updateZoningConfig}
      onDelete={deleteZoningConfig}
      onReset={resetZoningConfigs}
    />
  );
}
