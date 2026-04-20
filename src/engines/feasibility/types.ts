/* ── Feasibility engine types v2 ── */

/* ─────────────────────────── Unit Mix ─────────────────────────── */
export type UnitCategory = 'استوديو' | '1BR' | '2BR' | '3BR' | '4BR' | 'مخصص';

export interface UnitType {
  id: string;
  category: UnitCategory;
  count: number;
  avgAreaM2: number;
  pricePerM2: number;
  /** Computed automatically: avgAreaM2 < 180 → 1, else → 2 */
  parkingSpotsRequired: number;
}

export interface UnitRevenueRow {
  category: UnitCategory;
  count: number;
  avgAreaM2: number;
  pricePerM2: number;
  totalArea: number;
  totalRevenue: number;
  parkingSpots: number;
}

export interface UnitMixSummary {
  units: UnitType[];
  totalUnits: number;
  totalSellableArea: number;
  totalRevenue: number;
  blendedPricePerM2: number;
  totalParkingRequired: number;
  breakdown: UnitRevenueRow[];
}

/* ─────────────────────────── Basement Cost Params ─────────────────────────── */
export interface BasementCostParams {
  /** حفر وردم — SAR/m² */
  excavationPerM2: number;
  /** هيكل إضافي (أساسات عميقة، جدران دافعة) — SAR/m² above regular */
  structuralPremiumPerM2: number;
  /** عزل مائي — SAR/m² */
  waterproofingPerM2: number;
  /** مواسير، صرف، تهوية تحت الأرض — SAR/m² */
  mepPerM2: number;
}

export const DEFAULT_BASEMENT_PARAMS: BasementCostParams = {
  excavationPerM2:       350,
  structuralPremiumPerM2: 500,
  waterproofingPerM2:    250,
  mepPerM2:              300,
};

/* ─────────────────────────── Area Result ─────────────────────────── */
export interface AreaResult {
  landArea: number;
  groundCoverageRatio: number;

  /* Above-ground ─────────────────────────── */
  aboveGroundGFA: number;         // landArea × gcr × floors
  aboveGroundSellable: number;    // aboveGroundGFA × (1 − servicesRatio) — THE ONLY sellable
  aboveGroundServices: number;    // corridors, stairs, lobby (non-sellable, above-ground)

  /* Basement ─────────────────────────── */
  basementGFA: number;            // landArea × 0.90 × basementFloors — NEVER sellable
  basementParkingArea: number;    // parkingDemandSpots × SQMPERSPOT housed in basement
  basementNonParkingArea: number; // remaining basement (storage, utilities, plant room)

  /* Parking ─────────────────────────── */
  parkingDemandSpots: number;     // required by unit mix (Saudi code)
  parkingSupplySpots: number;     // how many the basement can fit
  parkingDeficit: number;         // max(0, demand − supply) → compliance issue

  /* Totals ─────────────────────────── */
  grossBuildArea: number;         // aboveGroundGFA + basementGFA
  sellableArea: number;           // = aboveGroundSellable — identical to aboveGroundSellable
}

/** m² per parking spot including maneuvering lane allocation */
export const SQMPERSPOT = 15;

/* ─────────────────────────── Cost Result ─────────────────────────── */
export interface CostResult {
  /* Land */
  landBasePrice: number;
  rettCost: number;             // ضريبة التصرفات العقارية 5%
  landCost: number;             // landBasePrice + rettCost

  /* Above-ground construction */
  aboveGroundBuildCost: number; // aboveGroundGFA × buildCostPerM2

  /* Basement cost center (separate) */
  basementBaseCost: number;     // basementGFA × buildCostPerM2 (base structure)
  basementExcavation: number;
  basementStructural: number;
  basementWaterproofing: number;
  basementMep: number;
  basementTotalCost: number;    // all basement line items combined

  /* Indirect */
  softCosts: number;            // % of (aboveGroundBuildCost + basementTotalCost)
  contingency: number;
  marketingCost: number;        // agent commission + advertising

  /* Financing */
  financingCost: number;
  loanDelayPenalty: number;

  /* Aggregates */
  totalBuildCost: number;       // aboveGround + basement (no land, no financing)
  totalCost: number;            // everything
}

/* ─────────────────────────── Revenue Result ─────────────────────────── */
export interface RevenueResult {
  revenue: number;
  revenueMethod: 'unit-mix' | 'blended-price';
  net: number;
  margin: number;
  roi: number;
  irr: number;
  irrMethod: 'exact' | 'approximate';
  npv: number;
  paybackMonths: number;
}

/* ─────────────────────────── Compliance ─────────────────────────── */
export type ComplianceStatus = 'pass' | 'warning' | 'fail';

export interface ComplianceCheck {
  id: string;
  label: string;
  status: ComplianceStatus;
  detail: string;
  value?: string;
  threshold?: string;
}

export interface ComplianceResult {
  overallStatus: ComplianceStatus;
  checks: ComplianceCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

/* ─────────────────────────── Feasibility Input ─────────────────────────── */
export interface FeasibilityInput {
  /* Land */
  landArea: number;
  landPricePerM2: number;

  /* Building */
  floors: number;
  basementFloors?: number;
  groundCoverageRatio: number;
  gcr?: number;                      // alias — groundCoverageRatio takes priority
  servicesRatio?: number;            // non-sellable fraction of above-ground GFA; default 0.15

  /* Costs */
  buildCostPerM2: number;            // above-ground hard cost
  basementParams?: Partial<BasementCostParams>;
  softCostsPct: number;
  contingencyPct: number;
  agentCommissionPct?: number;       // default 0.02
  marketingBudgetPct?: number;       // default 0.01

  /* Revenue */
  unitMix?: UnitType[];              // unit-based revenue (preferred)
  sellPricePerM2?: number;           // blended fallback
  operationMode?: 'sell' | 'rent';
  rentYield?: number;
  manualNetSellableArea?: number;    // override calculated sellableArea

  /* Financing */
  bankPct: number;
  interestRate: number;
  projectDurationMonths: number;
  loanDelayPenaltyPct?: number;
  gracePeriodMonths?: number;

  /* Target */
  profitTarget?: number;

  /* Zoning */
  zoningCode?: string;
}

/* ─────────────────────────── Feasibility Result ─────────────────────────── */
export interface FeasibilityResult {
  areas: AreaResult;
  costs: CostResult;
  financials: RevenueResult;
  unitMix: UnitMixSummary | null;
  compliance: ComplianceResult;
  rlv: { maxLandPerM2: number; maxLandBudget: number };
  summary: { isBuy: boolean; decision: string; reasons: string[] };
  cashFlow: number[];
  inputWarnings: string[];
}

/* ── backward-compat re-exports so existing consumers don't break ── */
export type { FeasibilityInput as LegacyFeasibilityInput };
