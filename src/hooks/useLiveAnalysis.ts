/**
 * useLiveAnalysis — Live feasibility computation.
 *
 * Reads the current form state from analysisStore and computes a full
 * FeasibilityResult synchronously on every keystroke via useMemo.
 * Returns null if the three required inputs (area, land price, sell price)
 * are not yet filled in.
 *
 * This is the engine behind the "no Run button" reactive UX.
 */
import { useMemo } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { runFeasibility } from '../engines/feasibility';
import type { FeasibilityResult } from '../engines/feasibility/types';

export function useLiveAnalysis(): FeasibilityResult | null {
  const formInput          = useAnalysisStore(s => s.formInput);
  const financingStructure = useAnalysisStore(s => s.financingStructure);

  return useMemo((): FeasibilityResult | null => {
    const la = parseFloat(formInput.landArea        as string);
    const lp = parseFloat(formInput.landPricePerM2  as string);
    const sp = parseFloat(formInput.sellPricePerM2  as string);

    // Need the three core numbers before we can compute anything meaningful
    if (!la || la <= 0 || !lp || lp <= 0 || !sp || sp <= 0) return null;

    const floors    = parseFloat(formInput.floors              as string) || 4;
    const gcr       = parseFloat(formInput.groundCoverageRatio as string) || 0.60;
    const bc        = parseFloat(formInput.buildCostPerM2      as string) || 2000;
    const bf        = parseFloat(formInput.basementFloors      as string) || 0;
    const pt        = parseFloat(formInput.profitTarget        as string) || 0.25;
    const svcPct    = parseFloat(formInput.servicesAreaPct     as string) || 0.15;
    const duration  = parseFloat(formInput.projectDurationMonths as string) || 24;
    const softPct   = parseFloat(formInput.softCostsPct        as string) || 0.05;
    const contPct   = parseFloat(formInput.contingencyPct      as string) || 0.05;
    const manualNSA = formInput.manualNetSellableArea
      ? parseFloat(formInput.manualNetSellableArea as string) || undefined
      : undefined;

    try {
      return runFeasibility({
        landArea:              la,
        landPricePerM2:        lp,
        sellPricePerM2:        sp,
        floors,
        basementFloors:        bf,
        groundCoverageRatio:   gcr,
        buildCostPerM2:        bc,
        softCostsPct:          softPct,
        contingencyPct:        contPct,
        bankPct:               financingStructure.bankPct,
        interestRate:          financingStructure.bankInterestRate / 100,
        projectDurationMonths: duration,
        operationMode:         (formInput.operationMode as any) || 'sell',
        profitTarget:          pt,
        servicesRatio:         svcPct,
        manualNetSellableArea: manualNSA,
        loanDelayPenaltyPct:   financingStructure.loanDelayPenaltyPct,
      });
    } catch {
      return null;
    }
  }, [
    formInput.landArea,
    formInput.landPricePerM2,
    formInput.sellPricePerM2,
    formInput.floors,
    formInput.basementFloors,
    formInput.groundCoverageRatio,
    formInput.buildCostPerM2,
    formInput.softCostsPct,
    formInput.contingencyPct,
    formInput.profitTarget,
    formInput.servicesAreaPct,
    formInput.projectDurationMonths,
    formInput.operationMode,
    formInput.manualNetSellableArea,
    financingStructure.bankPct,
    financingStructure.bankInterestRate,
    financingStructure.loanDelayPenaltyPct,
  ]);
}
