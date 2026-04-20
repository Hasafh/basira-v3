import { useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI } from '../../api';
import { useAnalysisStore } from '../../store/analysisStore';
import {
  calculateReadiness,
  calculateConfidence,
  getReportUsage,
  getMarketInsight,
} from '../../lib/engines/confidenceEngine';
import { generateExecutiveSummary, type SummaryTarget } from '../../lib/engines/executiveSummaryEngine';
import { calculateLocationScore } from '../../lib/engines/locationScoringEngine';
import { applyLocationConfig } from '../../lib/config/locationConfig';
import { SourceBadge } from '../../components/report/SourceBadge';
import type { AdvisoryRequiredInputs, DataSourceType } from '../../lib/types/report';
import { sourceLabel } from '../../lib/types/report';
import { calculateDebtMetrics } from '../../lib/engines/debtEngine';
import { generateMonthlyCashFlow, generateAdvancedCashFlow } from '../../lib/engines/cashFlowEngine';
import { runSensitivity } from '../../lib/engines/sensitivityEngine';
import { simulateDelay } from '../../lib/engines/delayImpactEngine';

/* ── constants ── */
const DEFAULT_ADVISORY: AdvisoryRequiredInputs = {
  valuationReport: false, comparableProjects: [], marketDataSource: null,
  zoningDocument: null, contractorQuotes: 0, landLegalStatus: false,
};

const SOURCE_LABELS: Record<string, string> = {
  government: 'وزارة العدل', certified_appraisal: 'تقييم RICS',
  broker_data: 'وسيط', internal_excel: 'Excel داخلي', manual_input: 'يدوي',
};

/* ── formatters ── */
const fN = (v?: number, d = 0) =>
  v != null && isFinite(v) ? v.toLocaleString('ar-SA', { maximumFractionDigits: d }) : '—';
const fM = (v?: number) =>
  v != null && isFinite(v) ? `${(v / 1_000_000).toFixed(2)} م` : '—';
const fP = (v?: number, d = 1) =>
  v != null && isFinite(v) ? `${v.toFixed(d)}٪` : '—';

/* ── smart decision ── */
function decision(irr: number | null) {
  if (irr == null) return { label: 'لم تُحسب النتائج بعد', color: '#6b7280', bg: '#f3f4f6', text: '' };
  if (irr >= 20) return {
    label: 'يُوصى بالمضي — عائد ممتاز',
    color: '#065f46', bg: '#d1fae5',
    text: `يُحقق المشروع عائداً داخلياً ${irr.toFixed(1)}٪ يتجاوز المعدل المستهدف بفارق واضح. تُشير المؤشرات الى جدوى استثمارية قوية مع هامش أمان مقبول في ظل الظروف السوقية الراهنة.`,
  };
  if (irr >= 15) return {
    label: 'مقبول مع مراجعة هيكل التمويل',
    color: '#92400e', bg: '#fef3c7',
    text: `يُسجّل المشروع عائداً داخلياً ${irr.toFixed(1)}٪ ضمن النطاق المقبول. يُنصح بمراجعة هيكل التمويل وجدولة التسليم لرفع العائد وتخفيض مخاطر الزمن.`,
  };
  return {
    label: 'يحتاج إعادة هيكلة قبل المضي',
    color: '#991b1b', bg: '#fee2e2',
    text: `يُسجّل المشروع عائداً داخلياً ${irr.toFixed(1)}٪ دون الحد الأدنى المعتاد (15٪+). يُوصى بإعادة النظر في تكاليف البناء أو استراتيجية التسعير قبل التنفيذ.`,
  };
}

const GRADE_CFG = {
  investment:  { label: 'استثماري',  color: '#065f46', bg: '#d1fae5', border: '#34d399' },
  conditional: { label: 'مشروط',     color: '#92400e', bg: '#fef3c7', border: '#f59e0b' },
  indicative:  { label: 'استرشادي',  color: '#1e40af', bg: '#dbeafe', border: '#60a5fa' },
};

/* ══ sub-components ══════════════════════════════════════════ */

function KPI({ label, value, color = '#0A0C12', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', textAlign: 'right' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function KPILight({ label, value, color = '#0A0C12', bg = '#f8fafc' }: { label: string; value: string; color?: string; bg?: string }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '12px 14px', textAlign: 'right' }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #e2e8f0' }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F3D2E' }}>{children}</h2>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#475569' }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{fM(value)}</span>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
        <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function ConfBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#64748b' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{safe}٪</span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
        <div style={{ height: 6, width: `${safe}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function TRow({ label, value, bold, gold }: { label: string; value: string; bold?: boolean; gold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', color: '#475569', fontSize: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{label}</td>
      <td style={{ padding: '8px 12px', fontWeight: bold ? 700 : 400, color: gold ? '#BA7517' : '#0A0C12', fontSize: 13, textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{value}</td>
    </tr>
  );
}

/* ══ main page ════════════════════════════════════════════════ */

export default function AdvisoryReportPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Bank/investor mode — set via ?target=bank&inst=BankName&notes=...
  const reportTarget       = searchParams.get('target') ?? 'internal';
  const institutionName    = searchParams.get('inst')   ?? '';
  const institutionNotes   = searchParams.get('notes')  ?? '';
  const isBankMode         = reportTarget === 'bank';

  const { projectResults, projectAdvisoryInputs, projectInputs, reportBuilder, zoningConfigs, locationConfig } = useAnalysisStore();

  const result    = id ? (projectResults[id]       ?? null)           : null;
  const inputs    = id ? (projectAdvisoryInputs[id] ?? DEFAULT_ADVISORY) : DEFAULT_ADVISORY;
  const formInput = id ? (projectInputs[id]        ?? {})             : {};

  const gate       = useMemo(() => calculateReadiness(inputs),                                [inputs]);
  const confidence = useMemo(() => calculateConfidence(inputs),                               [inputs]);
  const usage      = useMemo(() => getReportUsage(confidence.grade),                          [confidence.grade]);
  const insight    = useMemo(() => getMarketInsight(confidence, inputs.comparableProjects),   [confidence, inputs.comparableProjects]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await projectsAPI.get(id!);
      return res.data?.data?.project ?? res.data?.data ?? res.data?.project ?? res.data;
    },
    enabled: !!id,
  });

  const fin   = result?.financials ?? result?.feasibility?.financials ?? null;
  const costs = result?.costs      ?? result?.feasibility?.costs      ?? null;
  const areas = result?.areas      ?? result?.feasibility?.areas      ?? null;

  const irr    = fin?.irr    ?? null;
  const margin = fin?.margin ?? null;
  const roi    = fin?.roi    ?? null;
  const net    = fin?.net    ?? null;

  // NPV: recompute from stored cashFlow using 8% DCF — bypasses any stale cached value
  const storedCashFlow: number[] | null = result?.cashFlow ?? null;
  const npv = useMemo(() => {
    if (storedCashFlow && storedCashFlow.length > 1) {
      const monthlyR = Math.pow(1.08, 1 / 12) - 1;
      const v = storedCashFlow.reduce((sum, cf, t) => sum + cf / Math.pow(1 + monthlyR, t), 0);
      return isFinite(v) ? v : null;
    }
    // fallback: approximate from net profit if no cash flow stored
    if (net != null && fin?.npv != null && isFinite(fin.npv) && fin.npv !== 0) return fin.npv;
    if (net != null && net !== 0) {
      const yrs = (parseFloat(formInput.projectDurationMonths ?? '24') || 24) / 12;
      return net / Math.pow(1.08, yrs);
    }
    return null;
  }, [storedCashFlow, net, fin?.npv, formInput.projectDurationMonths]);

  const sellPricePerM2 = parseFloat(formInput.sellPricePerM2        ?? '0') || 0;
  const landPricePerM2 = parseFloat(formInput.landPricePerM2        ?? '0') || 0;
  const buildCostPerM2 = parseFloat(formInput.buildCostPerM2        ?? '0') || 0;
  const durationMonths = parseFloat(formInput.projectDurationMonths ?? '24') || 24;
  const floorsNum      = parseFloat(formInput.floors ?? '4') || 4;
  const floors         = formInput.floors ?? '—';
  const gcRaw          = formInput.groundCoverageRatio ?? formInput.groundCoverage;
  const gcrNum         = gcRaw ? (parseFloat(gcRaw) || 0.6) : (areas?.groundCoverageRatio ?? 0.6);
  const groundCovPct   = gcRaw
    ? `${(parseFloat(gcRaw) * 100).toFixed(0)}٪`
    : (areas?.groundCoverageRatio ? `${(areas.groundCoverageRatio * 100).toFixed(0)}٪` : '—');
  const zoningCode     = formInput.zoningCode ?? formInput.regulatoryCode ?? '—';
  const usageType      = formInput.usageType ?? '—';

  // Fallbacks for computed area fields — use result.areas first, then derive from form inputs
  const landAreaInput     = parseFloat(formInput.landArea ?? '0') || 0;
  const landAreaVal       = (areas?.landArea        && areas.landArea        > 0) ? areas.landArea        : landAreaInput;
  const grossBuildAreaVal = (areas?.grossBuildArea   && areas.grossBuildArea  > 0) ? areas.grossBuildArea  : (landAreaInput * floorsNum * gcrNum);
  const sellableAreaVal   = (areas?.sellableArea     && areas.sellableArea    > 0) ? areas.sellableArea    : (grossBuildAreaVal * 0.85);

  const dec       = decision(irr);
  const gradeInfo = GRADE_CFG[confidence.grade] ?? GRADE_CFG.indicative;

  /* executive summary — from builder data if available, else auto-generate */
  const builderData = id ? (reportBuilder[id] ?? null) : null;
  const summaryText = useMemo(() => {
    if (builderData?.executiveSummary) return builderData.executiveSummary;
    const numF = (k: string, fb = 0) => parseFloat(formInput?.[k] ?? '') || fb;
    return generateExecutiveSummary({
      project: {
        name:          project?.name,
        location:      project?.location,
        usageType:     formInput?.usageType || formInput?.landType,
        landArea:      landAreaVal || undefined,
        floorsCount:   numF('floors', 4),
        totalUnits:    result?.unitMix?.totalUnits,
        durationMonths: numF('projectDurationMonths', 24),
        sellPricePerSqm: sellPricePerM2 || undefined,
      },
      financials: {
        irr:       irr   ?? undefined,
        netMargin: margin ?? undefined,
        netProfit: net   ?? undefined,
      },
      comparables: comps,
      confidence:  confidence.total,
      target:      (builderData?.target ?? 'internal') as SummaryTarget,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderData?.executiveSummary, builderData?.target, irr, margin, net, confidence.total]);

  /* location score */
  const mergedZoningConfigs = useMemo(
    () => applyLocationConfig(zoningConfigs, locationConfig),
    [zoningConfigs, locationConfig],
  );
  const locationScore = useMemo(() => calculateLocationScore(
    {
      usageType:   formInput.usageType || formInput.landType,
      zoningCode:  formInput.zoningCode || formInput.regulatoryCode,
      streetWidth: parseFloat(formInput.streetWidth ?? '0') || undefined,
      floorsCount: parseFloat(formInput.floors ?? '0') || undefined,
      landArea:    landAreaVal || undefined,
      location:    project?.location,
    },
    mergedZoningConfigs,
    locationConfig,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [formInput.zoningCode, formInput.regulatoryCode, formInput.streetWidth, formInput.floors, landAreaVal, mergedZoningConfigs, locationConfig]);

  /* monthly cashflow rows from stored cashFlow array */
  const monthlyCashflow = useMemo(() => {
    const cf: number[] = result?.cashFlow ?? [];
    let cumulative = 0;
    return cf.map((val, i) => {
      cumulative += val;
      return {
        month:      i + 1,
        expenses:   val < 0 ? Math.abs(val) : 0,
        revenue:    val > 0 ? val : 0,
        net:        val,
        cumulative,
      };
    });
  }, [result?.cashFlow]);

  /* ── bank financing analysis ── */
  const bankPctNum    = parseFloat(formInput.bankFinancingRatio ?? formInput.bankPct ?? '') || 0.60;
  const annualRate    = parseFloat(formInput.interestRate ?? formInput.annualInterestRate ?? '') || 6.0;
  const softCostsPct  = parseFloat(formInput.softCostsPct ?? '') || 0.07;
  const contPctNum    = parseFloat(formInput.contingencyPct ?? '') || 0.05;
  const loanDurMonths = Math.max(12, durationMonths + 6);

  const landCostTotal   = landPricePerM2 * landAreaVal;
  const buildCostTotal  = buildCostPerM2 * grossBuildAreaVal;
  const totalRevGross   = fin?.revenue ?? (sellPricePerM2 > 0 && sellableAreaVal > 0 ? sellPricePerM2 * sellableAreaVal : 0);
  const totalCostGross  = costs?.totalCost ?? (landCostTotal + buildCostTotal * (1 + softCostsPct + contPctNum));
  const financingCostEst = costs?.financingCost ?? (totalCostGross * bankPctNum * (annualRate / 100) * (loanDurMonths / 12));
  const noiBankCalc     = Math.max(0, totalRevGross - (totalCostGross - financingCostEst));

  const debtMetrics = useMemo(() => {
    if (!totalCostGross || !totalRevGross) return null;
    return calculateDebtMetrics({
      totalProjectCost:   totalCostGross,
      estimatedEndValue:  totalRevGross,
      netOperatingIncome: noiBankCalc,
      bankPct:            bankPctNum,
      annualInterestRate: annualRate,
      loanDurationMonths: loanDurMonths,
      gracePeriodMonths:  Math.round(durationMonths * 0.25),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCostGross, totalRevGross, noiBankCalc, bankPctNum, annualRate, loanDurMonths, durationMonths]);

  const cashFlowEng = useMemo(() => {
    if (!buildCostTotal && !landCostTotal) return null;
    return generateMonthlyCashFlow({
      landCost:       landCostTotal,
      buildCost:      buildCostTotal,
      softCostsPct,
      contingencyPct: contPctNum,
      totalRevenue:   totalRevGross,
      durationMonths,
      bankPct:        bankPctNum,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landCostTotal, buildCostTotal, softCostsPct, contPctNum, totalRevGross, durationMonths, bankPctNum]);

  const sensitivityEng = useMemo(() => {
    if (!totalCostGross || !totalRevGross) return null;
    return runSensitivity({
      totalProjectCost:   totalCostGross,
      totalRevenue:       totalRevGross,
      bankPct:            bankPctNum,
      annualInterestRate: annualRate,
      loanDurationMonths: loanDurMonths,
      operatingCosts:     totalCostGross - financingCostEst,
      durationMonths,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCostGross, totalRevGross, bankPctNum, annualRate, loanDurMonths, financingCostEst, durationMonths]);

  const cashFlowAdvanced = useMemo(() => {
    if (!buildCostTotal && !landCostTotal) return null;
    return generateAdvancedCashFlow({
      durationMonths,
      landCost:       landCostTotal,
      buildCost:      buildCostTotal,
      softCostsPct:   softCostsPct,
      contingencyPct: contPctNum,
      totalRevenue:   totalRevGross,
      salesStartMonth: Math.max(3, Math.round(durationMonths * 0.25)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landCostTotal, buildCostTotal, softCostsPct, contPctNum, totalRevGross, durationMonths]);

  const delayImpact6m = useMemo(() => {
    if (!totalCostGross || !totalRevGross) return null;
    return simulateDelay({
      totalProjectCost:   totalCostGross,
      totalRevenue:       totalRevGross,
      durationMonths,
      bankPct:            bankPctNum,
      annualInterestRate: annualRate,
      loanDurationMonths: loanDurMonths,
      gracePeriodMonths:  Math.round(durationMonths * 0.25),
    }, 6);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCostGross, totalRevGross, durationMonths, bankPctNum, annualRate, loanDurMonths]);

  /* market */
  const comps      = inputs.comparableProjects;
  const prices     = comps.map(c => c.sellPricePerSqm).filter(Boolean);
  const avgPrice   = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const minPrice   = prices.length ? Math.round(Math.min(...prices)) : 0;
  const maxPrice   = prices.length ? Math.round(Math.max(...prices)) : 0;
  const priceRange = maxPrice - minPrice || 1;
  const markerPct  = maxPrice > minPrice ? Math.round(((sellPricePerM2 - minPrice) / priceRange) * 100) : 50;
  const showMarket = confidence.total >= 60 && comps.length >= 3;

  /* sensitivity — revenue ±20%, costs fixed */
  const revenue     = fin?.revenue ?? 0;
  const totalCostV  = costs?.totalCost ?? 0;
  const netBase     = net ?? (revenue - totalCostV);
  const netPess     = revenue * 0.80 - totalCostV;
  const netOpt      = revenue * 1.20 - totalCostV;
  const revPess     = revenue * 0.80;
  const revOpt      = revenue * 1.20;
  const mBase       = revenue  > 0 ? (netBase / revenue)  * 100 : 0;
  const mPess       = revPess  > 0 ? (netPess / revPess)  * 100 : 0;
  const mOpt        = revOpt   > 0 ? (netOpt  / revOpt)   * 100 : 0;
  const evalLabel   = (m: number) => m >= 15 ? '✓ مقبول' : m >= 0 ? '~ هامشي' : '✗ خسارة';
  const scenarios = [
    { label: 'تراجع الإيرادات −20٪', net: netPess, margin: mPess, color: '#dc2626', bg: '#fef2f2', eval: evalLabel(mPess) },
    { label: 'السيناريو الأساسي',     net: netBase, margin: mBase, color: '#0F3D2E', bg: '#f0fdf4', eval: evalLabel(mBase) },
    { label: 'ارتفاع الإيرادات +20٪', net: netOpt,  margin: mOpt,  color: '#16a34a', bg: '#f0fdf4', eval: evalLabel(mOpt)  },
  ];

  const date = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  /* inject fonts + print CSS */
  useEffect(() => {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'advisory-print-css';
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body {
        direction: rtl;
        font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
        margin: 0; padding: 0;
        background: #f1f5f9;
        color: #0A0C12;
      }
      @media print {
        @page { size: A4 portrait; margin: 12mm 15mm; }
        html, body { background: white !important; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
        .no-print { display: none !important; }
        .page-break { page-break-before: always; break-before: page; }
        .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        .report-wrap { max-width: 100% !important; box-shadow: none !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      try { document.head.removeChild(link); } catch {}
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  useEffect(() => {
    const suffix = isBankMode ? 'الملف التمويلي' : 'التقرير الاستثماري';
    if (project?.name) document.title = `بصيرة — ${suffix} — ${project.name}`;
  }, [project?.name, isBankMode]);

  /* ── low-confidence gate ── */
  if (!isLoading && confidence.total < 60) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
        <div style={{ maxWidth: 480, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F3D2E', marginBottom: 12 }}>البيانات غير مكتملة</h2>
          <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.8 }}>
            درجة الثقة الحالية ({confidence.total}٪) أقل من الحد الأدنى المطلوب (60٪) لإصدار تقرير موثوق.
          </p>
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: 20, textAlign: 'right' }}>
            <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>البنود الناقصة:</p>
            {gate.missingFields.map((f, i) => (
              <p key={i} style={{ color: '#92400e', fontSize: 13, margin: '4px 0' }}>• {f}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'rtl' }}>

      {/* ── floating print button ── */}
      <div className="no-print" style={{ position: 'fixed', bottom: 32, left: 32, zIndex: 1000, display: 'flex', gap: 10 }}>
        <button
          onClick={() => window.print()}
          style={{
            background: 'linear-gradient(135deg, #0F3D2E, #1A6B4A)',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '14px 28px', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
            boxShadow: '0 8px 32px rgba(15,61,46,0.35)',
          }}
        >
          🖨️ تصدير PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: 'white', color: '#475569', border: '1px solid #e2e8f0',
            borderRadius: 14, padding: '14px 20px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
          }}
        >
          ✕ إغلاق
        </button>
      </div>

      <div className="report-wrap" style={{ maxWidth: 860, margin: '0 auto', background: 'white', boxShadow: '0 0 40px rgba(0,0,0,0.12)' }}>

        {/* ════════════════════════════════════════
            القسم ١ — الغلاف
        ════════════════════════════════════════ */}
        <div className="cover-section" style={{
          background: 'linear-gradient(160deg, #0F3D2E 0%, #1A6B4A 60%, #0F3D2E 100%)',
          padding: '52px 48px 40px',
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 56 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#BA7517', letterSpacing: -1 }}>بصيرة</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>منصة الذكاء العقاري</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{date}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  background: gradeInfo.bg, color: gradeInfo.color,
                  borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${gradeInfo.border}`,
                }}>
                  {gradeInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* project name */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              {isBankMode ? 'ملف تمويلي — للتقديم للجهة الممولة' : 'تقرير الجدوى الاستثمارية الشاملة'}
            </div>
            <div style={{ fontSize: 46, fontWeight: 900, color: '#BA7517', lineHeight: 1.15, marginBottom: 8 }}>
              {isLoading ? '...' : (project?.name ?? id)}
            </div>
            {project?.location && (
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginBottom: 40 }}>
                📍 {project.location}
              </div>
            )}

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 40 }}>
              <KPI label="معدل العائد الداخلي" value={fP(irr)} color="#4ade80" />
              <KPI label="هامش الربح الصافي"   value={fP(margin)} color="#BA7517" />
              <KPI
                label="التصنيف"
                value={gradeInfo.label}
                color={gradeInfo.bg}
                sub={`${confidence.total}٪ ثقة`}
              />
            </div>
          </div>

          {/* project meta block — fills white space */}
          <div style={{
            marginTop: 36,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '24px 28px',
            border: '1px solid rgba(255,255,255,0.10)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>نوع الاستخدام</div>
                <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{usageType !== '—' ? usageType : (formInput.landType ?? 'غير محدد')}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>الموقع</div>
                <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{project?.location ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>مساحة الأرض</div>
                <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{areas?.landArea ? `${fN(areas.landArea)} م²` : (formInput.landArea ? `${formInput.landArea} م²` : '—')}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>مدة التطوير</div>
                <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{durationMonths} شهراً</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>يشمل هذا التقرير</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(isBankMode
              ? ['DSCR', 'LTV / LTC', 'هيكل التمويل', 'جدول الدفعات', 'جدول التحصيل', 'تحليل حساسية', 'تأثير التأخير', 'إفصاحات قانونية']
              : ['تحليل سوق', 'جدول مقارنات', 'تحليل الديون', 'DSCR', 'هيكل التمويل', 'تحليل حساسية', 'تقييم مخاطر', 'إفصاحات قانونية']
            ).map(tag => (
                  <span key={tag} style={{
                    background: 'rgba(186,117,23,0.25)', color: '#f0c040',
                    borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
                    border: '1px solid rgba(186,117,23,0.35)',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* footer strip */}
          <div style={{
            marginTop: 24,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 10,
            padding: '12px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>رقم المشروع: {id}</span>
            {isBankMode && institutionName && (
              <span style={{ fontSize: 11, color: 'rgba(186,117,23,0.85)', fontWeight: 600 }}>
                مُعدّ لـ: {institutionName}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              {isBankMode ? 'سري — للجهة الممولة فقط' : 'سري — للمطور والمستثمرين المعتمدين فقط'}
            </span>
          </div>
        </div>

        {/* inner content padding wrapper */}
        <div style={{ padding: '0 48px 48px' }}>

          {/* ════════════════════════════════════════
              القسم ٢ — الملخص التنفيذي
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📋">{isBankMode ? 'الملخص التنفيذي — نسخة الجهة الممولة' : 'الملخص التنفيذي'}</SectionTitle>

            {/* Bank-mode recipient header */}
            {isBankMode && (
              <div style={{
                background: '#f0fdf4', border: '1.5px solid #0F3D2E', borderRadius: 12,
                padding: '14px 20px', marginBottom: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>مُعدّ لـ</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F3D2E' }}>{institutionName || 'الجهة الممولة'}</div>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  {debtMetrics && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#64748b' }}>DSCR</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: debtMetrics.dscrColor === 'green' ? '#065f46' : debtMetrics.dscrColor === 'yellow' ? '#92400e' : '#991b1b' }}>
                          {debtMetrics.dscr.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#64748b' }}>مبلغ القرض</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0284c7' }}>{fM(debtMetrics.loanAmount)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#64748b' }}>مدة القرض</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed' }}>{loanDurMonths} ش</div>
                      </div>
                    </>
                  )}
                </div>
                {institutionNotes && (
                  <div style={{ width: '100%', fontSize: 12, color: '#475569', borderTop: '1px solid rgba(15,61,46,0.15)', paddingTop: 10, marginTop: 4 }}>
                    <strong>ملاحظات:</strong> {institutionNotes}
                  </div>
                )}
              </div>
            )}

            {/* decision banner */}
            <div style={{
              background: dec.bg, borderRadius: 14,
              padding: '20px 24px', marginBottom: 24,
              border: `2px solid ${dec.color}33`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: dec.color, marginBottom: 10 }}>
                {dec.label}
              </div>
              {dec.text && (
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.9, fontSize: 14 }}>{dec.text}</p>
              )}
            </div>

            {/* 6 KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              <KPILight label="IRR — معدل العائد الداخلي" value={fP(irr)}    color="#0F3D2E" bg="#f0fdf4" />
              <KPILight label="NPV — صافي القيمة الحالية" value={fM(npv)}    color="#0284c7" bg="#f0f9ff" />
              <KPILight label="هامش الربح الصافي"          value={fP(margin)} color="#BA7517" bg="#fffbeb" />
              <KPILight label="ROI — العائد على الاستثمار" value={fP(roi)}    color="#7c3aed" bg="#faf5ff" />
              <KPILight label="صافي الربح"                 value={fM(net)}    color="#0F3D2E" bg="#f0fdf4" />
              <KPILight label="مدة المشروع"                value={`${durationMonths} شهراً`} color="#475569" bg="#f8fafc" />
            </div>

            {/* conditional warning */}
            {confidence.grade === 'conditional' && (
              <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠️ تقرير مشروط</div>
                <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
                  يعتمد هذا التقرير على بيانات جزئية (ثقة {confidence.total}٪). يمكن تقديمه للأطراف الخارجية مع إيضاح هذا التحفظ صراحةً.
                </p>
              </div>
            )}

            {/* confidence bars */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 14 }}>مؤشرات الموثوقية</div>
              <ConfBar label={`الإجمالي — ${confidence.total}٪`} pct={confidence.total} color={gradeInfo.color} />
              <ConfBar label="التغطية"  pct={Math.round((confidence.coverage    ?? 0) * 100)} color="#0F3D2E" />
              <ConfBar label="الجودة"   pct={Math.round((confidence.quality     ?? 0) * 100)} color="#BA7517" />
              <ConfBar label="الاتساق"  pct={Math.round((confidence.consistency ?? 0) * 100)} color="#0284c7" />
            </div>

            {/* executive summary — dynamic by audience */}
            <div style={{ marginTop: 20, background: '#f0fdf4', borderRadius: 12, padding: '16px 20px', borderRight: '4px solid #0F3D2E' }}>
              <div style={{ margin: 0, color: '#334155', fontSize: 13, lineHeight: 2, textAlign: 'right', whiteSpace: 'pre-line' }}>
                {summaryText}
              </div>
            </div>

            {/* source footer */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span>مصدر البيانات: بيانات مدخلة من المستخدم · محتسب تلقائياً</span>
              <span>درجة الثقة: {confidence.total}٪ · تاريخ الإصدار: {date}</span>
            </div>
          </div>

          {/* ════════════════════════════════════════
              القسم ٣ — بيانات الأرض والمشروع
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="🏗️">بيانات الأرض والمشروع</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* land data */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>بيانات الأرض</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    <TRow label="مساحة الأرض"      value={landAreaVal > 0 ? `${fN(landAreaVal)} م²` : '—'} />
                    <TRow label="سعر الأرض / م²"   value={landPricePerM2 > 0 ? `${fN(landPricePerM2)} ر.س` : '—'} />
                    <TRow label="إجمالي قيمة الأرض" value={landPricePerM2 > 0 && landAreaVal > 0 ? `${fM(landPricePerM2 * landAreaVal)}` : '—'} bold />
                    <TRow label="الكود التنظيمي"   value={zoningCode} />
                    <TRow label="نوع الاستخدام"    value={usageType} />
                    <TRow label="عرض الشارع"        value={formInput.streetWidth ? `${formInput.streetWidth} م` : '—'} />
                  </tbody>
                </table>
              </div>

              {/* project data */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>بيانات المشروع</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    <TRow label="عدد الطوابق"              value={floors} />
                    <TRow label="نسبة البناء الأرضي"       value={groundCovPct} />
                    <TRow label="إجمالي مساحة البناء"       value={grossBuildAreaVal > 0 ? `${fN(grossBuildAreaVal)} م²` : '—'} />
                    <TRow label="المساحة القابلة للبيع"     value={sellableAreaVal   > 0 ? `${fN(sellableAreaVal)} م²`   : '—'} bold />
                    <TRow label="سعر البيع / م²"           value={sellPricePerM2 > 0 ? `${fN(sellPricePerM2)} ر.س` : '—'} />
                    <TRow label="تكلفة البناء / م²"         value={buildCostPerM2 > 0 ? `${fN(buildCostPerM2)} ر.س` : '—'} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* regulatory summary table */}
            {(zoningCode !== '—' || floors !== '—' || groundCovPct !== '—') && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>الاشتراطات النظامية</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#e2e8f0' }}>
                      {['الكود النظامي', 'عدد الأدوار المسموح', 'نسبة البناء الأرضي', 'الارتداد الأمامي'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F3D2E', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>{zoningCode}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>{floors !== '—' ? `${floors} دور` : '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>{groundCovPct}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        {formInput.streetWidth ? `${Math.max(3, parseFloat(formInput.streetWidth) * 0.15).toFixed(0)} م` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* readiness */}
            <div style={{
              marginTop: 20, borderRadius: 12, padding: '16px 20px',
              background: gate.passed ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${gate.passed ? '#86efac' : '#fca5a5'}`,
            }}>
              <div style={{ fontWeight: 700, color: gate.passed ? '#065f46' : '#991b1b', marginBottom: gate.passed ? 0 : 8 }}>
                {gate.passed ? `✓ جميع المتطلبات مكتملة — جاهز للتقرير الكامل` : `⚠ ${gate.missingFields.length} متطلبات ناقصة — نسبة الاستعداد ${gate.readinessScore}٪`}
              </div>
              {!gate.passed && gate.missingFields.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>• {f}</div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
              القسم ٤ — تحليل السوق
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📊">تحليل السوق والمقارنات</SectionTitle>

            {!showMarket ? (
              <div style={{ background: '#fef2f2', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>تحليل السوق غير متاح</div>
                <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
                  {confidence.total < 60
                    ? `درجة الثقة (${confidence.total}٪) أقل من الحد الأدنى (60٪) لإصدار حكم سعري موثوق.`
                    : 'يتطلب تحليل السوق 3 مشاريع مقارنة على الأقل.'}
                </p>
              </div>
            ) : (
              <>
                {/* summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'أدنى سعر مقارن',    v: `${fN(minPrice)} ر.س`, c: '#dc2626' },
                    { label: 'متوسط سعر السوق',   v: `${fN(avgPrice)} ر.س`, c: '#BA7517' },
                    { label: 'أعلى سعر مقارن',    v: `${fN(maxPrice)} ر.س`, c: '#16a34a' },
                    { label: 'سعر المشروع',       v: `${fN(sellPricePerM2)} ر.س`, c: '#0284c7' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: k.c }}>{k.v}/م²</div>
                    </div>
                  ))}
                </div>

                {/* price range bar */}
                {maxPrice > minPrice && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>نطاق الأسعار في السوق</div>
                    <div style={{ position: 'relative', height: 20, background: '#e2e8f0', borderRadius: 10 }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
                        background: 'linear-gradient(to left, #16a34a, #f59e0b)',
                        borderRadius: 10, opacity: 0.3,
                      }} />
                      <div style={{
                        position: 'absolute', top: -4, height: 28, width: 4,
                        background: '#0284c7', borderRadius: 2,
                        left: `${Math.max(0, Math.min(96, markerPct))}%`,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      <span>{fN(minPrice)}</span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>■ سعر المشروع: {fN(sellPricePerM2)}</span>
                      <span>{fN(maxPrice)}</span>
                    </div>
                  </div>
                )}

                {/* market insight */}
                {insight.signal !== 'blocked' && (
                  <div style={{
                    background: insight.signal === 'reliable' ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${insight.signal === 'reliable' ? '#86efac' : '#fcd34d'}`,
                    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                  }}>
                    <div style={{ fontWeight: 700, color: insight.signal === 'reliable' ? '#065f46' : '#92400e', fontSize: 13 }}>
                      {insight.signal === 'reliable' ? '✓' : '~'} {insight.message}
                    </div>
                    {insight.detail && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{insight.detail}</div>}
                  </div>
                )}

                {/* comparables table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0F3D2E' }}>
                      {['المشروع', 'الموقع', 'السعر ر.س/م²', 'مُباع٪', 'التسليم', 'المصدر'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((c, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{c.name}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{c.location}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0F3D2E', borderBottom: '1px solid #f1f5f9' }}>{fN(c.sellPricePerSqm)}</td>
                        <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>{`${c.soldUnitsPercent}٪`}</td>
                        <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>{`${c.deliveryMonths} ش`}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{SOURCE_LABELS[c.sourceType] ?? c.sourceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                  {comps.length > 0
                    ? `مبني على ${comps.length} مشاريع مقارنة · ${sourceLabel('manual')}`
                    : 'لا توجد بيانات سوق كافية'}
                </div>
              </>
            )}
          </div>

          {/* ════════════════════════════════════════
              القسم ٥ — تحليل الموقع
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📍">تحليل الموقع والكود النظامي</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
              {/* score card */}
              <div style={{ background: locationScore.totalScore >= 70 ? '#f0fdf4' : locationScore.totalScore >= 50 ? '#fffbeb' : '#fef2f2', borderRadius: 14, padding: 24, textAlign: 'center', border: `2px solid ${locationScore.totalScore >= 70 ? '#86efac' : locationScore.totalScore >= 50 ? '#fcd34d' : '#fca5a5'}` }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: locationScore.totalScore >= 70 ? '#065f46' : locationScore.totalScore >= 50 ? '#92400e' : '#991b1b', lineHeight: 1 }}>
                  {locationScore.totalScore}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>من 100</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: '#0F3D2E' }}>{locationScore.grade}</div>
              </div>

              {/* breakdown bars */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>تفاصيل التقييم</div>
                {[
                  { label: 'ملاءمة الكود النظامي', value: locationScore.breakdown.zoningFit },
                  { label: 'الخدمات والمرافق',      value: locationScore.breakdown.amenities },
                  { label: 'البنية التحتية',         value: locationScore.breakdown.infrastructure },
                ].map(b => (
                  <div key={b.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#475569' }}>{b.label}</span>
                      <span style={{ fontWeight: 700 }}>{b.value}٪</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                      <div style={{ height: 6, width: `${b.value}%`, background: '#0F3D2E', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* feature breakdown */}
            {locationScore.featureBreakdown && locationScore.featureBreakdown.length > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                  تفاصيل مزايا الأرض — كود {formInput.zoningCode || formInput.regulatoryCode}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                  {locationScore.featureBreakdown.map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{f.label}</span>
                      <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 3 }}>
                        <div style={{ height: 5, width: `${f.value}%`, background: f.value >= 70 ? '#10b981' : f.value >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', minWidth: 30, textAlign: 'left' }}>{f.value}٪</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>×{f.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* positives & cautions */}
            {(locationScore.positives.length > 0 || locationScore.cautions.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {locationScore.positives.length > 0 && (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 8, fontSize: 13 }}>✓ المزايا</div>
                    {locationScore.positives.map((p, i) => <div key={i} style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>• {p}</div>)}
                  </div>
                )}
                {locationScore.cautions.length > 0 && (
                  <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8, fontSize: 13 }}>⚠ ملاحظات</div>
                    {locationScore.cautions.map((c, i) => <div key={i} style={{ fontSize: 12, color: '#78350f', marginTop: 4 }}>• {c}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* narrative */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', borderRight: '3px solid #0F3D2E' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.9 }}>{locationScore.narrative}</p>
            </div>
          </div>

          {/* ════════════════════════════════════════
              القسم ٦ — التحليل المالي التفصيلي
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="💰">التحليل المالي التفصيلي</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* costs */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>هيكل التكاليف</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    {[
                      { label: 'تكلفة الأرض',       v: costs?.landCost },
                      { label: 'تكلفة البناء',       v: costs?.totalBuildCost ?? costs?.buildCost },
                      { label: 'تكاليف ناعمة',       v: costs?.softCosts },
                      { label: 'احتياطي طوارئ',       v: costs?.contingency },
                      { label: 'تكاليف تمويل بنكي',  v: costs?.financingCost },
                    ].filter(r => r.v && r.v > 0).map((r, i) => (
                      <TRow key={i} label={r.label} value={fM(r.v)} />
                    ))}
                    <TRow label="الإجمالي" value={fM(costs?.totalCost)} bold gold />
                  </tbody>
                </table>
              </div>

              {/* financials */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>المؤشرات المالية</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    <TRow label="إجمالي الإيرادات"        value={fM(fin?.revenue)} bold />
                    <TRow label="إجمالي التكاليف"          value={fM(costs?.totalCost)} />
                    <TRow label="صافي الربح"               value={fM(net)} bold gold />
                    <TRow label="هامش الربح الصافي"         value={fP(margin)} />
                    <TRow label="معدل العائد الداخلي IRR"  value={fP(irr)} bold />
                    <TRow label="العائد على الاستثمار ROI" value={fP(roi)} />
                    <TRow label="صافي القيمة الحالية NPV"  value={fM(npv)} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* visual bars */}
            {costs && fin && (
              <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 16 }}>مقارنة التكاليف والإيرادات</div>
                {(() => {
                  const max = Math.max(costs.totalCost ?? 0, fin.revenue ?? 0) * 1.05;
                  return (
                    <>
                      <BarRow label="إجمالي التكاليف" value={costs.totalCost ?? 0} max={max} color="#ef4444" />
                      <BarRow label="إجمالي الإيرادات" value={fin.revenue ?? 0}   max={max} color="#16a34a" />
                      {(net ?? 0) > 0 && <BarRow label="صافي الربح" value={net ?? 0} max={max} color="#0284c7" />}
                    </>
                  );
                })()}
              </div>
            )}

            {/* decision box */}
            {result?.summary && (
              <div style={{
                marginTop: 20, borderRadius: 12, padding: '16px 20px',
                background: result.summary.isBuy ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${result.summary.isBuy ? '#86efac' : '#fca5a5'}`,
              }}>
                <div style={{ fontWeight: 800, color: result.summary.isBuy ? '#065f46' : '#991b1b', fontSize: 15, marginBottom: 8 }}>
                  {result.summary.isBuy ? '✓ المشروع مجدٍ استثمارياً' : '✗ المشروع غير مجدٍ بالمعطيات الحالية'}
                </div>
                {result.summary.reasons?.map((r: string, i: number) => (
                  <div key={i} style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>• {r}</div>
                ))}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              القسم ٦.٥ — تحليل الديون وهيكل التمويل
          ════════════════════════════════════════ */}
          {debtMetrics && (
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="🏦">تحليل الديون وهيكل التمويل</SectionTitle>

            {/* DSCR hero card */}
            <div style={{
              background: debtMetrics.dscrColor === 'green'  ? '#f0fdf4'  :
                          debtMetrics.dscrColor === 'yellow' ? '#fffbeb'  : '#fef2f2',
              border: `2px solid ${
                debtMetrics.dscrColor === 'green'  ? '#86efac' :
                debtMetrics.dscrColor === 'yellow' ? '#fcd34d' : '#fca5a5'
              }`,
              borderRadius: 16, padding: '24px 28px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 24,
            }}>
              <div style={{ textAlign: 'center', minWidth: 110 }}>
                <div style={{
                  fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: debtMetrics.dscrColor === 'green' ? '#065f46' :
                         debtMetrics.dscrColor === 'yellow' ? '#92400e' : '#991b1b',
                }}>
                  {debtMetrics.dscr.toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>DSCR</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {debtMetrics.dscrColor === 'green'  ? '✓ ممتاز ≥ 1.3'   :
                   debtMetrics.dscrColor === 'yellow' ? '~ مقبول 1.1–1.3' : '✗ دون الحد < 1.1'}
                </div>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>LTV — القرض / القيمة</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7' }}>{debtMetrics.ltv.toFixed(1)}٪</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>LTC — القرض / التكلفة</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{debtMetrics.ltc.toFixed(1)}٪</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>نسبة التمويل البنكي</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0F3D2E' }}>{(bankPctNum * 100).toFixed(0)}٪</div>
                </div>
              </div>
            </div>

            {/* loan summary + creditworthiness */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>ملخص القرض</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    <TRow label="مبلغ القرض"       value={fM(debtMetrics.loanAmount)} bold />
                    <TRow label="القسط الشهري"       value={`${fN(debtMetrics.monthlyPayment, 0)} ر.س`} />
                    <TRow label="إجمالي الفائدة"     value={fM(debtMetrics.totalInterest)} />
                    <TRow label="إجمالي السداد"      value={fM(debtMetrics.totalRepayment)} bold gold />
                    <TRow label="سعر الفائدة السنوي" value={`${annualRate}٪`} />
                    <TRow label="مدة القرض"          value={`${loanDurMonths} شهراً`} />
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>مؤشرات الجدارة الائتمانية</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
                  <tbody>
                    <TRow label="DSCR — نسبة تغطية الدين"   value={debtMetrics.dscr.toFixed(2)} bold />
                    <TRow label="LTV — القرض / القيمة"      value={`${debtMetrics.ltv.toFixed(1)}٪`} />
                    <TRow label="LTC — القرض / التكلفة"     value={`${debtMetrics.ltc.toFixed(1)}٪`} />
                    <TRow label="حقوق الملكية"               value={fM(totalCostGross * (1 - bankPctNum))} />
                    <TRow label="صافي الدخل التشغيلي (NOI)" value={fM(noiBankCalc)} />
                    <TRow label="إجمالي خدمة الدين"         value={fM(debtMetrics.totalRepayment)} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* amortization schedule — first 12 months */}
            {debtMetrics.schedule.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>جدول الإطفاء (أول 12 شهراً)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0F3D2E' }}>
                      {['الشهر', 'القسط', 'الأصل', 'الفائدة', 'الرصيد المتبقي'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debtMetrics.schedule.slice(0, 12).map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>ش {row.month}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{fN(row.payment, 0)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#0284c7' }}>{fN(row.principal, 0)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#dc2626' }}>{fN(row.interest, 0)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0F3D2E' }}>{fM(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {debtMetrics.schedule.length > 12 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    * يعرض الجدول أول 12 شهراً — القرض يمتد {debtMetrics.schedule.length} شهراً إجمالاً
                  </div>
                )}
              </div>
            )}

            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 14 }}>
              * DSCR ≥ 1.3: ممتاز · 1.1–1.3: مقبول · &lt; 1.1: دون الحد البنكي المعتاد | LTV = القرض ÷ القيمة السوقية المتوقعة | LTC = القرض ÷ إجمالي التكلفة
            </div>
          </div>
          )}

          {/* ════════════════════════════════════════
              القسم ٧ — التدفق النقدي الشهري
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📈">التدفق النقدي الشهري</SectionTitle>

            {/* summary KPIs when cashFlowEng available */}
            {cashFlowEng && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'أقصى تمويل مطلوب', v: fM(Math.abs(cashFlowEng.peakNegative)), c: '#dc2626' },
                  { label: 'شهر التعادل',        v: cashFlowEng.breakEvenMonth ? `ش ${cashFlowEng.breakEvenMonth}` : 'لم يُحدَّد', c: '#0284c7' },
                  { label: 'صافي الإيرادات',     v: fM(cashFlowEng.totalInflow - cashFlowEng.totalOutflow), c: '#16a34a' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}

            {(cashFlowEng?.rows?.length ?? 0) > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#0F3D2E' }}>
                        {['الشهر', 'تدفقات داخلة', 'تدفقات خارجة', 'صافي', 'تراكمي'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowEng!.rows.slice(0, 36).map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>ش {row.month}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#16a34a', fontWeight: row.inflow > 0 ? 600 : 400 }}>
                            {row.inflow > 0 ? fM(row.inflow) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', fontWeight: row.outflow > 0 ? 600 : 400 }}>
                            {row.outflow > 0 ? `(${fM(row.outflow)})` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: row.net >= 0 ? '#16a34a' : '#dc2626' }}>
                            {fM(row.net)}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: row.cumulative >= 0 ? '#16a34a' : '#dc2626' }}>
                            {fM(row.cumulative)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cashFlowEng!.rows.length > 36 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    * يعرض الجدول أول 36 شهراً — المشروع يمتد {cashFlowEng!.rows.length} شهراً
                  </div>
                )}
              </>
            ) : monthlyCashflow.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#0F3D2E' }}>
                        {['الشهر', 'المصروفات', 'الإيرادات', 'التراكمي'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyCashflow.slice(0, 36).map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>ش {row.month}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', fontWeight: row.expenses > 0 ? 600 : 400 }}>
                            {row.expenses > 0 ? `(${fM(row.expenses)})` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#16a34a', fontWeight: row.revenue > 0 ? 600 : 400 }}>
                            {row.revenue > 0 ? fM(row.revenue) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: row.cumulative >= 0 ? '#16a34a' : '#dc2626' }}>
                            {fM(row.cumulative)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {monthlyCashflow.length > 36 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    * يعرض الجدول أول 36 شهراً — المشروع يمتد {monthlyCashflow.length} شهراً
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                  التدفق النقدي الشهري التفصيلي غير متوفر — شغّل التحليل المالي أولاً
                </p>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              القسم ٧.٥ — جدول الدفعات والتحصيل
          ════════════════════════════════════════ */}
          {cashFlowAdvanced && (
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📋">جدول الدفعات والتحصيل</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              {/* Payment schedule (outflows) */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                  جدول الدفعات — المدفوعات الخارجة
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0F3D2E' }}>
                      {['الشهر', 'النوع', 'المبلغ'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowAdvanced.paymentSchedule
                      .filter(r => r.amount > 0)
                      .slice(0, 24)
                      .map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>ش {row.month}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20,
                              background: row.type === 'land' ? '#fee2e2' : row.type === 'construction' ? '#dbeafe' : row.type === 'soft' ? '#f3e8ff' : '#fef9c3',
                              color:      row.type === 'land' ? '#991b1b' : row.type === 'construction' ? '#1e40af' : row.type === 'soft' ? '#7c3aed' : '#854d0e',
                            }}>
                              {row.type === 'land' ? 'أرض' : row.type === 'construction' ? 'بناء' : row.type === 'soft' ? 'ناعمة' : 'طوارئ'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#dc2626' }}>
                            {fM(row.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(['land', 'construction', 'soft', 'contingency'] as const).map(type => {
                    const total = cashFlowAdvanced.paymentSchedule.filter(r => r.type === type).reduce((s, r) => s + r.amount, 0);
                    if (!total) return null;
                    const labels = { land: 'الأرض', construction: 'البناء', soft: 'التكاليف الناعمة', contingency: 'الطوارئ' };
                    return (
                      <div key={type} style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: '#64748b' }}>{labels[type]}</span>
                        <span style={{ fontWeight: 700 }}>{fM(total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sales collection schedule (inflows) */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                  جدول التحصيل — المبيعات المتوقعة
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0F3D2E' }}>
                      {['الشهر', 'التحصيل', 'تراكمي'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let cum = 0;
                      return cashFlowAdvanced.salesSchedule
                        .filter(r => r.inflow > 0)
                        .slice(0, 24)
                        .map((row, i) => {
                          cum += row.inflow;
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>ش {row.month}</td>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#16a34a' }}>
                                {fM(row.inflow)}
                              </td>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#0F3D2E' }}>
                                {fM(cum)}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
                <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#475569' }}>إجمالي التحصيل المتوقع</span>
                  <span style={{ fontWeight: 800, color: '#065f46' }}>{fM(cashFlowAdvanced.totalInflow)}</span>
                </div>
                {cashFlowAdvanced.breakEvenMonth && (
                  <div style={{ marginTop: 6, background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#475569' }}>شهر التعادل</span>
                    <span style={{ fontWeight: 800, color: '#0284c7' }}>الشهر {cashFlowAdvanced.breakEvenMonth}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* ════════════════════════════════════════
              القسم ٧.٧ — تأثير التأخير
          ════════════════════════════════════════ */}
          {delayImpact6m && (
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="⏱️">تحليل تأثير التأخير</SectionTitle>

            {/* narrative */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12,
              padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8, fontSize: 14 }}>
                ⚠ في حال تأخر المشروع 6 أشهر عن الجدول الزمني:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'الفائدة الإضافية المتراكمة',   v: fM(delayImpact6m.addedInterest),         c: '#dc2626' },
                  { label: 'تأثير السوق على الإيرادات',    v: fM(delayImpact6m.revenueImpact),         c: '#dc2626' },
                  { label: 'الربح بعد التأخير',             v: fM(delayImpact6m.newProfit),             c: delayImpact6m.newProfit >= 0 ? '#065f46' : '#991b1b' },
                  { label: 'IRR بعد التأخير',               v: `${delayImpact6m.newIRR.toFixed(1)}٪`,  c: delayImpact6m.newIRR >= 15 ? '#065f46' : '#dc2626' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8 }}>
                تأخير 6 أشهر يُضيف <strong>{fM(delayImpact6m.addedInterest)}</strong> في تكاليف التمويل والتشغيل،
                ويُخفّض الإيرادات بنسبة تتراوح بين 2–4٪ بسبب تأثير السوق.
                يتراجع IRR من <strong>{delayImpact6m.baseIRR.toFixed(1)}٪</strong> إلى <strong>{delayImpact6m.newIRR.toFixed(1)}٪</strong>،
                وتتراجع نسبة DSCR من <strong>{delayImpact6m.baseDSCR.toFixed(2)}</strong> إلى <strong>{delayImpact6m.newDSCR.toFixed(2)}</strong>.
              </div>
            </div>

            {/* comparison table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0F3D2E' }}>
                  {['المؤشر', 'السيناريو الأساسي', 'بعد تأخير 6 أشهر', 'الفارق'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'الربح الصافي',         base: fM(delayImpact6m.baseProfit),        after: fM(delayImpact6m.newProfit),         delta: fM(delayImpact6m.profitImpact),        neg: delayImpact6m.profitImpact < 0 },
                  { label: 'IRR',                   base: `${delayImpact6m.baseIRR.toFixed(1)}٪`, after: `${delayImpact6m.newIRR.toFixed(1)}٪`, delta: `${delayImpact6m.irrImpact.toFixed(1)}٪`, neg: delayImpact6m.irrImpact < 0 },
                  { label: 'DSCR',                  base: delayImpact6m.baseDSCR.toFixed(2),   after: delayImpact6m.newDSCR.toFixed(2),    delta: (delayImpact6m.newDSCR - delayImpact6m.baseDSCR).toFixed(2), neg: delayImpact6m.newDSCR < delayImpact6m.baseDSCR },
                  { label: 'التكلفة الإجمالية',     base: fM(delayImpact6m.newTotalCost - delayImpact6m.addedInterest), after: fM(delayImpact6m.newTotalCost), delta: `+${fM(delayImpact6m.addedInterest)}`, neg: true },
                ].map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{r.label}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0F3D2E' }}>{r.base}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: r.neg ? '#dc2626' : '#16a34a' }}>{r.after}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: r.neg ? '#dc2626' : '#16a34a' }}>{r.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
              * تشمل التكاليف الإضافية: فائدة القرض خلال فترة التأخير + تكاليف الموقع والإدارة | تراجع الإيرادات: 2٪ لكل 6 أشهر تأخير
            </div>
          </div>
          )}

          {/* ════════════════════════════════════════
              القسم ٨ — الحساسية والمخاطر
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="⚖️">تحليل الحساسية والمخاطر</SectionTitle>

            {/* ── enhanced 5-scenario bank sensitivity ── */}
            {sensitivityEng && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>تحليل الحساسية الموسّع — 5 سيناريوهات</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0F3D2E' }}>
                      {['السيناريو', 'الإيرادات', 'IRR', 'صافي الربح', 'DSCR', 'التقييم'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityEng.scenarios.map((s, i) => (
                      <tr key={i} style={{
                        background: s.isWorstCase ? '#fef2f2' : i === 0 ? '#f0fdf4' : i % 2 === 0 ? 'white' : '#f8fafc',
                        outline: s.isWorstCase ? '2px solid #fca5a5' : 'none',
                      }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, borderBottom: '1px solid #e2e8f0', color: s.isWorstCase ? '#991b1b' : i === 0 ? '#065f46' : '#334155' }}>
                          {s.isWorstCase && '⚠ '}{s.label}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{fM(s.revenue)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: s.irr >= 15 ? '#16a34a' : s.irr >= 8 ? '#92400e' : '#dc2626' }}>
                          {s.irr.toFixed(1)}٪
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: s.profit >= 0 ? '#0F3D2E' : '#dc2626' }}>
                          {fM(s.profit)}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                          <span style={{
                            background: s.dscrColor === 'green' ? '#d1fae5' : s.dscrColor === 'yellow' ? '#fef9c3' : '#fee2e2',
                            color:      s.dscrColor === 'green' ? '#065f46' : s.dscrColor === 'yellow' ? '#854d0e' : '#991b1b',
                            padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11,
                          }}>
                            {s.dscr.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}>
                          {s.profitPct >= 15 ? '✓ مقبول' : s.profitPct >= 0 ? '~ هامشي' : '✗ خسارة'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  * تأخير 6 أشهر يشمل انخفاض 4٪ في الإيرادات وارتفاع 5٪ في التكاليف | IRR مُحسَّب بطريقة التدفق الزمني المُبسَّطة
                </div>
              </div>
            )}

            {/* sensitivity table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0F3D2E' }}>
                  {['السيناريو', 'صافي الربح', 'هامش الربح', 'التقييم'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', color: 'white', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => (
                  <tr key={i} style={{ background: s.bg }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: s.color, borderBottom: '1px solid #e2e8f0' }}>{s.label}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: s.color, borderBottom: '1px solid #e2e8f0' }}>{fM(s.net)}</td>
                    <td style={{ padding: '12px 16px', color: s.color, borderBottom: '1px solid #e2e8f0' }}>{fP(s.margin)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                      {s.eval}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 28 }}>
              * الحساسية محسوبة على أساس تغيّر صافي الربح خطياً مع الإيرادات ± 20٪ من سعر البيع.
            </div>

            {/* risk table */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>عوامل المخاطرة الرئيسية</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>نوع المخاطرة</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>التأثير</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>الاحتمالية</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { risk: 'تراجع أسعار البيع',      impact: 'عالٍ',    prob: 'متوسط',   action: 'مراقبة السوق وإعادة التسعير' },
                  { risk: 'تأخر البناء',             impact: 'متوسط',   prob: 'مرتفع',   action: 'شروط عقدية صارمة مع المقاول' },
                  { risk: 'ارتفاع تكاليف البناء',    impact: 'متوسط',   prob: 'متوسط',   action: 'تثبيت الأسعار مع الموردين' },
                  { risk: 'تغير أسعار الفائدة',      impact: 'متوسط',   prob: 'منخفض',   action: 'قرض بسعر ثابت أو تحوط' },
                  { risk: 'تغيرات تنظيمية',          impact: 'عالٍ',    prob: 'منخفض',   action: 'مراجعة دورية مع مستشار قانوني' },
                ].map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{r.risk}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        background: r.impact === 'عالٍ' ? '#fee2e2' : '#fef9c3',
                        color: r.impact === 'عالٍ' ? '#991b1b' : '#854d0e',
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>{r.impact}</span>
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        background: r.prob === 'مرتفع' ? '#fee2e2' : r.prob === 'متوسط' ? '#fef9c3' : '#f0fdf4',
                        color: r.prob === 'مرتفع' ? '#991b1b' : r.prob === 'متوسط' ? '#854d0e' : '#065f46',
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>{r.prob}</span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: 11 }}>{r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ════════════════════════════════════════
              القسم ٩ — جودة البيانات ودرجة الثقة
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="🔍">جودة البيانات ودرجة الثقة</SectionTitle>

            {/* 3 confidence dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Coverage',    value: confidence.coverage,    weight: '40٪' },
                { label: 'Quality',     value: confidence.quality,     weight: '35٪' },
                { label: 'Consistency', value: confidence.consistency, weight: '25٪' },
              ].map(dim => (
                <div key={dim.label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#0F3D2E', marginBottom: 4 }}>
                    {Math.round(dim.value * 100)}٪
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{dim.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>وزن: {dim.weight}</div>
                </div>
              ))}
            </div>

            {/* data sources table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['البيان', 'القيمة', 'المصدر'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  { label: 'سعر الأرض/م²',    value: landPricePerM2 > 0 ? `${fN(landPricePerM2)} ر.س` : '—', source: 'manual'  as DataSourceType },
                  { label: 'تكلفة البناء/م²',  value: buildCostPerM2 > 0 ? `${fN(buildCostPerM2)} ر.س` : '—', source: 'manual'  as DataSourceType },
                  { label: 'سعر البيع/م²',     value: sellPricePerM2 > 0 ? `${fN(sellPricePerM2)} ر.س` : '—', source: 'manual'  as DataSourceType },
                  { label: 'IRR',              value: irr    != null ? `${irr.toFixed(1)}٪`    : '—',          source: 'derived' as DataSourceType },
                  { label: 'صافي الربح',        value: net    != null ? fM(net)                : '—',          source: 'derived' as DataSourceType },
                  { label: 'متوسط أسعار السوق', value: avgPrice > 0   ? `${fN(avgPrice)} ر.س/م²` : 'غير متوفر', source: 'market'  as DataSourceType },
                ] as { label: string; value: string; source: DataSourceType }[]).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>{row.label}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{row.value}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <SourceBadge source={row.source} small />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ════════════════════════════════════════
              القسم ٩.٥ — الافتراضات والمنهجية
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📐">الافتراضات والمنهجية الحسابية</SectionTitle>

            {/* key assumptions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>المعاملات المالية المستخدمة</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <TRow label="سعر الفائدة السنوي"    value={`${annualRate}٪ (SAIBOR + هامش)`} />
                    <TRow label="نسبة التمويل البنكي"   value={`${(bankPctNum * 100).toFixed(0)}٪ من إجمالي التكلفة`} />
                    <TRow label="مدة القرض المفترضة"    value={`${loanDurMonths} شهراً`} />
                    <TRow label="فترة السماح"            value={`${Math.round(durationMonths * 0.25)} شهراً (فوائد فقط)`} />
                    <TRow label="التكاليف الناعمة"       value={`${(softCostsPct * 100).toFixed(0)}٪ من تكلفة البناء`} />
                    <TRow label="احتياطي الطوارئ"        value={`${(contPctNum * 100).toFixed(0)}٪ من مجموع التكاليف`} />
                  </tbody>
                </table>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>منهجية التدفق النقدي</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.9 }}>
                  <p style={{ margin: '0 0 8px' }}>• تكلفة الأرض: دفعة واحدة في الشهر الأول</p>
                  <p style={{ margin: '0 0 8px' }}>• تكاليف البناء: موزعة خطياً على مدة المشروع</p>
                  <p style={{ margin: '0 0 8px' }}>• الإيرادات: تبدأ عند ربع مدة المشروع وتمتد 3 أشهر بعد الانتهاء</p>
                  <p style={{ margin: '0 0 8px' }}>• IRR: محسوب باستخدام نموذج التدفق الزمني المُبسَّط (CAGR proxy)</p>
                  <p style={{ margin: 0 }}>• DSCR: صافي الدخل التشغيلي ÷ إجمالي خدمة الدين</p>
                </div>
              </div>
            </div>

            {/* sensitivity methodology */}
            <div style={{ background: '#fffbeb', borderRadius: 12, padding: '16px 18px', border: '1px solid #fcd34d', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>معايير سيناريوهات الحساسية</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {[
                  { s: 'السيناريو الأساسي', d: 'بدون تغيير' },
                  { s: 'انخفاض −10٪',       d: 'تراجع سعر البيع 10٪' },
                  { s: 'انخفاض −20٪',       d: 'تراجع سعر البيع 20٪' },
                  { s: 'ارتفاع تكاليف +10٪', d: 'زيادة إجمالي التكاليف 10٪' },
                  { s: 'تأخير 6 أشهر',      d: 'زيادة 5٪ تكاليف وتراجع 4٪ إيرادات' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 6px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0F3D2E', marginBottom: 4 }}>{item.s}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{item.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* data sources */}
            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '16px 18px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>مصادر البيانات</div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.85 }}>
                {[
                  `أسعار الأرض والبناء: مُدخلة من المستخدم — يُنصح بالتحقق من صفقات مماثلة حديثة`,
                  `${comps.length > 0 ? `بيانات السوق: ${comps.length} مشروع مقارن مُدخَل يدوياً` : 'بيانات السوق: غير متوفرة — يُوصى بإضافة مشاريع مقارنة'}`,
                  `درجة الثقة الإجمالية: ${confidence.total}٪ — ${confidence.grade === 'investment' ? 'تقرير استثماري كامل' : confidence.grade === 'conditional' ? 'تقرير مشروط' : 'تقرير استرشادي'}`,
                  `بيانات السوق العقاري السعودي: مؤشرات 2025 (SAIBOR، معدلات الإيجار، رسوم التسجيل)`,
                ].map((line, i) => (
                  <p key={i} style={{ margin: '0 0 6px' }}>• {line}</p>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              القسم ١٠ — الإفصاحات
          ════════════════════════════════════════ */}
          <div className="page-break avoid-break" style={{ paddingTop: 40 }}>
            <SectionTitle icon="📜">الإفصاحات والتحفظات القانونية</SectionTitle>

            {confidence.grade !== 'investment' && (
              <div style={{
                background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12,
                padding: '16px 20px', marginBottom: 24,
              }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  {confidence.grade === 'conditional' ? '⚠️ تقرير مشروط — صلاحية الاستخدام محدودة' : '⚠️ تقرير استرشادي — للاستخدام الداخلي فقط'}
                </div>
                <p style={{ margin: 0, color: '#78350f', fontSize: 13, lineHeight: 1.8 }}>
                  {confidence.grade === 'conditional'
                    ? 'هذا التقرير مصنّف "مشروط" ويمكن تقديمه للأطراف الخارجية مع إيضاح هذا التحفظ صراحةً. لا يُعدّ مستوفياً لجميع متطلبات الإقراض البنكي الكامل.'
                    : 'هذا التقرير مصنّف "استرشادي" ومُعدٌّ للاستخدام الداخلي فقط. لا يجوز تقديمه للبنوك أو المستثمرين الخارجيين بوصفه دراسة جدوى رسمية.'}
                </p>
              </div>
            )}

            {[
              { t: '١. طبيعة التقرير', b: 'يستند هذا التقرير إلى البيانات المُدخلة من قِبل المستخدم وعمليات حسابية آلية. لا يُمثّل استشارة استثمارية أو قانونية أو مالية معتمدة. يتحمل القارئ مسؤولية التحقق من صحة البيانات قبل اتخاذ أي قرار استثماري.' },
              { t: '٢. محدودية التوقعات', b: 'جميع الأرقام المالية هي توقعات مبنية على افتراضات معينة. الأداء الفعلي قد يختلف اختلافاً جوهرياً نتيجة لتغيرات في السوق أو التشريعات أو ظروف التنفيذ.' },
              { t: '٣. المقارنات السوقية', b: `بيانات المقارنات مُدخلة يدوياً وتعكس مصادر بدرجات ثقة متفاوتة (درجة الثقة الإجمالية: ${confidence.total}٪). لا تتحمل منصة بصيرة مسؤولية دقة هذه البيانات.` },
              { t: '٤. الامتثال النظامي', b: 'يُفترض أن المشروع يستوفي جميع الاشتراطات النظامية. التحقق من التراخيص والأكواد يقع على عاتق المطور والجهات المختصة.' },
              { t: '٥. حقوق الملكية', b: 'هذا التقرير مُولَّد حصرياً عبر منصة بصيرة للذكاء العقاري. جميع الحقوق محفوظة.' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: '#0F3D2E', marginBottom: 6, fontSize: 14 }}>{s.t}</div>
                <p style={{ margin: 0, color: '#475569', fontSize: 13, lineHeight: 1.85 }}>{s.b}</p>
              </div>
            ))}

            {/* signature row */}
            <div style={{
              marginTop: 36, paddingTop: 20, borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>تاريخ الإصدار</div>
                <div style={{ fontWeight: 700, color: '#0A0C12', marginTop: 2 }}>{date}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>المشروع</div>
                <div style={{ fontWeight: 700, color: '#0A0C12', marginTop: 2 }}>{project?.name ?? id}</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>الجهة المُصدِرة</div>
                <div style={{ fontWeight: 700, color: '#BA7517', marginTop: 2 }}>بصيرة — منصة الذكاء العقاري</div>
              </div>
            </div>
          </div>

        </div>{/* /inner padding wrapper */}
      </div>{/* /report-wrap */}
    </div>
  );
}
