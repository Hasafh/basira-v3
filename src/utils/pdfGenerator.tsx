/**
 * PDF Generator — Basira v4
 * Uses @react-pdf/renderer to produce real downloadable PDFs.
 * Existing window.print() system remains as fallback.
 */
import {
  Document, Page, Text, View, StyleSheet, Font, pdf,
} from '@react-pdf/renderer';
import { ensurePdfFonts } from '../lib/reports/pdfFonts';

/* ── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily:    'Tajawal',
    fontSize:      10,
    color:         '#0A0C12',
    backgroundColor: '#FFFFFF',
    padding:       '14mm 12mm',
    direction:     'rtl',
  },
  // Header
  headerRow: {
    flexDirection:  'row-reverse',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   12,
    paddingBottom:  10,
    borderBottom:   '1.5pt solid #B8924A',
  },
  logoBox: {
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(184,146,74,0.12)',
    border: '1pt solid rgba(184,146,74,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText:    { fontSize: 18, color: '#B8924A', fontWeight: 700 },
  brandName:   { fontSize: 20, color: '#B8924A', fontWeight: 700, textAlign: 'right' },
  brandSub:    { fontSize: 8,  color: 'rgba(184,146,74,0.6)', textAlign: 'right', marginTop: 2 },
  dateText:    { fontSize: 8,  color: 'rgba(10,12,18,0.45)',  textAlign: 'left'  },

  // Project banner
  projectBanner: {
    backgroundColor: 'rgba(184,146,74,0.06)',
    border:          '1pt solid rgba(184,146,74,0.25)',
    borderRadius:    8,
    padding:         '8 12',
    marginBottom:    12,
    textAlign:       'right',
  },
  projectName: { fontSize: 13, fontWeight: 700, color: '#0A0C12', textAlign: 'right' },
  projectLoc:  { fontSize: 9,  color: 'rgba(10,12,18,0.5)',       textAlign: 'right', marginTop: 2 },

  // Section title
  sectionTitle: {
    fontSize:      11,
    fontWeight:    700,
    color:         '#0A0C12',
    marginTop:     12,
    marginBottom:  6,
    textAlign:     'right',
    paddingBottom: 4,
    borderBottom:  '0.5pt solid rgba(10,12,18,0.12)',
  },

  // KPI grid
  kpiRow:  { flexDirection: 'row-reverse', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  kpiCard: {
    flex:            1,
    minWidth:        '22%',
    backgroundColor: '#F4F3EF',
    borderRadius:    6,
    padding:         '8 10',
    alignItems:      'flex-end',
  },
  kpiLabel: { fontSize: 7,  color: 'rgba(10,12,18,0.5)', textAlign: 'right', marginBottom: 3 },
  kpiValue: { fontSize: 14, fontWeight: 700, textAlign: 'right' },

  // Table
  table:      { marginBottom: 8 },
  tableHead:  { flexDirection: 'row-reverse', backgroundColor: '#F4F3EF', padding: '5 8', borderRadius: '4 4 0 0' },
  tableRow:   { flexDirection: 'row-reverse', padding: '5 8', borderBottom: '0.5pt solid rgba(10,12,18,0.07)' },
  tableRowAlt:{ flexDirection: 'row-reverse', padding: '5 8', borderBottom: '0.5pt solid rgba(10,12,18,0.07)', backgroundColor: 'rgba(10,12,18,0.02)' },
  thLabel:    { flex: 2, fontSize: 8,  fontWeight: 700, color: 'rgba(10,12,18,0.5)', textAlign: 'right' },
  thValue:    { flex: 1, fontSize: 8,  fontWeight: 700, color: 'rgba(10,12,18,0.5)', textAlign: 'left' },
  tdLabel:    { flex: 2, fontSize: 9,  color: 'rgba(10,12,18,0.7)',                  textAlign: 'right' },
  tdValue:    { flex: 1, fontSize: 9,  fontWeight: 700, color: '#0A0C12',            textAlign: 'left' },
  tdTotal:    { flex: 2, fontSize: 10, fontWeight: 700, color: '#B8924A',            textAlign: 'right' },
  tdTotalVal: { flex: 1, fontSize: 10, fontWeight: 700, color: '#B8924A',            textAlign: 'left' },

  // Decision box
  decisionBox: {
    borderRadius:    8,
    padding:         '10 14',
    marginTop:       12,
    textAlign:       'right',
  },
  decisionText: { fontSize: 11, fontWeight: 700, textAlign: 'right' },
  reasonText:   { fontSize: 8,  color: 'rgba(10,12,18,0.6)', marginTop: 3, textAlign: 'right' },

  // Footer
  footer: {
    position:   'absolute',
    bottom:     10,
    left:       12,
    right:      12,
    fontSize:   7,
    color:      'rgba(10,12,18,0.3)',
    textAlign:  'center',
    borderTop:  '0.5pt solid rgba(10,12,18,0.1)',
    paddingTop: 4,
  },
});

/* ── Helpers ──────────────────────────────────────────── */
const fmtNum = (v?: number) =>
  v != null ? v.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) : '—';
const fmtM = (v?: number) =>
  v != null ? `${(v / 1e6).toFixed(2)} م` : '—';
const fmtPct = (v?: number) =>
  v != null ? `${v.toFixed(1)}٪` : '—';

/* ── PDF Document Component ──────────────────────────── */
export interface PDFReportData {
  projectName:     string;
  projectLocation: string;
  generatedAt?:    string;
  result:          any;   // FeasibilityResult
}

function FeasibilityDocument({ data }: { data: PDFReportData }) {
  const r      = data.result;
  const f      = r?.financials;
  const costs  = r?.costs;
  const areas  = r?.areas;
  const rlv    = r?.rlv;
  const summary = r?.summary;

  const date = data.generatedAt ||
    new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const isBuy = summary?.isBuy;
  const decisionBg = isBuy
    ? 'rgba(34,197,94,0.08)'
    : 'rgba(239,68,68,0.08)';
  const decisionBorder = isBuy
    ? 'rgba(34,197,94,0.35)'
    : 'rgba(239,68,68,0.35)';
  const decisionColor = isBuy ? '#16a34a' : '#dc2626';

  return (
    <Document
      title={`بصيرة — ${data.projectName}`}
      author="منصة بصيرة للذكاء العقاري"
    >
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.headerRow}>
          <View>
            <Text style={S.brandName}>بصيرة</Text>
            <Text style={S.brandSub}>منصة الذكاء العقاري</Text>
          </View>
          <View style={S.logoBox}>
            <Text style={S.logoText}>ب</Text>
          </View>
          <Text style={S.dateText}>{date}</Text>
        </View>

        {/* Project banner */}
        <View style={S.projectBanner}>
          <Text style={S.projectName}>{data.projectName}</Text>
          {data.projectLocation ? (
            <Text style={S.projectLoc}>{data.projectLocation}</Text>
          ) : null}
        </View>

        {/* KPIs */}
        <Text style={S.sectionTitle}>المؤشرات المالية</Text>
        <View style={S.kpiRow}>
          {[
            { label: 'معدل العائد الداخلي (IRR)', value: fmtPct(f?.irr),    color: '#16a34a' },
            { label: 'هامش الربح الصافي',          value: fmtPct(f?.margin), color: '#B8924A' },
            { label: 'العائد على الاستثمار (ROI)', value: fmtPct(f?.roi),   color: '#2563eb' },
            { label: 'صافي الربح',                 value: fmtM(f?.net),     color: '#7c3aed' },
          ].map((k, i) => (
            <View key={i} style={S.kpiCard}>
              <Text style={S.kpiLabel}>{k.label}</Text>
              <Text style={[S.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>
        <View style={S.kpiRow}>
          {[
            { label: 'إجمالي الإيرادات', value: fmtM(f?.revenue),      color: '#16a34a' },
            { label: 'إجمالي التكاليف',  value: fmtM(costs?.totalCost), color: '#dc2626' },
            { label: 'NPV',              value: fmtM(f?.npv),            color: '#0284c7' },
            { label: 'RLV (أقصى سعر أرض)', value: `${fmtNum(rlv?.maxLandPerM2)} ر.س/م²`, color: '#d97706' },
          ].map((k, i) => (
            <View key={i} style={S.kpiCard}>
              <Text style={S.kpiLabel}>{k.label}</Text>
              <Text style={[S.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Costs table */}
        {costs && (
          <>
            <Text style={S.sectionTitle}>التكاليف</Text>
            <View style={S.table}>
              <View style={S.tableHead}>
                <Text style={S.thLabel}>البند</Text>
                <Text style={S.thValue}>المبلغ (ر.س)</Text>
              </View>
              {[
                { label: 'تكلفة الأرض',    val: costs.landCost    },
                { label: 'تكلفة البناء',   val: costs.totalBuildCost ?? costs.buildCost   },
                { label: 'تكاليف ناعمة',   val: costs.softCosts   },
                { label: 'احتياطي طوارئ',  val: costs.contingency },
                { label: 'تمويل بنكي',     val: costs.financingCost },
              ].filter(r => r.val > 0).map((row, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={S.tdLabel}>{row.label}</Text>
                  <Text style={S.tdValue}>{fmtNum(row.val)}</Text>
                </View>
              ))}
              <View style={[S.tableRow, { borderTop: '1pt solid rgba(10,12,18,0.15)' }]}>
                <Text style={S.tdTotal}>الإجمالي</Text>
                <Text style={S.tdTotalVal}>{fmtNum(costs.totalCost)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Areas */}
        {areas && (
          <>
            <Text style={S.sectionTitle}>المساحات</Text>
            <View style={S.table}>
              {[
                { label: 'مساحة الأرض',           val: `${fmtNum(areas.landArea)} م²`         },
                { label: 'إجمالي مساحة البناء',    val: `${fmtNum(areas.grossBuildArea)} م²`   },
                { label: 'المساحة القابلة للبيع',  val: `${fmtNum(areas.sellableArea)} م²`     },
                { label: 'نسبة البناء الأرضي',    val: fmtPct((areas.groundCoverageRatio || 0) * 100) },
              ].map((row, i) => (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={S.tdLabel}>{row.label}</Text>
                  <Text style={S.tdValue}>{row.val}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Decision */}
        {summary && (
          <View style={[S.decisionBox, { backgroundColor: decisionBg, border: `1.5pt solid ${decisionBorder}` }]}>
            <Text style={[S.decisionText, { color: decisionColor }]}>
              {isBuy ? '✓ الصفقة مجدية' : '✗ الصفقة غير مجدية'}
            </Text>
            <Text style={S.decisionText}>{summary.decision}</Text>
            {summary.reasons?.map((r: string, i: number) => (
              <Text key={i} style={S.reasonText}>• {r}</Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={S.footer} fixed>
          بصيرة — منصة الذكاء العقاري  ·  تقرير مُولَّد آلياً  ·  {date}
        </Text>
      </Page>
    </Document>
  );
}

/* ── Public API ───────────────────────────────────────── */

/**
 * Generate a PDF Blob from feasibility data.
 * Returns null if the result has no financials (no analysis run yet).
 */
export async function generateFeasibilityPDF(data: PDFReportData): Promise<Blob | null> {
  if (!data.result?.financials) return null;
  await ensurePdfFonts();
  return pdf(<FeasibilityDocument data={data} />).toBlob();
}

/**
 * Trigger a file download of the PDF.
 * Falls back to window.print() on failure.
 */
export async function downloadFeasibilityPDF(
  data: PDFReportData,
  filename = 'basira-feasibility.pdf',
): Promise<void> {
  try {
    const blob = await generateFeasibilityPDF(data);
    if (!blob) {
      window.print();
      return;
    }
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // Graceful fallback
    window.print();
  }
}
