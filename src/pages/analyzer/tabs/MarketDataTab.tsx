/**
 * MarketDataTab — Module 3: Excel/CSV Bridge
 *
 * Upload a CSV file of historical sales transactions.
 * The tab:
 *  1. Parses the CSV client-side (no server round-trip)
 *  2. Presents a column-mapping step (which column is price? which is area?)
 *  3. Computes descriptive statistics: count, median, mean, p25, p75, min, max
 *  4. Shows a histogram of price per m² distribution
 *  5. One-click "Apply as Land Price" / "Apply as Sell Price" pushes the
 *     median price per m² into the analysis store
 */
import { useState, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useAnalysisStore } from '../../../store/analysisStore';
import toast from 'react-hot-toast';

/* ── CSV parsing ─────────────────────────────────────── */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Detect delimiter (comma or semicolon)
  const firstLine = text.split('\n')[0] ?? '';
  const delim = firstLine.includes(';') ? ';' : ',';

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Strip BOM if present
  const rawHeaders = lines[0].replace(/^\uFEFF/, '').split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
  const headers = rawHeaders;

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

/* ── Statistics helpers ──────────────────────────────── */
function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
function buildHistogram(values: number[], bins = 10) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => ({
    label: Math.round(min + i * width),
    count: 0,
  }));
  values.forEach(v => {
    const b = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[b].count++;
  });
  return counts;
}

/* ── Column guesser — tries to match Arabic & English headers ─ */
const PRICE_KEYWORDS   = ['سعر', 'price', 'قيمة', 'value', 'amount', 'مبلغ'];
const AREA_KEYWORDS    = ['مساحة', 'area', 'size', 'م2', 'sqm', 'متر'];

function guessColumn(headers: string[], keywords: string[]): string {
  const kw = keywords.map(k => k.toLowerCase());
  return headers.find(h => kw.some(k => h.toLowerCase().includes(k))) ?? '';
}

/* ══════════════════════════════════════════════════════ */
export default function MarketDataTab({ project }: { project: any }) {
  const { setFormField } = useAnalysisStore();

  const [dragOver, setDragOver]     = useState(false);
  const [headers, setHeaders]       = useState<string[]>([]);
  const [rows, setRows]             = useState<Record<string, string>[]>([]);
  const [priceCol, setPriceCol]     = useState('');
  const [areaCol, setAreaCol]       = useState('');
  const [fileName, setFileName]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* Load a file (called by drop or input change) */
  const loadFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error('يُرجى تحميل ملف CSV (.csv أو .txt)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      setPriceCol(guessColumn(h, PRICE_KEYWORDS));
      setAreaCol(guessColumn(h, AREA_KEYWORDS));
      toast.success(`✅ تم تحميل ${r.length.toLocaleString()} صف`);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  /* Derived: price-per-m² values */
  const pricePerM2: number[] = rows.flatMap(row => {
    const price = parseFloat((row[priceCol] ?? '').replace(/[,،\s]/g, ''));
    const area  = parseFloat((row[areaCol]  ?? '').replace(/[,،\s]/g, ''));
    if (!isFinite(price) || price <= 0) return [];
    if (areaCol && isFinite(area) && area > 0) return [price / area];
    return [price]; // treat price column as already per-m²
  });

  const stats = pricePerM2.length > 0 ? {
    count:  pricePerM2.length,
    mean:   pricePerM2.reduce((a, b) => a + b, 0) / pricePerM2.length,
    median: median(pricePerM2),
    p25:    percentile(pricePerM2, 25),
    p75:    percentile(pricePerM2, 75),
    min:    Math.min(...pricePerM2),
    max:    Math.max(...pricePerM2),
  } : null;

  const histogram = stats ? buildHistogram(pricePerM2) : [];

  const applyPrice = (field: 'landPricePerM2' | 'sellPricePerM2', value: number) => {
    const rounded = Math.round(value);
    setFormField(field, String(rounded));
    toast.success(`✅ تم تطبيق ${rounded.toLocaleString()} ر.س/م² على ${field === 'landPricePerM2' ? 'سعر الأرض' : 'سعر البيع'}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5" dir="rtl">

      {/* Intro banner */}
      <div className="rounded-xl p-4 text-sm"
        style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
        <p className="font-bold mb-0.5" style={{ color: '#2563eb' }}>📂 جسر البيانات — رفع صفقات السوق</p>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.5)' }}>
          حمّل ملف CSV يحتوي على صفقات بيع تاريخية لاستخراج متوسط سعر م² وتطبيقه على التحليل تلقائياً.
          يدعم التنسيق: عمود السعر وعمود المساحة (اختياري).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
        style={{
          border:     `2px dashed ${dragOver ? '#2563eb' : 'rgba(10,12,18,0.15)'}`,
          background: dragOver ? 'rgba(37,99,235,0.04)' : '#F4F3EF',
          padding:    '48px 24px',
          minHeight:  140,
        }}
      >
        <span className="text-4xl">{fileName ? '📊' : '📁'}</span>
        {fileName ? (
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>{fileName}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>{rows.length.toLocaleString()} صف · اضغط لاستبدال الملف</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>اسحب وأسقط ملف CSV هنا</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>أو اضغط للاختيار · يدعم .csv و .txt</p>
          </div>
        )}
        <input
          ref={inputRef} type="file" accept=".csv,.txt"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
      </div>

      {/* Column mapping — shown after file load */}
      {headers.length > 0 && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>
          <h3 className="font-bold text-sm" style={{ color: '#0A0C12' }}>🗂 ربط الأعمدة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                عمود السعر * (ر.س أو ر.س/م²)
              </label>
              <select value={priceCol} onChange={e => setPriceCol(e.target.value)}
                style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', width: '100%', background: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '14px', outline: 'none' }}>
                <option value="">-- اختر عمود --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                عمود المساحة (م²) — اتركه فارغاً إذا السعر مباشرة بالم²
              </label>
              <select value={areaCol} onChange={e => setAreaCol(e.target.value)}
                style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', width: '100%', background: 'white', fontFamily: 'Tajawal, sans-serif', fontSize: '14px', outline: 'none' }}>
                <option value="">-- لا يوجد (السعر بالم²) --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl" style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(10,12,18,0.07)' }}>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F4F3EF' }}>
                  <tr>
                    {headers.map(h => (
                      <th key={h} className="py-2 px-3 text-right font-semibold whitespace-nowrap"
                        style={{ color: h === priceCol ? '#2563eb' : h === areaCol ? '#16a34a' : 'rgba(10,12,18,0.5)' }}>
                        {h === priceCol ? '💰 ' : h === areaCol ? '📐 ' : ''}{h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(10,12,18,0.05)', background: i % 2 ? '#F4F3EF' : 'white' }}>
                      {headers.map(h => (
                        <td key={h} className="py-1.5 px-3 num whitespace-nowrap"
                          style={{ color: h === priceCol ? '#2563eb' : h === areaCol ? '#16a34a' : 'rgba(10,12,18,0.6)' }}>
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statistics + Apply */}
      {stats && (
        <div className="space-y-4">

          {/* KPI strip */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm" style={{ color: '#0A0C12' }}>📊 إحصاءات السوق</h3>
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                {stats.count.toLocaleString()} صفقة
              </span>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { l: 'الوسيط',    v: stats.median, c: '#B8924A', bold: true },
                { l: 'المتوسط',   v: stats.mean,   c: '#2563eb' },
                { l: 'الربع الأدنى (P25)', v: stats.p25, c: '#16a34a' },
                { l: 'الربع الأعلى (P75)', v: stats.p75, c: '#d97706' },
                { l: 'الأدنى',    v: stats.min,    c: '#dc2626' },
                { l: 'الأعلى',    v: stats.max,    c: '#7c3aed' },
              ].map(k => (
                <div key={k.l} className="rounded-xl p-3 text-center"
                  style={{ background: '#F4F3EF', border: `1px solid ${k.c}18` }}>
                  <p className="text-xs mb-1 leading-tight" style={{ color: 'rgba(10,12,18,0.4)' }}>{k.l}</p>
                  <p className={`num ${k.bold ? 'text-base font-black' : 'text-sm font-bold'}`}
                    style={{ color: k.c }}>
                    {Math.round(k.v).toLocaleString()}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.3)' }}>ر.س/م²</p>
                </div>
              ))}
            </div>

            {/* Apply buttons */}
            <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
              <div className="flex-1">
                <p className="text-xs mb-2 font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>
                  تطبيق الوسيط ({Math.round(stats.median).toLocaleString()} ر.س/م²) على:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => applyPrice('landPricePerM2', stats.median)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(184,146,74,0.10)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.25)' }}
                  >
                    سعر الأرض →
                  </button>
                  <button
                    onClick={() => applyPrice('sellPricePerM2', stats.median)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.22)' }}
                  >
                    سعر البيع →
                  </button>
                </div>
              </div>

              {/* Custom value applier */}
              <CustomApply stats={stats} onApply={applyPrice} />
            </div>
          </div>

          {/* Histogram */}
          {histogram.length > 0 && (
            <div className="rounded-2xl p-5"
              style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>
              <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>
                📈 توزيع الأسعار (سعر م²)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histogram} margin={{ right: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,12,18,0.05)" />
                  <XAxis dataKey="label" tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [v, 'عدد الصفقات']}
                    labelFormatter={l => `~${Number(l).toLocaleString()} ر.س/م²`}
                    contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid rgba(184,146,74,0.2)', fontSize: 12 }}
                  />
                  <ReferenceLine
                    x={histogram.reduce((best, b) => b.count > best.count ? b : best, histogram[0]).label}
                    stroke="#B8924A" strokeDasharray="4 3" strokeWidth={2}
                  />
                  <Bar dataKey="count" fill="#2563eb" fillOpacity={0.7} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs mt-2 text-center" style={{ color: 'rgba(10,12,18,0.35)' }}>
                الخط الذهبي = الفئة الأكثر تكراراً (المنوال)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Custom value picker for applying a specific percentile ── */
function CustomApply({
  stats,
  onApply,
}: {
  stats: { p25: number; median: number; mean: number; p75: number };
  onApply: (field: 'landPricePerM2' | 'sellPricePerM2', value: number) => void;
}) {
  const [selected, setSelected] = useState<'p25' | 'median' | 'mean' | 'p75'>('median');
  const valueMap = { p25: stats.p25, median: stats.median, mean: stats.mean, p75: stats.p75 };
  const labelMap = { p25: 'P25', median: 'الوسيط', mean: 'المتوسط', p75: 'P75' };

  return (
    <div className="rounded-xl p-3 shrink-0"
      style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.07)', minWidth: 180 }}>
      <p className="text-xs mb-2 font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>قيمة مخصصة</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {(['p25','median','mean','p75'] as const).map(k => (
          <button key={k} onClick={() => setSelected(k)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: selected === k ? '#2563eb' : 'white',
              color:      selected === k ? 'white' : 'rgba(10,12,18,0.5)',
              border:     '1px solid rgba(37,99,235,0.2)',
            }}>
            {labelMap[k]}
          </button>
        ))}
      </div>
      <p className="text-sm font-bold num mb-2" style={{ color: '#2563eb' }}>
        {Math.round(valueMap[selected]).toLocaleString()} ر.س/م²
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onApply('landPricePerM2', valueMap[selected])}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'rgba(184,146,74,0.10)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.25)' }}>
          أرض
        </button>
        <button onClick={() => onApply('sellPricePerM2', valueMap[selected])}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.22)' }}>
          بيع
        </button>
      </div>
    </div>
  );
}
