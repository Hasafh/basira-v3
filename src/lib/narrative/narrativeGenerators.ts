import type { ComparableProject } from '../types/report';

// ── نبذة المشروع ──────────────────────────────────
export function generateProjectBrief(project: {
  location?:      string;
  landArea?:      number;
  usageType?:     string;
  floorsCount?:   number;
  totalUnits?:    number;
  durationMonths?: number;
}): string {
  const parts: string[] = [];

  const usage    = project.usageType || 'سكني';
  const location = project.location  || 'الموقع المحدد';
  parts.push(`مشروع ${usage} يقع في ${location}`);

  if (project.landArea)
    parts.push(`على مساحة أرض ${project.landArea.toLocaleString('ar-SA')} م²`);

  if (project.floorsCount)
    parts.push(`يتكون من ${project.floorsCount} طوابق`);

  if (project.totalUnits)
    parts.push(`بإجمالي ${project.totalUnits} وحدة`);

  if (project.durationMonths)
    parts.push(`مدة التطوير المتوقعة ${project.durationMonths} شهراً`);

  return parts.join('، ') + '.';
}

// ── مزايا المشروع ─────────────────────────────────
export function generateAdvantages(
  project: {
    streetWidth?:    number;
    floorsCount?:    number;
    durationMonths?: number;
    buildCostPerSqm?: number;
  },
  financials: {
    netMargin?: number | null;
    irr?:       number | null;
  },
): string {
  const items: string[] = [];

  if ((project.streetWidth ?? 0) >= 30)
    items.push(`واجهة على شارع ${project.streetWidth}م توفر إمكانية وصول ممتازة`);

  if ((financials.netMargin ?? 0) >= 40)
    items.push(`هامش ربح ${financials.netMargin?.toFixed(1)}% يتجاوز متوسط السوق`);
  else if ((financials.netMargin ?? 0) >= 25)
    items.push(`هامش ربح ${financials.netMargin?.toFixed(1)}% ضمن النطاق المقبول`);

  if ((financials.irr ?? 0) >= 25)
    items.push(`معدل عائد داخلي ${financials.irr?.toFixed(1)}% يتفوق على بدائل الاستثمار`);

  if ((project.buildCostPerSqm ?? 9999) <= 2000 && (project.buildCostPerSqm ?? 0) > 0)
    items.push(`تكلفة بناء تنافسية ${project.buildCostPerSqm?.toLocaleString('ar-SA')} ر.س/م²`);

  if ((project.durationMonths ?? 99) <= 18)
    items.push(`مدة تطوير قصيرة ${project.durationMonths} شهراً تُسرّع استرداد رأس المال`);

  if ((project.floorsCount ?? 0) >= 7)
    items.push(`كود نظامي يتيح ${project.floorsCount} طوابق مع استغلال أمثل للأرض`);

  if (items.length === 0)
    items.push('فرصة استثمارية في سوق نشط');

  return items.map(i => `✓ ${i}`).join('\n');
}

// ── تحليل الأسعار ─────────────────────────────────
export function generatePricingAnalysis(
  projectPrice: number,
  comparables:  ComparableProject[],
): string {
  if (!projectPrice)
    return 'لم يُحدد سعر البيع بعد.';

  if (!comparables.length)
    return `سعر البيع المقترح ${projectPrice.toLocaleString('ar-SA')} ر.س/م².`;

  const prices = comparables.map(c => c.sellPricePerSqm).filter(Boolean);
  if (!prices.length)
    return `سعر البيع المقترح ${projectPrice.toLocaleString('ar-SA')} ر.س/م².`;

  const avg  = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min  = Math.min(...prices);
  const max  = Math.max(...prices);
  const diff = ((projectPrice - avg) / avg) * 100;

  const position =
    diff > 5  ? `أعلى من متوسط السوق بـ ${diff.toFixed(1)}%`
    : diff < -5 ? `أقل من متوسط السوق بـ ${Math.abs(diff).toFixed(1)}% — ميزة تنافسية`
    : 'متوافق مع متوسط السوق';

  return (
    `نطاق الأسعار في السوق المحيط: ${min.toLocaleString('ar-SA')} – ${max.toLocaleString('ar-SA')} ر.س/م² ` +
    `بمتوسط ${Math.round(avg).toLocaleString('ar-SA')} ر.س/م². ` +
    `سعر المشروع ${projectPrice.toLocaleString('ar-SA')} ر.س/م² — ${position}.`
  );
}
