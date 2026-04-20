import type { LocationConfig, LandFeature } from '../types/report';

export type { LocationConfig };

export interface ZoningAmenityWeights {
  mosque:       number;
  supermarket:  number;
  mall:         number;
  school:       number;
  park:         number;
  metro:        number;
  bus:          number;
}

export interface ZoningInfraWeights {
  electricity: number;
  water:       number;
  sewage:      number;
  fiber:       number;
  flood:       number;
}

export interface ZoningConfig {
  code:      string;
  label:     string;
  usageType: 'residential' | 'commercial' | 'office' | 'mixed';

  rules: {
    idealStreetWidth: number;
    minStreetWidth:   number;
    maxFloors?:       number;
    minLandArea?:     number;
  };

  weights: {
    streetWidth:    number;
    amenities:      number;
    infrastructure: number;
    location:       number;
  };

  amenityWeights: ZoningAmenityWeights;
  infraWeights:   ZoningInfraWeights;

  landAdvantages: {
    trigger:   string;
    advantage: string;
    weight:    'high' | 'medium' | 'low';
  }[];

  /** مزايا الموقع المرجحة — مرتبطة بالكود مباشرة */
  locationFeatures?: {
    features: LandFeature[];
  };
}

// ── مزايا سكنية افتراضية ──────────────────────────
const residentialFeatures = (streetW: number, infraW: number): LandFeature[] => {
  const rem = 100 - streetW - infraW;
  return [
    { key: 'streetWidth',    label: 'عرض الشارع',   weight: streetW           },
    { key: 'mosque',         label: 'قرب مسجد',      weight: Math.round(rem * 0.30) },
    { key: 'school',         label: 'قرب مدرسة',     weight: Math.round(rem * 0.28) },
    { key: 'supermarket',    label: 'قرب سوبرماركت', weight: Math.round(rem * 0.22) },
    { key: 'park',           label: 'قرب حديقة',     weight: Math.round(rem * 0.12) },
    { key: 'metro',          label: 'قرب مترو',      weight: Math.round(rem * 0.08) },
    { key: 'infrastructure', label: 'البنية التحتية', weight: infraW           },
  ];
};

const commercialFeatures = (streetW: number, infraW: number): LandFeature[] => {
  const rem = 100 - streetW - infraW;
  return [
    { key: 'streetWidth',    label: 'عرض الشارع',   weight: streetW           },
    { key: 'metro',          label: 'قرب مترو',      weight: Math.round(rem * 0.35) },
    { key: 'mall',           label: 'قرب مول',       weight: Math.round(rem * 0.30) },
    { key: 'supermarket',    label: 'قرب سوبرماركت', weight: Math.round(rem * 0.20) },
    { key: 'mosque',         label: 'قرب مسجد',      weight: Math.round(rem * 0.08) },
    { key: 'park',           label: 'قرب حديقة',     weight: Math.round(rem * 0.07) },
    { key: 'infrastructure', label: 'البنية التحتية', weight: infraW           },
  ];
};

// ── أكواد البناء السعودية + أكواد مخصصة (مطابقة لنموذج الإدخال) ──
export const DEFAULT_ZONING_CONFIGS: ZoningConfig[] = [
  // ── س111 ── سكني فيلا (≤500م²) ────────────────────
  {
    code: 'س111', label: 'سكني — فيلا (أرض ≤500م²)', usageType: 'residential',
    rules: { idealStreetWidth: 20, minStreetWidth: 10, maxFloors: 3 },
    weights: { streetWidth: 0.25, amenities: 0.30, infrastructure: 0.25, location: 0.20 },
    amenityWeights: { mosque: 0.25, supermarket: 0.15, school: 0.25, park: 0.15, mall: 0.08, metro: 0.07, bus: 0.05 },
    infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'واجهة على شارع مناسب للفيلات يعزز القيمة التسويقية', weight: 'high' },
      { trigger: 'landArea >= 500',                 advantage: 'مساحة الأرض مثالية لتصميم فيلا مريحة مع حديقة', weight: 'medium' },
    ],
    locationFeatures: { features: residentialFeatures(25, 15) },
  },
  // ── س112 ── سكني فيلا (>500م²) ────────────────────
  {
    code: 'س112', label: 'سكني — فيلا (أرض >500م²)', usageType: 'residential',
    rules: { idealStreetWidth: 25, minStreetWidth: 15, maxFloors: 3 },
    weights: { streetWidth: 0.25, amenities: 0.30, infrastructure: 0.25, location: 0.20 },
    amenityWeights: { mosque: 0.25, supermarket: 0.15, school: 0.25, park: 0.15, mall: 0.08, metro: 0.07, bus: 0.05 },
    infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'شارع واسع يناسب الفيلات الكبيرة ويتيح مداخل متعددة', weight: 'high' },
      { trigger: 'landArea >= 800',                 advantage: 'مساحة الأرض تتيح فيلا فاخرة مع مسبح وحديقة', weight: 'high' },
    ],
    locationFeatures: { features: residentialFeatures(25, 15) },
  },
  // ── س121 ── سكني شقق منخفض الارتفاع (≤4 أدوار) ───
  {
    code: 'س121', label: 'سكني — شقق منخفض الارتفاع (≤4 أدوار)', usageType: 'residential',
    rules: { idealStreetWidth: 30, minStreetWidth: 20, maxFloors: 5, minLandArea: 400 },
    weights: { streetWidth: 0.30, amenities: 0.28, infrastructure: 0.22, location: 0.20 },
    amenityWeights: { mosque: 0.22, supermarket: 0.18, school: 0.22, park: 0.12, mall: 0.10, metro: 0.10, bus: 0.06 },
    infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'عرض الشارع مناسب لمبنى شقق منخفض مع واجهة جيدة', weight: 'high' },
      { trigger: 'landArea >= 600',                 advantage: 'المساحة تتيح 4 وحدات بمواقف كافية', weight: 'medium' },
    ],
    locationFeatures: { features: residentialFeatures(30, 12) },
  },
  // ── س122 ── سكني شقق متوسط الارتفاع (5-9 أدوار) ──
  {
    code: 'س122', label: 'سكني — شقق متوسط الارتفاع (5–9 أدوار)', usageType: 'residential',
    rules: { idealStreetWidth: 50, minStreetWidth: 30, maxFloors: 10, minLandArea: 600 },
    weights: { streetWidth: 0.35, amenities: 0.25, infrastructure: 0.22, location: 0.18 },
    amenityWeights: { mosque: 0.18, supermarket: 0.20, school: 0.20, park: 0.10, mall: 0.12, metro: 0.14, bus: 0.06 },
    infraWeights:   { electricity: 0.28, water: 0.25, sewage: 0.25, fiber: 0.12, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'شارع رئيسي واسع يمكّن من 9 أدوار مع مداخل متعددة', weight: 'high' },
      { trigger: 'floorsCount >= 7',                advantage: 'استغلال أقصى للأدوار يرفع الإيرادات بشكل ملحوظ', weight: 'high' },
      { trigger: 'landArea >= 800',                 advantage: 'المساحة مناسبة لمواقف سيارات سفلية', weight: 'medium' },
    ],
    locationFeatures: { features: residentialFeatures(35, 12) },
  },
  // ── ت111 ── تجاري محلات (شارع ≤30م) ───────────────
  {
    code: 'ت111', label: 'تجاري — محلات تجارية (شارع ≤30م)', usageType: 'commercial',
    rules: { idealStreetWidth: 30, minStreetWidth: 15, maxFloors: 3 },
    weights: { streetWidth: 0.40, amenities: 0.22, infrastructure: 0.18, location: 0.20 },
    amenityWeights: { mosque: 0.08, supermarket: 0.12, school: 0.05, park: 0.08, mall: 0.32, metro: 0.22, bus: 0.13 },
    infraWeights:   { electricity: 0.28, water: 0.20, sewage: 0.20, fiber: 0.22, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'الشارع الرئيسي يعزز الظهور التجاري وحركة العملاء', weight: 'high' },
      { trigger: 'streetWidth >= minStreetWidth && streetWidth < idealStreetWidth', advantage: 'الموقع يحتاج تخطيطاً دقيقاً للمداخل', weight: 'low' },
    ],
    locationFeatures: { features: commercialFeatures(30, 10) },
  },
  // ── ت121 ── تجاري مكاتب ومختلط (شارع >30م) ────────
  {
    code: 'ت121', label: 'تجاري — مكاتب ومختلط (شارع >30م)', usageType: 'mixed',
    rules: { idealStreetWidth: 50, minStreetWidth: 30, maxFloors: 7 },
    weights: { streetWidth: 0.38, amenities: 0.22, infrastructure: 0.20, location: 0.20 },
    amenityWeights: { mosque: 0.06, supermarket: 0.10, school: 0.05, park: 0.07, mall: 0.28, metro: 0.30, bus: 0.14 },
    infraWeights:   { electricity: 0.28, water: 0.20, sewage: 0.20, fiber: 0.22, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'شارع رئيسي يمكّن من مبنى مكتبي بارز يتيح مداخل متعددة', weight: 'high' },
      { trigger: 'floorsCount >= 5',                advantage: 'الكود يسمح بأدوار متعددة تعظّم إيرادات الإيجار', weight: 'high' },
    ],
    locationFeatures: { features: commercialFeatures(32, 10) },
  },
  // ── كود-1 ── سكني فلل عام ─────────────────────────
  {
    code: 'كود-1', label: 'سكني — فلل، فلل متلاصقة، أدوار سكنية', usageType: 'residential',
    rules: { idealStreetWidth: 25, minStreetWidth: 10, maxFloors: 3 },
    weights: { streetWidth: 0.25, amenities: 0.30, infrastructure: 0.25, location: 0.20 },
    amenityWeights: { mosque: 0.25, supermarket: 0.15, school: 0.25, park: 0.15, mall: 0.08, metro: 0.07, bus: 0.05 },
    infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'واجهة على شارع واسع تعزز القيمة السوقية', weight: 'high' },
      { trigger: 'landArea >= 400',                 advantage: 'مساحة مناسبة للفيلا بحديقة ومرآب', weight: 'medium' },
    ],
    locationFeatures: { features: residentialFeatures(25, 15) },
  },
  // ── كود-2 ── مختلط ─────────────────────────────────
  {
    code: 'كود-2', label: 'مختلط — سكني / تجاري / مكتبي', usageType: 'mixed',
    rules: { idealStreetWidth: 40, minStreetWidth: 30, maxFloors: 3 },
    weights: { streetWidth: 0.35, amenities: 0.25, infrastructure: 0.20, location: 0.20 },
    amenityWeights: { mosque: 0.10, supermarket: 0.15, school: 0.10, park: 0.08, mall: 0.25, metro: 0.22, bus: 0.10 },
    infraWeights:   { electricity: 0.28, water: 0.20, sewage: 0.20, fiber: 0.22, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'الشارع الرئيسي يدعم الاستخدام المختلط ويجذب حركة العملاء', weight: 'high' },
    ],
    locationFeatures: {
      features: [
        { key: 'streetWidth',    label: 'عرض الشارع',   weight: 30 },
        { key: 'metro',          label: 'قرب مترو',      weight: 18 },
        { key: 'mall',           label: 'قرب مول',       weight: 15 },
        { key: 'supermarket',    label: 'قرب سوبرماركت', weight: 12 },
        { key: 'mosque',         label: 'قرب مسجد',      weight: 8  },
        { key: 'school',         label: 'قرب مدرسة',     weight: 7  },
        { key: 'park',           label: 'قرب حديقة',     weight: 5  },
        { key: 'infrastructure', label: 'البنية التحتية', weight: 5  },
      ],
    },
  },
  // ── كود-3 ── شقق سكنية ────────────────────────────
  {
    code: 'كود-3', label: 'شقق سكنية', usageType: 'residential',
    rules: { idealStreetWidth: 40, minStreetWidth: 30, maxFloors: 4, minLandArea: 400 },
    weights: { streetWidth: 0.30, amenities: 0.28, infrastructure: 0.22, location: 0.20 },
    amenityWeights: { mosque: 0.20, supermarket: 0.18, school: 0.20, park: 0.12, mall: 0.12, metro: 0.12, bus: 0.06 },
    infraWeights:   { electricity: 0.25, water: 0.25, sewage: 0.25, fiber: 0.15, flood: 0.10 },
    landAdvantages: [
      { trigger: 'streetWidth >= idealStreetWidth', advantage: 'شارع واسع يرفع الطلب السكني ويتيح تصميم واجهة متميزة', weight: 'high' },
      { trigger: 'landArea >= 600',                 advantage: 'المساحة تتيح وحدات متعددة مع مواقف سيارات كافية', weight: 'medium' },
    ],
    locationFeatures: { features: residentialFeatures(32, 12) },
  },
];

// ── إعدادات الموقع الافتراضية ─────────────────────
export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  weights: {
    zoningFit:      30,
    accessibility:  25,
    amenities:      25,
    infrastructure: 20,
  },
  usageRules: {
    residential: { minStreetWidth: 10, idealStreetWidth: 25 },
    commercial:  { minStreetWidth: 15, idealStreetWidth: 40 },
    office:      { minStreetWidth: 20, idealStreetWidth: 35 },
  },
};

// ── دمج LocationConfig مع ZoningConfig[] ──────────
export function applyLocationConfig(
  zoningConfigs: ZoningConfig[],
  lc: LocationConfig,
): ZoningConfig[] {
  const total = lc.weights.zoningFit + lc.weights.accessibility +
    lc.weights.amenities + lc.weights.infrastructure || 100;

  const streetW    = (lc.weights.zoningFit + lc.weights.accessibility) / total;
  const amenitiesW = lc.weights.amenities      / total;
  const infraW     = lc.weights.infrastructure / total;

  return zoningConfigs.map(z => {
    const usageRule =
      z.usageType === 'commercial' ? lc.usageRules.commercial
      : z.usageType === 'office'   ? lc.usageRules.office
      : lc.usageRules.residential;

    return {
      ...z,
      weights: {
        streetWidth:    streetW,
        amenities:      amenitiesW,
        infrastructure: infraW,
        location:       Math.max(0, 1 - streetW - amenitiesW - infraW),
      },
      rules: {
        ...z.rules,
        minStreetWidth:   usageRule.minStreetWidth,
        idealStreetWidth: usageRule.idealStreetWidth,
      },
    };
  });
}
