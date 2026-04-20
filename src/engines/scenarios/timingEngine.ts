import type { TimeSensitivityRow, TimingRow, DelayRow } from './types';

/* ── buildTimingRows (kept for backward compat) ── */
export function buildTimingRows(
  baseCost: number,
  baseRevenue: number,
  baseMonths: number,
  monthlyCostIncrease = 0.005,    // 0.5% per month
  monthlyRevenueDecrease = 0.003, // 0.3% per month
): TimeSensitivityRow[] {
  const delays = [0, 3, 6, 9, 12, 18, 24];
  return delays.map(delay => {
    const totalMonths = baseMonths + delay;
    const totalCost   = baseCost    * Math.pow(1 + monthlyCostIncrease,    delay);
    const revenue     = baseRevenue * Math.pow(1 - monthlyRevenueDecrease, delay);
    const net         = revenue - totalCost;
    const years       = Math.max(totalMonths, 1) / 12;
    const irr         = totalCost > 0
      ? (Math.pow(1 + net / totalCost, 1 / years) - 1) * 100
      : 0;
    const status: TimeSensitivityRow['status'] = irr >= 15 ? 'safe' : irr >= 8 ? 'warn' : 'danger';
    return { delay, totalCost, revenue, net, irr, status };
  });
}

/* ── runTimingRows — duration sensitivity (varies project length) ── */
/**
 * For each project duration in `durations`, compute IRR and net profit
 * given a fixed base net (no additional bank interest already included)
 * plus marginal bank interest for the extra months beyond month 0.
 *
 * Matches the local fallback logic in TimeSensitivityPage.
 *
 * @param totalCost           Total project cost (SAR)
 * @param baseNet             Net profit at base conditions (SAR)
 * @param baseRevenue         Total revenue (SAR)
 * @param bankAmount          Loan principal (SAR)
 * @param bankInterestRatePct Annual interest rate, e.g. 7
 * @param durations           Array of durations to test (months)
 */
export function runTimingRows(
  totalCost: number,
  baseNet: number,
  baseRevenue: number,
  bankAmount: number,
  bankInterestRatePct: number,
  durations: number[],
): TimingRow[] {
  const rate = bankInterestRatePct / 100;
  return durations.map(months => {
    const bankInterest = bankAmount * rate * (months / 12);
    const adjNet       = baseNet - bankInterest;
    const irr          = (totalCost > 0 && months > 0)
      ? (adjNet / totalCost) * (12 / months) * 100
      : 0;
    const margin       = baseRevenue > 0 ? (adjNet / baseRevenue) * 100 : 0;
    return { months, adjNet, irr, margin, bankInterest };
  });
}

/* ── runDelayRows — delay tolerance analysis ── */
/**
 * For each delay in `delayMonths`, compute the incremental financing cost,
 * adjusted net profit, IRR, and DSCR.
 *
 * Matches the inline `delayRows` logic in TimeSensitivityPage.
 *
 * @param baseNet             Net profit at zero delay (SAR)
 * @param totalCost           Total project cost (SAR)
 * @param bankAmount          Loan principal (SAR)
 * @param bankInterestRatePct Annual interest rate, e.g. 7
 * @param baseMonths          Base project duration (months)
 * @param delayMonths         Array of delay values to test (months)
 */
/* ── Amortization helper ── */
function amortTotalInterest(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12; // monthly rate
  if (r === 0) return 0;
  const n = months;
  const monthlyPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return monthlyPayment * n - principal;
}

export function runDelayRows(
  baseNet: number,
  totalCost: number,
  bankAmount: number,
  bankInterestRatePct: number,
  baseMonths: number,
  delayMonths: number[],
): DelayRow[] {
  // Base interest with no delay
  const baseInterest = amortTotalInterest(bankAmount, bankInterestRatePct, baseMonths);

  return delayMonths.map(delayM => {
    const totMo       = Math.max(1, baseMonths + delayM);
    // Total interest with delay (delay extends loan period from project end date)
    const totalInterest = amortTotalInterest(bankAmount, bankInterestRatePct, totMo);
    const addCost       = Math.max(0, totalInterest - baseInterest);
    const adjNet        = baseNet - addCost;
    const irr           = totalCost > 0
      ? (adjNet / totalCost) * (12 / totMo) * 100
      : 0;
    const totalDebt = bankAmount + totalInterest;
    const dscr      = totalDebt > 0 ? adjNet / totalDebt : null;
    const status: DelayRow['status'] = dscr === null ? 'safe'
      : dscr >= 1.25 ? 'safe'
      : dscr >= 1.0  ? 'warn'
      : 'danger';
    return { delayM, addCost, adjNet, irr, dscr, status };
  });
}
