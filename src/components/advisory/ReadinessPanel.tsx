import type { GateResult, ConfidenceBreakdown, ReportGrade } from '../../lib/types/report';

interface Props {
  gate: GateResult;
  confidence: ConfidenceBreakdown;
  onGenerate?: () => void;
  exporting?: boolean;
}

const GRADE_CONFIG: Record<ReportGrade, {
  label: string;
  description: string;
  bg: string;
  border: string;
  color: string;
  badge: string;
}> = {
  indicative: {
    label:       'استرشادي',
    description: 'للاستخدام الداخلي فقط — لا يُقدَّم للبنك أو المستثمر',
    bg:          'rgba(220,38,38,0.05)',
    border:      'rgba(220,38,38,0.20)',
    color:       '#dc2626',
    badge:       'rgba(220,38,38,0.10)',
  },
  conditional: {
    label:       'مشروط',
    description: 'يعتمد على بيانات جزئية — لا يُنصح للقرار التمويلي النهائي',
    bg:          'rgba(217,119,6,0.05)',
    border:      'rgba(217,119,6,0.20)',
    color:       '#d97706',
    badge:       'rgba(217,119,6,0.10)',
  },
  investment: {
    label:       'استثماري',
    description: 'Bank-ready — قابل للتقديم للبنك والمستثمر',
    bg:          'rgba(22,163,74,0.05)',
    border:      'rgba(22,163,74,0.20)',
    color:       '#16a34a',
    badge:       'rgba(22,163,74,0.10)',
  },
};

export function ReadinessPanel({ gate, confidence, onGenerate, exporting }: Props) {
  const cfg         = GRADE_CONFIG[confidence.grade];
  const canGenerate = gate.passed && confidence.total >= 65;

  const dims = [
    { label: 'Coverage',    value: confidence.coverage,    weight: '40٪', color: '#2563eb' },
    { label: 'Quality',     value: confidence.quality,     weight: '35٪', color: '#7c3aed' },
    { label: 'Consistency', value: confidence.consistency, weight: '25٪', color: '#16a34a' },
  ];

  return (
    <div dir="rtl" className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid rgba(10,12,18,0.08)', boxShadow: '0 2px 12px rgba(10,12,18,0.06)' }}>

      {/* Header — Grade badge */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
          <div>
            <p className="font-bold text-sm" style={{ color: cfg.color }}>
              تقرير {cfg.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              {cfg.description}
            </p>
          </div>
        </div>
        <div className="text-center shrink-0">
          <p className="text-3xl font-black num" style={{ color: cfg.color }}>{confidence.total}</p>
          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>/ 100</p>
        </div>
      </div>

      {/* Confidence dimensions */}
      <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(10,12,18,0.06)' }}>
        {dims.map(d => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-28 text-xs" style={{ color: 'rgba(10,12,18,0.45)' }}>
              {d.label} ({d.weight})
            </span>
            <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(10,12,18,0.07)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(d.value * 100)}%`, background: d.color }}
              />
            </div>
            <span className="w-9 text-right text-xs font-bold num" style={{ color: d.color }}>
              {Math.round(d.value * 100)}٪
            </span>
          </div>
        ))}
      </div>

      {/* Reasons */}
      <div className="px-5 py-4 space-y-2" style={{ borderBottom: '1px solid rgba(10,12,18,0.06)' }}>
        {confidence.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="flex-shrink-0 font-bold mt-0.5"
              style={{ color: r.type === 'positive' ? '#16a34a' : r.type === 'negative' ? '#dc2626' : '#d97706' }}>
              {r.type === 'positive' ? '✓' : r.type === 'negative' ? '✗' : '–'}
            </span>
            <span style={{ color: r.type === 'positive' ? '#16a34a' : r.type === 'negative' ? '#dc2626' : 'rgba(10,12,18,0.6)' }}>
              {r.text}
            </span>
          </div>
        ))}
      </div>

      {/* Missing requirements — hard block */}
      {!gate.passed && (
        <div className="mx-4 my-3 rounded-xl p-3"
          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.18)' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#dc2626' }}>
            متطلبات إلزامية ناقصة ({gate.missingFields.length})
          </p>
          <ul className="space-y-1.5">
            {gate.missingFields.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#dc2626' }}>
                <span className="flex-shrink-0 mt-0.5">✗</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditional warning — shown when grade is conditional (not bank-ready) */}
      {confidence.grade === 'conditional' && (
        <div className="mx-4 my-3 rounded-xl p-3"
          style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.22)' }}>
          <p className="text-xs font-bold mb-1" style={{ color: '#d97706' }}>⚠️ تحذير استخدام</p>
          <p className="text-xs" style={{ color: '#92400e' }}>
            هذا التقرير يعتمد على بيانات جزئية ولا يُوصى باستخدامه لاتخاذ قرار تمويلي نهائي.
            يجب إرفاق هذا التحذير مع أي نسخة خارجية.
          </p>
        </div>
      )}

      {/* Generate button — hard block when gate not passed */}
      <div className="px-5 pb-5 pt-2">
        <button
          onClick={canGenerate && !exporting ? onGenerate : undefined}
          disabled={!canGenerate || exporting}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all"
          style={{
            background: canGenerate
              ? `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color})`
              : 'rgba(10,12,18,0.06)',
            color:   canGenerate ? 'white' : 'rgba(10,12,18,0.3)',
            cursor:  canGenerate && !exporting ? 'pointer' : 'not-allowed',
            opacity: exporting ? 0.75 : 1,
          }}
          title={!canGenerate ? 'أكمل المتطلبات الإلزامية لتفعيل التقرير الاستشاري' : undefined}
        >
          {exporting
            ? 'جاري إنشاء التقرير...'
            : canGenerate
            ? `توليد التقرير ${confidence.grade === 'investment' ? 'الاستثماري ✓' : 'المشروط'}`
            : `أكمل ${gate.missingFields.length} متطلبات لفتح التقرير الاستشاري`
          }
        </button>
        {!canGenerate && (
          <p className="text-center text-xs mt-2" style={{ color: 'rgba(10,12,18,0.35)' }}>
            التقرير الاسترشادي متاح الآن للاستخدام الداخلي
          </p>
        )}
      </div>
    </div>
  );
}
