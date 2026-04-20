import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectPage from '../../pages/projects/ProjectPage';
import { ReportBuilderDrawer, DEFAULT_BUILDER_DATA } from '../report/ReportBuilderDrawer';
import { useAnalysisStore } from '../../store/analysisStore';
import { calculateConfidence, calculateReadiness } from '../../lib/engines/confidenceEngine';
import type { ConfidenceBreakdown, GateResult, AdvisoryRequiredInputs } from '../../lib/types/report';

type FlowStep = 'analysis' | 'report_builder';

const EMPTY_ADVISORY: AdvisoryRequiredInputs = {
  valuationReport:    false,
  comparableProjects: [],
  marketDataSource:   null,
  zoningDocument:     null,
  contractorQuotes:   0,
  landLegalStatus:    false,
};

export default function ProjectFlow() {
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState<FlowStep>('analysis');

  const {
    projectResults,
    projectInputs,
    projectAdvisoryInputs,
    reportBuilder,
    zoningConfigs,
    updateReportBuilder,
  } = useAnalysisStore();

  const pid         = id ?? '';
  const result      = projectResults[pid]     ?? null;
  const formInput   = projectInputs[pid]      ?? {};
  const advisory    = projectAdvisoryInputs[pid] ?? EMPTY_ADVISORY;
  const comparables = advisory.comparableProjects ?? [];

  const confidence: ConfidenceBreakdown = calculateConfidence(advisory);
  const gate:       GateResult          = calculateReadiness(advisory);

  const initialData = reportBuilder[pid] ?? DEFAULT_BUILDER_DATA;

  return (
    <div className="h-full relative">
      <ProjectPage />

      {/* ── Floating convert button ── */}
      {step === 'analysis' && (
        <div
          className="fixed bottom-6 z-50"
          style={{ left: '50%', transform: 'translateX(-50%)', direction: 'rtl' }}
        >
          <button
            onClick={() => setStep('report_builder')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #0F3D2E, #1A6B4A)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(15,61,46,0.35)',
              fontFamily: 'Tajawal, sans-serif',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(15,61,46,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,61,46,0.35)')}
          >
            <span>📄</span>
            <span>تحويل إلى تقرير استثماري</span>
          </button>
        </div>
      )}

      {/* ── Report Builder Drawer ── */}
      {step === 'report_builder' && (
        <ReportBuilderDrawer
          projectId={pid}
          project={{ name: formInput.projectName ?? '', location: formInput.projectLocation ?? '' }}
          result={result}
          formInput={formInput}
          comparables={comparables}
          confidence={confidence}
          gate={gate}
          initialData={initialData}
          zoningConfigs={zoningConfigs}
          onSave={(data) => updateReportBuilder(pid, data)}
          onExport={(data) => {
            updateReportBuilder(pid, { ...data, lastGeneratedAt: new Date().toISOString() });
            window.open(`/report/advisory/${pid}`, '_blank');
          }}
          onClose={() => setStep('analysis')}
        />
      )}
    </div>
  );
}
