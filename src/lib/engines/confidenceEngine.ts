import type {
  AdvisoryRequiredInputs,
  ConfidenceBreakdown,
  ConfidenceReason,
  GateResult,
  ReportGrade,
  ReportUsage,
} from '../types/report';
import { SOURCE_WEIGHTS } from '../types/report';

export function calculateReadiness(inputs: AdvisoryRequiredInputs): GateResult {
  const missing: string[] = [];

  if (!inputs.valuationReport)
    missing.push('تقييم عقاري معتمد من مقيّم مرخص');

  if (inputs.comparableProjects.length < 3)
    missing.push(`مشاريع مقارنة — مطلوب 3 على الأقل (موجود: ${inputs.comparableProjects.length})`);

  if (!inputs.marketDataSource)
    missing.push('مصدر بيانات السوق (وزارة العدل / إتقان / تقييم)');

  if (!inputs.zoningDocument)
    missing.push('الكود النظامي — وثيقة رسمية أو إدخال موثّق');

  if (inputs.contractorQuotes < 3)
    missing.push(`عروض مقاولين — مطلوب 3 (موجود: ${inputs.contractorQuotes})`);

  if (!inputs.landLegalStatus)
    missing.push('إقرار خلو الأرض من النزاعات القانونية');

  const readinessScore = Math.round(((6 - missing.length) / 6) * 100);

  return {
    passed: missing.length === 0,
    readinessScore,
    missingFields: missing,
    blockedReason: missing.length > 0
      ? `${missing.length} متطلبات إلزامية ناقصة`
      : undefined,
  };
}

export function calculateConfidence(inputs: AdvisoryRequiredInputs): ConfidenceBreakdown {
  const reasons: ConfidenceReason[] = [];

  /* ── Coverage (40%) ── */
  const compsScore    = Math.min(inputs.comparableProjects.length / 7, 1);
  const appraisalScore = inputs.valuationReport ? 1 : 0;
  const quotesScore   = inputs.contractorQuotes >= 3 ? 1 : inputs.contractorQuotes / 3;
  const coverage = compsScore * 0.4 + appraisalScore * 0.35 + quotesScore * 0.25;

  /* ── Verification boost (applied to Quality) ── */
  const verifiedCount = inputs.comparableProjects.filter(
    p => p.verification?.verified,
  ).length;

  let verificationBoost = 0;
  if (verifiedCount >= 5) verificationBoost = 0.15;
  else if (verifiedCount >= 3) verificationBoost = 0.1;

  /* ── Quality (35%) — base + verification boost ── */
  const baseQuality = inputs.marketDataSource
    ? SOURCE_WEIGHTS[inputs.marketDataSource]
    : 0.2;

  const quality = Math.min(1, baseQuality + verificationBoost);

  /* ── Consistency (25%) ── */
  const prices = inputs.comparableProjects.map(p => p.sellPricePerSqm);
  let consistency = 0.5;
  if (prices.length >= 2) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avg) / avg));
    consistency = Math.max(0.2, Math.min(1.0, 1 - (maxDeviation - 0.1) / 0.2));
  }

  const total = Math.round(
    (0.4 * coverage + 0.35 * quality + 0.25 * consistency) * 100,
  );

  /* ── Reasons ── */
  if (appraisalScore === 1)
    reasons.push({ type: 'positive', text: 'تقييم عقاري معتمد موجود' });
  else
    reasons.push({ type: 'negative', text: 'لا يوجد تقييم عقاري' });

  if (inputs.comparableProjects.length >= 5)
    reasons.push({ type: 'positive', text: `${inputs.comparableProjects.length} مشاريع مقارنة — تغطية جيدة` });
  else if (inputs.comparableProjects.length >= 3)
    reasons.push({ type: 'neutral', text: `${inputs.comparableProjects.length} مشاريع مقارنة — الحد الأدنى` });
  else
    reasons.push({ type: 'negative', text: 'أقل من 3 مشاريع — غير كافٍ' });

  if (quality >= 0.9)
    reasons.push({ type: 'positive', text: `مصدر موثوق: ${inputs.marketDataSource}` });
  else if (quality >= 0.7)
    reasons.push({ type: 'neutral', text: `مصدر متوسط: ${inputs.marketDataSource}` });
  else
    reasons.push({ type: 'negative', text: 'مصدر بيانات ضعيف أو غير محدد' });

  if (consistency >= 0.8)
    reasons.push({ type: 'positive', text: 'أسعار المشاريع المقارنة متسقة' });
  else if (consistency >= 0.5)
    reasons.push({ type: 'neutral', text: 'تباين معتدل في أسعار المقارنة' });
  else
    reasons.push({ type: 'negative', text: 'تباين حاد في أسعار المقارنة' });

  /* ── Verification reasons ── */
  if (verifiedCount >= 3)
    reasons.push({ type: 'positive', text: `بيانات موثقة جزئياً (${verifiedCount} عناصر موثقة)` });
  else if (verifiedCount > 0)
    reasons.push({ type: 'neutral', text: `${verifiedCount} عنصر موثق — أضف المزيد لرفع الثقة` });
  else
    reasons.push({ type: 'negative', text: 'لا يوجد توثيق فعلي للبيانات' });

  const gate = calculateReadiness(inputs);
  let grade: ReportGrade;
  if (gate.passed && total >= 80) grade = 'investment';
  else if (total >= 65)           grade = 'conditional';
  else                            grade = 'indicative';

  return {
    coverage:    Math.round(coverage    * 100) / 100,
    quality:     Math.round(quality     * 100) / 100,
    consistency: Math.round(consistency * 100) / 100,
    total,
    grade,
    reasons,
  };
}

export function getMarketInsight(
  confidence: ConfidenceBreakdown,
  comparables: AdvisoryRequiredInputs['comparableProjects'],
): { signal: 'reliable' | 'weak' | 'blocked'; message: string; detail?: string } {
  if (confidence.total < 60) {
    return {
      signal:  'blocked',
      message: 'لا يمكن إصدار حكم سعري موثوق',
      detail:  'درجة الثقة منخفضة — أكمل البيانات أولاً',
    };
  }

  if (comparables.length < 3) {
    return {
      signal:  'blocked',
      message: 'بيانات مقارنة غير كافية',
      detail:  'أدخل 3 مشاريع منافسة على الأقل',
    };
  }

  const prices = comparables.map(p => p.sellPricePerSqm);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const min = Math.round(Math.min(...prices));
  const max = Math.round(Math.max(...prices));

  if (confidence.total >= 70) {
    return {
      signal:  'reliable',
      message: `نطاق السوق: ${min.toLocaleString()} – ${max.toLocaleString()} ر.س/م²`,
      detail:  `متوسط موزون: ${avg.toLocaleString()} ر.س/م² — مبني على ${comparables.length} مشاريع`,
    };
  }

  return {
    signal:  'weak',
    message: `إشارة أولية: ~${avg.toLocaleString()} ر.س/م²`,
    detail:  'بيانات محدودة — أضف مشاريع إضافية للتأكيد',
  };
}

/* ══════════════════════════════════════════════════════════════
   Usage Enforcement — maps grade → allowed usage level
   Hard rule: Indicative is NEVER external / bank-ready.
══════════════════════════════════════════════════════════════ */
export function getReportUsage(grade: ReportGrade): ReportUsage {
  if (grade === 'investment') return 'bank_ready';
  if (grade === 'conditional') return 'external_with_warning';
  return 'internal_only';
}
