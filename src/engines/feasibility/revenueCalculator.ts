import type { UnitType, UnitMixSummary, UnitRevenueRow } from './types';

/**
 * Unit-based revenue calculation.
 * This is the preferred revenue model — each unit type has its own area and price.
 */
export function calculateRevenueFromMix(unitMix: UnitType[]): UnitMixSummary {
  let totalRevenue    = 0;
  let totalArea       = 0;
  let totalUnits      = 0;
  let totalParking    = 0;

  const breakdown: UnitRevenueRow[] = unitMix.map(u => {
    const totalUnitArea = u.count * u.avgAreaM2;
    const unitRevenue   = totalUnitArea * u.pricePerM2;
    const parkingSpots  = u.count * u.parkingSpotsRequired;

    totalRevenue += unitRevenue;
    totalArea    += totalUnitArea;
    totalUnits   += u.count;
    totalParking += parkingSpots;

    return {
      category:     u.category,
      count:        u.count,
      avgAreaM2:    u.avgAreaM2,
      pricePerM2:   u.pricePerM2,
      totalArea:    totalUnitArea,
      totalRevenue: unitRevenue,
      parkingSpots,
    };
  });

  return {
    units:                unitMix,
    totalUnits,
    totalSellableArea:    totalArea,
    totalRevenue,
    blendedPricePerM2:    totalArea > 0 ? totalRevenue / totalArea : 0,
    totalParkingRequired: totalParking,
    breakdown,
  };
}

/**
 * Blended-price revenue — fallback when no unit mix is provided.
 * Kept for backward compatibility and the Quick Scanner.
 */
export function calculateRevenue(sellableArea: number, sellPricePerM2: number): number {
  return sellableArea * sellPricePerM2;
}

/**
 * Rental revenue — for hold/operate strategy.
 */
export function calculateRentalRevenue(
  sellableArea: number,
  rentPerM2Year: number,
  occupancyRate = 0.90,
): { annualRent: number; capitalisedValue: number; yieldPct: number } {
  const annualRent       = sellableArea * rentPerM2Year * occupancyRate;
  const yieldPct         = rentPerM2Year > 0 ? occupancyRate * 100 : 0;
  const capitalisedValue = yieldPct > 0 ? (annualRent / yieldPct) * 100 : 0;
  return { annualRent, capitalisedValue, yieldPct };
}

/**
 * Derive parking spots required for a unit.
 * Saudi Development Standards (mandatory):
 *   unit net area < 180 m²  → 1 spot
 *   unit net area ≥ 180 m²  → 2 spots
 */
export function parkingSpotsForUnit(avgAreaM2: number): number {
  return avgAreaM2 < 180 ? 1 : 2;
}

/**
 * Enrich a raw unit array by computing parkingSpotsRequired for each unit.
 * Call this whenever unit mix is created or edited.
 */
export function enrichUnitMix(units: Omit<UnitType, 'parkingSpotsRequired'>[]): UnitType[] {
  return units.map(u => ({
    ...u,
    parkingSpotsRequired: parkingSpotsForUnit(u.avgAreaM2),
  }));
}
