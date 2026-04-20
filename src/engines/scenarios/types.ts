/* ── Scenario engine types ── */

/* ── kept from original ── */
export interface SensitivityVar {
  name: string
  low: number
  base: number
  high: number
  impact: number   // % impact on net profit
}

export interface Scenario {
  label: string
  priceMultiplier: number
  costMultiplier: number
  net: number
  irr: number
  margin: number
}

export interface HBUOption {
  usageType: string
  floors: number
  revenue: number
  totalCost: number
  net: number
  irr: number
  margin: number
  isOptimal: boolean
}

export interface AuctionBid {
  startPrice: number
  maxBid: number
  recommendedBid: number
  dscr: number | null
  ltc: number | null
}

export interface TimeSensitivityRow {
  delay: number
  totalCost: number
  revenue: number
  net: number
  irr: number
  status: 'safe' | 'warn' | 'danger'
}

/* ── Sensitivity matrix ── */
export interface SensitivityRow {
  pct: number    // % change applied to the varied input
  irr: number
  margin: number
  net: number
}

export type SensitivityMatrixData = Record<string, SensitivityRow[]>

export interface SensitivityMatrixResult {
  matrix: SensitivityMatrixData
  baseIRR: number
  baseMargin: number
  isApproximate: boolean
}

/* ── Stress test ── */
export interface PriceDropRow {
  dropPct: number
  adjRevenue: number
  adjNet: number
  adjMargin: number
  adjIRR: number
}

export interface DelayScenarioRow {
  delayMonths: number
  additionalCost: number
  adjustedNet: number
  adjustedMargin: number
}

export interface StressTestResult {
  breakEvenPricePerM2: number
  priceDropTolerance: number       // % drop before net goes negative
  priceDropScenarios: PriceDropRow[]
  delayScenarios: DelayScenarioRow[]
}

/* ── HBU ── */
export interface HBUScenario {
  id: string
  label: string
  landType: string
  usageType: string
  floors: number
  gcr: number
  buildCost: number   // SAR / m² hard cost
}

export interface HBUResult {
  irr: number
  margin: number
  net: number
  revenue: number
  totalCost: number
  nla: number
  gfa: number
}

/* ── Auction ── */
export interface BidTier {
  perM2: number
  total: number
  probability: number   // % win probability
}

export interface AuctionFallbackResult {
  conservative: BidTier
  moderate: BidTier
  aggressive: BidTier
  maxLandPerM2: number
  breakEvenPerM2: number
  safetyMargin: number | null
  dscr: number | null
  recommend: string | null
  revenue: number
  isApproximate: boolean
}

/* ── Duration / timing ── */
export interface TimingRow {
  months: number
  adjNet: number
  irr: number
  margin: number
  bankInterest: number
}

export interface DelayRow {
  delayM: number
  addCost: number
  adjNet: number
  irr: number
  dscr: number | null
  status: 'safe' | 'warn' | 'danger'
}
