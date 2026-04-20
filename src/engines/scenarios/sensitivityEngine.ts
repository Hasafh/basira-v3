import type {
  SensitivityVar, Scenario,
  SensitivityMatrixResult,
  StressTestResult,
} from './types';

/* ── Default price elasticity of IRR with respect to each input ── */
const DEFAULT_ELASTICITY: Record<string, number> = {
  sellPricePerM2:  1.2,    // +1% sell price → +1.2% IRR
  buildCostPerM2: -0.6,    // +1% build cost → -0.6% IRR
  landPricePerM2: -0.4,    // +1% land price → -0.4% IRR
};

/* ── buildSensitivityVars (kept for backward compat) ── */
export function buildSensitivityVars(
  baseNet: number,
  totalCost: number,
): SensitivityVar[] {
  return [
    { name: 'سعر البيع',    low: baseNet * 0.6,  base: baseNet, high: baseNet * 1.4,  impact: Math.abs(baseNet * 0.4  / totalCost * 100) },
    { name: 'تكلفة البناء', low: baseNet * 1.2,  base: baseNet, high: baseNet * 0.7,  impact: Math.abs(baseNet * 0.3  / totalCost * 100) },
    { name: 'سعر الفائدة',  low: baseNet * 1.05, base: baseNet, high: baseNet * 0.9,  impact: Math.abs(baseNet * 0.15 / totalCost * 100) },
    { name: 'مدة البيع',    low: baseNet * 1.1,  base: baseNet, high: baseNet * 0.8,  impact: Math.abs(baseNet * 0.1  / totalCost * 100) },
  ];
}

/* ── buildScenarios (kept for backward compat) ── */
export function buildScenarios(
  baseRevenue: number,
  totalCost: number,
  durationMonths: number,
): Scenario[] {
  const make = (label: string, priceMult: number, costMult: number): Scenario => {
    const adjRevenue = baseRevenue * priceMult;
    const adjCost    = totalCost   * costMult;
    const net        = adjRevenue - adjCost;
    const margin     = adjRevenue > 0 ? (net / adjRevenue) * 100 : 0;
    const years      = Math.max(durationMonths, 1) / 12;
    const irr        = adjCost > 0
      ? (Math.pow(1 + net / adjCost, 1 / years) - 1) * 100
      : 0;
    return { label, priceMultiplier: priceMult, costMultiplier: costMult, net, irr, margin };
  };

  return [
    make('متشائم (−20٪ سعر)',  0.8, 1.0),
    make('أساسي',               1.0, 1.0),
    make('متفائل (+20٪ سعر)',   1.2, 1.0),
  ];
}

/* ── buildSensitivityMatrix ── */
/**
 * Build a full sensitivity matrix using linear elasticity.
 * For each input key, each variation percentage is applied and
 * IRR / margin / net are approximated.
 *
 * @param baseIRR     IRR of the base scenario (%)
 * @param baseMargin  Net margin of the base scenario (%)
 * @param baseNet     Net profit of the base scenario (SAR)
 * @param variations  Array of % changes, e.g. [-20, -15, -10, -5, 0, 5, 10, 15, 20]
 * @param keys        Array of input field names to test
 * @param elasticity  Optional override of elasticity per key
 */
export function buildSensitivityMatrix(
  baseIRR: number,
  baseMargin: number,
  baseNet: number,
  variations: number[],
  keys: string[],
  elasticity: Record<string, number> = {},
): SensitivityMatrixResult {
  const elas = { ...DEFAULT_ELASTICITY, ...elasticity };

  const matrix: SensitivityMatrixResult['matrix'] = {};

  for (const key of keys) {
    const f = elas[key] ?? 1.0;
    matrix[key] = variations.map(pct => {
      const adjIRR    = baseIRR    + (pct * f * baseIRR    / 100);
      const adjMargin = baseMargin + (pct * f * baseMargin / 100);
      const adjNet    = baseNet    + (pct * f * baseNet    / 100);
      return { pct, irr: Math.max(adjIRR, -99), margin: adjMargin, net: adjNet };
    });
  }

  return { matrix, baseIRR, baseMargin, isApproximate: true };
}

/* ── runStressTest ── */
/**
 * Generate price-drop and delay-impact scenario tables.
 *
 * @param baseRevenue         Total revenue at base price (SAR)
 * @param totalCost           Total project cost (SAR)
 * @param baseNet             Base net profit = revenue - cost (SAR)
 * @param sellPricePerM2      Base sell price (SAR/m²)
 * @param nla                 Net lettable / sellable area (m²)
 * @param durationMonths      Base project duration (months)
 * @param bankAmount          Loan principal (SAR)
 * @param bankInterestRatePct Annual interest rate, e.g. 7 for 7%
 */
export function runStressTest(
  baseRevenue: number,
  totalCost: number,
  baseNet: number,
  sellPricePerM2: number,
  nla: number,
  durationMonths: number,
  bankAmount: number,
  bankInterestRatePct: number,
): StressTestResult {
  const rate = bankInterestRatePct / 100;

  // Break-even sell price: minimum price that covers all costs
  const breakEvenPricePerM2 = nla > 0 ? Math.round(totalCost / nla) : 0;
  const priceDropTolerance  = sellPricePerM2 > 0
    ? Math.max(0, ((sellPricePerM2 - breakEvenPricePerM2) / sellPricePerM2) * 100)
    : 0;

  const years = Math.max(durationMonths, 1) / 12;

  const priceDropScenarios = [5, 10, 15, 20, 25, 30].map(dropPct => {
    const adjRevenue = baseRevenue * (1 - dropPct / 100);
    const adjNet     = adjRevenue - totalCost;
    const adjMargin  = adjRevenue > 0 ? (adjNet / adjRevenue) * 100 : 0;
    const adjIRR     = totalCost  > 0
      ? (Math.pow(1 + adjNet / totalCost, 1 / years) - 1) * 100
      : 0;
    return { dropPct, adjRevenue, adjNet, adjMargin, adjIRR };
  });

  const delayScenarios = [3, 6, 9, 12, 18, 24].map(delayMonths => {
    const additionalCost = bankAmount * rate * (delayMonths / 12);
    const adjustedNet    = baseNet - additionalCost;
    const adjustedMargin = baseRevenue > 0 ? (adjustedNet / baseRevenue) * 100 : 0;
    return { delayMonths, additionalCost, adjustedNet, adjustedMargin };
  });

  return { breakEvenPricePerM2, priceDropTolerance, priceDropScenarios, delayScenarios };
}
