import type { HBUOption, HBUScenario, HBUResult } from './types';

/* ── Standard 6-scenario set matching HbuPage ── */
export const HBU_SCENARIOS: HBUScenario[] = [
  { id: 'villa',      label: 'فيلا منفصلة',  landType: 'سكني',  usageType: 'فيلا منفصلة',  floors: 2, gcr: 0.60, buildCost: 2500 },
  { id: 'attached',   label: 'فيلا متلاصقة', landType: 'سكني',  usageType: 'فيلا متلاصقة', floors: 3, gcr: 0.60, buildCost: 2000 },
  { id: 'apartments', label: 'أدوار سكنية',  landType: 'سكني',  usageType: 'أدوار سكنية',  floors: 4, gcr: 0.60, buildCost: 1800 },
  { id: 'commercial', label: 'معارض تجارية', landType: 'تجاري', usageType: 'معارض',         floors: 3, gcr: 0.80, buildCost: 1600 },
  { id: 'offices',    label: 'مكاتب',         landType: 'تجاري', usageType: 'مكاتب',         floors: 5, gcr: 0.80, buildCost: 2200 },
  { id: 'mixed',      label: 'مختلط',         landType: 'تجاري', usageType: 'مختلط',         floors: 6, gcr: 0.75, buildCost: 2100 },
];

/* ── runHBUAnalysis (kept for backward compat, uses sell-price multipliers) ── */
interface HBUInput {
  landArea: number
  landCost: number
  buildCostPerM2: number
  gcr: number
  softCostsPct: number
  contingencyPct: number
  durationMonths: number
}

const USAGE_CONFIGS: { usageType: string; floors: number; sellPriceMultiplier: number }[] = [
  { usageType: 'فيلا سكنية',   floors: 2, sellPriceMultiplier: 1.0  },
  { usageType: 'شقق سكنية',    floors: 4, sellPriceMultiplier: 0.9  },
  { usageType: 'تجاري + سكني', floors: 6, sellPriceMultiplier: 1.15 },
  { usageType: 'مكاتب إدارية', floors: 8, sellPriceMultiplier: 1.1  },
];

export function runHBUAnalysis(
  input: HBUInput,
  baseSellPricePerM2: number,
): HBUOption[] {
  const options = USAGE_CONFIGS.map(cfg => {
    const buildArea = input.landArea * input.gcr * cfg.floors;
    const sellArea  = buildArea * 0.85;
    const buildCost = buildArea * input.buildCostPerM2;
    const soft      = buildCost * (input.softCostsPct + input.contingencyPct);
    const totalCost = input.landCost + buildCost + soft;
    const revenue   = sellArea * (baseSellPricePerM2 * cfg.sellPriceMultiplier);
    const net       = revenue - totalCost;
    const margin    = revenue > 0 ? (net / revenue) * 100 : 0;
    const years     = Math.max(input.durationMonths, 1) / 12;
    const irr       = totalCost > 0
      ? (Math.pow(1 + net / totalCost, 1 / years) - 1) * 100
      : 0;
    return { usageType: cfg.usageType, floors: cfg.floors, revenue, totalCost, net, irr, margin, isOptimal: false };
  });

  const bestIdx = options.reduce((best, cur, i) => cur.irr > options[best].irr ? i : best, 0);
  options[bestIdx].isOptimal = true;
  return options;
}

/* ── runHBUFallback — matches HbuPage local fallback exactly ── */
/**
 * Run all HBU scenarios without an API call.
 * Uses separate sell prices for residential and commercial scenarios.
 *
 * @param landArea              Land area (m²)
 * @param landPricePerM2        Land purchase price (SAR/m²)
 * @param scenarios             Scenario configs (default: HBU_SCENARIOS)
 * @param sellPriceResidential  Sell price for residential scenarios (SAR/m²)
 * @param sellPriceCommercial   Sell price for commercial scenarios (SAR/m²)
 * @param softCostsPct          Soft costs fraction of build cost
 * @param contingencyPct        Contingency fraction of build cost
 * @param durationMonths        Project duration (months) for IRR
 */
export function runHBUFallback(
  landArea: number,
  landPricePerM2: number,
  scenarios: HBUScenario[],
  sellPriceResidential: number,
  sellPriceCommercial: number,
  softCostsPct: number,
  contingencyPct: number,
  durationMonths: number,
): Record<string, HBUResult> {
  const result: Record<string, HBUResult> = {};

  for (const sc of scenarios) {
    const gfa      = landArea * sc.gcr * sc.floors;
    const nla      = gfa * 0.85;
    const sellP    = sc.landType === 'تجاري' ? sellPriceCommercial : sellPriceResidential;
    const revenue  = nla * sellP;
    const landCost = landArea * landPricePerM2 * 1.05; // incl. RETT 5%
    const bldCost  = gfa * sc.buildCost;
    const soft     = bldCost * (softCostsPct + contingencyPct);
    const totalCost = landCost + bldCost + soft;
    const net      = revenue - totalCost;
    const margin   = revenue > 0 ? (net / revenue) * 100 : 0;
    const irr      = totalCost > 0
      ? (net / totalCost) * (12 / Math.max(1, durationMonths)) * 100
      : 0;
    result[sc.id]  = { irr, margin, net, revenue, totalCost, nla, gfa };
  }

  return result;
}
