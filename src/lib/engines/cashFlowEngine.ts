// ── Cash Flow Engine ─────────────────────────────────────────
// Generates monthly inflow/outflow from project parameters.
// No dependency on any existing engine — standalone.

export interface CashFlowInput {
  landCost:       number;   // total land cost (area × price/m²)
  buildCost:      number;   // total construction cost
  softCostsPct:   number;   // 0–1
  contingencyPct: number;   // 0–1
  totalRevenue:   number;   // sellableArea × sellPricePerM²
  durationMonths: number;   // project construction months
  // Loan parameters (optional — used to split equity vs bank disbursement)
  bankPct?:         number; // 0–1
  loanStartMonth?:  number; // when bank starts disbursing (1-based)
  loanTranches?:    number; // equal tranches over construction phase
}

export interface CashFlowRow {
  month:      number;
  inflow:     number;  // revenue collected this month
  outflow:    number;  // costs paid this month (positive number)
  net:        number;  // inflow − outflow
  cumulative: number;  // running sum of net
}

export interface CashFlowResult {
  rows:            CashFlowRow[];
  peakNegative:    number;   // worst cumulative (max equity needed)
  breakEvenMonth:  number | null; // first month cumulative ≥ 0
  totalInflow:     number;
  totalOutflow:    number;
}

// ── Main function ─────────────────────────────────────────────

export function generateMonthlyCashFlow(input: CashFlowInput): CashFlowResult {
  const {
    landCost,
    buildCost,
    softCostsPct,
    contingencyPct,
    totalRevenue,
    durationMonths,
  } = input;

  const n       = Math.max(1, Math.round(durationMonths));
  const softC   = buildCost * softCostsPct;
  const contC   = (buildCost + softC) * contingencyPct;

  // Construction spread: linear over all n months
  const buildPerMonth = (buildCost + softC + contC) / n;

  // Revenue spread: starts at month 3, linear to end + 3 months sell-out
  const revenueStart = Math.max(3, Math.round(n * 0.25));
  const revenueEnd   = n + 3;
  const revenueMonths = revenueEnd - revenueStart + 1;
  const revenuePerMonth = totalRevenue / revenueMonths;

  const totalMonths = revenueEnd;
  const rows: CashFlowRow[] = [];
  let cumulative = 0;
  let peakNeg    = 0;
  let breakEven: number | null = null;

  for (let m = 1; m <= totalMonths; m++) {
    // outflow
    let outflow = 0;
    if (m === 1)  outflow += landCost;          // land: lump sum month 1
    if (m <= n)   outflow += buildPerMonth;      // construction: months 1..n

    // inflow
    let inflow = 0;
    if (m >= revenueStart && m <= revenueEnd) inflow = revenuePerMonth;

    const net = inflow - outflow;
    cumulative += net;

    if (cumulative < peakNeg) peakNeg = cumulative;
    if (breakEven === null && cumulative >= 0 && m > 1) breakEven = m;

    rows.push({ month: m, inflow, outflow, net, cumulative });
  }

  return {
    rows,
    peakNegative:   peakNeg,
    breakEvenMonth: breakEven,
    totalInflow:    rows.reduce((s, r) => s + r.inflow,  0),
    totalOutflow:   rows.reduce((s, r) => s + r.outflow, 0),
  };
}

// ── Advanced Cash Flow ────────────────────────────────────────
// Adds per-type payment schedule (10/30/60 construction split)
// and a buyer sales collection schedule.

export interface PaymentScheduleRow {
  month:  number;
  type:   'land' | 'construction' | 'soft' | 'contingency';
  amount: number;
}

export interface SalesScheduleRow {
  month:  number;
  inflow: number;
}

export interface AdvancedCashFlowInput {
  durationMonths:   number;
  landCost:         number;
  buildCost:        number;
  softCostsPct:     number;   // 0–1
  contingencyPct:   number;   // 0–1
  totalRevenue:     number;
  salesStartMonth?: number;   // default: max(3, round(n×0.25))
  customPaymentSchedule?: PaymentScheduleRow[];
  customSalesSchedule?:   SalesScheduleRow[];
}

export interface AdvancedCashFlowResult {
  paymentSchedule:  PaymentScheduleRow[];
  salesSchedule:    SalesScheduleRow[];
  rows:             CashFlowRow[];
  peakNegative:     number;   // worst cumulative (equity funding gap)
  peakFundingMonth: number;   // month of peak negative cumulative
  breakEvenMonth:   number | null;
  totalInflow:      number;
  totalOutflow:     number;
}

// ── Payment schedule builder (10/30/60 construction split) ───

function buildDefaultPaymentSchedule(
  n: number,
  landCost: number,
  buildCost: number,
  softCostsPct: number,
  contingencyPct: number,
): PaymentScheduleRow[] {
  const softC = buildCost * softCostsPct;
  const contC = (buildCost + softC) * contingencyPct;
  const rows: PaymentScheduleRow[] = [];

  // Land: lump sum month 1
  if (landCost > 0) rows.push({ month: 1, type: 'land', amount: landCost });

  // Construction cost: 10% mobilization | 30% execution | 60% completion
  const mobEndMonth  = Math.min(2, n);
  const execEndMonth = Math.max(mobEndMonth + 1, Math.round(n * 0.70));

  const mobMonths   = mobEndMonth;
  const execMonths  = Math.max(1, execEndMonth - mobEndMonth);
  const complMonths = Math.max(1, n - execEndMonth);

  for (let m = 1; m <= mobEndMonth; m++) {
    rows.push({ month: m, type: 'construction', amount: (buildCost * 0.10) / mobMonths });
  }
  for (let m = mobEndMonth + 1; m <= execEndMonth; m++) {
    rows.push({ month: m, type: 'construction', amount: (buildCost * 0.30) / execMonths });
  }
  for (let m = execEndMonth + 1; m <= n; m++) {
    rows.push({ month: m, type: 'construction', amount: (buildCost * 0.60) / complMonths });
  }

  // Soft costs and contingency: spread linearly over construction
  const softPerMonth = n > 0 ? softC / n : 0;
  const contPerMonth = n > 0 ? contC / n : 0;
  for (let m = 1; m <= n; m++) {
    if (softPerMonth > 0) rows.push({ month: m, type: 'soft',        amount: softPerMonth });
    if (contPerMonth > 0) rows.push({ month: m, type: 'contingency', amount: contPerMonth });
  }

  return rows;
}

// ── Sales collection schedule ─────────────────────────────────

function buildDefaultSalesSchedule(
  n: number,
  totalRevenue: number,
  salesStartMonth: number,
): SalesScheduleRow[] {
  const salesEnd    = n + 3;
  const salesMonths = Math.max(1, salesEnd - salesStartMonth + 1);
  const rows: SalesScheduleRow[] = [];
  for (let m = salesStartMonth; m <= salesEnd; m++) {
    rows.push({ month: m, inflow: totalRevenue / salesMonths });
  }
  return rows;
}

// ── Main advanced function ────────────────────────────────────

export function generateAdvancedCashFlow(input: AdvancedCashFlowInput): AdvancedCashFlowResult {
  const n             = Math.max(1, Math.round(input.durationMonths));
  const salesStartM   = input.salesStartMonth ?? Math.max(3, Math.round(n * 0.25));

  const paymentSchedule = input.customPaymentSchedule
    ?? buildDefaultPaymentSchedule(n, input.landCost, input.buildCost, input.softCostsPct, input.contingencyPct);

  const salesSchedule = input.customSalesSchedule
    ?? buildDefaultSalesSchedule(n, input.totalRevenue, salesStartM);

  // Collapse into per-month maps
  const outflowMap = new Map<number, number>();
  const inflowMap  = new Map<number, number>();

  for (const p of paymentSchedule) {
    outflowMap.set(p.month, (outflowMap.get(p.month) ?? 0) + p.amount);
  }
  for (const s of salesSchedule) {
    inflowMap.set(s.month, (inflowMap.get(s.month) ?? 0) + s.inflow);
  }

  const lastMonth = Math.max(
    ...[...outflowMap.keys()],
    ...[...inflowMap.keys()],
    1,
  );

  const rows: CashFlowRow[] = [];
  let cumulative      = 0;
  let peakNeg         = 0;
  let peakFundingMonth = 1;
  let breakEven: number | null = null;

  for (let m = 1; m <= lastMonth; m++) {
    const outflow = outflowMap.get(m) ?? 0;
    const inflow  = inflowMap.get(m)  ?? 0;
    const net     = inflow - outflow;
    cumulative   += net;

    if (cumulative < peakNeg) {
      peakNeg          = cumulative;
      peakFundingMonth = m;
    }
    if (breakEven === null && cumulative >= 0 && m > 1) breakEven = m;

    rows.push({ month: m, inflow, outflow, net, cumulative });
  }

  return {
    paymentSchedule,
    salesSchedule,
    rows,
    peakNegative:    peakNeg,
    peakFundingMonth,
    breakEvenMonth:  breakEven,
    totalInflow:     salesSchedule.reduce((s, r) => s + r.inflow,  0),
    totalOutflow:    paymentSchedule.reduce((s, r) => s + r.amount, 0),
  };
}
