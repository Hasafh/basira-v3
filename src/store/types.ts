/* ── Shared store types ── */
import type { UnitType, BasementCostParams } from '../engines/feasibility/types';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectInput {
  /* Land */
  landArea?: number;
  landWidth?: number;
  landDepth?: number;
  landType?: string;
  usageType?: string;
  zoningCode?: string;
  streetWidth?: number;

  /* Building */
  floors?: number;
  basementFloors?: number;
  groundCoverageRatio?: number;
  servicesRatio?: number;            // non-sellable ratio of above-ground GFA (default 0.15)

  /* Costs */
  landPricePerM2?: number;
  buildCostPerM2?: number;
  softCostsPct?: number;
  contingencyPct?: number;
  basementParams?: Partial<BasementCostParams>;
  agentCommissionPct?: number;       // default 0.02
  marketingBudgetPct?: number;       // default 0.01

  /* Revenue */
  sellPricePerM2?: number;
  unitMix?: UnitType[];              // unit-based revenue (preferred over blended price)
  operationMode?: string;
  rentYield?: number;
  manualNetSellableArea?: number;

  /* Financing */
  selfPct?: number;
  bankPct?: number;
  partnerPct?: number;
  interestRate?: number;
  ltvPct?: number;
  gracePeriodMonths?: number;
  projectDurationMonths?: number;
  loanDelayPenaltyPct?: number;

  /* Target */
  profitTarget?: number;
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  status: string;
  input?: ProjectInput;
  result?: any;
  createdAt?: string;
  updatedAt?: string;
}

/* Re-export engine types for convenience */
export type { UnitType, BasementCostParams };
