/* ── Regulation engine types ── */

export interface LandInput {
  landArea: number
  streetWidths: { north?: number; south?: number; east?: number; west?: number }
  landType: 'سكني' | 'تجاري' | 'صناعي'
  city: string
}

export interface ParkingRule {
  useType: string
  condition: 'per_unit_small' | 'per_unit_large' | 'per_sqm'
  threshold?: number
  spots: number
  sqmPerSpot?: number
}

export interface RegulationCode {
  code: string
  nameAr: string
  landType: string
  allowedUses: string[]
  maxFloors: number
  hasAnnex: boolean
  annexPct: number
  groundCoverageGround: number
  groundCoverageUpper: number
  minStreetWidth: number
  setbacks: {
    mainStreet: string
    mainStreetValue: number
    neighbor: number
    secondaryStreet: string
    secondaryStreetFormula: 'fixed' | 'fraction'
    secondaryStreetMin: number
  }
  parkingRules: ParkingRule[]
  depthRule?: string
}

export interface LandClassification {
  type: 'شارع واحد' | 'زاوية' | 'متظاهرة' | 'رأس بلك' | 'بلك'
  streetCount: number
  mainStreetWidth: number
  desirabilityScore: number
}

export interface RegulationResult {
  code: RegulationCode
  classification: LandClassification
  appliedSetbacks: { north: number; south: number; east: number; west: number }
  effectiveBuildArea: number
  maxFloorLabel: string
  warnings: string[]
  errors: string[]
  isValid: boolean
}
