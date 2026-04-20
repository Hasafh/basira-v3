/* ── Report engine types ──
   All data is pre-computed in reportDataBuilder.
   Templates read ONLY from ReportData — no calculations allowed.
*/

export interface ReportScenario {
  label: string;
  tag:   string;       // ▲ ■ ▼
  irr:   number;
  margin: number;
  net:   number;
}

export interface ReportAnnualDSCR {
  year:       number;
  debtService: number;
  netIncome:  number;
  dscr:       number | null;
}

export interface ReportDrawdownStage {
  stage:     string;
  pct:       number;
  amount:    number;
  condition: string;
  months:    number;
}

export interface ReportStressTest {
  label:  string;
  net:    number;
  dscr:   number | null;
  extra:  number;
  color:  string;
  bg:     string;
  bc:     string;
  verdict: string;
}

export interface ReportCapitalCall {
  tranche:   string;
  pct:       number;
  amount:    number;
  months:    number;
  condition: string;
}

export interface ReportMilestone {
  label: string;
  month: number;
  icon:  string;
  money: string;  // e.g. "−12.3 م" or "+28.0 م" or ""
}

export interface ReportData {
  /* ── Meta ── */
  projectName:     string;
  projectLocation: string;
  date:            string;

  /* ── Input snapshot (for display, no calculation) ── */
  input: {
    landArea:             number;
    landPricePerM2:       number;
    sellPricePerM2:       number;
    buildCostPerM2:       number;
    floors:               number;
    basementFloors:       number;
    gcr:                  number;
    zoningCode:           string;
    landType:             string;
    usageType:            string;
    streetWidth:          number;
    projectDurationMonths: number;
    bankPct:              number;
    bankRate:             number;   // annual decimal e.g. 0.07
    softCostsPct:         number;
    contingencyPct:       number;
    partnerPct:           number;   // institutional partner share
  };

  /* ── Engine outputs (null if no analysis run) ── */
  areas: {
    landArea:        number;
    grossBuildArea:  number;
    sellableArea:    number;
    gcr:             number;
    estimatedUnits:  number;
  } | null;

  costs: {
    landCost:     number;
    buildCost:    number;
    softCosts:    number;
    contingency:  number;
    financingCost: number;
    totalCost:    number;
  } | null;

  financials: {
    revenue:       number;
    net:           number;
    margin:        number;
    roi:           number;
    irr:           number;
    npv:           number;
    paybackMonths: number;
  } | null;

  rlv: {
    maxLandPerM2:   number;
    safetyMarginPct: number;  // pre-computed: (max - current) / max * 100
  } | null;

  summary: {
    isBuy:    boolean;
    decision: string;
    reasons:  string[];
  } | null;

  /* ── Pre-computed for FeasibilityReport ── */
  scenarios: ReportScenario[];

  /* ── Pre-computed for BankReport ── */
  bank: {
    bankAmount:      number;
    bankRate:        number;
    monthlyPayment:  number;
    totalRepayment:  number;
    totalInterest:   number;
    ltc:             number;
    ltv:             number;
    dscr:            number | null;
    llcr:            number | null;
    successScore:    number;
    annualDSCR:      ReportAnnualDSCR[];
    drawdown:        ReportDrawdownStage[];
    stressTests:     ReportStressTest[];
  } | null;

  /* ── Pre-computed for ShareholderInstitutionalReport ── */
  institutional: {
    partnerPct:         number;
    devPct:             number;
    partnerEquity:      number;
    devEquity:          number;
    preferredReturn:    number;
    netAfterPreferred:  number;
    partnerSplit:       number;
    devSplit:           number;
    partnerTotal:       number;
    investorIRR:        number;
    equityMultiple:     number;
    capitalCalls:       ReportCapitalCall[];
  } | null;

  /* ── Pre-computed for ShareholderIndividualReport ── */
  individual: {
    investorEquity:  number;
    devEquity:       number;
    investorProfit:  number;
    investorTotal:   number;
    investorIRR:     number;
    equityMultiple:  number;
    breakEvenPerM2:  number;
    safetyMarginPct: number | null;
    priceAboveBE:    number | null;
    milestones:      ReportMilestone[];
  } | null;

  /* ── Pre-computed for LandStudyReport ── */
  regulation: {
    codeLabel:       string;
    allowedUses:     string[];
    maxFloors:       number;
    gcr:             number;
    setbacks:        { north: number; south: number; east: number; west: number };
    classification:  string;
    effectiveBuildArea: number;
    isValid:         boolean;
    warnings:        string[];
    errors:          string[];
  } | null;
}
