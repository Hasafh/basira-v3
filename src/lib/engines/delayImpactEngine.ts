// ── Delay Impact Engine ───────────────────────────────────────
// Simulates the financial effect of project delays.
// No dependency on any existing engine — standalone.

import { calculateDebtMetrics } from './debtEngine';

export interface DelayImpactInput {
  // project
  totalProjectCost:   number;
  totalRevenue:       number;
  durationMonths:     number;
  // financing
  bankPct:            number;   // 0–1
  annualInterestRate: number;   // % e.g. 6.0
  loanDurationMonths: number;
  gracePeriodMonths?: number;
}

export interface DelayImpactResult {
  monthsDelay:      number;
  // IRR
  baseIRR:          number;
  newIRR:           number;
  irrImpact:        number;   // newIRR − baseIRR (negative = worse)
  // Profit
  baseProfit:       number;
  newProfit:        number;
  profitImpact:     number;
  // DSCR
  baseDSCR:         number;
  newDSCR:          number;
  // Cost breakdown
  addedInterest:    number;   // extra interest from loan extension
  revenueImpact:    number;   // market-softening revenue reduction
  newTotalCost:     number;
  newRevenue:       number;
}

// ── IRR approximation (same formula as sensitivityEngine) ─────
function approxIRR(profit: number, totalCost: number, durationMonths: number): number {
  if (totalCost <= 0 || durationMonths <= 0) return 0;
  const ratio = (totalCost + profit) / totalCost;
  if (ratio <= 0) return -100;
  return (Math.pow(ratio, 1 / (durationMonths / 12)) - 1) * 100;
}

// ── Main function ─────────────────────────────────────────────

export function simulateDelay(
  params: DelayImpactInput,
  monthsDelay: number,
): DelayImpactResult {
  const {
    totalProjectCost,
    totalRevenue,
    durationMonths,
    bankPct,
    annualInterestRate,
    loanDurationMonths,
    gracePeriodMonths = 0,
  } = params;

  const loanAmount  = totalProjectCost * Math.max(0, Math.min(1, bankPct));
  const monthlyRate = annualInterestRate / 100 / 12;

  // ── Base metrics ──────────────────────────────────────────
  const baseProfit = totalRevenue - totalProjectCost;
  const baseIRR    = approxIRR(baseProfit, totalProjectCost, durationMonths);

  const baseNOI  = Math.max(0, totalRevenue - totalProjectCost * 0.85);
  const baseDebt = calculateDebtMetrics({
    totalProjectCost,
    estimatedEndValue:  totalRevenue,
    netOperatingIncome: baseNOI,
    bankPct,
    annualInterestRate,
    loanDurationMonths,
    gracePeriodMonths,
  });

  // ── Delay effects ─────────────────────────────────────────
  // 1. Market softening: 2% revenue reduction per 6 months of delay, max 10%
  const softeningRate = Math.min(0.10, (monthsDelay / 6) * 0.02);
  const newRevenue    = totalRevenue * (1 - softeningRate);

  // 2. Extra interest accruing on outstanding loan during delay period
  const addedInterest = loanAmount * monthlyRate * monthsDelay;

  // 3. Carrying costs increase (management, site, financing)
  const addedCarrying = totalProjectCost * 0.005 * monthsDelay; // 0.5% / month carrying cost

  const newTotalCost    = totalProjectCost + addedInterest + addedCarrying;
  const newDurationMonths = durationMonths + monthsDelay;
  const newLoanDuration   = loanDurationMonths + monthsDelay;
  const newGracePeriod    = gracePeriodMonths + Math.round(monthsDelay * 0.5);

  const newProfit = newRevenue - newTotalCost;
  const newIRR    = approxIRR(newProfit, newTotalCost, newDurationMonths);

  const newNOI  = Math.max(0, newRevenue - newTotalCost * 0.85);
  const newDebt = calculateDebtMetrics({
    totalProjectCost:   newTotalCost,
    estimatedEndValue:  newRevenue,
    netOperatingIncome: newNOI,
    bankPct,
    annualInterestRate,
    loanDurationMonths: newLoanDuration,
    gracePeriodMonths:  newGracePeriod,
  });

  return {
    monthsDelay,
    baseIRR,
    newIRR,
    irrImpact:     newIRR - baseIRR,
    baseProfit,
    newProfit,
    profitImpact:  newProfit - baseProfit,
    baseDSCR:      baseDebt.dscr,
    newDSCR:       newDebt.dscr,
    addedInterest: addedInterest + addedCarrying,
    revenueImpact: newRevenue - totalRevenue,
    newTotalCost,
    newRevenue,
  };
}

// ── Multi-delay comparison ────────────────────────────────────
// Simulates several delay lengths for comparison table.

export function runDelayScenarios(
  params: DelayImpactInput,
  delayMonths: number[] = [3, 6, 9, 12],
): DelayImpactResult[] {
  return delayMonths.map(d => simulateDelay(params, d));
}
