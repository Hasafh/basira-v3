// ── Sensitivity Engine ────────────────────────────────────────
// Runs 5 scenarios and returns IRR, profit, DSCR for each.
// No dependency on any existing engine — standalone.

import { calculateDebtMetrics } from './debtEngine';

export interface SensitivityInputs {
  totalProjectCost: number;
  totalRevenue:     number;
  bankPct:          number;
  annualInterestRate: number;
  loanDurationMonths: number;
  gracePeriodMonths?: number;
  operatingCosts:   number;   // non-financing costs (for NOI)
  durationMonths:   number;   // project duration for IRR approximation
}

export interface ScenarioResult {
  label:       string;
  labelEn:     string;
  revenue:     number;
  totalCost:   number;
  profit:      number;
  profitPct:   number;   // profit / totalCost × 100
  irr:         number;   // annualized IRR % (simplified)
  dscr:        number;
  dscrColor:   'green' | 'yellow' | 'red';
  isWorstCase: boolean;
}

export interface SensitivityResult {
  scenarios:   ScenarioResult[];
  worstIdx:    number;   // index of worst profit scenario
}

// ── Simplified IRR approximation ──────────────────────────────
// Uses XNPV-like approach: profit / totalCost annualized.
// For a more precise IRR the full cash flow is needed — this
// gives a directionally-correct proxy sufficient for bank reports.
function approxIRR(profit: number, totalCost: number, durationMonths: number): number {
  if (totalCost <= 0 || durationMonths <= 0) return 0;
  const years = durationMonths / 12;
  // (1 + irr)^years = (totalCost + profit) / totalCost
  // irr = ((totalCost + profit) / totalCost)^(1/years) - 1
  const ratio = (totalCost + profit) / totalCost;
  if (ratio <= 0) return -100;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function dscrColor(dscr: number): 'green' | 'yellow' | 'red' {
  return dscr >= 1.3 ? 'green' : dscr >= 1.1 ? 'yellow' : 'red';
}

function buildScenario(
  label: string,
  labelEn: string,
  revenue: number,
  totalCost: number,
  inputs: SensitivityInputs,
): ScenarioResult {
  const profit    = revenue - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const irr       = approxIRR(profit, totalCost, inputs.durationMonths);

  const noi = revenue - inputs.operatingCosts;
  const debt = calculateDebtMetrics({
    totalProjectCost:   totalCost,
    estimatedEndValue:  revenue,
    netOperatingIncome: noi,
    bankPct:            inputs.bankPct,
    annualInterestRate: inputs.annualInterestRate,
    loanDurationMonths: inputs.loanDurationMonths,
    gracePeriodMonths:  inputs.gracePeriodMonths,
  });

  return {
    label,
    labelEn,
    revenue,
    totalCost,
    profit,
    profitPct,
    irr,
    dscr:      debt.dscr,
    dscrColor: dscrColor(debt.dscr),
    isWorstCase: false,
  };
}

// ── Main function ─────────────────────────────────────────────

export function runSensitivity(inputs: SensitivityInputs): SensitivityResult {
  const {
    totalProjectCost,
    totalRevenue,
  } = inputs;

  const scenarios: ScenarioResult[] = [
    buildScenario('السيناريو الأساسي',         'Base Case',           totalRevenue,            totalProjectCost,            inputs),
    buildScenario('انخفاض الأسعار −10٪',       'Price −10%',          totalRevenue * 0.90,     totalProjectCost,            inputs),
    buildScenario('انخفاض الأسعار −20٪',       'Price −20%',          totalRevenue * 0.80,     totalProjectCost,            inputs),
    buildScenario('ارتفاع التكاليف +10٪',      'Cost +10%',           totalRevenue,            totalProjectCost * 1.10,     inputs),
    buildScenario('تأخير 6 أشهر',              'Delay +6 mo',         totalRevenue * 0.96,     totalProjectCost * 1.05,     {
      ...inputs,
      durationMonths: inputs.durationMonths + 6,
    }),
    buildScenario('تأخير + انخفاض أسعار',      'Delay + Price Drop',  totalRevenue * 0.90 * 0.96, totalProjectCost * 1.05, {
      ...inputs,
      durationMonths: inputs.durationMonths + 6,
    }),
  ];

  // Find worst-case by minimum profit
  let worstIdx = 0;
  for (let i = 1; i < scenarios.length; i++) {
    if (scenarios[i].profit < scenarios[worstIdx].profit) worstIdx = i;
  }
  scenarios[worstIdx].isWorstCase = true;

  return { scenarios, worstIdx };
}
