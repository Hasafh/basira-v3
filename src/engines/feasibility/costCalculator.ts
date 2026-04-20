import type { CostResult, BasementCostParams } from './types';
import { DEFAULT_BASEMENT_PARAMS } from './types';

/** Saudi Real Estate Transaction Tax — ضريبة التصرفات العقارية (fixed by law) */
export const RETT_RATE = 0.05;

/**
 * Calculate full project cost breakdown with separated above-ground / basement cost centres.
 *
 * DESIGN CONTRACT:
 *   • aboveGroundBuildCost  = aboveGroundGFA × buildCostPerM2
 *   • basementTotalCost     = basementGFA × (buildCostPerM2 + premium components)
 *   • softCosts/contingency = % of (aboveGroundBuildCost + basementTotalCost)
 *   • Parking cost is already embedded in basementTotalCost — NOT a separate line.
 */
export function calculateCosts(
  landArea: number,
  landPricePerM2: number,
  aboveGroundGFA: number,
  basementGFA: number,
  buildCostPerM2: number,
  softCostsPct: number,
  contingencyPct: number,
  bankPct: number,
  interestRate: number,
  durationYears: number,
  basementParams?: Partial<BasementCostParams>,
  agentCommissionPct = 0.02,
  marketingBudgetPct = 0.01,
  rettRate = RETT_RATE,
  loanDelayPenaltyPct = 0,
  revenue = 0,
): CostResult {
  /* ── Land ── */
  const landBasePrice = landArea * landPricePerM2;
  const rettCost      = landBasePrice * rettRate;
  const landCost      = landBasePrice + rettCost;

  /* ── Above-ground ── */
  const aboveGroundBuildCost = aboveGroundGFA * buildCostPerM2;

  /* ── Basement cost centre ── */
  const bp: BasementCostParams = { ...DEFAULT_BASEMENT_PARAMS, ...(basementParams ?? {}) };
  const basementBaseCost       = basementGFA * buildCostPerM2;
  const basementExcavation     = basementGFA * bp.excavationPerM2;
  const basementStructural     = basementGFA * bp.structuralPremiumPerM2;
  const basementWaterproofing  = basementGFA * bp.waterproofingPerM2;
  const basementMep            = basementGFA * bp.mepPerM2;
  const basementTotalCost      = basementBaseCost
                                 + basementExcavation
                                 + basementStructural
                                 + basementWaterproofing
                                 + basementMep;

  /* ── Indirect ── */
  const totalBuildCost = aboveGroundBuildCost + basementTotalCost;
  const softCosts      = totalBuildCost * softCostsPct;
  const contingency    = totalBuildCost * contingencyPct;
  const marketingCost  = revenue * (agentCommissionPct + marketingBudgetPct);

  /* ── Financing ── */
  const baseCost        = landCost + totalBuildCost + softCosts + contingency;
  const loanAmount      = baseCost * Math.min(Math.max(bankPct, 0), 1);
  const financingCost   = loanAmount * interestRate * Math.max(durationYears, 0);
  const loanDelayPenalty = loanAmount > 0 && loanDelayPenaltyPct > 0
    ? loanAmount * (loanDelayPenaltyPct / 100)
    : 0;

  const totalCost = baseCost + financingCost + loanDelayPenalty + marketingCost;

  return {
    landBasePrice,
    rettCost,
    landCost,
    aboveGroundBuildCost,
    basementBaseCost,
    basementExcavation,
    basementStructural,
    basementWaterproofing,
    basementMep,
    basementTotalCost,
    softCosts,
    contingency,
    marketingCost,
    financingCost,
    loanDelayPenalty,
    totalBuildCost,
    totalCost,
  };
}

/** Land acquisition cost including RETT — convenience helper */
export function calculateLandCost(
  landArea: number,
  pricePerM2: number,
  rettRate = RETT_RATE,
): number {
  const base = landArea * pricePerM2;
  return base + base * rettRate;
}

/**
 * Effective basement cost per m² (base + all premiums).
 * Useful for display / validation.
 */
export function basementCostPerM2(
  buildCostPerM2: number,
  params?: Partial<BasementCostParams>,
): number {
  const bp = { ...DEFAULT_BASEMENT_PARAMS, ...(params ?? {}) };
  return buildCostPerM2
    + bp.excavationPerM2
    + bp.structuralPremiumPerM2
    + bp.waterproofingPerM2
    + bp.mepPerM2;
}
