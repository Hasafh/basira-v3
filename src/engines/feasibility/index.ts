export type {
  FeasibilityInput,
  FeasibilityResult,
  AreaResult,
  CostResult,
  RevenueResult,
  UnitType,
  UnitCategory,
  UnitMixSummary,
  UnitRevenueRow,
  BasementCostParams,
  ComplianceResult,
  ComplianceCheck,
  ComplianceStatus,
} from './types';

export { DEFAULT_BASEMENT_PARAMS, SQMPERSPOT } from './types';

export { calculateAreas, calcParkingDemand }                  from './areaCalculator';
export { calculateCosts, calculateLandCost, basementCostPerM2, RETT_RATE } from './costCalculator';
export {
  calculateRevenue,
  calculateRevenueFromMix,
  calculateRentalRevenue,
  parkingSpotsForUnit,
  enrichUnitMix,
}                                                             from './revenueCalculator';
export {
  irrFromCashFlows,
  irrApprox,
  calculateFinancials,
  calculateRLV,
  calculateBNM,
  runFeasibility,
  buildCashFlowTimeline,
}                                                             from './financialEngine';
