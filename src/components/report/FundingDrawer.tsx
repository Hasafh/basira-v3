import { useState, useMemo } from 'react';
import { calculateDebtMetrics } from '../../lib/engines/debtEngine';
import { useAnalysisStore } from '../../store/analysisStore';
import type { FundingTarget } from '../../lib/reporting/fundingPackageBuilder';

interface Props {
  project:    any;
  result:     any;
  formInput:  Record<string, string>;
  confidence: number;
  irr?:       number;
  onClose:    () => void;
}

const TARGET_OPTIONS: { value: FundingTarget; label: string; sub: string; icon: string }[] = [
  { value: 'bank',                   label: 'بنك تجاري',         sub: 'تمويل بناء أو رهن عقاري', icon: '🏦' },
  { value: 'institutional_investor', label: 'مستثمر مؤسسي',      sub: 'صندوق / شركة استثمار',    icon: '🏢' },
  { value: 'individual_investor',    label: 'مستثمر فردي',       sub: 'شريك / ممول خاص',          icon: '👤' },
];

const fM = (v: number) => `${(v / 1_000_000).toFixed(2)} م`;
const fP = (v: number) => `${v.toFixed(1)}٪`;

export function FundingDrawer({ project, result, formInput, confidence, irr, onClose }: Props) {
  const { logReportIssuance } = useAnalysisStore();

  const [target,          setTarget]          = useState<FundingTarget>('bank');
  const [institutionName, setInstitutionName] = useState('');
  const [notes,           setNotes]           = useState('');

  /* ── derive key numbers for preview ── */
  const bankPctNum  = parseFloat(formInput.bankFinancingRatio ?? formInput.bankPct ?? '') || 0.60;
  const annualRate  = parseFloat(formInput.interestRate ?? formInput.annualInterestRate ?? '') || 6.0;
  const duration    = parseFloat(formInput.projectDurationMonths ?? '') || 24;
  const loanDur     = Math.max(12, duration + 6);

  const fin   = result?.financials ?? result?.feasibility?.financials ?? null;
  const costs = result?.costs      ?? result?.feasibility?.costs      ?? null;

  const totalCost    = costs?.totalCost   ?? 0;
  const totalRevenue = fin?.revenue       ?? 0;

  const debtPreview = useMemo(() => {
    if (!totalCost || !totalRevenue) return null;
    return calculateDebtMetrics({
      totalProjectCost:   totalCost,
      estimatedEndValue:  totalRevenue,
      netOperatingIncome: Math.max(0, totalRevenue - totalCost * 0.85),
      bankPct:            bankPctNum,
      annualInterestRate: annualRate,
      loanDurationMonths: loanDur,
      gracePeriodMonths:  Math.round(duration * 0.25),
    });
  }, [totalCost, totalRevenue, bankPctNum, annualRate, loanDur, duration]);

  const dscrColor =
    !debtPreview       ? '#64748b' :
    debtPreview.dscr >= 1.3 ? '#065f46' :
    debtPreview.dscr >= 1.1 ? '#92400e' : '#991b1b';

  const dscrBg =
    !debtPreview       ? '#f8fafc' :
    debtPreview.dscr >= 1.3 ? '#f0fdf4' :
    debtPreview.dscr >= 1.1 ? '#fffbeb' : '#fef2f2';

  const handleGenerate = () => {
    const params = new URLSearchParams({
      target,
      inst:  institutionName || 'غير محدد',
      notes: notes || '',
    });

    logReportIssuance({
      id:              `${project.id}-${Date.now()}`,
      projectId:       project.id,
      projectName:     project.name ?? project.id,
      timestamp:       new Date().toISOString(),
      target,
      institutionName: institutionName || 'غير محدد',
      confidence,
      irr:             irr ?? undefined,
      dscr:            debtPreview?.dscr ?? undefined,
    });

    window.open(`/report/advisory/${project.id}?${params.toString()}`, '_blank');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />

      {/* Drawer */}
      <div
        dir="rtl"
        style={{
          position: 'relative', zIndex: 1,
          width: 440, height: '100vh', overflowY: 'auto',
          background: 'white',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Cairo, Tajawal, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(10,12,18,0.08)',
          background: 'linear-gradient(135deg, #0F3D2E, #1A6B4A)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>🏦 إصدار ملف تمويلي</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{project?.name ?? project?.id}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

          {/* Preview metrics */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,12,18,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              مؤشرات المشروع
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {/* IRR */}
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>IRR</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>{irr != null ? fP(irr) : '—'}</div>
              </div>
              {/* DSCR */}
              <div style={{ background: dscrBg, borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: `1px solid ${dscrColor}22` }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>DSCR</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: dscrColor }}>
                  {debtPreview ? debtPreview.dscr.toFixed(2) : '—'}
                </div>
              </div>
              {/* Loan Amount */}
              <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>مبلغ القرض</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>
                  {debtPreview ? fM(debtPreview.loanAmount) : '—'}
                </div>
              </div>
            </div>

            {debtPreview && (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>LTV</span>
                  <span style={{ fontWeight: 700 }}>{debtPreview.ltv.toFixed(1)}٪</span>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>LTC</span>
                  <span style={{ fontWeight: 700 }}>{debtPreview.ltc.toFixed(1)}٪</span>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>إجمالي الفائدة</span>
                  <span style={{ fontWeight: 700 }}>{fM(debtPreview.totalInterest)}</span>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>القسط الشهري</span>
                  <span style={{ fontWeight: 700 }}>{debtPreview.monthlyPayment.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</span>
                </div>
              </div>
            )}
          </div>

          {/* Target selection */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 10 }}>الجهة المستهدفة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TARGET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTarget(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, textAlign: 'right', cursor: 'pointer',
                    background: target === opt.value ? 'rgba(15,61,46,0.06)' : 'rgba(10,12,18,0.03)',
                    border: target === opt.value ? '1.5px solid #0F3D2E' : '1px solid rgba(10,12,18,0.10)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: target === opt.value ? '#0F3D2E' : '#334155' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{opt.sub}</div>
                  </div>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: target === opt.value ? 'none' : '1.5px solid rgba(10,12,18,0.25)',
                    background: target === opt.value ? '#0F3D2E' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {target === opt.value && <span style={{ fontSize: 8, color: 'white', fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Institution name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              اسم الجهة <span style={{ color: '#94a3b8', fontWeight: 400 }}>(اختياري)</span>
            </label>
            <input
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              placeholder="مثال: بنك الرياض — إدارة التمويل العقاري"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1px solid rgba(10,12,18,0.15)', background: 'white', color: '#0A0C12',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              ملاحظات <span style={{ color: '#94a3b8', fontWeight: 400 }}>(اختياري)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تعليقات أو متطلبات خاصة بالجهة..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1px solid rgba(10,12,18,0.15)', background: 'white', color: '#0A0C12',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'Cairo, Tajawal, sans-serif',
              }}
            />
          </div>

          {/* Confidence warning */}
          {confidence < 75 && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: '#fffbeb', border: '1px solid #fcd34d', fontSize: 12, color: '#92400e',
            }}>
              <span style={{ fontWeight: 700 }}>⚠ درجة الثقة {confidence}٪</span> — يُوصى بإكمال بيانات السوق قبل التقديم للبنك
            </div>
          )}

          {/* Disclosure reminder */}
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 20,
            background: 'rgba(10,12,18,0.03)', border: '1px solid rgba(10,12,18,0.08)', fontSize: 11, color: '#64748b',
            lineHeight: 1.8,
          }}>
            ⓘ يحتوي التقرير على إفصاح بأن البيانات من المطور ولم يتم التحقق الخارجي منها. يُوصى بمراجعة مستشار مالي معتمد قبل التقديم.
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(10,12,18,0.08)',
          display: 'flex', gap: 10,
          background: '#fafafa',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: 'rgba(10,12,18,0.06)', color: 'rgba(10,12,18,0.5)',
              border: '1px solid rgba(10,12,18,0.10)', cursor: 'pointer',
              fontFamily: 'Cairo, Tajawal, sans-serif',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleGenerate}
            disabled={!totalCost || !totalRevenue}
            style={{
              flex: 2, padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: (!totalCost || !totalRevenue) ? 'rgba(15,61,46,0.35)' : 'linear-gradient(135deg, #0F3D2E, #1A6B4A)',
              color: 'white', border: 'none',
              cursor: (!totalCost || !totalRevenue) ? 'not-allowed' : 'pointer',
              fontFamily: 'Cairo, Tajawal, sans-serif',
              boxShadow: (!totalCost || !totalRevenue) ? 'none' : '0 4px 16px rgba(15,61,46,0.30)',
            }}
          >
            🏦 إصدار الملف التمويلي
          </button>
        </div>
      </div>
    </div>
  );
}
