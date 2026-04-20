// ── Debt Engine ───────────────────────────────────────────────
// Calculates loan schedule, DSCR, LTV, LTC.
// No dependency on any existing engine — standalone.

export interface LoanParams {
  totalProjectCost:   number;   // for LTC
  estimatedEndValue:  number;   // sellableArea × sellPricePerM² (for LTV)
  netOperatingIncome: number;   // revenue − operating costs (excl. financing)
  bankPct:            number;   // 0–1 fraction financed by bank
  annualInterestRate: number;   // % e.g. 7.0
  loanDurationMonths: number;   // e.g. 24
  gracePeriodMonths?: number;   // months of interest-only at start
}

export interface LoanScheduleRow {
  month:     number;
  payment:   number;  // total monthly payment
  principal: number;
  interest:  number;
  balance:   number;  // outstanding principal
}

export interface DebtMetrics {
  loanAmount:       number;
  monthlyPayment:   number;
  totalInterest:    number;
  totalRepayment:   number;
  ltv:              number;   // Loan-to-Value %
  ltc:              number;   // Loan-to-Cost %
  dscr:             number;   // overall project DSCR
  dscrColor:        'green' | 'yellow' | 'red';
  schedule:         LoanScheduleRow[];
}

// ── PMT formula (standard amortization) ──────────────────────

function pmt(principal: number, monthlyRate: number, n: number): number {
  if (monthlyRate === 0) return principal / n;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n));
}

// ── Main function ─────────────────────────────────────────────

export function calculateDebtMetrics(params: LoanParams): DebtMetrics {
  const {
    totalProjectCost,
    estimatedEndValue,
    netOperatingIncome,
    bankPct,
    annualInterestRate,
    loanDurationMonths,
    gracePeriodMonths = 0,
  } = params;

  const loanAmount   = totalProjectCost * Math.max(0, Math.min(1, bankPct));
  const monthlyRate  = annualInterestRate / 100 / 12;
  const repayMonths  = Math.max(1, loanDurationMonths - gracePeriodMonths);
  const monthly      = loanAmount > 0 ? pmt(loanAmount, monthlyRate, repayMonths) : 0;
  const totalRepay   = monthly * repayMonths + loanAmount * monthlyRate * gracePeriodMonths;
  const totalInterest = totalRepay - loanAmount;

  // Amortization schedule
  const schedule: LoanScheduleRow[] = [];
  let balance = loanAmount;

  for (let m = 1; m <= loanDurationMonths; m++) {
    const interestAmt = balance * monthlyRate;
    const isGrace     = m <= gracePeriodMonths;
    const payment     = isGrace ? interestAmt : monthly;
    const principalAmt = isGrace ? 0 : payment - interestAmt;
    balance = Math.max(0, balance - principalAmt);
    schedule.push({ month: m, payment, principal: principalAmt, interest: interestAmt, balance });
  }

  // DSCR = Net Operating Income / Total Debt Service
  const totalDebtService = Math.max(1, totalRepay);
  const dscr = netOperatingIncome > 0 && totalDebtService > 0
    ? netOperatingIncome / totalDebtService
    : 0;

  const dscrColor: DebtMetrics['dscrColor'] =
    dscr >= 1.3  ? 'green'  :
    dscr >= 1.1  ? 'yellow' :
    'red';

  const ltv = estimatedEndValue > 0 ? (loanAmount / estimatedEndValue) * 100 : 0;
  const ltc = totalProjectCost  > 0 ? (loanAmount / totalProjectCost)  * 100 : 0;

  return {
    loanAmount,
    monthlyPayment: monthly,
    totalInterest:  Math.max(0, totalInterest),
    totalRepayment: Math.max(0, totalRepay),
    ltv,
    ltc,
    dscr,
    dscrColor,
    schedule,
  };
}

// ── Monthly DSCR Analysis ─────────────────────────────────────
// Combines the cash flow (sales inflows) with the loan schedule
// to produce a per-month DSCR time-series and a summary.
//
// For a development project:
//   monthly DSCR = monthly_sales_inflow / monthly_loan_payment
//
// During construction (no sales, grace period) DSCR is near 0 —
// this is expected; summary stats exclude months with no payment.

export interface MonthlyDscrRow {
  month:       number;
  salesInflow: number;   // revenue collected this month
  debtService: number;   // loan payment (principal + interest)
  dscr:        number;   // salesInflow / debtService  (0 if no payment due)
  balance:     number;   // outstanding loan after this payment
}

export interface DscrSummary {
  avgDscr:       number;   // average over repayment months only
  minDscr:       number;   // lowest monthly DSCR during repayment
  monthsAbove1:  number;   // repayment months where DSCR ≥ 1
  monthsBelow1:  number;   // repayment months where DSCR < 1
  monthlyDscr:   MonthlyDscrRow[];
}

/**
 * @param cashFlowRows  Output from generateAdvancedCashFlow / generateMonthlyCashFlow
 * @param loanSchedule  Output from calculateDebtMetrics().schedule
 * @param loanMonthOffset  Add to loan schedule month to align with cash flow months (default 0)
 */
export function calculateMonthlyDscr(
  cashFlowRows:    { month: number; inflow: number }[],
  loanSchedule:    LoanScheduleRow[],
  loanMonthOffset = 0,
): DscrSummary {
  // Build a lookup: cashflow month → loan schedule row
  const loanMap = new Map<number, LoanScheduleRow>();
  for (const row of loanSchedule) {
    loanMap.set(row.month + loanMonthOffset, row);
  }

  const monthlyDscr: MonthlyDscrRow[] = [];

  for (const cf of cashFlowRows) {
    const loan        = loanMap.get(cf.month);
    const debtService = loan?.payment  ?? 0;
    const balance     = loan?.balance  ?? 0;
    const dscr        = debtService > 0 ? cf.inflow / debtService : 0;

    monthlyDscr.push({
      month:       cf.month,
      salesInflow: cf.inflow,
      debtService,
      dscr,
      balance,
    });
  }

  // Summary: only over months where the bank expects a payment
  const repayRows  = monthlyDscr.filter(r => r.debtService > 0);
  const dscrValues = repayRows.map(r => r.dscr);

  return {
    avgDscr:      dscrValues.length ? dscrValues.reduce((a, b) => a + b, 0) / dscrValues.length : 0,
    minDscr:      dscrValues.length ? Math.min(...dscrValues) : 0,
    monthsAbove1: dscrValues.filter(d => d >= 1).length,
    monthsBelow1: dscrValues.filter(d => d > 0 && d < 1).length,
    monthlyDscr,
  };
}
