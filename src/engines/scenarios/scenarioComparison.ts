import { runFeasibility }     from '../feasibility';
import type { FeasibilityInput, FeasibilityResult } from '../feasibility/types';

/* ── Types ─────────────────────────────────────────────── */

export interface ScenarioComparison {
  label: string;
  tag:   'optimistic' | 'base' | 'pessimistic' | 'custom';
  result: FeasibilityResult;
}

/* ── Core runner ────────────────────────────────────────── */

/**
 * Run a single scenario by merging `overrides` onto `base` and calling runFeasibility.
 * "No calculations in template/UI" — all math happens here in engines/.
 */
export function runScenario(
  base:      FeasibilityInput,
  overrides: Partial<FeasibilityInput>,
  label:     string,
  tag:       ScenarioComparison['tag'] = 'custom',
): ScenarioComparison {
  const input: FeasibilityInput = { ...base, ...overrides };
  return { label, tag, result: runFeasibility(input) };
}

/* ── Default 3-scenario set ─────────────────────────────── */

/**
 * Run the standard 3 scenarios used for comparison:
 *   - متفائل: sellPrice +10%
 *   - معتدل:  base (no changes)
 *   - متشائم: sellPrice −10%, buildCost +10%
 */
export function runDefaultScenarios(base: FeasibilityInput): ScenarioComparison[] {
  return [
    runScenario(
      base,
      { sellPricePerM2: Math.round((base.sellPricePerM2 ?? 0) * 1.1) },
      'متفائل (+10٪ سعر بيع)',
      'optimistic',
    ),
    runScenario(base, {}, 'معتدل (الأساس)', 'base'),
    runScenario(
      base,
      {
        sellPricePerM2: Math.round((base.sellPricePerM2 ?? 0) * 0.9),
        buildCostPerM2: Math.round(base.buildCostPerM2 * 1.1),
      },
      'متشائم (−10٪ سعر, +10٪ بناء)',
      'pessimistic',
    ),
  ];
}
