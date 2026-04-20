// ── طريقة التحقق من البيانات ────────────────────────────────
export type VerificationMethod =
  | 'document'      // مستند رسمي
  | 'field_visit'   // زيارة ميدانية
  | 'third_party'   // طرف ثالث (وسيط / شركة)
  | 'unverified';   // غير موثق

export interface VerificationMeta {
  verified: boolean;
  method: VerificationMethod;
  note?: string;
}

// ── صلاحية استخدام التقرير ──────────────────────────────────
export type ReportUsage =
  | 'internal_only'           // استرشادي — داخلي فقط
  | 'external_with_warning'   // مشروط — خارجي مع تحذير
  | 'bank_ready';             // استثماري — جاهز للبنك

// ── أنواع المصادر وأوزانها ──────────────────────────────────
export type EvidenceSourceType =
  | 'government'          // وزن 1.0
  | 'certified_appraisal' // وزن 0.9
  | 'broker_data'         // وزن 0.7
  | 'internal_excel'      // وزن 0.5
  | 'manual_input';       // وزن 0.3

export const SOURCE_WEIGHTS: Record<EvidenceSourceType, number> = {
  government:          1.0,
  certified_appraisal: 0.9,
  broker_data:         0.7,
  internal_excel:      0.5,
  manual_input:        0.3,
};

// ── درجة التصنيف الرسمية ────────────────────────────────────
export type ReportGrade =
  | 'indicative'   // < 65% أو readiness ناقص
  | 'conditional'  // 65–79% مع readiness جزئي
  | 'investment';  // ≥ 80% + readiness = 100%

// ── نتيجة Quality Gate ──────────────────────────────────────
export interface GateResult {
  passed: boolean;
  readinessScore: number;      // 0–100
  missingFields: string[];
  blockedReason?: string;
}

// ── تفاصيل درجة الثقة ──────────────────────────────────────
export interface ConfidenceBreakdown {
  coverage: number;            // 0–1  (وزن 40%)
  quality: number;             // 0–1  (وزن 35%)
  consistency: number;         // 0–1  (وزن 25%)
  total: number;               // 0–100
  grade: ReportGrade;
  reasons: ConfidenceReason[];
}

export interface ConfidenceReason {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
}

// ── المدخلات الإلزامية للتقرير الاستشاري ───────────────────
export interface AdvisoryRequiredInputs {
  valuationReport: boolean;
  comparableProjects: ComparableProject[];
  marketDataSource: EvidenceSourceType | null;
  zoningDocument: 'official' | 'manual' | null;
  contractorQuotes: number;
  landLegalStatus: boolean;
}

export interface ComparableProject {
  name: string;
  location: string;
  sellPricePerSqm: number;
  soldUnitsPercent: number;
  deliveryMonths: number;
  sourceType: EvidenceSourceType;
  verification?: VerificationMeta;   // توثيق فعلي للبيانات
}

// ── Snapshot للتخزين والمعايرة لاحقاً ──────────────────────
export interface ProjectSnapshot {
  projectId: string;
  timestamp: Date;
  landPrice: number;
  sellPrice: number;
  buildCost: number;
  confidence: ConfidenceBreakdown;
  readinessScore: number;
  grade: ReportGrade;
  predictedIRR: number;
  predictedNPV: number;
  predictedDuration: number;
}

export interface ActualOutcome {
  projectId: string;
  actualIRR: number;
  actualDuration: number;
  actualSellPrice: number;
  completedAt: Date;
}

// ── Data Source Layer ─────────────────────────────────────────
export type DataSourceType = 'manual' | 'derived' | 'erp' | 'market';

export interface DataPoint<T = number> {
  value:       T;
  source:      DataSourceType;
  confidence?: number;
  note?:       string;
}

export function dataPoint<T>(
  value: T,
  source: DataSourceType = 'manual',
  confidence?: number,
): DataPoint<T> {
  return { value, source, confidence };
}

export function sourceLabel(source: DataSourceType): string {
  switch (source) {
    case 'manual':  return 'بيانات مدخلة من المستخدم';
    case 'derived': return 'محتسب تلقائياً';
    case 'erp':     return 'من نظام ERP';
    case 'market':  return 'بيانات سوق';
  }
}

// ── ميزة أرض مرتبطة بكود نظامي ─────────────────────────────
export interface LandFeature {
  key:    string;
  label:  string;
  weight: number;   // 0-100 (مجموع الميزات لكل كود = 100)
}

export interface CodeFeatureConfig {
  streetRules: { min: number; ideal: number };
  features:    LandFeature[];
}

// ── إعدادات تقييم الموقع (قابلة للتخصيص) ───────────────────
export interface LocationConfig {
  weights: {
    zoningFit:      number;   // 0-100
    accessibility:  number;   // 0-100
    amenities:      number;   // 0-100
    infrastructure: number;   // 0-100
  };
  usageRules: {
    residential: { minStreetWidth: number; idealStreetWidth: number };
    commercial:  { minStreetWidth: number; idealStreetWidth: number };
    office:      { minStreetWidth: number; idealStreetWidth: number };
  };
  landFeaturesByCode?: Record<string, CodeFeatureConfig>;
}

// ── نتيجة تقييم الموقع ──────────────────────────────────────
export interface LocationScoreResult {
  totalScore:  number;
  grade:       'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'ضعيف';
  breakdown: {
    zoningFit:      number;
    accessibility:  number;
    amenities:      number;
    infrastructure: number;
  };
  positives:  string[];
  cautions:   string[];
  narrative:  string;
  dataSource: 'derived' | 'api';
  featureScore?:     number;
  featureBreakdown?: { key: string; label: string; value: number; weight: number }[];
}

// ── Report Builder ────────────────────────────────

export type ReportTarget =
  | 'internal'
  | 'bank'
  | 'individual'
  | 'institutional';

export interface ProfitDistributionConfig {
  bankFinancingPercent:        number;
  developerCapitalPercent:     number;
  investorCapitalPercent:      number;
  developerFeeOnConstruction:  number;
  developerProfitSharePercent: number;
  bankInterestRate:            number;
}

export interface ReportUnitRow {
  id:               string;
  typeName:         string;
  areaSqm:          number;
  count:            number;
  sellPricePerUnit: number;
  totalRevenue:     number; // count × sellPricePerUnit
}

export interface ReportBuilderData {
  projectBrief:       string;
  projectAdvantages:  string;
  pricingAnalysis:    string;
  executiveSummary:   string;
  unitTypes:          ReportUnitRow[];
  distributionConfig: ProfitDistributionConfig | null;
  target:             ReportTarget | null;
  targetName:         string;
  investorOwnCapital: number;
  lastGeneratedAt?:   string;
}
