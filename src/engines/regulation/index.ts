export type { LandInput, ParkingRule, RegulationCode, LandClassification, RegulationResult } from './types';
export { BUILDING_CODES, getBuildingCode } from './buildingCodes';
export {
  classifyLand,
  calculateSetback,
  applyRegulationCode,
  validateFloors,
  suggestCodes,
  calculateParking,
  checkRegulation,
} from './regulationEngine';
