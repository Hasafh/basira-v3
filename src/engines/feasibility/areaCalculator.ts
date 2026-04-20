import type { AreaResult, UnitType } from './types';
import { SQMPERSPOT } from './types';

/** Basement covers 90% of plot area per floor (structural standard) */
const BASEMENT_COVERAGE = 0.90;

/**
 * Compute required parking spots using Saudi development standards.
 *
 * Rules (mandatory):
 *   • Unit net area < 180 m²  → 1 spot
 *   • Unit net area ≥ 180 m²  → 2 spots
 *
 * When unitMix is absent, falls back to a code-based estimate:
 *   1 spot per estimated unit (conservative default).
 */
export function calcParkingDemand(
  unitMix: UnitType[] | undefined,
  sellableArea: number,
): number {
  if (unitMix && unitMix.length > 0) {
    return unitMix.reduce((sum, u) => sum + u.count * u.parkingSpotsRequired, 0);
  }
  // Fallback: estimate one spot per unit, average unit ~100 m²
  const estimatedUnits = Math.ceil(sellableArea / 100);
  return estimatedUnits;
}

/**
 * Calculate all area components.
 *
 * DESIGN CONTRACT:
 *   • Basement is NEVER sellable — it is a cost centre only.
 *   • Parking spots are housed in the basement; they do NOT reduce sellableArea.
 *   • sellableArea === aboveGroundSellable — always, unconditionally.
 *
 * @param landArea            m²
 * @param floors              above-ground floors (≥ 1)
 * @param gcr                 ground coverage ratio (0–1), e.g. 0.60
 * @param servicesRatio       non-sellable fraction of above-ground GFA (default 0.15)
 * @param basementFloors      number of basement levels (default 0)
 * @param unitMix             optional — used for accurate parking demand
 */
export function calculateAreas(
  landArea: number,
  floors: number,
  gcr: number,
  servicesRatio = 0.15,
  basementFloors = 0,
  unitMix?: UnitType[],
): AreaResult {
  const safeFloors   = Math.max(floors,        0);
  const safeBasement = Math.max(basementFloors, 0);
  const safeGcr      = Math.min(Math.max(gcr, 0), 1);

  /* ── Above-ground ── */
  const aboveGroundGFA      = landArea * safeGcr * safeFloors;
  const aboveGroundSellable = aboveGroundGFA * (1 - servicesRatio);
  const aboveGroundServices = aboveGroundGFA - aboveGroundSellable;

  /* ── Basement ── */
  const basementGFA = landArea * BASEMENT_COVERAGE * safeBasement;

  /* ── Parking ── */
  const parkingDemandSpots  = calcParkingDemand(unitMix, aboveGroundSellable);
  const parkingSupplySpots  = basementGFA > 0 ? Math.floor(basementGFA / SQMPERSPOT) : 0;
  const parkingDeficit      = Math.max(0, parkingDemandSpots - parkingSupplySpots);
  const basementParkingArea = Math.min(parkingDemandSpots * SQMPERSPOT, basementGFA);
  const basementNonParkingArea = Math.max(0, basementGFA - basementParkingArea);

  /* ── Totals ── */
  const grossBuildArea = aboveGroundGFA + basementGFA;

  return {
    landArea,
    groundCoverageRatio: safeGcr,
    aboveGroundGFA,
    aboveGroundSellable,
    aboveGroundServices,
    basementGFA,
    basementParkingArea,
    basementNonParkingArea,
    parkingDemandSpots,
    parkingSupplySpots,
    parkingDeficit,
    grossBuildArea,
    sellableArea: aboveGroundSellable,
  };
}
