// ── Funding Package Builder ───────────────────────────────────
// Assembles all analytical engines into a single coherent funding
// package object. Pure function — no side effects, no rendering.

import { calculateDebtMetrics, type DebtMetrics } from '../engines/debtEngine';
import { generateAdvancedCashFlow, type AdvancedCashFlowResult } from '../engines/cashFlowEngine';
import { runSensitivity, type SensitivityResult } from '../engines/sensitivityEngine';
import { simulateDelay, type DelayImpactResult } from '../engines/delayImpactEngine';

export type FundingTarget = 'bank' | 'institutional_investor' | 'individual_investor';

export interface FundingPackageInput {
  projectId:        string;
  projectName:      string;
  location?:        string;
  // Financial
  totalProjectCost: number;
  totalRevenue:     number;
  landCost:         number;
  buildCost:        number;
  durationMonths:   number;
  softCostsPct:     number;
  contingencyPct:   number;
  // Financing
  bankPct:          number;
  annualInterestRate: number;
  loanDurationMonths: number;
  gracePeriodMonths?: number;
  // Report metadata
  target:           FundingTarget;
  institutionName:  string;
  notes?:           string;
  // Pass-through from existing engine (no recompute)
  existingIRR?:     number;
  existingMargin?:  number;
  confidence:       number;
}

export interface FundingPackage {
  input:         FundingPackageInput;
  debtMetrics:   DebtMetrics;
  cashFlow:      AdvancedCashFlowResult;
  sensitivity:   SensitivityResult;
  delay3m:       DelayImpactResult;
  delay6m:       DelayImpactResult;
  delay12m:      DelayImpactResult;
  generatedAt:   string;   // ISO timestamp
}

export function buildFundingPackage(input: FundingPackageInput): FundingPackage {
  const {
    totalProjectCost, totalRevenue, landCost, buildCost,
    durationMonths, softCostsPct, contingencyPct,
    bankPct, annualInterestRate, loanDurationMonths,
    gracePeriodMonths = 0,
  } = input;

  const loanDur = Math.max(12, loanDurationMonths);
  const noi     = Math.max(0, totalRevenue - totalProjectCost * 0.85);

  const debtMetrics = calculateDebtMetrics({
    totalProjectCost,
    estimatedEndValue:  totalRevenue,
    netOperatingIncome: noi,
    bankPct,
    annualInterestRate,
    loanDurationMonths: loanDur,
    gracePeriodMonths,
  });

  const cashFlow = generateAdvancedCashFlow({
    durationMonths,
    landCost,
    buildCost,
    softCostsPct,
    contingencyPct,
    totalRevenue,
    salesStartMonth: Math.max(3, Math.round(durationMonths * 0.25)),
  });

  // Operating costs exclude financing (debt engine handles that separately)
  const financingCostEst = debtMetrics.loanAmount * (annualInterestRate / 100) * (loanDur / 12);
  const operatingCosts   = Math.max(0, totalProjectCost - financingCostEst);

  const sensitivity = runSensitivity({
    totalProjectCost,
    totalRevenue,
    bankPct,
    annualInterestRate,
    loanDurationMonths:  loanDur,
    gracePeriodMonths,
    operatingCosts,
    durationMonths,
  });

  const delayBase = {
    totalProjectCost, totalRevenue, durationMonths,
    bankPct, annualInterestRate,
    loanDurationMonths: loanDur, gracePeriodMonths,
  };

  return {
    input,
    debtMetrics,
    cashFlow,
    sensitivity,
    delay3m:     simulateDelay(delayBase, 3),
    delay6m:     simulateDelay(delayBase, 6),
    delay12m:    simulateDelay(delayBase, 12),
    generatedAt: new Date().toISOString(),
  };
}
