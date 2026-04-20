import type { ZoningConfig } from '../config/locationConfig';
import type { LocationConfig, LocationScoreResult } from '../types/report';

type ProjectInput = {
  usageType?:  string;
  zoningCode?: string;
  streetWidth?: number;
  floorsCount?: number;
  landArea?:   number;
  location?:   string;
  // amenity proximity flags (undefined = unknown → neutral 0.5)
  hasMosqueNearby?:      boolean;
  hasSchoolNearby?:      boolean;
  hasMallNearby?:        boolean;
  hasSupermarketNearby?: boolean;
  hasParkNearby?:        boolean;
  hasMetroNearby?:       boolean;
  hasBusNearby?:         boolean;
  infrastructureScore?:  number;   // 0-1
};

// ── المحرك الرئيسي ────────────────────────────────
export function calculateLocationScore(
  project: ProjectInput,
  zoningConfigs: ZoningConfig[],
  locationConfig?: LocationConfig,
): LocationScoreResult {
  const config =
    zoningConfigs.find(z => z.code === project.zoningCode) ??
    zoningConfigs.find(z => z.usageType === normalizeUsage(project.usageType)) ??
    zoningConfigs[0];

  if (!config) return fallbackScore();

  const positives: string[] = [];
  const cautions:  string[] = [];
  const streetWidth = project.streetWidth ?? 0;

  // ── Street Width Score ────────────────────────────
  let streetScore: number;
  if (streetWidth >= config.rules.idealStreetWidth) {
    streetScore = 100;
    positives.push(`عرض الشارع ${streetWidth}م يتجاوز المثالي لكود ${config.code}`);
  } else if (streetWidth >= config.rules.minStreetWidth) {
    const ratio =
      (streetWidth - config.rules.minStreetWidth) /
      (config.rules.idealStreetWidth - config.rules.minStreetWidth);
    streetScore = Math.round(50 + ratio * 40);
    if (config.rules.idealStreetWidth - streetWidth > 5)
      cautions.push(
        `عرض الشارع ${streetWidth}م مقبول؛ الأمثل لهذا الكود ${config.rules.idealStreetWidth}م`,
      );
  } else if (streetWidth > 0) {
    streetScore = 25;
    cautions.push(
      `عرض الشارع ${streetWidth}م أقل من الحد الأدنى ${config.rules.minStreetWidth}م لكود ${config.code}`,
    );
  } else {
    streetScore = 50;
    cautions.push('لم يُحدد عرض الشارع — التقييم تقديري');
  }

  // ── Amenities Score ───────────────────────────────
  const amenitiesScore = 62;

  // ── Infrastructure Score ──────────────────────────
  let infraScore = 60;
  if (streetWidth >= 20) {
    infraScore = 80;
    positives.push('عرض الشارع يدل على شبكة بنية تحتية جيدة');
  }
  if ((project.landArea ?? 0) >= (config.rules.minLandArea ?? 400)) {
    infraScore = Math.min(100, infraScore + 10);
    positives.push(
      `مساحة الأرض ${project.landArea?.toLocaleString()} م² تلبّي الحد الأدنى لكود ${config.code}`,
    );
  }

  // ── Location Score ────────────────────────────────
  const locationScore = 65;

  // ── الحساب النهائي ────────────────────────────────
  const total = Math.round(
    streetScore    * config.weights.streetWidth    +
    amenitiesScore * config.weights.amenities      +
    infraScore     * config.weights.infrastructure +
    locationScore  * config.weights.location,
  );

  // ── مزايا الأرض ───────────────────────────────────
  const triggeredAdvantages = config.landAdvantages
    .filter(adv => evaluateTrigger(adv.trigger, project, config))
    .map(adv => adv.advantage);

  positives.push(...triggeredAdvantages.slice(0, 3));

  const baseResult: LocationScoreResult = {
    totalScore: Math.min(100, Math.max(0, total)),
    grade:      getGrade(total),
    breakdown: {
      zoningFit:      streetScore,
      accessibility:  streetScore,
      amenities:      amenitiesScore,
      infrastructure: infraScore,
    },
    positives: positives.slice(0, 4),
    cautions:  cautions.slice(0, 3),
    narrative: generateLocationNarrative(total, positives, cautions, config),
    dataSource: 'derived',
  };

  // ── طبقة مزايا الأرض ─────────────────────────────
  // الأولوية 1: ZoningConfig.locationFeatures (من الـ store — مطابق للكود الفعلي)
  if (config.locationFeatures && config.locationFeatures.features.length > 0) {
    const synthetic = {
      streetRules: { min: config.rules.minStreetWidth, ideal: config.rules.idealStreetWidth },
      features:    config.locationFeatures.features,
    };
    return applyFeatureScore(baseResult, project, synthetic, config);
  }
  // الأولوية 2: LocationConfig.landFeaturesByCode (احتياطي)
  if (locationConfig?.landFeaturesByCode && project.zoningCode) {
    const codeFeatures = locationConfig.landFeaturesByCode[project.zoningCode];
    if (codeFeatures && codeFeatures.features.length > 0) {
      return applyFeatureScore(baseResult, project, codeFeatures, config);
    }
  }

  return baseResult;
}

// ── حساب طبقة المزايا ────────────────────────────
function applyFeatureScore(
  base:         LocationScoreResult,
  project:      ProjectInput,
  codeFeatures: NonNullable<LocationConfig['landFeaturesByCode']>[string],
  config:       ZoningConfig,
): LocationScoreResult {
  const sw = project.streetWidth ?? 0;
  let featureScore = 0;
  const featureBreakdown: { key: string; label: string; value: number; weight: number }[] = [];

  codeFeatures.features.forEach(f => {
    let value: number;
    switch (f.key) {
      case 'streetWidth':
        if (sw >= codeFeatures.streetRules.ideal) value = 1;
        else if (sw <= 0) value = 0.5;
        else if (sw < codeFeatures.streetRules.min) value = 0;
        else value = 0.5 + 0.5 * (sw - codeFeatures.streetRules.min) /
          (codeFeatures.streetRules.ideal - codeFeatures.streetRules.min);
        break;
      case 'mosque':      value = project.hasMosqueNearby      === undefined ? 0.5 : project.hasMosqueNearby      ? 1 : 0; break;
      case 'supermarket': value = project.hasSupermarketNearby === undefined ? 0.5 : project.hasSupermarketNearby ? 1 : 0; break;
      case 'school':      value = project.hasSchoolNearby      === undefined ? 0.5 : project.hasSchoolNearby      ? 1 : 0; break;
      case 'mall':        value = project.hasMallNearby        === undefined ? 0.5 : project.hasMallNearby        ? 1 : 0; break;
      case 'park':        value = project.hasParkNearby        === undefined ? 0.5 : project.hasParkNearby        ? 1 : 0; break;
      case 'metro':       value = project.hasMetroNearby       === undefined ? 0.5 : project.hasMetroNearby       ? 1 : 0; break;
      case 'bus':         value = project.hasBusNearby         === undefined ? 0.5 : project.hasBusNearby         ? 1 : 0; break;
      case 'infrastructure': value = project.infrastructureScore ?? 0.7; break;
      default:            value = 0.5; break;
    }
    featureScore += value * (f.weight / 100);
    featureBreakdown.push({ key: f.key, label: f.label, value: Math.round(value * 100), weight: f.weight });
  });

  const finalScore = Math.min(100, Math.max(0, Math.round(featureScore * 100)));
  const narrative  =
    generateLocationNarrative(finalScore, base.positives, base.cautions, config) +
    ` حقّق الموقع درجة ${finalScore}/100 بناءً على تقييم مزايا الأرض المرتبطة بالكود (${config.code}).`;

  return {
    ...base,
    totalScore:       finalScore,
    grade:            getGrade(finalScore),
    narrative,
    featureScore:     finalScore,
    featureBreakdown,
  };
}

// ── مزايا الأرض القابلة للعرض ─────────────────────
export function getLandAdvantages(
  project: Record<string, unknown>,
  zoningConfigs: ZoningConfig[],
): { advantage: string; weight: 'high' | 'medium' | 'low' }[] {
  const config =
    zoningConfigs.find(z => z.code === project.zoningCode) ??
    zoningConfigs.find(z => z.usageType === normalizeUsage(project.usageType as string | undefined));

  if (!config) return [];

  return config.landAdvantages
    .filter(adv => evaluateTrigger(adv.trigger, project, config))
    .map(adv => ({ advantage: adv.advantage, weight: adv.weight }));
}

// ── تقييم الشرط ───────────────────────────────────
function evaluateTrigger(
  trigger: string,
  project: Record<string, unknown>,
  config: ZoningConfig,
): boolean {
  try {
    const expr = trigger
      .replace(/streetWidth/g,    String(project.streetWidth   ?? 0))
      .replace(/landArea/g,       String(project.landArea      ?? 0))
      .replace(/floorsCount/g,    String(project.floorsCount   ?? 0))
      .replace(/idealStreetWidth/g, String(config.rules.idealStreetWidth))
      .replace(/minStreetWidth/g,   String(config.rules.minStreetWidth));

    // eslint-disable-next-line no-new-func
    return (Function(`"use strict"; return (${expr})`)() as unknown) === true;
  } catch {
    return false;
  }
}

// ── مساعدات ───────────────────────────────────────
function normalizeUsage(t = ''): ZoningConfig['usageType'] {
  if (t.includes('تجار') || t.includes('commercial')) return 'commercial';
  if (t.includes('مكتب') || t.includes('office'))     return 'office';
  if (t.includes('مختلط') || t.includes('mixed'))     return 'mixed';
  return 'residential';
}

function getGrade(score: number): LocationScoreResult['grade'] {
  if (score >= 85) return 'ممتاز';
  if (score >= 70) return 'جيد جداً';
  if (score >= 55) return 'جيد';
  if (score >= 40) return 'مقبول';
  return 'ضعيف';
}

function fallbackScore(): LocationScoreResult {
  return {
    totalScore: 50,
    grade:      'مقبول',
    breakdown:  { zoningFit: 50, accessibility: 50, amenities: 50, infrastructure: 50 },
    positives:  [],
    cautions:   ['لا يوجد كود نظامي محدد — التقييم تقديري'],
    narrative:  'لم يُحدد الكود النظامي. يُنصح بإدخاله للحصول على تقييم دقيق.',
    dataSource: 'derived',
  };
}

export function generateLocationNarrative(
  score: number,
  positives: string[],
  cautions: string[],
  config: ZoningConfig,
): string {
  const usage =
    config.usageType === 'residential' ? 'السكني'
    : config.usageType === 'commercial' ? 'التجاري'
    : config.usageType === 'office'     ? 'المكتبي'
    : 'المختلط';

  const opening =
    score >= 70
      ? `يتمتع موقع المشروع بمؤشرات إيجابية وفق كود ${config.code} للاستخدام ${usage}.`
      : score >= 50
      ? `يُقدّم الموقع خصائص متوسطة تستدعي دراسة بعض العوامل وفق متطلبات كود ${config.code}.`
      : `يستدعي الموقع مراجعة دقيقة لعدد من العوامل قبل المضي في التطوير وفق كود ${config.code}.`;

  const posText = positives.slice(0, 2).length
    ? 'أبرز المزايا: ' + positives.slice(0, 2).join('؛ ') + '.'
    : '';

  const cauText = cautions.slice(0, 2).length
    ? 'نقاط للمتابعة: ' + cautions.slice(0, 2).join('؛ ') + '.'
    : '';

  return [
    opening, posText, cauText,
    'يستند هذا التقييم إلى البيانات المتاحة ويُنصح بزيارة ميدانية للتأكيد.',
  ].filter(Boolean).join(' ');
}
