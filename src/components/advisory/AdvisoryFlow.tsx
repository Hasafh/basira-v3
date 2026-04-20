import AdvisoryTab from '../../pages/analyzer/tabs/AdvisoryTab';

interface Props {
  project: any;
  mode: 'indicative' | 'advisory';
  onBack: () => void;
}

export function AdvisoryFlow({ project, mode, onBack }: Props) {
  return (
    <div className="h-full flex flex-col" dir="rtl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: 'rgba(10,12,18,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0A0C12')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(10,12,18,0.45)')}
        >
          ← النتائج
        </button>
        <span style={{ color: 'rgba(10,12,18,0.15)', userSelect: 'none' }}>/</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#B8924A' }} />
          <span className="text-xs font-bold" style={{ color: '#B8924A' }}>
            التقرير الاستثماري
          </span>
        </div>
        {mode === 'indicative' && (
          <span className="text-xs px-2 py-0.5 rounded-full mr-auto"
            style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706' }}>
            ترقية اختيارية
          </span>
        )}
      </div>

      {/* Reuse existing AdvisoryTab — no logic duplication */}
      <div className="flex-1 overflow-auto">
        <AdvisoryTab project={project} />
      </div>

    </div>
  );
}
