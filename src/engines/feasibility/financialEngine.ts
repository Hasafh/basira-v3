import type { FeasibilityInput, FeasibilityResult, RevenueResult } from './types';
import { DEFAULT_BASEMENT_PARAMS } from './types';
import { calculateAreas }          from './areaCalculator';
import { calculateCosts, RETT_RATE } from './costCalculator';
import {
  calculateRevenue,
  calculateRevenueFromMix,
  enrichUnitMix,
}                                  from './revenueCalculator';

const HURDLE_RATE = 0.08; // 8% annual — corporate hurdle for NPV

/* ══════════════════════════════════════════════════════════════════
   IRR — Newton-Raphson on the full monthly cash flow timeline.
   Returns annualised IRR (%).
   Returns NaN if it fails to converge (caller falls back to approx).
══════════════════════════════════════════════════════════════════ */
export function irrFromCashFlows(cashFlows: number[], maxIter = 300): number {
  if (cashFlows.length < 2) return NaN;

  // Sanity: must have at least one negative and one positive entry
  const hasNeg = cashFlows.some(v => v < 0);
  const hasPos = cashFlows.some(v => v > 0);
  if (!hasNeg || !hasPos) return NaN;

  const npv = (r: number) =>
    cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);

  const dnpv = (r: number) =>
    cashFlows.reduce((sum, cf, t) => sum - t * cf / Math.pow(1 + r, t + 1), 0);

  let r = 0.01; // initial guess: 1% per period (monthly)
  for (let i = 0; i < maxIter; i++) {
    const fVal = npv(r);
    const dVal = dnpv(r);
    if (Math.abs(dVal) < 1e-12) break;
    const rNew = r - fVal / dVal;
    if (!isFinite(rNew) || rNew <= -1) break;
    if (Math.abs(rNew - r) < 1e-8) {
      r = rNew;
      break;
    }
    r = rNew;
  }

  if (!isFinite(r) || r <= -1) return NaN;

  // Monthly → annualised
  const annualised = (Math.pow(1 + r, 12) - 1) * 100;
  // Sanity cap: > 500% annualised is almost certainly a data error
  return Math.abs(annualised) > 500 ? NaN : annualised;
}

/* ══════════════════════════════════════════════════════════════════
   APPROXIMATE IRR — CAGR-based.
   Kept ONLY for the Quick Scanner (dashboard) where speed > precision.
   MUST NOT be used in runFeasibility or any report.
══════════════════════════════════════════════════════════════════ */
export function irrApprox(net: number, totalCost: number, durationMonths: number): number {
  if (totalCost <= 0) return 0;
  const years = Math.max(durationMonths, 1) / 12;
  return (Math.pow(1 + net / totalCost, 1 / years) - 1) * 100;
}

/* ══════════════════════════════════════════════════════════════════
   calculateFinancials — used by Quick Scanner ONLY.
   Uses irrApprox — labelled 'approximate' in the output.
══════════════════════════════════════════════════════════════════ */
export function calculateFinancials(
  revenue: number,
  totalCost: number,
  durationMonths: number,
): RevenueResult {
  const net     = revenue - totalCost;
  const margin  = revenue > 0 ? (net / revenue) * 100 : 0;
  const roi     = totalCost > 0 ? (net / totalCost) * 100 : 0;
  const years   = Math.max(durationMonths, 1) / 12;
  const irr     = irrApprox(net, totalCost, durationMonths);
  const npv     = net / Math.pow(1 + HURDLE_RATE, years);
  const paybackMonths = revenue > 0 && net > 0
    ? Math.round((totalCost / revenue) * durationMonths)
    : durationMonths;

  return { revenue, revenueMethod: 'blended-price', net, margin, roi, irr, irrMethod: 'approximate', npv, paybackMonths };
}

/* ══════════════════════════════════════════════════════════════════
   calculateRLV — Residual Land Value.
   Formula (margin-on-revenue basis):
     maxLandBudget = revenue × (1 − profitTargetPct) − constructionExclLand
══════════════════════════════════════════════════════════════════ */
export function calculateRLV(
  revenue: number,
  constructionCostExclLand: number,
  landArea: number,
  profitTargetPct: number,
): { maxLandBudget: number; maxLandPerM2: number } {
  const maxLandBudget = Math.max(
    0,
    revenue * (1 - profitTargetPct) - constructionCostExclLand,
  );
  const maxLandPerM2 = landArea > 0 ? Math.round(maxLandBudget / landArea) : 0;
  return { maxLandBudget, maxLandPerM2 };
}

/** Backward-compat alias */
export function calculateBNM(
  totalCost: number,
  sellableArea: number,
  sellPricePerM2: number,
  targetMarginPct = 20,
): number {
  const revenue = sellableArea * sellPricePerM2;
  return calculateRLV(revenue, totalCost, sellableArea, targetMarginPct / 100).maxLandPerM2;
}

/* ══════════════════════════════════════════════════════════════════
   buildCashFlowTimeline
   Month 0  = land purchase (large negative outflow)
   Months 1 → cEnd: construction + basement outflows (S-curve)
   Months sStart → end: revenue inflows (linear, unit-based if available)
══════════════════════════════════════════════════════════════════ */
export function buildCashFlowTimeline(
  landCost: number,
  constructionCost: number,
  revenue: number,
  durationMonths: number,
): number[] {
  const months = Math.max(12, Math.min(durationMonths, 60));
  const cEnd   = Math.round(months * 0.65);
  const sStart = cEnd + 1;

  // S-curve weights for construction outflows
  const weights = Array.from({ length: cEnd }, (_, i) =>
    Math.sin(((i + 1) / cEnd) * Math.PI),
  );
  const wTotal = weights.reduce((a, b) => a + b, 0) || 1;

  const cf: number[] = [-landCost]; // month 0 — land purchase

  for (let m = 1; m <= months; m++) {
    const cWeight     = m <= cEnd ? weights[m - 1] : 0;
    const monthlyCost = cWeight > 0 ? -(constructionCost * cWeight) / wTotal : 0;
    const salesMonths = months - sStart + 1;
    const monthlyRev  = m >= sStart ? revenue / Math.max(salesMonths, 1) : 0;
    cf.push(monthlyCost + monthlyRev);
  }

  return cf;
}

/* ══════════════════════════════════════════════════════════════════
   runFeasibility — main orchestrator (v2)
   Produces a complete FeasibilityResult with:
     • Separated above-ground / basement area & cost centres
     • Unit-based revenue when unitMix is provided
     • Exact IRR from Newton-Raphson on monthly cash flow
     • Saudi compliance checks
══════════════════════════════════════════════════════════════════ */
export function runFeasibility(input: FeasibilityInput): FeasibilityResult {
  const gcr            = input.groundCoverageRatio ?? input.gcr ?? 0.6;
  const servicesRatio  = input.servicesRatio ?? 0.15;
  const basementFloors = input.basementFloors ?? 0;
  const durationYears  = input.projectDurationMonths / 12;
  const profitTarget   = input.profitTarget ?? 0.25;

  /* ── 1. Enrich unit mix (ensure parkingSpotsRequired is computed) ── */
  const enrichedMix = input.unitMix && input.unitMix.length > 0
    ? enrichUnitMix(input.unitMix)
    : undefined;

  /* ── 2. Areas ── */
  const areas = calculateAreas(
    input.landArea,
    input.floors,
    gcr,
    servicesRatio,
    basementFloors,
    enrichedMix,
  );

  /* ── 3. Revenue ── */
  let revenue: number;
  let mixSummary = null;
  let revenueMethod: 'unit-mix' | 'blended-price' = 'blended-price';

  if (enrichedMix && enrichedMix.length > 0) {
    const mixResult = calculateRevenueFromMix(enrichedMix);
    // Use override only if provided; otherwise derive from unit mix
    const effectiveSellable = input.manualNetSellableArea ?? mixResult.totalSellableArea;
    if (effectiveSellable !== mixResult.totalSellableArea) {
      // Proportionally scale unit revenues if manual override was set
      const scale   = effectiveSellable / mixResult.totalSellableArea;
      revenue       = mixResult.totalRevenue * scale;
    } else {
      revenue = mixResult.totalRevenue;
    }
    mixSummary      = mixResult;
    revenueMethod   = 'unit-mix';
  } else if (input.operationMode === 'rent' && input.sellPricePerM2) {
    const rentYield    = input.rentYield ?? 0.07;
    const annualRent   = areas.sellableArea * input.sellPricePerM2 * rentYield;
    revenue            = annualRent * durationYears;
    revenueMethod      = 'blended-price';
  } else {
    const effectiveSellable = input.manualNetSellableArea ?? areas.sellableArea;
    revenue = calculateRevenue(effectiveSellable, input.sellPricePerM2 ?? 0);
    revenueMethod = 'blended-price';
  }

  /* ── 4. Costs ── */
  const costs = calculateCosts(
    input.landArea,
    input.landPricePerM2,
    areas.aboveGroundGFA,
    areas.basementGFA,
    input.buildCostPerM2,
    input.softCostsPct,
    input.contingencyPct,
    input.bankPct,
    input.interestRate,
    durationYears,
    input.basementParams ? { ...DEFAULT_BASEMENT_PARAMS, ...input.basementParams } : undefined,
    input.agentCommissionPct ?? 0.02,
    input.marketingBudgetPct ?? 0.01,
    RETT_RATE,
    input.loanDelayPenaltyPct ?? 0,
    revenue,
  );

  /* ── 5. Cash flow timeline ── */
  const constructionCost = costs.totalCost - costs.landCost;
  const cashFlow = buildCashFlowTimeline(
    costs.landCost,
    constructionCost,
    revenue,
    input.projectDurationMonths,
  );

  /* ── 6. Financials — use exact IRR from cash flow ── */
  const net    = revenue - costs.totalCost;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;
  const roi    = costs.totalCost > 0 ? (net / costs.totalCost) * 100 : 0;
  const years  = Math.max(input.projectDurationMonths, 1) / 12;

  const exactIRR = irrFromCashFlows(cashFlow);
  const irr      = isFinite(exactIRR) ? exactIRR : irrApprox(net, costs.totalCost, input.projectDurationMonths);
  const irrMethod: 'exact' | 'approximate' = isFinite(exactIRR) ? 'exact' : 'approximate';

  // NPV from discounted monthly cash flows (8% annual hurdle rate)
  const monthlyRate = Math.pow(1 + HURDLE_RATE, 1 / 12) - 1;
  const npvFromCF   = cashFlow.reduce((sum, cf, t) => sum + cf / Math.pow(1 + monthlyRate, t), 0);
  const npv         = isFinite(npvFromCF) && cashFlow.length > 1
    ? npvFromCF
    : net / Math.pow(1 + HURDLE_RATE, years);
  const paybackMonths = revenue > 0 && net > 0
    ? Math.round((costs.totalCost / revenue) * input.projectDurationMonths)
    : input.projectDurationMonths;

  const financials: RevenueResult = {
    revenue,
    revenueMethod,
    net,
    margin,
    roi,
    irr,
    irrMethod,
    npv,
    paybackMonths,
  };

  /* ── 7. RLV ── */
  const constructionExclLand = costs.totalBuildCost + costs.softCosts + costs.contingency;
  const rlv = calculateRLV(revenue, constructionExclLand, input.landArea, profitTarget);

  /* ── 8. Compliance ── */
  const compliance = runComplianceChecks(areas, input, costs, revenue);

  /* ── 9. Decision summary ── */
  const isBuy   = margin >= profitTarget * 100;
  const reasons: string[] = [];

  if (irr > 20)        reasons.push(`IRR ممتاز: ${irr.toFixed(1)}٪`);
  else if (irr > 15)   reasons.push(`IRR جيد: ${irr.toFixed(1)}٪`);
  else if (irr > 10)   reasons.push(`IRR مقبول: ${irr.toFixed(1)}٪`);
  else                 reasons.push(`IRR ضعيف: ${irr.toFixed(1)}٪`);

  if (npv > 0)  reasons.push('NPV موجب — المشروع يتجاوز تكلفة الفرصة');
  else          reasons.push('NPV سالب — لا يغطي تكلفة الفرصة');

  if (margin < profitTarget * 100)
    reasons.push(`هامش ${margin.toFixed(1)}٪ أقل من الهدف ${(profitTarget * 100).toFixed(0)}٪`);

  if (input.landPricePerM2 > rlv.maxLandPerM2)
    reasons.push(`سعر الأرض ${input.landPricePerM2.toLocaleString()} يتجاوز RLV ${rlv.maxLandPerM2.toLocaleString()}`);

  if (areas.parkingDeficit > 0)
    reasons.push(`عجز ${areas.parkingDeficit} موقف — يستلزم حلاً (طابق إضافي أو سطح)`);

  /* ── 10. Input warnings ── */
  const inputWarnings = buildInputWarnings(input, financials);

  return {
    areas,
    costs,
    financials,
    unitMix: mixSummary,
    compliance,
    rlv,
    summary: {
      isBuy,
      decision: isBuy
        ? `✅ الصفقة مجدية — هامش ${margin.toFixed(1)}٪ ≥ ${(profitTarget * 100).toFixed(0)}٪`
        : `❌ الصفقة غير مجدية — هامش ${margin.toFixed(1)}٪ < ${(profitTarget * 100).toFixed(0)}٪`,
      reasons,
    },
    cashFlow,
    inputWarnings,
  };
}

/* ══════════════════════════════════════════════════════════════════
   Saudi Development Compliance Engine
══════════════════════════════════════════════════════════════════ */
function runComplianceChecks(
  areas: ReturnType<typeof calculateAreas>,
  input: FeasibilityInput,
  costs: ReturnType<typeof calculateCosts>,
  revenue: number,
) {
  const { ComplianceResult } = {} as any; void ComplianceResult;
  type Check = import('./types').ComplianceCheck;
  type Status = import('./types').ComplianceStatus;

  const checks: Check[] = [];
  const add = (
    id: string,
    label: string,
    status: Status,
    detail: string,
    value?: string,
    threshold?: string,
  ) => checks.push({ id, label, status, detail, value, threshold });

  /* ── Parking compliance ── */
  if (areas.parkingDeficit === 0) {
    add('parking', 'امتثال المواقف',
      'pass',
      `الطلب (${areas.parkingDemandSpots} موقف) مغطى من القبو (${areas.parkingSupplySpots} موقف)`,
      `${areas.parkingDemandSpots}`,
      `${areas.parkingSupplySpots}`,
    );
  } else if (areas.basementGFA === 0 && areas.parkingDemandSpots > 0) {
    add('parking', 'امتثال المواقف',
      'fail',
      `لا يوجد قبو — لا تتوفر مواقف (مطلوب ${areas.parkingDemandSpots} موقف). يجب إضافة قبو أو حل بديل.`,
      '0',
      `${areas.parkingDemandSpots}`,
    );
  } else {
    add('parking', 'امتثال المواقف',
      'warning',
      `عجز ${areas.parkingDeficit} موقف. القبو يسع ${areas.parkingSupplySpots}، المطلوب ${areas.parkingDemandSpots}.`,
      `${areas.parkingSupplySpots}`,
      `${areas.parkingDemandSpots}`,
    );
  }

  /* ── FAR utilisation ── */
  const far      = areas.aboveGroundGFA / Math.max(input.landArea, 1);
  const gcr      = input.groundCoverageRatio ?? input.gcr ?? 0.6;
  const maxFAR   = gcr * input.floors;
  const farUtilPct = maxFAR > 0 ? (far / maxFAR) * 100 : 0;
  if (farUtilPct >= 95) {
    add('far', 'استغلال معامل البناء (FAR)', 'pass',
      `استغلال ${farUtilPct.toFixed(0)}٪ من الطاقة النظامية`, `${far.toFixed(2)}`, `${maxFAR.toFixed(2)}`);
  } else if (farUtilPct >= 80) {
    add('far', 'استغلال معامل البناء (FAR)', 'warning',
      `استغلال ${farUtilPct.toFixed(0)}٪ — هناك فرصة لزيادة الكثافة`, `${far.toFixed(2)}`, `${maxFAR.toFixed(2)}`);
  } else {
    add('far', 'استغلال معامل البناء (FAR)', 'warning',
      `استغلال ${farUtilPct.toFixed(0)}٪ فقط — المشروع يستخدم أقل من 80٪ من الطاقة المسموحة`, `${far.toFixed(2)}`, `${maxFAR.toFixed(2)}`);
  }

  /* ── Unit size feasibility (when unit mix provided) ── */
  if (input.unitMix && input.unitMix.length > 0) {
    const UNIT_SIZE_RANGES: Record<string, { min: number; max: number }> = {
      'استوديو': { min: 35, max: 70 },
      '1BR':     { min: 55, max: 100 },
      '2BR':     { min: 85, max: 150 },
      '3BR':     { min: 130, max: 220 },
      '4BR':     { min: 175, max: 350 },
      'مخصص':   { min: 20, max: 500 },
    };
    const outOfRange = input.unitMix.filter(u => {
      const range = UNIT_SIZE_RANGES[u.category] ?? { min: 20, max: 500 };
      return u.avgAreaM2 < range.min || u.avgAreaM2 > range.max;
    });
    if (outOfRange.length === 0) {
      add('unitSizes', 'مساحات الوحدات', 'pass',
        'جميع مساحات الوحدات ضمن معايير التصميم السكني السعودي');
    } else {
      const names = outOfRange.map(u => `${u.category} (${u.avgAreaM2}م²)`).join('، ');
      add('unitSizes', 'مساحات الوحدات', 'warning',
        `وحدات خارج النطاق المعتاد: ${names}`);
    }
  }

  /* ── Density realism ── */
  if (input.unitMix && input.unitMix.length > 0) {
    const totalUnits = input.unitMix.reduce((s, u) => s + u.count, 0);
    const unitsPerHa = totalUnits / (input.landArea / 10_000);
    if (unitsPerHa <= 600) {
      add('density', 'كثافة المشروع', 'pass',
        `${totalUnits} وحدة على ${input.landArea.toLocaleString()} م² — كثافة واقعية`);
    } else {
      add('density', 'كثافة المشروع', 'warning',
        `كثافة مرتفعة (${Math.round(unitsPerHa)} وحدة/هكتار) — راجع قابلية التصميم`);
    }
  }

  /* ── Cost realism ── */
  const costPerSellableM2 = areas.sellableArea > 0
    ? costs.totalCost / areas.sellableArea
    : 0;
  if (costPerSellableM2 > 0 && costPerSellableM2 < 500) {
    add('costRealism', 'واقعية التكلفة', 'warning',
      `تكلفة منخفضة جداً: ${costPerSellableM2.toFixed(0)} ر.س/م² — راجع مدخلات التكلفة`);
  } else if (costPerSellableM2 > 20_000) {
    add('costRealism', 'واقعية التكلفة', 'warning',
      `تكلفة مرتفعة جداً: ${costPerSellableM2.toFixed(0)} ر.س/م² — راجع مدخلات التكلفة`);
  } else if (costPerSellableM2 > 0) {
    add('costRealism', 'واقعية التكلفة', 'pass',
      `تكلفة كلية ${costPerSellableM2.toFixed(0)} ر.س/م² مبيعي — ضمن النطاق المعتاد`);
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const overallStatus: import('./types').ComplianceStatus =
    failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';

  return { overallStatus, checks, passCount, warnCount, failCount };
}

/* ══════════════════════════════════════════════════════════════════
   Input Warnings
══════════════════════════════════════════════════════════════════ */
function buildInputWarnings(input: FeasibilityInput, fin: RevenueResult): string[] {
  const w: string[] = [];
  const p = input.landPricePerM2;
  const s = input.sellPricePerM2 ?? 0;
  const b = input.buildCostPerM2;

  if (p < 100)   w.push(`سعر الأرض ${p} ر.س/م² منخفض جداً — هل هو صحيح؟`);
  if (p > 40_000) w.push(`سعر الأرض ${p.toLocaleString()} ر.س/م² مرتفع جداً — تحقق من الرقم`);
  if (s < 800)   w.push(`سعر البيع ${s} ر.س/م² أقل من الحد الأدنى المعتاد`);
  if (s > 40_000) w.push(`سعر البيع ${s.toLocaleString()} ر.س/م² مرتفع جداً — تحقق من الرقم`);
  if (b < 800)   w.push(`تكلفة البناء ${b} ر.س/م² منخفضة جداً — الحد الأدنى الواقعي ~1,200`);
  if (b > 8_000) w.push(`تكلفة البناء ${b.toLocaleString()} ر.س/م² مرتفعة جداً`);
  if (s > 0 && p > 0 && s / p > 8)
    w.push(`نسبة البيع/الأرض = ${(s / p).toFixed(1)}× — غير مألوفة في السوق السعودي`);
  if (fin.irr > 150)
    w.push(`معدل العائد الداخلي ${fin.irr.toFixed(0)}٪ غير واقعي — راجع المدخلات`);

  return w;
}
