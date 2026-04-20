import {
  Document, Page, Text, View, StyleSheet, pdf,
} from '@react-pdf/renderer';
import type { AdvisoryRequiredInputs, ConfidenceBreakdown, GateResult, ReportUsage } from '../types/report';
import { ensurePdfFonts } from './pdfFonts';

// fonts loaded lazily via ensurePdfFonts() before each export

/* ── Palette ── */
const C = {
  gold:   '#B8924A',
  goldBg: 'rgba(184,146,74,0.08)',
  goldBd: 'rgba(184,146,74,0.30)',
  green:  '#16a34a',
  red:    '#dc2626',
  blue:   '#2563eb',
  ink:    '#0A0C12',
  ink60:  'rgba(10,12,18,0.60)',
  ink45:  'rgba(10,12,18,0.45)',
  ink15:  'rgba(10,12,18,0.15)',
  ink07:  'rgba(10,12,18,0.07)',
  bg:     '#F4F3EF',
  white:  '#FFFFFF',
};

const S = StyleSheet.create({
  page: {
    fontFamily:      'Tajawal',
    fontSize:        9,
    color:           C.ink,
    backgroundColor: C.white,
    paddingTop:      '12mm',
    paddingBottom:   '14mm',
    paddingLeft:     '12mm',
    paddingRight:    '12mm',
    direction:       'rtl',
  },
  /* ── header / footer ── */
  header: {
    flexDirection:  'row-reverse',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   10,
    paddingBottom:  8,
    borderBottom:   `1.5pt solid ${C.gold}`,
  },
  brandName:   { fontSize: 18, fontWeight: 700, color: C.gold },
  brandSub:    { fontSize: 7, color: 'rgba(184,146,74,0.65)', marginTop: 1 },
  dateText:    { fontSize: 7.5, color: C.ink45 },
  footer: {
    position:   'absolute',
    bottom:     10,
    left:       12,
    right:      12,
    fontSize:   6.5,
    color:      C.ink45,
    textAlign:  'center',
    borderTop:  `0.5pt solid ${C.ink15}`,
    paddingTop: 4,
  },
  /* ── section title ── */
  sectionTitle: {
    fontSize:      10,
    fontWeight:    700,
    color:         C.ink,
    marginTop:     10,
    marginBottom:  5,
    paddingBottom: 3,
    borderBottom:  `0.5pt solid ${C.ink15}`,
    textAlign:     'right',
  },
  /* ── KPI grid ── */
  kpiRow:  { flexDirection: 'row-reverse', gap: 5, marginBottom: 6 },
  kpiCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    alignItems: 'flex-end',
  },
  kpiLabel: { fontSize: 6.5, color: C.ink45, marginBottom: 3, textAlign: 'right' },
  kpiValue: { fontSize: 13, fontWeight: 700, textAlign: 'right' },
  /* ── table ── */
  tableHead:   { flexDirection: 'row-reverse', backgroundColor: C.bg, paddingVertical: 5, paddingHorizontal: 8 },
  tableRow:    { flexDirection: 'row-reverse', paddingVertical: 5, paddingHorizontal: 8, borderBottom: `0.5pt solid ${C.ink07}` },
  tableRowAlt: { flexDirection: 'row-reverse', paddingVertical: 5, paddingHorizontal: 8, borderBottom: `0.5pt solid ${C.ink07}`, backgroundColor: 'rgba(10,12,18,0.018)' },
  thLabel:     { flex: 2, fontSize: 7.5, fontWeight: 700, color: C.ink45, textAlign: 'right' },
  thValue:     { flex: 1, fontSize: 7.5, fontWeight: 700, color: C.ink45, textAlign: 'left' },
  tdLabel:     { flex: 2, fontSize: 8.5, color: C.ink60,  textAlign: 'right' },
  tdValue:     { flex: 1, fontSize: 8.5, fontWeight: 700, color: C.ink, textAlign: 'left' },
  tdTotal:     { flex: 2, fontSize: 9,   fontWeight: 700, color: C.gold, textAlign: 'right' },
  tdTotalVal:  { flex: 1, fontSize: 9,   fontWeight: 700, color: C.gold, textAlign: 'left' },
  /* ── info box ── */
  infoBox: {
    borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12, marginVertical: 6, textAlign: 'right',
  },
  infoTitle:  { fontSize: 10, fontWeight: 700, marginBottom: 4, textAlign: 'right' },
  infoText:   { fontSize: 8.5, lineHeight: 1.7, textAlign: 'right' },
  /* ── grade badge inline ── */
  badge: {
    borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 3, paddingBottom: 3,
    fontSize: 8, fontWeight: 700,
  },
  /* ── cover page ── */
  coverPage: {
    fontFamily: 'Tajawal', fontSize: 9, backgroundColor: C.ink, color: C.white,
    paddingTop: '18mm', paddingBottom: '18mm', paddingLeft: '16mm', paddingRight: '16mm',
    direction: 'rtl',
  },
  coverBrand:   { fontSize: 26, fontWeight: 700, color: C.gold, textAlign: 'right', marginBottom: 4 },
  coverSub:     { fontSize: 9,  color: 'rgba(184,146,74,0.6)', textAlign: 'right', marginBottom: 36 },
  coverProject: { fontSize: 20, fontWeight: 700, color: C.white, textAlign: 'right', marginBottom: 8 },
  coverLoc:     { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginBottom: 32 },
  coverDivider: { height: 1.5, backgroundColor: 'rgba(184,146,74,0.35)', marginBottom: 24 },
  coverGrade:   { fontSize: 12, fontWeight: 700, textAlign: 'right', marginBottom: 6 },
  coverGradeLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginBottom: 28 },
  coverMeta:    { fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'right' },
  /* ── sensitivity row ── */
  sensRow: {
    flexDirection: 'row-reverse', gap: 5, marginBottom: 6,
  },
  sensCard: {
    flex: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'flex-end',
  },
  /* ── confidence bar (flex-based — no percentage widths) ── */
  barBg:      { height: 5, backgroundColor: 'rgba(10,12,18,0.08)', borderRadius: 3, marginTop: 4, flexDirection: 'row' },
  barFill:    { height: 5, borderRadius: 3 },
  barEmpty:   { height: 5 },
});

/* ── Formatters ── */
const fmtN = (v?: number, d = 0) =>
  v != null && isFinite(v) ? v.toLocaleString('ar-SA', { maximumFractionDigits: d }) : '—';
const fmtM = (v?: number) =>
  v != null && isFinite(v) ? `${(v / 1e6).toFixed(2)} م` : '—';
const fmtPct = (v?: number, d = 1) =>
  v != null && isFinite(v) ? `${v.toFixed(d)}٪` : '—';

/* ── Smart executive summary ── */
function execSummaryText(irr: number | null, confidence: number, grade: string): string {
  if (irr == null) return 'لم يتم احتساب نتائج التحليل المالي بعد.';
  if (irr >= 25 && confidence >= 80)
    return `يُصنَّف هذا المشروع فرصةً استثمارية متميزة بعائد داخلي يبلغ ${irr.toFixed(1)}٪ ومستوى ثقة ${confidence}٪. تتوافر البيانات الداعمة وتُشير المقارنات السوقية إلى إمكانية تحقيق هذا الأداء في ظل الظروف الراهنة.`;
  if (irr >= 15)
    return `يُحقق المشروع أداءً مالياً مقبولاً بعائد داخلي ${irr.toFixed(1)}٪. يُنصح بمراجعة هيكل التمويل وجدولة التسليم لتحسين الكفاءة والحد من مخاطر الزمن.`;
  return `يسجّل المشروع عائداً داخلياً ${irr.toFixed(1)}٪ وهو دون المعدل المستهدف عادةً (15٪+). يُوصى بإعادة النظر في تكاليف البناء أو استراتيجية التسعير قبل المضيّ في التنفيذ.`;
}

/* ── Grade labels ── */
const GRADE_LABELS: Record<string, { ar: string; color: string; bg: string }> = {
  investment:  { ar: 'استثماري',  color: C.green, bg: 'rgba(22,163,74,0.12)' },
  conditional: { ar: 'مشروط',     color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  indicative:  { ar: 'استرشادي',  color: C.blue,  bg: 'rgba(37,99,235,0.10)' },
};

const USAGE_LABELS: Record<string, string> = {
  bank_ready:            'جاهز للبنك والمستثمر',
  external_with_warning: 'خارجي مع تحذير — مشروط',
  internal_only:         'داخلي فقط',
};

/* ── Shared header ── */
function Header({ date }: { date: string }) {
  return (
    <View style={S.header}>
      <View>
        <Text style={S.brandName}>بصيرة</Text>
        <Text style={S.brandSub}>منصة الذكاء العقاري</Text>
      </View>
      <Text style={S.dateText}>{date}</Text>
    </View>
  );
}

/* ── Shared footer ── */
function Footer({ date, page, total }: { date: string; page: string; total: string }) {
  return (
    <Text style={S.footer} fixed>
      بصيرة — منصة الذكاء العقاري  ·  تقرير مُولَّد آلياً  ·  {date}  ·  صفحة {page} من {total}
    </Text>
  );
}

/* ══════════════════════════════════════════════════════════════
   EXPORT INTERFACE
══════════════════════════════════════════════════════════════ */
export interface AdvisoryReportInput {
  project:    { id: string; name: string; location?: string };
  result:     any;
  inputs:     AdvisoryRequiredInputs;
  confidence: ConfidenceBreakdown;
  gate:       GateResult;
  usage:      ReportUsage;
  formInput:  Record<string, string>;
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENT
══════════════════════════════════════════════════════════════ */
export function AdvisoryReportDocument({ data }: { data: AdvisoryReportInput }) {
  const { project, result, inputs, confidence, gate, usage, formInput } = data;

  const fin   = result?.financials ?? result?.feasibility?.financials ?? null;
  const costs = result?.costs      ?? result?.feasibility?.costs      ?? null;
  const areas = result?.areas      ?? result?.feasibility?.areas      ?? null;

  const irr    = fin?.irr    ?? null;
  const npv    = fin?.npv    ?? null;
  const margin = fin?.margin ?? null;
  const roi    = fin?.roi    ?? null;
  const net    = fin?.net    ?? null;

  const sellPricePerM2 = parseFloat(formInput.sellPricePerM2 ?? '0') || 0;
  const landPricePerM2 = parseFloat(formInput.landPricePerM2 ?? '0') || 0;
  const buildCostPerM2 = parseFloat(formInput.buildCostPerM2 ?? '0') || 0;
  const durationMonths = parseFloat(formInput.projectDurationMonths ?? '24') || 24;

  const gradeInfo = GRADE_LABELS[confidence.grade] ?? GRADE_LABELS.indicative;

  const date = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  /* Market comparables */
  const comps = inputs.comparableProjects;
  const compPrices = comps.map(c => c.sellPricePerSqm).filter(Boolean);
  const avgCompPrice = compPrices.length
    ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length)
    : 0;
  const minCompPrice = compPrices.length ? Math.round(Math.min(...compPrices)) : 0;
  const maxCompPrice = compPrices.length ? Math.round(Math.max(...compPrices)) : 0;

  /* Sensitivity — ±20% sell price impact on net profit */
  const sellableArea = areas?.sellableArea ?? 0;
  const deltaRevenue = sellableArea * sellPricePerM2 * 0.20;
  const netBase = net ?? 0;
  const netPlus  = netBase + deltaRevenue;
  const netMinus = netBase - deltaRevenue;
  const totalCost = costs?.totalCost ?? 1;
  const marginPlus  = totalCost > 0 ? ((netPlus  / totalCost) * 100) : 0;
  const marginMinus = totalCost > 0 ? ((netMinus / totalCost) * 100) : 0;

  const showMarket = confidence.total >= 60 && comps.length >= 3;

  return (
    <Document
      title={`بصيرة — التقرير الاستثماري — ${project.name}`}
      author="منصة بصيرة للذكاء العقاري"
      subject="تقرير جدوى استثمارية"
    >

      {/* ══ PAGE 1 — COVER ══════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <Text style={S.coverBrand}>بصيرة</Text>
        <Text style={S.coverSub}>منصة الذكاء العقاري</Text>

        <Text style={S.coverProject}>{project.name}</Text>
        {project.location ? (
          <Text style={S.coverLoc}>{project.location}</Text>
        ) : null}

        <View style={S.coverDivider} />

        <Text style={S.coverGrade}>
          التصنيف: {gradeInfo.ar}
        </Text>
        <Text style={S.coverGradeLabel}>
          {USAGE_LABELS[usage]}  ·  درجة الثقة {confidence.total}٪
        </Text>

        <View style={{ flexDirection: 'row-reverse', gap: 12, marginBottom: 32 }}>
          {irr != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>معدل العائد الداخلي</Text>
              <Text style={{ fontSize: 24, fontWeight: 700, color: C.gold }}>{irr.toFixed(1)}٪</Text>
            </View>
          )}
          {npv != null && (
            <View style={{ alignItems: 'flex-end', marginRight: 20 }}>
              <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>صافي القيمة الحالية</Text>
              <Text style={{ fontSize: 24, fontWeight: 700, color: C.white }}>{fmtM(npv)}</Text>
            </View>
          )}
        </View>

        <Text style={S.coverMeta}>
          تاريخ الإصدار: {date}  ·  رقم المشروع: {project.id}
        </Text>
        <Text style={{ ...S.coverMeta, marginTop: 6 }}>
          هذا التقرير مُولَّد آلياً بواسطة منصة بصيرة للذكاء العقاري
        </Text>
      </Page>

      {/* ══ PAGE 2 — EXECUTIVE SUMMARY ══════════════════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>الملخص التنفيذي</Text>

        {/* Summary text */}
        <View style={[S.infoBox, { backgroundColor: C.goldBg, border: `1pt solid ${C.goldBd}`, marginBottom: 10 }]}>
          <Text style={[S.infoText, { color: C.ink, lineHeight: 1.8 }]}>
            {execSummaryText(irr, confidence.total, confidence.grade)}
          </Text>
        </View>

        {/* Grade row */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={[S.badge, { backgroundColor: gradeInfo.bg }]}>
            <Text style={{ color: gradeInfo.color, fontWeight: 700, fontSize: 8 }}>
              {gradeInfo.ar}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: C.ink45 }}>التصنيف الرسمي للتقرير</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 8, color: C.ink45 }}>الاستخدام: {USAGE_LABELS[usage]}</Text>
        </View>

        {/* KPIs */}
        <View style={S.kpiRow}>
          {[
            { label: 'معدل العائد الداخلي (IRR)', value: fmtPct(irr),    color: C.green },
            { label: 'هامش الربح الصافي',          value: fmtPct(margin), color: C.gold  },
            { label: 'عائد على الاستثمار (ROI)',   value: fmtPct(roi),   color: C.blue  },
            { label: 'صافي الربح',                 value: fmtM(net),     color: '#7c3aed' },
          ].map((k, i) => (
            <View key={i} style={S.kpiCard}>
              <Text style={S.kpiLabel}>{k.label}</Text>
              <Text style={[S.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>
        <View style={S.kpiRow}>
          {[
            { label: 'إجمالي الإيرادات',       value: fmtM(fin?.revenue),    color: C.green  },
            { label: 'إجمالي التكاليف',          value: fmtM(costs?.totalCost), color: C.red   },
            { label: 'صافي القيمة الحالية NPV', value: fmtM(npv),              color: '#0284c7' },
            { label: 'مدة المشروع',              value: `${durationMonths} شهراً`, color: C.ink  },
          ].map((k, i) => (
            <View key={i} style={S.kpiCard}>
              <Text style={S.kpiLabel}>{k.label}</Text>
              <Text style={[S.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Confidence summary */}
        <Text style={[S.sectionTitle, { marginTop: 14 }]}>مؤشر الثقة والموثوقية</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
          {[
            { label: 'التغطية',    pct: Math.max(0, Math.min(100, Math.round((confidence.coverage    ?? 0) * 100))), color: C.gold },
            { label: 'الجودة',     pct: Math.max(0, Math.min(100, Math.round((confidence.quality     ?? 0) * 100))), color: C.gold },
            { label: 'الاتساق',    pct: Math.max(0, Math.min(100, Math.round((confidence.consistency ?? 0) * 100))), color: C.gold },
          ].map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 9 }}>
              <Text style={{ fontSize: 7, color: C.ink45, textAlign: 'right', marginBottom: 2 }}>{c.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: 700, color: c.color, textAlign: 'right' }}>{`${c.pct}٪`}</Text>
              <View style={S.barBg}>
                <View style={[S.barFill, { flex: c.pct, backgroundColor: c.color }]} />
                <View style={[S.barEmpty, { flex: 100 - c.pct }]} />
              </View>
            </View>
          ))}
          <View style={{ flex: 1, backgroundColor: gradeInfo.bg, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 9 }}>
            <Text style={{ fontSize: 7, color: C.ink45, textAlign: 'right', marginBottom: 2 }}>إجمالي الثقة</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: gradeInfo.color, textAlign: 'right' }}>{`${confidence.total}٪`}</Text>
            <View style={S.barBg}>
              <View style={[S.barFill, { flex: confidence.total, backgroundColor: gradeInfo.color }]} />
              <View style={[S.barEmpty, { flex: 100 - confidence.total }]} />
            </View>
          </View>
        </View>

        <Footer date={date} page="2" total="7" />
      </Page>

      {/* ══ PAGE 3 — LAND & PROJECT DATA ═══════════════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>بيانات الأرض والمشروع</Text>

        <View style={S.tableHead}>
          <Text style={S.thLabel}>البند</Text>
          <Text style={S.thValue}>القيمة</Text>
        </View>
        {[
          { label: 'مساحة الأرض',              value: areas?.landArea        ? `${fmtN(areas.landArea)} م²`          : '—' },
          { label: 'سعر الأرض / م²',           value: landPricePerM2 > 0     ? `${fmtN(landPricePerM2)} ر.س`          : '—' },
          { label: 'تكلفة البناء / م²',         value: buildCostPerM2 > 0     ? `${fmtN(buildCostPerM2)} ر.س`          : '—' },
          { label: 'سعر البيع / م²',            value: sellPricePerM2 > 0     ? `${fmtN(sellPricePerM2)} ر.س`          : '—' },
          { label: 'إجمالي مساحة البناء',       value: areas?.grossBuildArea  ? `${fmtN(areas.grossBuildArea)} م²`     : '—' },
          { label: 'المساحة القابلة للبيع',     value: areas?.sellableArea    ? `${fmtN(areas.sellableArea)} م²`       : '—' },
          { label: 'عدد الطوابق',               value: formInput.floors        ? formInput.floors                        : '—' },
          { label: 'نسبة البناء الأرضي',        value: formInput.groundCoverage ? `${(parseFloat(formInput.groundCoverage) * 100).toFixed(0)}٪` : '—' },
          { label: 'مدة المشروع',               value: `${durationMonths} شهراً` },
        ].map((row, i) => (
          <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={S.tdLabel}>{row.label}</Text>
            <Text style={S.tdValue}>{row.value}</Text>
          </View>
        ))}

        {/* Cost breakdown */}
        {costs && (
          <>
            <Text style={[S.sectionTitle, { marginTop: 14 }]}>هيكل التكاليف</Text>
            <View style={S.tableHead}>
              <Text style={S.thLabel}>البند</Text>
              <Text style={S.thValue}>المبلغ (ر.س)</Text>
            </View>
            {[
              { label: 'تكلفة الأرض',          val: costs.landCost      },
              { label: 'تكلفة البناء',          val: costs.totalBuildCost ?? costs.buildCost },
              { label: 'تكاليف ناعمة',          val: costs.softCosts     },
              { label: 'احتياطي طوارئ',         val: costs.contingency   },
              { label: 'تكاليف تمويل بنكي',    val: costs.financingCost },
            ].filter(r => r.val > 0).map((row, i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tdLabel}>{row.label}</Text>
                <Text style={S.tdValue}>{fmtN(row.val)}</Text>
              </View>
            ))}
            <View style={[S.tableRow, { borderTop: `1pt solid ${C.ink15}` }]}>
              <Text style={S.tdTotal}>الإجمالي</Text>
              <Text style={S.tdTotalVal}>{fmtN(costs.totalCost)}</Text>
            </View>
          </>
        )}

        {/* Readiness score */}
        <View style={[S.infoBox, {
          backgroundColor: gate.passed ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.06)',
          border: `0.75pt solid ${gate.passed ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.20)'}`,
          marginTop: 10,
        }]}>
          <Text style={[S.infoTitle, { color: gate.passed ? C.green : C.red }]}>
            {gate.passed ? '✓ اكتملت جميع متطلبات التقرير' : `⚠ متطلبات ناقصة — ${gate.missingFields.length} بند`}
          </Text>
          <Text style={{ fontSize: 8.5, color: C.ink60, textAlign: 'right' }}>
            نسبة الاستعداد: {gate.readinessScore}٪
          </Text>
          {!gate.passed && gate.missingFields.map((f, i) => (
            <Text key={i} style={{ fontSize: 8, color: C.red, textAlign: 'right', marginTop: 2 }}>
              • {f}
            </Text>
          ))}
        </View>

        <Footer date={date} page="3" total="7" />
      </Page>

      {/* ══ PAGE 4 — MARKET ANALYSIS (conditional) ═════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>تحليل السوق والمقارنات</Text>

        {!showMarket ? (
          <View style={[S.infoBox, { backgroundColor: 'rgba(220,38,38,0.05)', border: `0.75pt solid rgba(220,38,38,0.20)` }]}>
            <Text style={[S.infoTitle, { color: C.red }]}>تحليل السوق غير متاح</Text>
            <Text style={[S.infoText, { color: C.ink60 }]}>
              {confidence.total < 60
                ? `درجة الثقة الحالية (${confidence.total}٪) أقل من الحد الأدنى المطلوب (60٪) لإصدار تحليل سعري موثوق.`
                : 'يتطلب تحليل السوق 3 مشاريع مقارنة على الأقل — أدخل البيانات في تبويب التقرير الاستثماري.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Summary stats */}
            <View style={S.kpiRow}>
              {[
                { label: 'أدنى سعر مقارن',   value: `${fmtN(minCompPrice)} ر.س/م²`, color: C.blue  },
                { label: 'متوسط سعر السوق',  value: `${fmtN(avgCompPrice)} ر.س/م²`, color: C.gold  },
                { label: 'أعلى سعر مقارن',   value: `${fmtN(maxCompPrice)} ر.س/م²`, color: C.green },
                { label: 'سعر البيع المقترح', value: `${fmtN(sellPricePerM2)} ر.س/م²`, color: C.ink },
              ].map((k, i) => (
                <View key={i} style={S.kpiCard}>
                  <Text style={S.kpiLabel}>{k.label}</Text>
                  <Text style={[S.kpiValue, { color: k.color, fontSize: 11 }]}>{k.value}</Text>
                </View>
              ))}
            </View>

            {/* Price position note */}
            {sellPricePerM2 > 0 && avgCompPrice > 0 && (
              <View style={[S.infoBox, {
                backgroundColor: sellPricePerM2 <= avgCompPrice * 1.1
                  ? 'rgba(22,163,74,0.06)' : 'rgba(217,119,6,0.06)',
                border: `0.75pt solid ${sellPricePerM2 <= avgCompPrice * 1.1
                  ? 'rgba(22,163,74,0.22)' : 'rgba(217,119,6,0.22)'}`,
                marginBottom: 8,
              }]}>
                <Text style={[S.infoText, {
                  color: sellPricePerM2 <= avgCompPrice * 1.1 ? C.green : '#d97706', fontWeight: 700,
                }]}>
                  {sellPricePerM2 <= avgCompPrice
                    ? `سعر البيع المقترح أقل من متوسط السوق بفارق ${fmtN(avgCompPrice - sellPricePerM2)} ر.س/م² — ميزة تنافسية`
                    : sellPricePerM2 <= avgCompPrice * 1.1
                    ? `سعر البيع المقترح أعلى من المتوسط بـ ${fmtPct((sellPricePerM2 / avgCompPrice - 1) * 100)} — ضمن النطاق المقبول`
                    : `سعر البيع المقترح يتجاوز متوسط السوق بـ ${fmtPct((sellPricePerM2 / avgCompPrice - 1) * 100)} — يُنصح بإعادة المراجعة`}
                </Text>
              </View>
            )}

            {/* Comparables table */}
            <View style={S.tableHead}>
              <Text style={[S.thLabel, { flex: 2.5 }]}>المشروع / الموقع</Text>
              <Text style={[S.thValue, { flex: 1.5 }]}>السعر ر.س/م²</Text>
              <Text style={[S.thValue, { flex: 1 }]}>المبيع٪</Text>
              <Text style={[S.thValue, { flex: 1 }]}>التسليم</Text>
              <Text style={[S.thValue, { flex: 1.5 }]}>المصدر</Text>
            </View>
            {comps.map((c, i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <View style={{ flex: 2.5 }}>
                  <Text style={[S.tdLabel, { fontWeight: 700 }]}>{c.name}</Text>
                  <Text style={{ fontSize: 7, color: C.ink45, textAlign: 'right' }}>{c.location}</Text>
                </View>
                <Text style={[S.tdValue, { flex: 1.5 }]}>{fmtN(c.sellPricePerSqm)}</Text>
                <Text style={[S.tdValue, { flex: 1 }]}>{c.soldUnitsPercent}٪</Text>
                <Text style={[S.tdValue, { flex: 1 }]}>{c.deliveryMonths} ش</Text>
                <Text style={[S.tdValue, { flex: 1.5, fontSize: 7 }]}>{c.sourceType}</Text>
              </View>
            ))}
          </>
        )}

        {/* Confidence reasons */}
        <Text style={[S.sectionTitle, { marginTop: 14 }]}>أسباب درجة الثقة</Text>
        {confidence.reasons.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
            <Text style={{
              fontSize: 8, fontWeight: 700,
              color: r.type === 'positive' ? C.green : r.type === 'negative' ? C.red : '#d97706',
            }}>
              {r.type === 'positive' ? '✓' : r.type === 'negative' ? '✗' : '~'}
            </Text>
            <Text style={{ fontSize: 8, color: C.ink60, flex: 1, textAlign: 'right' }}>{r.text}</Text>
          </View>
        ))}

        <Footer date={date} page="4" total="7" />
      </Page>

      {/* ══ PAGE 5 — FINANCIAL ANALYSIS ════════════════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>التحليل المالي التفصيلي</Text>

        {/* Financials table */}
        {fin ? (
          <>
            <View style={S.tableHead}>
              <Text style={S.thLabel}>المؤشر المالي</Text>
              <Text style={S.thValue}>القيمة</Text>
            </View>
            {[
              { label: 'إجمالي الإيرادات',                  val: fmtM(fin.revenue) },
              { label: 'تكلفة الأرض',                       val: fmtN(costs?.landCost) },
              { label: 'تكلفة البناء',                      val: fmtM(costs?.totalBuildCost ?? costs?.buildCost) },
              { label: 'إجمالي التكاليف',                   val: fmtM(costs?.totalCost) },
              { label: 'صافي الربح',                        val: fmtM(net) },
              { label: 'هامش الربح الصافي',                 val: fmtPct(margin) },
              { label: 'معدل العائد الداخلي (IRR)',         val: fmtPct(irr) },
              { label: 'العائد على الاستثمار (ROI)',        val: fmtPct(roi) },
              { label: 'صافي القيمة الحالية (NPV)',         val: fmtM(npv) },
              { label: 'الحد الأقصى لسعر الأرض (RLV)',     val: result?.rlv?.maxLandPerM2 ? `${fmtN(result.rlv.maxLandPerM2)} ر.س/م²` : '—' },
            ].filter(r => r.val !== '—').map((row, i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tdLabel}>{row.label}</Text>
                <Text style={S.tdValue}>{row.val}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={[S.infoBox, { backgroundColor: C.bg }]}>
            <Text style={[S.infoText, { color: C.ink45 }]}>لم يتم تشغيل التحليل المالي بعد.</Text>
          </View>
        )}

        {/* Decision box */}
        {result?.summary && (
          <>
            <Text style={[S.sectionTitle, { marginTop: 14 }]}>قرار الجدوى</Text>
            <View style={[S.infoBox, {
              backgroundColor: result.summary.isBuy ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)',
              border: `1pt solid ${result.summary.isBuy ? 'rgba(22,163,74,0.28)' : 'rgba(220,38,38,0.25)'}`,
            }]}>
              <Text style={[S.infoTitle, { color: result.summary.isBuy ? C.green : C.red }]}>
                {result.summary.isBuy ? '✓ المشروع مجدٍ استثمارياً' : '✗ المشروع غير مجدٍ بالمعطيات الحالية'}
              </Text>
              <Text style={[S.infoText, { color: C.ink60, marginTop: 4 }]}>
                {result.summary.decision}
              </Text>
              {result.summary.reasons?.map((r: string, i: number) => (
                <Text key={i} style={{ fontSize: 8, color: C.ink60, textAlign: 'right', marginTop: 3 }}>• {r}</Text>
              ))}
            </View>
          </>
        )}

        <Footer date={date} page="5" total="7" />
      </Page>

      {/* ══ PAGE 6 — SENSITIVITY & RISKS ═══════════════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>تحليل الحساسية — تأثير تغيّر سعر البيع ±20٪</Text>

        <View style={S.sensRow}>
          {[
            { label: 'تراجع الأسعار −20٪', net: netMinus, margin: marginMinus, color: C.red,   bg: 'rgba(220,38,38,0.06)',  bd: 'rgba(220,38,38,0.20)' },
            { label: 'السيناريو الأساسي',    net: netBase,  margin: margin ?? 0,  color: C.gold,  bg: C.goldBg,                bd: C.goldBd               },
            { label: 'ارتفاع الأسعار +20٪', net: netPlus,  margin: marginPlus,   color: C.green, bg: 'rgba(22,163,74,0.07)',  bd: 'rgba(22,163,74,0.22)' },
          ].map((s, i) => (
            <View key={i} style={[S.sensCard, { backgroundColor: s.bg, border: `0.75pt solid ${s.bd}` }]}>
              <Text style={{ fontSize: 7.5, color: C.ink45, textAlign: 'right', marginBottom: 4 }}>{s.label}</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: s.color, textAlign: 'right' }}>{fmtM(s.net)}</Text>
              <Text style={{ fontSize: 7.5, color: C.ink45, textAlign: 'right', marginTop: 2 }}>
                هامش: {fmtPct(s.margin)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 4, marginBottom: 12 }}>
          <Text style={{ fontSize: 7.5, color: C.ink45, textAlign: 'right' }}>
            * الحساسية محسوبة على أساس تغيّر صافي الربح خطياً مع الإيرادات. لا تشمل تأثير ذلك على جدولة التدفقات النقدية أو تكاليف التمويل المتغيرة.
          </Text>
        </View>

        {/* Risk factors */}
        <Text style={S.sectionTitle}>عوامل المخاطرة الرئيسية</Text>
        {[
          {
            title: 'مخاطر السوق',
            items: [
              'تقلب أسعار البيع تبعاً لحالة السوق المحلي والعرض والطلب',
              'التغيرات في معدلات الإشغال وأوقات تصريف الوحدات',
              'المنافسة من مشاريع قريبة في نفس الموقع أو الفئة',
            ],
          },
          {
            title: 'مخاطر التنفيذ',
            items: [
              'تأخيرات البناء وزيادة تكاليف المواد والعمالة',
              'تغييرات المتطلبات النظامية أو الحصول على التراخيص',
              'مخاطر المقاول الرئيسي وسلسلة التوريد',
            ],
          },
          {
            title: 'مخاطر التمويل',
            items: [
              'تغيّر أسعار الفائدة وتكلفة التمويل البنكي',
              'انقطاع تدفق التمويل أو تعثر سداد الأقساط',
              'الفجوة بين التدفقات الداخلة والخارجة في مرحلة البناء',
            ],
          },
        ].map((risk, ri) => (
          <View key={ri} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink, textAlign: 'right', marginBottom: 4 }}>
              {risk.title}
            </Text>
            {risk.items.map((item, ii) => (
              <Text key={ii} style={{ fontSize: 8, color: C.ink60, textAlign: 'right', marginBottom: 3, lineHeight: 1.6 }}>
                • {item}
              </Text>
            ))}
          </View>
        ))}

        <Footer date={date} page="6" total="7" />
      </Page>

      {/* ══ PAGE 7 — DISCLAIMER ════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <Header date={date} />

        <Text style={S.sectionTitle}>الإفصاحات والتحفظات القانونية</Text>

        {/* Grade-specific warning */}
        {confidence.grade !== 'investment' && (
          <View style={[S.infoBox, { backgroundColor: 'rgba(220,38,38,0.06)', border: `1pt solid rgba(220,38,38,0.22)`, marginBottom: 12 }]}>
            <Text style={[S.infoTitle, { color: C.red }]}>
              {confidence.grade === 'conditional'
                ? '⚠ تقرير مشروط — صلاحية الاستخدام محدودة'
                : '⚠ تقرير استرشادي — للاستخدام الداخلي فقط'}
            </Text>
            <Text style={[S.infoText, { color: C.ink60, marginTop: 4 }]}>
              {confidence.grade === 'conditional'
                ? 'هذا التقرير مصنّف "مشروط" ويمكن تقديمه للأطراف الخارجية مع إيضاح هذا التحفظ صراحةً. لا يُعدّ مستوفياً لجميع متطلبات الإقراض البنكي الكامل.'
                : 'هذا التقرير مصنّف "استرشادي" ومُعدٌّ للاستخدام الداخلي في دعم القرار فحسب. لا يجوز تقديمه للبنوك أو المستثمرين الخارجيين بوصفه دراسة جدوى رسمية.'}
            </Text>
          </View>
        )}

        {[
          {
            title: '١. طبيعة التقرير',
            body:  'يستند هذا التقرير إلى البيانات المُدخلة من قِبل المستخدم وعمليات حسابية آلية. لا يُمثّل استشارة استثمارية أو قانونية أو مالية معتمدة. يتحمل القارئ مسؤولية التحقق من صحة البيانات قبل اتخاذ أي قرار استثماري.',
          },
          {
            title: '٢. محدودية التوقعات',
            body:  'جميع الأرقام المالية المتعلقة بالإيرادات والتكاليف والعوائد هي توقعات مبنية على افتراضات معينة. الأداء الفعلي قد يختلف اختلافاً جوهرياً عن هذه التوقعات نتيجة لتغيرات في السوق أو التشريعات أو ظروف التنفيذ.',
          },
          {
            title: '٣. المقارنات السوقية',
            body:  `بيانات المقارنات السوقية مُدخلة يدوياً وتعكس مصادر محددة بدرجات ثقة متفاوتة (درجة الثقة الإجمالية: ${confidence.total}٪). لا تتحمل منصة بصيرة مسؤولية دقة هذه البيانات أو تحديثها.`,
          },
          {
            title: '٤. الامتثال النظامي',
            body:  'يُفترض في هذا التقرير أن المشروع يستوفي جميع الاشتراطات النظامية المعمول بها. التحقق من التراخيص والأكواد والمخططات التفصيلية يقع على عاتق المطور والجهات المختصة.',
          },
          {
            title: '٥. حقوق الملكية',
            body:  'هذا التقرير مُولَّد حصرياً عبر منصة بصيرة للذكاء العقاري. جميع الحقوق محفوظة. يُحظر تعديل محتواه أو إزالة بيانات المصدر أو نسبه لجهة أخرى.',
          },
        ].map((section, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink, textAlign: 'right', marginBottom: 5 }}>
              {section.title}
            </Text>
            <Text style={{ fontSize: 8, color: C.ink60, textAlign: 'right', lineHeight: 1.75 }}>
              {section.body}
            </Text>
          </View>
        ))}

        {/* Signature area */}
        <View style={{ marginTop: 24, paddingTop: 16, borderTop: `0.5pt solid ${C.ink15}`, flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7.5, color: C.ink45 }}>تاريخ الإصدار</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink, marginTop: 2 }}>{date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7.5, color: C.ink45 }}>المشروع</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.ink, marginTop: 2 }}>{project.name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7.5, color: C.ink45 }}>الجهة المُصدِرة</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.gold, marginTop: 2 }}>بصيرة — منصة الذكاء العقاري</Text>
          </View>
        </View>

        <Footer date={date} page="7" total="7" />
      </Page>

    </Document>
  );
}

/* ── Export function ── */
export async function exportAdvisoryReport(data: AdvisoryReportInput): Promise<void> {
  await ensurePdfFonts();
  const blob = await pdf(<AdvisoryReportDocument data={data} />).toBlob();
  const date = new Date().toISOString().slice(0, 10);
  const name = `بصيرة_${data.project.name}_${date}.pdf`;
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
