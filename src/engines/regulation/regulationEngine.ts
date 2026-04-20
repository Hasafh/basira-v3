import type { LandInput, LandClassification, RegulationCode, RegulationResult } from './types';
import { BUILDING_CODES, getBuildingCode } from './buildingCodes';

/* ── classifyLand ── */
export function classifyLand(input: LandInput): LandClassification {
  const { streetWidths } = input;

  const streetSides = Object.entries(streetWidths).filter(([, w]) => w && w > 0);
  const streetCount = streetSides.length;

  // Main street = widest
  const mainStreetWidth = streetSides.reduce((max, [, w]) => Math.max(max, w ?? 0), 0);

  const dirs = streetSides.map(([d]) => d);
  const hasNorth = dirs.includes('north');
  const hasSouth = dirs.includes('south');
  const hasEast  = dirs.includes('east');
  const hasWest  = dirs.includes('west');

  let type: LandClassification['type'];
  let desirabilityScore: number;

  if (streetCount >= 4) {
    type = 'بلك';
    desirabilityScore = 5;
  } else if (streetCount === 3) {
    type = 'رأس بلك';
    desirabilityScore = 4;
  } else if (streetCount === 2) {
    const isOpposite =
      (hasNorth && hasSouth) ||
      (hasEast  && hasWest);
    type = isOpposite ? 'متظاهرة' : 'زاوية';
    desirabilityScore = isOpposite ? 3 : 4;
  } else {
    type = 'شارع واحد';
    desirabilityScore = 1;
  }

  return { type, streetCount, mainStreetWidth, desirabilityScore };
}

/* ── calculateSetback ── */
export function calculateSetback(
  formula: 'fixed' | 'fraction',
  streetWidth: number,
  minValue: number,
  fixedValue = 0,
): number {
  if (formula === 'fixed') return fixedValue;
  return Math.max(streetWidth / 5, minValue);
}

/* ── applyRegulationCode ── */
export function applyRegulationCode(
  code: RegulationCode,
  input: LandInput,
): RegulationResult {
  const classification = classifyLand(input);
  const warnings: string[] = [];
  const errors:   string[] = [];

  const { streetWidths, landArea } = input;

  // Determine main street direction (widest)
  const entries = Object.entries(streetWidths) as [string, number | undefined][];
  const mainEntry = entries.reduce<[string, number]>(
    (best, [d, w]) => ((w ?? 0) > best[1] ? [d, w ?? 0] : best),
    ['', 0],
  );
  const mainDir   = mainEntry[0];
  const mainWidth = mainEntry[1];

  // Setback per direction
  const setback = (dir: string): number => {
    const w = streetWidths[dir as keyof typeof streetWidths] ?? 0;
    if (!w) return 0; // neighbour — no street setback from engine (keep at 0; page adds neighbour setback separately)

    if (dir === mainDir) {
      // Main street setback
      if (code.setbacks.mainStreetValue > 0) return code.setbacks.mainStreetValue;
      return Math.max(mainWidth / 5, 2);
    }
    // Secondary street setback
    return calculateSetback(
      code.setbacks.secondaryStreetFormula,
      w,
      code.setbacks.secondaryStreetMin,
      code.setbacks.mainStreetValue,
    );
  };

  const appliedSetbacks = {
    north: setback('north'),
    south: setback('south'),
    east:  setback('east'),
    west:  setback('west'),
  };

  // Effective build area (ground floor)
  const effectiveBuildArea = Math.max(
    0,
    landArea * code.groundCoverageGround,
  );

  // Validate street width
  if (mainWidth < code.minStreetWidth) {
    warnings.push(`عرض الشارع ${mainWidth}م أقل من الحد الأدنى المطلوب ${code.minStreetWidth}م لهذا الكود`);
  }

  const maxFloorLabel = code.hasAnnex
    ? `${code.maxFloors} أدوار + ملحق (${code.annexPct * 100}٪)`
    : `${code.maxFloors} أدوار`;

  return {
    code,
    classification,
    appliedSetbacks,
    effectiveBuildArea,
    maxFloorLabel,
    warnings,
    errors,
    isValid: errors.length === 0,
  };
}

/* ── validateFloors ── */
export function validateFloors(
  requestedFloors: number,
  code: RegulationCode,
): { valid: boolean; correctedFloors: number; message: string } {
  if (requestedFloors <= code.maxFloors) {
    return { valid: true, correctedFloors: requestedFloors, message: '' };
  }
  return {
    valid: false,
    correctedFloors: code.maxFloors,
    message: `الكود ${code.code} يسمح بحد أقصى ${code.maxFloors} أدوار، تم التصحيح تلقائياً`,
  };
}

/* ── suggestCodes ── */
export function suggestCodes(input: LandInput): RegulationCode[] {
  const classification = classifyLand(input);

  return BUILDING_CODES
    .filter(c => {
      // Match land type
      if (input.landType === 'سكني'  && c.landType !== 'سكني')  return false;
      if (input.landType === 'تجاري' && c.landType !== 'تجاري') return false;
      // Minimum street width
      if (classification.mainStreetWidth < c.minStreetWidth) return false;
      return true;
    })
    .sort((a, b) => {
      // Prefer codes matching desirability: higher floors for larger/better-positioned land
      const aScore = a.maxFloors + (a.groundCoverageGround * 10);
      const bScore = b.maxFloors + (b.groundCoverageGround * 10);
      return bScore - aScore;
    });
}

/* ── calculateParking ── */
export function calculateParking(
  code: RegulationCode,
  units: number,
  totalArea: number,
  avgUnitArea?: number,
): number {
  let total = 0;
  for (const rule of code.parkingRules) {
    if (rule.condition === 'per_sqm') {
      const sqmPerSpot = rule.sqmPerSpot ?? 30;
      total += Math.ceil(totalArea / sqmPerSpot) * rule.spots;
    } else if (rule.condition === 'per_unit_small') {
      const threshold = rule.threshold ?? 120;
      const unitArea  = avgUnitArea ?? (totalArea / Math.max(units, 1));
      if (unitArea <= threshold) {
        total += units * rule.spots;
      }
    } else if (rule.condition === 'per_unit_large') {
      const threshold = rule.threshold ?? 120;
      const unitArea  = avgUnitArea ?? (totalArea / Math.max(units, 1));
      if (unitArea > threshold) {
        total += units * rule.spots;
      }
    }
  }
  return Math.ceil(total);
}

/* ── convenience wrapper (backward compat) ── */
export function checkRegulation(input: { zoningCode: string; landArea: number; floors: number; gcr: number }) {
  const code = getBuildingCode(input.zoningCode);
  if (!code) {
    return { isCompliant: false, violations: ['كود النظام غير معروف'], warnings: [], maxBuildableArea: 0, maxFloors: 0, effectiveGCR: 0 };
  }
  const violations: string[] = [];
  const warnings:   string[] = [];
  if (input.floors > code.maxFloors)                violations.push(`عدد الأدوار ${input.floors} يتجاوز الحد ${code.maxFloors}`);
  if (input.gcr    > code.groundCoverageGround)     violations.push(`نسبة البناء ${(input.gcr * 100).toFixed(0)}٪ تتجاوز الحد ${(code.groundCoverageGround * 100).toFixed(0)}٪`);
  if (input.gcr    > code.groundCoverageGround * 0.9) warnings.push('نسبة البناء قريبة من الحد الأقصى');
  return {
    isCompliant: violations.length === 0,
    violations,
    warnings,
    maxBuildableArea: input.landArea * code.groundCoverageGround * code.maxFloors,
    maxFloors: code.maxFloors,
    effectiveGCR: Math.min(input.gcr, code.groundCoverageGround),
  };
}
