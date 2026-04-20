export type SummaryTarget = 'internal' | 'bank' | 'investor';
export type SummaryTone   = 'cautious' | 'balanced' | 'strong';

export interface SummaryInput {
  project: {
    name?:           string;
    location?:       string;
    usageType?:      string;
    landArea?:       number;
    floorsCount?:    number;
    totalUnits?:     number;
    durationMonths?: number;
    sellPricePerSqm?: number;
    streetWidth?:    number;
  };
  financials: {
    irr?:              number;
    netMargin?:        number;
    netProfit?:        number;
    totalRevenue?:     number;
    totalCost?:        number;
    dscr?:             number;
    paybackMonths?:    number;
    sensitivityLevel?: 'low' | 'medium' | 'high';
  };
  comparables:    Array<{ sellPricePerSqm: number }>;
  locationScore?: { totalScore: number; grade: string };
  confidence:     number;
  target:         SummaryTarget;
}

// ── المحرك الرئيسي ────────────────────────────────
export function generateExecutiveSummary(input: SummaryInput): string {
  const tone = getTone(input.confidence);

  const block1 = buildProjectBlock(input.project);
  const block2 = buildFinancialBlock(input.financials, tone);
  const block3 = buildMarketBlock(input.project, input.comparables, input.locationScore);
  const block4 = buildTargetBlock(input, tone);
  const disclaimer = buildDisclaimer(input.confidence);

  return [block1, block2, block3, block4, disclaimer]
    .filter(Boolean)
    .join('\n\n');
}

// ── Tone ──────────────────────────────────────────
function getTone(confidence: number): SummaryTone {
  if (confidence >= 80) return 'strong';
  if (confidence >= 60) return 'balanced';
  return 'cautious';
}

// ── Block 1: تعريف المشروع ────────────────────────
function buildProjectBlock(p: SummaryInput['project']): string {
  const parts: string[] = [];

  const usage = p.usageType || 'العقاري';
  const loc   = p.location ? `في ${p.location}` : '';
  parts.push(`${p.name || 'المشروع'} مشروع ${usage} ${loc}`.trim());

  if (p.landArea)      parts.push(`على مساحة أرض ${p.landArea.toLocaleString()} م²`);
  if (p.floorsCount)   parts.push(`يتكوّن من ${p.floorsCount} طوابق`);
  if (p.totalUnits)    parts.push(`بإجمالي ${p.totalUnits} وحدة`);
  if (p.durationMonths) parts.push(`ومدة تطوير ${p.durationMonths} شهراً`);

  return parts.join('، ') + '.';
}

// ── Block 2: المؤشرات المالية ──────────────────────
function buildFinancialBlock(
  f: SummaryInput['financials'],
  tone: SummaryTone,
): string {
  if (!f.irr && !f.netMargin && !f.netProfit) return '';

  const kpis: string[] = [];
  if (f.irr)       kpis.push(`معدل عائد داخلي ${f.irr.toFixed(1)}%`);
  if (f.netMargin) kpis.push(`هامش ربح ${f.netMargin.toFixed(1)}%`);
  if (f.netProfit) kpis.push(`صافي ربح ${(f.netProfit / 1_000_000).toFixed(2)} مليون ر.س`);

  const prefix =
    tone === 'strong'   ? 'تُسجّل المؤشرات المالية الرئيسية'
    : tone === 'balanced' ? 'تُظهر المؤشرات المالية'
    :                       'تُشير البيانات المتاحة إلى';

  return `${prefix}: ${kpis.join('، ')}.`;
}

// ── Block 3: السوق والموقع ────────────────────────
function buildMarketBlock(
  p: SummaryInput['project'],
  comparables: SummaryInput['comparables'],
  locationScore?: SummaryInput['locationScore'],
): string {
  const parts: string[] = [];

  if (comparables.length >= 3 && p.sellPricePerSqm) {
    const prices = comparables.map(c => c.sellPricePerSqm).filter(Boolean);
    const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
    const diff   = ((p.sellPricePerSqm - avg) / avg) * 100;
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);

    parts.push(
      `نطاق أسعار السوق ${min.toLocaleString()}–${max.toLocaleString()} ر.س/م² ` +
      `بمتوسط ${Math.round(avg).toLocaleString()} ر.س/م²`,
    );

    if (Math.abs(diff) > 2) {
      parts.push(
        diff < 0
          ? `سعر المشروع أقل من المتوسط بـ ${Math.abs(diff).toFixed(1)}%`
          : `سعر المشروع أعلى من المتوسط بـ ${diff.toFixed(1)}%`,
      );
    }
  }

  if (locationScore) {
    parts.push(`تقييم الموقع ${locationScore.totalScore}/100 (${locationScore.grade})`);
  }

  return parts.length ? parts.join('؛ ') + '.' : '';
}

// ── Block 4: الفقرة حسب الجهة ─────────────────────
function buildTargetBlock(input: SummaryInput, tone: SummaryTone): string {
  const { target, financials: f } = input;

  // ─ داخلي ─────────────────────────────────────────
  if (target === 'internal') {
    const sensitivityText =
      f.sensitivityLevel === 'low'    ? 'حساسية منخفضة'
      : f.sensitivityLevel === 'high' ? 'حساسية مرتفعة تستدعي المراقبة'
      :                                  'حساسية متوسطة';

    const recommendation =
      tone === 'strong'   ? 'تُشير المؤشرات إلى أن المشروع مناسب للمضي وفق المعطيات الحالية.'
      : tone === 'balanced' ? 'يُنصح بدراسة المشروع مع مراجعة هيكل التكاليف قبل الالتزام.'
      :                       'تستدعي البيانات الحالية مراجعة شاملة قبل اتخاذ قرار.';

    return (
      `تشير المؤشرات إلى تحقيق هامش ربح ${f.netMargin?.toFixed(1) ?? '—'}% ` +
      `ومعدل عائد داخلي ${f.irr?.toFixed(1) ?? '—'}%، مع ${sensitivityText} ` +
      `لتغيرات الأسعار.\n\n${recommendation}`
    );
  }

  // ─ بنك ───────────────────────────────────────────
  if (target === 'bank') {
    const parts: string[] = [];
    if (f.irr)           parts.push(`معدل عائد داخلي ${f.irr.toFixed(1)}%`);
    if (f.netProfit)     parts.push(`وصافي ربح ${(f.netProfit / 1_000_000).toFixed(2)} مليون ر.س`);
    if (f.dscr)          parts.push(`مع معدل تغطية خدمة الدين (DSCR) ${f.dscr.toFixed(2)}`);
    if (f.paybackMonths) parts.push(`وتدفقات نقدية إيجابية ابتداءً من الشهر ${f.paybackMonths} تقريباً`);

    return parts.length
      ? `يُظهر المشروع ${parts.join('، ')}.`
      : 'تم احتساب المؤشرات المالية بناءً على البيانات المدخلة.';
  }

  // ─ مستثمر ────────────────────────────────────────
  const prices   = input.comparables.map(c => c.sellPricePerSqm).filter(Boolean);
  const avg      = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const priceDiff = avg && input.project.sellPricePerSqm
    ? ((input.project.sellPricePerSqm - avg) / avg) * 100
    : 0;

  const parts: string[] = [];
  if (f.irr)
    parts.push(`عائداً داخلياً ${f.irr.toFixed(1)}% ضمن نطاق السوق`);
  if (priceDiff < -2)
    parts.push(`تسعير أقل من متوسط السوق بـ ${Math.abs(priceDiff).toFixed(1)}% مما يعزز الجاذبية التنافسية`);

  const body = parts.length
    ? `يوفر المشروع ${parts.join('، ')}.`
    : 'يُقدّم المشروع فرصة استثمارية ضمن قطاع نشط.';

  return body + '\n\nيعتمد الأداء على تحقيق افتراضات البيع ضمن الإطار الزمني المحدد.';
}

// ── Disclaimer (إلزامي دائماً) ────────────────────
function buildDisclaimer(confidence: number): string {
  const base =
    'تعتمد النتائج الواردة على المدخلات المقدمة وعمليات حسابية آلية، ' +
    'ولا يُعد هذا التقرير بديلاً عن دراسة جدوى تفصيلية أو تقييم مستقل. ' +
    'القرار الاستثماري يعود للجهة المختصة.';

  return confidence < 60
    ? base + ` (درجة الثقة الحالية ${confidence}% — يُنصح باستكمال البيانات.)`
    : base;
}
