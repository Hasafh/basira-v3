/* ── Report Data Builder ──
   All calculations happen here.
   Templates receive ReportData and display only — no further math.
*/

import type { ReportData, ReportScenario, ReportAnnualDSCR, ReportDrawdownStage, ReportStressTest, ReportCapitalCall, ReportMilestone } from './types';
import type { FeasibilityResult } from '../feasibility/types';
import type { RegulationResult }  from '../regulation/types';

const PREFERRED_RETURN  = 0.08;
const INVESTOR_SHARE    = 0.70;
const DEV_SHARE         = 0.30;
const DEFAULT_BANK_RATE = 0.07;

/* ── helpers ── */
const n0 = (v: any, fallback = 0): number => parseFloat(String(v ?? fallback)) || fallback;
const fmtM = (n: number): string => `${(n / 1e6).toFixed(2)} م`;

function buildScenarios(
  revenue: number,
  net: number,
  duration: number,
): ReportScenario[] {
  const costs = revenue - net;
  const build = (mult: number): Omit<ReportScenario, 'label' | 'tag'> => {
    const adjRev  = revenue * mult;
    const adjNet  = adjRev - costs;
    const adjMar  = adjRev > 0 ? (adjNet / adjRev) * 100 : 0;
    const adjIRR  = costs  > 0 ? (adjNet / costs) * (12 / Math.max(1, duration)) * 100 : 0;
    return { irr: adjIRR, margin: adjMar, net: adjNet };
  };
  return [
    { label: 'متفائل (+20٪ سعر البيع)',   tag: '▲', ...build(1.20) },
    { label: 'معتدل (السيناريو الأساسي)', tag: '■', ...build(1.00) },
    { label: 'متشائم (-20٪ سعر البيع)',   tag: '▼', ...build(0.80) },
  ];
}

function buildBankData(
  totalCost: number,
  revenue: number,
  net: number,
  bankPct: number,
  bankRate: number,
  duration: number,
) {
  if (!totalCost || !bankPct) return null;
  const bankAmount   = totalCost * bankPct;
  const monthlyRate  = bankRate / 12;
  const monthlyPayment = bankAmount > 0 && duration > 0
    ? bankAmount * (monthlyRate * Math.pow(1 + monthlyRate, duration)) /
      (Math.pow(1 + monthlyRate, duration) - 1)
    : 0;
  const totalRepayment = monthlyPayment * duration;
  const totalInterest  = totalRepayment - bankAmount;
  const ltv            = revenue > 0  ? (bankAmount / revenue)  * 100 : 0;
  const ltc            = totalCost > 0 ? (bankAmount / totalCost) * 100 : 0;
  const dscr           = totalRepayment > 0 ? net / totalRepayment : null;
  const llcr           = bankAmount  > 0    ? net / bankAmount      : null;

  /* Annual DSCR */
  const years = Math.max(1, Math.ceil(duration / 12));
  const annualDSCR: ReportAnnualDSCR[] = Array.from({ length: years }, (_, yr) => {
    const annualService = monthlyPayment * Math.min(12, duration - yr * 12);
    const annualNet     = net / years;
    return {
      year:        yr + 1,
      debtService: annualService,
      netIncome:   annualNet,
      dscr:        annualService > 0 ? annualNet / annualService : null,
    };
  });

  /* Drawdown schedule */
  const drawdown: ReportDrawdownStage[] = [
    { stage: 'الأساسات والبنية التحتية', pct: 20, amount: bankAmount * 0.20, condition: 'بدء أعمال الحفر والخوازيق',  months: Math.ceil(duration * 0.15) },
    { stage: 'الهيكل الإنشائي (العظم)', pct: 30, amount: bankAmount * 0.30, condition: 'اكتمال الهيكل الخرساني',       months: Math.ceil(duration * 0.35) },
    { stage: 'التشطيبات والتجهيز',       pct: 30, amount: bankAmount * 0.30, condition: 'اكتمال أعمال البناء والمداخل', months: Math.ceil(duration * 0.60) },
    { stage: 'التسليم والإشغال',          pct: 20, amount: bankAmount * 0.20, condition: 'شهادة الإشغال وبدء المبيعات', months: duration },
  ];

  /* Stress tests */
  const stressDelay    = bankAmount * bankRate;
  const stressNetDelay = net - stressDelay;
  const dscrDelay      = totalRepayment > 0 ? stressNetDelay / totalRepayment : null;
  const stressPriceDrop = net * 0.80;
  const dscrPrice       = totalRepayment > 0 ? stressPriceDrop / totalRepayment : null;

  const stressTests: ReportStressTest[] = [
    {
      label:  'السيناريو الأساسي',
      net,
      dscr,
      extra:  0,
      color: '#16a34a', bg: 'rgba(34,197,94,0.07)',   bc: 'rgba(34,197,94,0.30)',
      verdict: '✅ وضع طبيعي',
    },
    {
      label:  'تأخير 12 شهر',
      net:    stressNetDelay,
      dscr:   dscrDelay,
      extra:  stressDelay,
      color: '#d97706', bg: 'rgba(245,158,11,0.07)',  bc: 'rgba(245,158,11,0.30)',
      verdict: '⚠️ قابل للتعامل',
    },
    {
      label:  'انخفاض السعر 20٪',
      net:    stressPriceDrop,
      dscr:   dscrPrice,
      extra:  0,
      color: '#dc2626', bg: 'rgba(239,68,68,0.07)',   bc: 'rgba(239,68,68,0.30)',
      verdict: dscrPrice != null && dscrPrice >= 1.25 ? '✅ يتحمل' : '⚠️ يتطلب ضمانات',
    },
  ];

  /* Success score */
  const successScore = [
    ltc <= 65 ? 30 : ltc <= 70 ? 20 : 10,
    dscr != null && dscr >= 1.5 ? 25 : dscr != null && dscr >= 1.25 ? 18 : 10,
    llcr != null && llcr >= 1.5 ? 20 : llcr != null && llcr >= 1.0 ? 14 : 7,
    (net / Math.max(1, totalCost) * 100) >= 20 ? 15 : (net / Math.max(1, totalCost) * 100) >= 12 ? 10 : 5,
    bankPct <= 0.6 ? 10 : bankPct <= 0.7 ? 7 : 3,
  ].reduce((a, b) => a + b, 0);

  return { bankAmount, bankRate, monthlyPayment, totalRepayment, totalInterest, ltc, ltv, dscr, llcr, successScore, annualDSCR, drawdown, stressTests };
}

function buildInstitutional(
  totalCost: number,
  net: number,
  bankPct: number,
  partnerPct: number,
  duration: number,
) {
  if (!totalCost) return null;
  const devPct           = 1 - partnerPct;
  const equityRequired   = totalCost * (1 - bankPct);
  const partnerEquity    = equityRequired * partnerPct;
  const devEquity        = equityRequired * devPct;
  const durationYears    = duration / 12;
  const preferredReturn  = partnerEquity * PREFERRED_RETURN * durationYears;
  const netAfterPreferred = Math.max(0, net - preferredReturn);
  const partnerSplit     = netAfterPreferred * partnerPct;
  const devSplit         = netAfterPreferred * devPct;
  const partnerTotal     = preferredReturn + partnerSplit;
  const investorIRR      = partnerEquity > 0
    ? ((partnerTotal - partnerEquity) / partnerEquity) * (12 / Math.max(1, duration)) * 100
    : 0;
  const equityMultiple   = partnerEquity > 0 ? partnerTotal / partnerEquity : 0;

  const capitalCalls: ReportCapitalCall[] = [
    { tranche: 'الشريحة الأولى — عند التوقيع',   pct: 30, amount: partnerEquity * 0.30, months: 0,                         condition: 'إبرام عقد الشراكة ونظام الإدارة' },
    { tranche: 'الشريحة الثانية — بداية البناء', pct: 40, amount: partnerEquity * 0.40, months: Math.ceil(duration * 0.2),  condition: 'الحصول على رخصة البناء' },
    { tranche: 'الشريحة الثالثة — منتصف البناء', pct: 30, amount: partnerEquity * 0.30, months: Math.ceil(duration * 0.5),  condition: 'اكتمال 50٪ من الإنشاء' },
  ];

  return { partnerPct, devPct, partnerEquity, devEquity, preferredReturn, netAfterPreferred, partnerSplit, devSplit, partnerTotal, investorIRR, equityMultiple, capitalCalls };
}

function buildIndividual(
  totalCost: number,
  net: number,
  bankPct: number,
  duration: number,
  sellableArea: number,
  landPricePerM2: number,
  sellPricePerM2: number,
  maxLandPerM2: number | null,
) {
  if (!totalCost) return null;
  const equityRequired = totalCost * (1 - bankPct);
  const investorEquity = equityRequired * INVESTOR_SHARE;
  const devEquity      = equityRequired * DEV_SHARE;
  const investorProfit = net * INVESTOR_SHARE;
  const investorTotal  = investorEquity + investorProfit;
  const investorIRR    = investorEquity > 0
    ? (investorProfit / investorEquity) * (12 / Math.max(1, duration)) * 100
    : 0;
  const equityMultiple  = investorEquity > 0 ? investorTotal / investorEquity : 0;
  const breakEvenPerM2  = sellableArea > 0 ? totalCost / sellableArea : 0;
  const safetyMarginPct = maxLandPerM2 != null && landPricePerM2 > 0
    ? ((maxLandPerM2 - landPricePerM2) / maxLandPerM2) * 100
    : null;
  const priceAboveBE    = breakEvenPerM2 > 0 && sellPricePerM2 > 0
    ? ((sellPricePerM2 - breakEvenPerM2) / breakEvenPerM2) * 100
    : null;

  const milestones: ReportMilestone[] = [
    { label: 'بداية المشروع',           month: 0,                           icon: '🚀', money: '' },
    { label: 'استدعاء رأس المال',        month: Math.ceil(duration * 0.05),  icon: '💼', money: `−${fmtM(investorEquity)}` },
    { label: 'بدء الأعمال الإنشائية',   month: Math.ceil(duration * 0.15),  icon: '🏗', money: '' },
    { label: 'منتصف البناء',            month: Math.ceil(duration * 0.5),   icon: '⚙️', money: '' },
    { label: 'اكتمال البناء',           month: Math.ceil(duration * 0.8),   icon: '✅', money: '' },
    { label: 'توزيع العوائد',           month: Math.ceil(duration),          icon: '💰', money: `+${fmtM(investorTotal)}` },
  ];

  return { investorEquity, devEquity, investorProfit, investorTotal, investorIRR, equityMultiple, breakEvenPerM2, safetyMarginPct, priceAboveBE, milestones };
}

/* ═══════════════════════════════════════
   Main builder — entry point
═══════════════════════════════════════ */
export function buildReportData(
  project: any,
  feasibilityResult?: FeasibilityResult | null,
  regulationResult?: RegulationResult | null,
  sessionFormInput?: Record<string, any> | null,
): ReportData {
  // Support both flat { areas, costs, financials } and nested { feasibility: { ... } } formats
  const _raw: any = feasibilityResult ?? project?.result ?? null;
  const fr: FeasibilityResult | null = _raw?.financials != null
    ? (_raw as FeasibilityResult)
    : ((_raw?.feasibility as FeasibilityResult | null) ?? null);

  // sessionFormInput (from analysisStore) overrides project.input for current session values
  // (e.g. bankPct may be set in the form but not yet saved in project.input on the server)
  const inp = { ...(project?.input ?? {}), ...(sessionFormInput ?? {}) };

  /* Input snapshot */
  const landArea             = n0(fr?.areas?.landArea            ?? inp.landArea);
  const landPricePerM2       = n0(inp.landPricePerM2);
  const sellPricePerM2       = n0(inp.sellPricePerM2);
  const buildCostPerM2       = n0(inp.buildCostPerM2, 2000);
  const floors               = n0(inp.floors, 3);
  const basementFloors       = n0(inp.basementFloors, 0);
  const gcr                  = n0(fr?.areas?.groundCoverageRatio ?? inp.groundCoverageRatio ?? inp.gcr, 0.6);
  const zoningCode           = String(inp.zoningCode ?? '—');
  const landType             = String(inp.landType   ?? '—');
  const usageType            = String(inp.usageType  ?? '—');
  const streetWidth          = n0(inp.streetWidth,  20);
  const projectDurationMonths = n0(inp.projectDurationMonths, 24);
  // Priority: live sessionFormInput.bankPct (DryPowderTab current value)
  //         → _raw._inputs.bankPct (stored at analysis time)
  //         → inp.bankPct (project.input fallback)
  const bankPct = n0(sessionFormInput?.bankPct ?? _raw?._inputs?.bankPct ?? inp.bankPct, 0);
  const bankRate             = n0(inp.bankInterestRate, DEFAULT_BANK_RATE * 100) / 100 || DEFAULT_BANK_RATE;
  const softCostsPct         = n0(inp.softCostsPct, 0.05);
  const contingencyPct       = n0(inp.contingencyPct, 0.05);
  const partnerPct           = n0(inp.partnerPct, 0.3);

  /* Engine outputs */
  const areas = fr?.areas ? {
    landArea:       fr.areas.landArea,
    grossBuildArea: fr.areas.grossBuildArea,
    sellableArea:   fr.areas.sellableArea,
    gcr:            fr.areas.groundCoverageRatio,
    estimatedUnits: fr.areas.sellableArea > 0 ? Math.round(fr.areas.sellableArea / 150) : 0,
  } : null;

  const costs = fr?.costs ? {
    landCost:     fr.costs.landCost,
    buildCost:    fr.costs.totalBuildCost ?? (fr.costs as any).buildCost,
    softCosts:    fr.costs.softCosts,
    contingency:  fr.costs.contingency,
    financingCost: fr.costs.financingCost,
    totalCost:    fr.costs.totalCost,
  } : null;

  const financials = fr?.financials ? {
    revenue:       fr.financials.revenue,
    net:           fr.financials.net,
    margin:        fr.financials.margin,
    roi:           fr.financials.roi,
    irr:           fr.financials.irr,
    npv:           fr.financials.npv,
    paybackMonths: fr.financials.paybackMonths,
  } : null;

  const maxLandPerM2 = fr?.rlv?.maxLandPerM2 ?? null;
  const rlv = fr?.rlv && maxLandPerM2 != null ? {
    maxLandPerM2,
    safetyMarginPct: maxLandPerM2 > 0 && landPricePerM2 > 0
      ? ((maxLandPerM2 - landPricePerM2) / maxLandPerM2) * 100
      : 0,
  } : null;

  // Normalize summary to guarantee reasons[] always exists (API may omit it)
  const rawSummary = fr?.summary ?? null;
  const summary = rawSummary
    ? { ...rawSummary, reasons: rawSummary.reasons ?? [] }
    : null;

  /* Pre-computed for templates */
  const scenarios: ReportData['scenarios'] = financials
    ? buildScenarios(financials.revenue, financials.net, projectDurationMonths)
    : [];

  const bank = financials && costs
    ? buildBankData(costs.totalCost, financials.revenue, financials.net, bankPct, bankRate, projectDurationMonths)
    : null;

  const institutional = costs && financials
    ? buildInstitutional(costs.totalCost, financials.net, bankPct, partnerPct, projectDurationMonths)
    : null;

  const individual = costs && financials
    ? buildIndividual(
        costs.totalCost,
        financials.net,
        bankPct,
        projectDurationMonths,
        areas?.sellableArea ?? 0,
        landPricePerM2,
        sellPricePerM2,
        maxLandPerM2,
      )
    : null;

  /* Regulation — explicit arg > stored in analysis result > null
     checkRegulation() returns { isCompliant, violations, ... } (simple compliance)
     applyRegulationCode() / API returns a proper RegulationResult with code.code, classification, etc.
     Only use _raw.regulation if it's the proper RegulationResult shape (has code.code). */
  const rawReg: any = _raw?.regulation ?? null;
  const rr: RegulationResult | null =
    regulationResult ??
    (rawReg?.code?.code != null ? (rawReg as RegulationResult) : null);
  const regulation = rr ? {
    codeLabel:          `${rr.code.code} — ${rr.code.nameAr}`,
    allowedUses:        rr.code.allowedUses ?? [],
    maxFloors:          rr.code.maxFloors,
    gcr:                rr.code.groundCoverageGround,
    setbacks:           rr.appliedSetbacks,
    classification:     rr.classification.type,
    effectiveBuildArea: rr.effectiveBuildArea,
    isValid:            rr.isValid,
    warnings:           rr.warnings ?? [],
    errors:             rr.errors ?? [],
  } : null;

  return {
    projectName:     project?.name     ?? '—',
    projectLocation: project?.location ?? '—',
    date: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    input: {
      landArea, landPricePerM2, sellPricePerM2, buildCostPerM2,
      floors, basementFloors, gcr, zoningCode, landType, usageType,
      streetWidth, projectDurationMonths, bankPct, bankRate,
      softCostsPct, contingencyPct, partnerPct,
    },
    areas,
    costs,
    financials,
    rlv,
    summary,
    scenarios,
    bank,
    institutional,
    individual,
    regulation,
  };
}
