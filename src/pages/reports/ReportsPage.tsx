import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProjectsStore } from '../../store';
import { useAnalysis } from '../../hooks/useAnalysis';
import { aiAPI, projectsAPI } from '../../api';
import { buildReportData } from '../../engines/reports';
import MainReport from './templates/MainReport';
import FeasibilityReport from './templates/FeasibilityReport';
import BankReport from './templates/BankReport';
import InternalReport from './templates/InternalReport';
import LandStudyReport from './templates/LandStudyReport';
import ShareholdersAReport from './templates/ShareholderInstitutionalReport';
import ShareholdersBReport from './templates/ShareholderIndividualReport';

import { fmt, fmtM, pct } from '../../utils/format';

/* ── Navigation structure ── */
type NavItem =
  | { type: 'category'; label: string }
  | { type: 'report';   id: string; label: string; sub: string; icon: string; category: string };

const NAV: NavItem[] = [
  { type: 'category', label: '📁 للمستثمر والمالك' },
  { type: 'report', id: 'main',           label: 'التقرير الشامل',           sub: 'نظرة 360° كاملة على المشروع',        icon: '📊', category: 'main'         },
  { type: 'report', id: 'feasibility',    label: 'جدوى شراء الأرض',          sub: 'هل هذه الصفقة مجدية؟',               icon: '📋', category: 'buy'          },

  { type: 'category', label: '🏦 للبنك والممول' },
  { type: 'report', id: 'bank',           label: 'تقرير التمويل البنكي',      sub: 'DSCR، جدول السداد، تحليل المخاطر',  icon: '🏦', category: 'bank'         },

  { type: 'category', label: '🤝 للشركاء والمساهمين' },
  { type: 'report', id: 'shareholders-a', label: 'تقرير المساهمين — مؤسسي', sub: 'العائد المُفضَّل ونداءات رأس المال', icon: '🏛', category: 'shareholders' },
  { type: 'report', id: 'shareholders-b', label: 'تقرير المساهمين — أفراد',  sub: 'IRR الشخصي وجدول التوزيعات',        icon: '👤', category: 'shareholders' },

  { type: 'category', label: '🔍 داخلي وتقني' },
  { type: 'report', id: 'internal',       label: 'الدراسة المالية الداخلية', sub: 'تفاصيل التكاليف والتدفق النقدي',    icon: '🔒', category: 'internal'     },
  { type: 'report', id: 'land-study',     label: 'دراسة الأرض والكود',       sub: 'الاشتراطات النظامية والانتكاسات',   icon: '🗺️', category: 'land'         },
];

const REPORT_SECTIONS = [
  { id: 'summary',    label: 'الملخص التنفيذي',      icon: '📝' },
  { id: 'project',    label: 'بيانات المشروع',         icon: '🏛' },
  { id: 'areas',      label: 'المساحات',               icon: '📐' },
  { id: 'costs',      label: 'التكاليف',               icon: '💰' },
  { id: 'revenue',    label: 'الإيرادات والأرباح',     icon: '📈' },
  { id: 'kpis',       label: 'المؤشرات المالية',        icon: '🎯' },
  { id: 'decision',   label: 'توصية النظام',           icon: '⚖️' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const { currentProject } = useProjectsStore();
  const { isAnalyzed, projectResults, formInput, formProjectId, financingStructure } = useAnalysis();

  const [activeReport,  setActiveReport]  = useState<string>('main');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [summary,       setSummary]       = useState(currentProject?.result?.executiveSummary || '');
  const [genLoading,    setGenLoading]    = useState(false);
  const [savingSum,     setSavingSum]     = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);

  const r         = projectResults?.[currentProject?.id ?? ''] ?? currentProject?.result ?? null;
  const f         = r?.financials;
  const costs     = r?.costs;
  const areas     = r?.areas;
  const canReport = isAnalyzed || !!currentProject?.result;

  const generateSummary = async () => {
    if (!f) { toast.error('شغّل التحليل أولاً'); return; }
    setGenLoading(true);
    try {
      const prompt = `اكتب ملخصاً تنفيذياً احترافياً بالعربية للمشروع العقاري التالي:
المشروع: ${currentProject?.name || 'مشروع عقاري'}
الموقع: ${currentProject?.location || 'غير محدد'}
IRR: ${f.irr != null && isFinite(f.irr) ? f.irr.toFixed(1) : '--'}٪ | هامش الربح: ${f.margin != null && isFinite(f.margin) ? f.margin.toFixed(1) : '--'}٪ | ROI: ${f.roi != null && isFinite(f.roi) ? f.roi.toFixed(1) : '--'}٪
صافي الربح: ${(f.net/1e6).toFixed(2)} مليون ريال
الإيرادات: ${(f.revenue/1e6).toFixed(2)} مليون ريال
اكتب ملخصاً من 3-4 فقرات يغطي: الفرصة الاستثمارية، المؤشرات المالية، مستوى المخاطر، والتوصية.`;
      const res  = await aiAPI.chat({ message: prompt, projectId: currentProject?.id, history: [] });
      const text = res.data?.data?.message || res.data?.message || '';
      setSummary(text);
      toast.success('✅ تم توليد الملخص');
    } catch {
      toast.error('تعذّر توليد الملخص');
    } finally {
      setGenLoading(false);
    }
  };

  const saveSummary = async () => {
    if (!currentProject?.id) return;
    setSavingSum(true);
    try {
      await projectsAPI.patch(currentProject.id, {
        name:     currentProject.name,
        location: currentProject.location || '',
        status:   currentProject.status   || 'draft',
        result:   { ...currentProject.result, executiveSummary: summary },
      });
      toast.success('✅ تم حفظ الملخص');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSavingSum(false);
    }
  };

  /* ── Build shared report data (passed as props to pure templates) ── */
  // Pass formInput + live financingStructure.bankPct so BankReport syncs without re-running analysis
  const currentFormInput = formProjectId === currentProject?.id
    ? { ...formInput, bankPct: financingStructure.bankPct }
    : null;
  const reportData = buildReportData(currentProject, r as any, undefined, currentFormInput);

  /* ── Render sub-report ── */
  const renderSubReport = () => {
    switch (activeReport) {
      case 'main':           return <MainReport />;
      case 'feasibility':    return <FeasibilityReport    data={reportData} />;
      case 'bank':           return <BankReport           data={reportData} />;
      case 'land-study':     return <LandStudyReport      data={reportData} />;
      case 'internal':       return <InternalReport />;
      case 'shareholders-a': return <ShareholdersAReport  data={reportData} />;
      case 'shareholders-b': return <ShareholdersBReport  data={reportData} />;
      default:               return null;
    }
  };

  const isSubReport = true; // all reports render in sub-report area

  return (
    <div className="flex h-full" dir="rtl">
      {/* ── Sidebar ── */}
      <div
        className="w-56 shrink-0 flex flex-col py-4 overflow-y-auto"
        style={{ background: 'white', borderLeft: '1px solid rgba(10,12,18,0.07)' }}
      >
        {NAV.map((item, idx) => {
          if (item.type === 'category') {
            return (
              <p key={idx} className="text-xs font-semibold px-4 mt-4 mb-1 first:mt-0"
                style={{ color: 'rgba(10,12,18,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {item.label}
              </p>
            );
          }
          const isActive = activeReport === item.id;
          const isMain   = item.id === 'main';
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveReport(item.id);
                if (isMain) setActiveSection(null);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-all text-right w-full"
              style={{
                background:  isActive ? 'rgba(184,146,74,0.07)' : 'transparent',
                borderRight: isActive ? '3px solid #B8924A' : '3px solid transparent',
                opacity:     canReport ? 1 : 0.4,
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex flex-col items-start">
                <span className="leading-tight text-xs font-medium" style={{ color: isActive ? '#B8924A' : 'rgba(10,12,18,0.7)', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                <span className="leading-tight" style={{ fontSize: 10, color: 'rgba(10,12,18,0.38)' }}>{item.sub}</span>
              </span>
            </button>
          );
        })}

        {/* Sub-sections for main report */}
        {activeReport === 'main' && canReport && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(10,12,18,0.06)' }}>
            <p className="text-xs font-semibold px-4 mb-1" style={{ color: 'rgba(10,12,18,0.35)' }}>الأقسام</p>
            {REPORT_SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id === activeSection ? null : sec.id)}
                className="flex items-center gap-2 px-4 py-2 text-xs transition-all text-right w-full"
                style={{
                  background:  activeSection === sec.id ? 'rgba(184,146,74,0.05)' : 'transparent',
                  color:       activeSection === sec.id ? '#B8924A' : 'rgba(10,12,18,0.45)',
                  fontWeight:  activeSection === sec.id ? 600 : 400,
                  borderRight: activeSection === sec.id ? '3px solid rgba(184,146,74,0.5)' : '3px solid transparent',
                }}
              >
                <span>{sec.icon}</span>
                {sec.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 overflow-auto" style={{ background: '#F4F3EF' }}>

        {/* Sub-reports — rendered directly */}
        {isSubReport && (
          <div className="p-2">
            {/* No analysis banner */}
            {!canReport && (
              <div className="mx-4 mt-4 rounded-xl p-4 flex items-center justify-between"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#d97706' }}>شغّل التحليل أولاً</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                    يجب تشغيل التحليل الأساسي لتوليد بيانات التقارير
                  </p>
                </div>
                {currentProject && (
                  <button
                    onClick={() => navigate(`/project/${currentProject.id}#basics`)}
                    className="px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
                  >
                    انتقل للمحلل ←
                  </button>
                )}
              </div>
            )}

            {/* Project banner for sub-reports */}
            {currentProject && (
              <div className="flex items-center gap-3 rounded-xl p-3 mb-2 mx-4 mt-4"
                style={{ background: 'rgba(184,146,74,0.07)', border: '1px solid rgba(184,146,74,0.18)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(184,146,74,0.12)' }}>🏛</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: '#0A0C12' }}>{currentProject.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(10,12,18,0.45)' }}>
                    {currentProject.location}
                    {f && <span style={{ color: '#B8924A' }}> · IRR: {f.irr != null && isFinite(f.irr) ? f.irr.toFixed(1) : '--'}٪</span>}
                  </p>
                </div>
              </div>
            )}
            {renderSubReport()}
          </div>
        )}

        {/* Main report */}
        {!isSubReport && (
          <div className="p-6 space-y-5">
            {/* No analysis banner */}
            {!canReport && (
              <div className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#d97706' }}>لم يتم تشغيل التحليل بعد</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.5)' }}>شغّل التحليل لتوليد التقارير</p>
                </div>
                {currentProject && (
                  <button
                    onClick={() => navigate(`/project/${currentProject.id}#basics`)}
                    className="px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
                  >
                    انتقل للمحلل ←
                  </button>
                )}
              </div>
            )}

            {/* Project banner */}
            {currentProject && (
              <div className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: 'rgba(184,146,74,0.07)', border: '1px solid rgba(184,146,74,0.18)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(184,146,74,0.12)' }}>🏛</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>{currentProject.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(10,12,18,0.45)' }}>
                    {currentProject.location}
                    {f && <span style={{ color: '#B8924A' }}> · IRR: {f.irr != null && isFinite(f.irr) ? f.irr.toFixed(1) : '--'}٪</span>}
                  </p>
                </div>
                <div className="mr-auto flex gap-2">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(10,12,18,0.05)', color: 'rgba(10,12,18,0.45)' }}
                    onClick={() => window.print()}
                  >
                    🖨️ طباعة
                  </button>
                  {canReport && (
                    <button
                      disabled={pdfLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                      style={{
                        background: pdfLoading ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
                        color: pdfLoading ? 'rgba(10,12,18,0.4)' : '#0A0C12',
                        cursor: pdfLoading ? 'not-allowed' : 'pointer',
                      }}
                      onClick={async () => {
                        setPdfLoading(true);
                        try {
                          const { downloadFeasibilityPDF } = await import('../../utils/pdfGenerator');
                          await downloadFeasibilityPDF(
                            {
                              projectName:     currentProject?.name     || 'مشروع عقاري',
                              projectLocation: currentProject?.location || '',
                              result:          r,
                            },
                            `basira-${(currentProject?.name || 'report').replace(/\s+/g, '-')}.pdf`,
                          );
                        } finally {
                          setPdfLoading(false);
                        }
                      }}
                    >
                      {pdfLoading ? '⏳ جاري...' : '⬇️ PDF'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {canReport && (
              <>
                {/* 1. Executive Summary */}
                {(!activeSection || activeSection === 'summary') && (
                  <Section title="📝 الملخص التنفيذي" actions={
                    <div className="flex gap-2">
                      <button onClick={generateSummary} disabled={genLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: genLoading ? 'rgba(184,146,74,0.2)' : 'linear-gradient(135deg, #C9A05E, #B8924A)', color: genLoading ? 'rgba(10,12,18,0.4)' : '#0A0C12', cursor: genLoading ? 'not-allowed' : 'pointer' }}>
                        {genLoading ? '⏳' : '🤖'} توليد تلقائي
                      </button>
                      {summary && (
                        <button onClick={saveSummary} disabled={savingSum}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.6)' }}>
                          {savingSum ? '...' : '💾 حفظ'}
                        </button>
                      )}
                    </div>
                  }>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={6}
                      placeholder="اكتب الملخص التنفيذي هنا، أو اضغط 'توليد تلقائي'..."
                      className="w-full text-sm resize-none"
                      style={{ border: '1px solid rgba(10,12,18,0.10)', borderRadius: '12px', padding: '12px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, color: '#0A0C12', background: '#FAFAF8' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.10)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </Section>
                )}

                {/* 2. Project Data */}
                {(!activeSection || activeSection === 'project') && currentProject && (
                  <Section title="🏛 بيانات المشروع">
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        {[
                          ['اسم المشروع',     currentProject.name],
                          ['الموقع',          currentProject.location || '—'],
                          ['الحالة',          currentProject.status   || '—'],
                          ['الكود النظامي',   currentProject.input?.zoningCode || '—'],
                          ['نوع الأرض',       currentProject.input?.landType   || '—'],
                          ['الاستخدام',       currentProject.input?.usageType  || '—'],
                        ].map(([k, v]) => (
                          <tr key={k as string} style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                            <td className="py-2 px-3 text-xs font-medium w-40" style={{ color: 'rgba(10,12,18,0.45)', background: '#FAFAF8' }}>{k}</td>
                            <td className="py-2 px-3 text-sm font-medium" style={{ color: '#0A0C12' }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Section>
                )}

                {/* 3. Areas */}
                {(!activeSection || activeSection === 'areas') && (
                  <Section title="📐 المساحات">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: 'مساحة الأرض',         value: fmt(areas?.landArea || currentProject?.input?.landArea) + ' م²', color: '#B8924A' },
                        { label: 'مساحة البناء الكلية',  value: fmt(areas?.totalBuildArea) + ' م²',                              color: '#2563eb' },
                        { label: 'المساحة القابلة للبيع', value: fmt(areas?.sellableArea) + ' م²',                               color: '#16a34a' },
                        { label: 'نسبة البناء',           value: pct((areas?.groundCoverageRatio || currentProject?.input?.groundCoverageRatio) * 100), color: '#7c3aed' },
                        { label: 'عدد الأدوار',           value: String(currentProject?.input?.floors || '—'),                   color: '#0284c7' },
                        { label: 'أدوار البدروم',         value: String(currentProject?.input?.basementFloors || '0'),           color: '#64748b' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-3"
                          style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
                          <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>{item.label}</p>
                          <p className="text-lg font-bold num" style={{ color: item.color }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 4. Costs */}
                {(!activeSection || activeSection === 'costs') && costs && (
                  <Section title="💰 التكاليف">
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F4F3EF' }}>
                          {['البند', 'المبلغ (ر.س)', 'ملاحظة'].map(h => (
                            <th key={h} className="text-right py-2.5 px-3 text-xs font-medium"
                              style={{ color: 'rgba(10,12,18,0.5)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'تكلفة الأرض',   val: costs.landCost,    note: `${fmt(currentProject?.input?.landPricePerM2)} ر.س/م²` },
                          { label: 'تكلفة البناء',  val: costs.totalBuildCost ?? costs.buildCost,   note: `${fmt(currentProject?.input?.buildCostPerM2)} ر.س/م²` },
                          { label: 'تكاليف ناعمة',  val: costs.softCosts,   note: '5٪ من البناء' },
                          { label: 'احتياطي طوارئ', val: costs.contingency, note: '5٪ من البناء' },
                          { label: 'خدمات ومرافق',  val: costs.servicesCost, note: '' },
                        ].filter(row => row.val != null).map(row => (
                          <tr key={row.label} style={{ borderBottom: '1px solid rgba(10,12,18,0.05)' }}>
                            <td className="py-2.5 px-3 text-xs font-medium" style={{ color: 'rgba(10,12,18,0.6)' }}>{row.label}</td>
                            <td className="py-2.5 px-3 font-bold num" style={{ color: '#0A0C12' }}>{fmt(row.val)}</td>
                            <td className="py-2.5 px-3 text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{row.note}</td>
                          </tr>
                        ))}
                        <tr style={{ background: 'rgba(10,12,18,0.03)', borderTop: '2px solid rgba(10,12,18,0.1)' }}>
                          <td className="py-2.5 px-3 font-bold text-xs" style={{ color: '#0A0C12' }}>إجمالي التكاليف</td>
                          <td className="py-2.5 px-3 font-bold num text-base" style={{ color: '#B8924A' }}>{fmt(costs.totalCost)}</td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{fmtM(costs.totalCost)} ر.س</td>
                        </tr>
                      </tbody>
                    </table>
                  </Section>
                )}

                {/* 5. Revenue & Profit */}
                {(!activeSection || activeSection === 'revenue') && f && (
                  <Section title="📈 الإيرادات والأرباح">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'إجمالي الإيرادات', val: fmtM(f.revenue),        color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
                        { label: 'إجمالي التكاليف',  val: fmtM(costs?.totalCost), color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
                        { label: 'صافي الربح',       val: fmtM(f.net),            color: '#B8924A', bg: 'rgba(184,146,74,0.08)' },
                        { label: 'هامش الربح',        val: pct(f.margin),          color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-4"
                          style={{ background: item.bg, border: `1px solid ${item.color}22` }}>
                          <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>{item.label}</p>
                          <p className="text-xl font-bold num" style={{ color: item.color }}>{item.val}</p>
                          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>مليون ر.س</p>
                        </div>
                      ))}
                    </div>
                    {f.cashflows?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: 'rgba(10,12,18,0.5)' }}>التدفقات النقدية</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {f.cashflows.map((cf: any, i: number) => (
                            <div key={i} className="rounded-lg p-3 text-center shrink-0"
                              style={{ background: cf.amount >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${cf.amount >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, minWidth: '80px' }}>
                              <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.4)' }}>S{i + 1}</p>
                              <p className="text-sm font-bold num"
                                style={{ color: cf.amount >= 0 ? '#16a34a' : '#dc2626' }}>
                                {(cf.amount / 1e6).toFixed(1)}م
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* 6. KPIs */}
                {(!activeSection || activeSection === 'kpis') && f && (
                  <Section title="🎯 المؤشرات المالية">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'معدل العائد الداخلي (IRR)', value: pct(f.irr),    color: '#16a34a', bg: 'rgba(34,197,94,0.08)',   desc: f.irr >= 20 ? 'ممتاز' : f.irr >= 12 ? 'جيد' : 'منخفض' },
                        { label: 'العائد على الاستثمار (ROI)', value: pct(f.roi),   color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   desc: 'العائد الكلي' },
                        { label: 'هامش الربح الصافي',          value: pct(f.margin), color: '#B8924A', bg: 'rgba(184,146,74,0.08)', desc: 'نسبة من الإيراد' },
                        { label: 'مضاعف رأس المال (EM)',        value: f.equityMultiple ? `${f.equityMultiple.toFixed(2)}×` : pct(f.roi ? f.roi / 100 + 1 : undefined), color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', desc: 'مكرر الاستثمار' },
                      ].map(k => (
                        <div key={k.label} className="rounded-2xl p-4"
                          style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
                          <p className="text-xs mb-2" style={{ color: 'rgba(10,12,18,0.5)', lineHeight: 1.4 }}>{k.label}</p>
                          <p className="text-2xl font-bold num" style={{ color: k.color }}>{k.value}</p>
                          <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>{k.desc}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 7. Decision */}
                {(!activeSection || activeSection === 'decision') && r?.summary && (
                  <Section title="⚖️ توصية النظام">
                    <div className="rounded-xl p-5"
                      style={{ background: r.summary.isBuy ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: r.summary.isBuy ? '2px solid rgba(34,197,94,0.3)' : '2px solid rgba(239,68,68,0.3)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{r.summary.isBuy ? '✅' : '❌'}</span>
                        <p className="font-bold text-base" style={{ color: r.summary.isBuy ? '#16a34a' : '#dc2626' }}>
                          {r.summary.decision}
                        </p>
                      </div>
                      {r.summary.reasons?.length > 0 && (
                        <ul className="space-y-1.5 mt-3">
                          {r.summary.reasons.map((reason: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(10,12,18,0.65)' }}>
                              <span className="mt-0.5 shrink-0">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, actions }: {
  title: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px', padding: '20px' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: '#0A0C12' }}>{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}
