import type { UnitType, UnitCategory } from '../feasibility/types';
import { parkingSpotsForUnit } from '../feasibility/revenueCalculator';

/* ─────────────────────────────────────────────────────────
   Saudi residential sizing standards
   Source: Saudi Building Code (SBC) + typical market ranges
───────────────────────────────────────────────────────── */
export interface UnitSpec {
  category: UnitCategory;
  labelAr: string;
  avgAreaM2: number;       // representative mid-point
  minAreaM2: number;
  maxAreaM2: number;
}

export const UNIT_SPECS: UnitSpec[] = [
  { category: 'استوديو', labelAr: 'استوديو',       avgAreaM2: 52,  minAreaM2: 35,  maxAreaM2: 70  },
  { category: '1BR',     labelAr: 'غرفة وصالة',    avgAreaM2: 78,  minAreaM2: 55,  maxAreaM2: 100 },
  { category: '2BR',     labelAr: 'غرفتان وصالة',  avgAreaM2: 115, minAreaM2: 85,  maxAreaM2: 150 },
  { category: '3BR',     labelAr: 'ثلاث غرف',      avgAreaM2: 165, minAreaM2: 130, maxAreaM2: 220 },
  { category: '4BR',     labelAr: 'أربع غرف',      avgAreaM2: 230, minAreaM2: 175, maxAreaM2: 350 },
];

/* ─────────────────────────────────────────────────────────
   Mix profiles — relative weight of each unit type
───────────────────────────────────────────────────────── */
export type MixProfile =
  | 'affordable'   // استوديو + 1BR محور (استثمار إيجاري)
  | 'balanced'     // توزيع متوازن (سكني عام)
  | 'family'       // 3BR + 4BR محور (سكني عائلي)
  | 'luxury';      // وحدات كبيرة فقط

export const MIX_WEIGHTS: Record<MixProfile, Partial<Record<UnitCategory, number>>> = {
  affordable: { 'استوديو': 30, '1BR': 40, '2BR': 20, '3BR': 10 },
  balanced:   { 'استوديو': 15, '1BR': 25, '2BR': 35, '3BR': 20, '4BR': 5 },
  family:     {               '1BR': 10, '2BR': 25, '3BR': 40, '4BR': 25 },
  luxury:     {               '2BR': 20, '3BR': 40, '4BR': 40 },
};

/* ─────────────────────────────────────────────────────────
   autoSuggestUnitMix
   Given a sellable area, profile and an optional blended price,
   returns a UnitType[] that fits the available area.
───────────────────────────────────────────────────────── */
export function autoSuggestUnitMix(
  sellableAreaM2: number,
  profile: MixProfile = 'balanced',
  blendedPricePerM2 = 8_000,
  priceVariance: Partial<Record<UnitCategory, number>> = {},
): UnitType[] {
  const weights = MIX_WEIGHTS[profile];
  const totalWeight = Object.values(weights).reduce((s, w) => s + (w ?? 0), 0);
  if (totalWeight === 0 || sellableAreaM2 <= 0) return [];

  // Allocate area to each category proportionally
  const allocated: Array<{ spec: UnitSpec; weight: number; area: number }> = [];
  for (const spec of UNIT_SPECS) {
    const w = weights[spec.category] ?? 0;
    if (w === 0) continue;
    allocated.push({ spec, weight: w, area: sellableAreaM2 * (w / totalWeight) });
  }

  // Convert area allocations → integer unit counts
  const result: UnitType[] = [];
  let usedArea = 0;

  for (const { spec, area } of allocated) {
    const count = Math.max(1, Math.round(area / spec.avgAreaM2));
    const actualArea = count * spec.avgAreaM2;
    usedArea += actualArea;

    // Price: apply per-category variance from blended price
    const varianceFactor = 1 + ((priceVariance[spec.category] ?? 0) / 100);
    const pricePerM2 = Math.round(blendedPricePerM2 * varianceFactor);

    result.push({
      id:                    `auto-${spec.category}`,
      category:              spec.category,
      count,
      avgAreaM2:             spec.avgAreaM2,
      pricePerM2,
      parkingSpotsRequired:  parkingSpotsForUnit(spec.avgAreaM2),
    });
  }

  return result;
}

/**
 * Adjust unit counts so that total sellable area matches the target.
 * Distributes the remaining area proportionally across units.
 */
export function scaleMixToArea(units: UnitType[], targetAreaM2: number): UnitType[] {
  const currentArea = units.reduce((s, u) => s + u.count * u.avgAreaM2, 0);
  if (currentArea === 0) return units;
  const scale = targetAreaM2 / currentArea;

  return units.map(u => ({
    ...u,
    count: Math.max(1, Math.round(u.count * scale)),
  }));
}

/** Get the spec for a given category */
export function getUnitSpec(category: UnitCategory): UnitSpec | undefined {
  return UNIT_SPECS.find(s => s.category === category);
}

/** Total sellable area of a mix */
export function mixTotalArea(units: UnitType[]): number {
  return units.reduce((s, u) => s + u.count * u.avgAreaM2, 0);
}

/** Total parking spots required by a mix */
export function mixTotalParking(units: UnitType[]): number {
  return units.reduce((s, u) => s + u.count * u.parkingSpotsRequired, 0);
}
