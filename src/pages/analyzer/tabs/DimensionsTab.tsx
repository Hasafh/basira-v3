import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useProjectsStore } from '../../../store';
import { useAnalysisStore } from '../../../store/analysisStore';
import { projectsAPI } from '../../../api';
import { useQueryClient } from '@tanstack/react-query';
import { classifyLand } from '../../../engines/regulation';

type BoundaryType = 'قطعة' | 'شارع' | 'شارع رئيسي' | 'ممر خلفي';

interface BoundaryRow {
  direction: string;
  length: string;
  type: BoundaryType;
  streetWidth: string;
}

const FIXED_ROWS: BoundaryRow[] = [
  { direction: 'شمال', length: '', type: 'قطعة', streetWidth: '' },
  { direction: 'جنوب', length: '', type: 'قطعة', streetWidth: '' },
  { direction: 'شرق',  length: '', type: 'قطعة', streetWidth: '' },
  { direction: 'غرب',  length: '', type: 'شارع',  streetWidth: '' },
];

const BOUNDARY_TYPES: BoundaryType[] = ['قطعة', 'شارع', 'شارع رئيسي', 'ممر خلفي'];
const isStreet = (t: BoundaryType) => t === 'شارع' || t === 'شارع رئيسي';

export default function DimensionsTab({ project }: { project: any }) {
  const qc = useQueryClient();
  const { setDimensionsData } = useProjectsStore();
  const { setFormFields, formProjectId, initFormForProject } = useAnalysisStore();
  const saved = project?.input || {};

  const [rows,       setRows]       = useState<BoundaryRow[]>(FIXED_ROWS);
  const [extraRows,  setExtraRows]  = useState<BoundaryRow[]>([]);
  const [irregular,  setIrregular]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Pre-fill from saved data on project load
  useEffect(() => {
    if (saved.boundaries?.length >= 4) {
      setRows(saved.boundaries.slice(0, 4).map((b: any) => ({
        direction:   b.direction   || '',
        length:      String(b.length || ''),
        type:        b.type        || 'قطعة',
        streetWidth: String(b.streetWidth || ''),
      })));
      if (saved.boundaries.length > 4) {
        setExtraRows(saved.boundaries.slice(4).map((b: any) => ({
          direction:   b.direction || '',
          length:      String(b.length || ''),
          type:        b.type      || 'قطعة',
          streetWidth: String(b.streetWidth || ''),
        })));
        setIrregular(true);
      }
    }
  }, [project?.id]);

  const allRows = [...rows, ...extraRows];

  const updateRow = (allIdx: number, field: keyof BoundaryRow, value: string) => {
    if (allIdx < 4) {
      setRows(prev => prev.map((r, i) => i === allIdx ? { ...r, [field]: value } : r));
    } else {
      const ei = allIdx - 4;
      setExtraRows(prev => prev.map((r, i) => i === ei ? { ...r, [field]: value } : r));
    }
  };

  /* ── Auto-calculate area whenever rows change ── */
  const n = parseFloat(rows[0].length) || 0;
  const s = parseFloat(rows[1].length) || 0;
  const e = parseFloat(rows[2].length) || 0;
  const w = parseFloat(rows[3].length) || 0;

  const calcArea = (): number => {
    const avgWidth  = (n + s) / (n > 0 && s > 0 ? 2 : 1) || (n || s);
    const avgDepth  = (e + w) / (e > 0 && w > 0 ? 2 : 1) || (e || w);
    if (avgWidth <= 0 || avgDepth <= 0) return 0;
    return Math.round(avgWidth * avgDepth * 100) / 100;
  };

  const landArea = calcArea();

  /* ── Street classification (via regulation engine) ── */
  const streetRows = allRows.filter(r => isStreet(r.type));
  const dirMap: Record<string, string> = { شمال: 'north', جنوب: 'south', شرق: 'east', غرب: 'west' };
  const streetWidthsForEngine: { north?: number; south?: number; east?: number; west?: number } = {};
  for (const r of streetRows) {
    const key = dirMap[r.direction] as keyof typeof streetWidthsForEngine;
    if (key) streetWidthsForEngine[key] = parseFloat(r.streetWidth) || 1;
  }

  const landClassRaw = streetRows.length > 0
    ? classifyLand({ landArea, streetWidths: streetWidthsForEngine, landType: 'سكني', city: '' })
    : null;

  const CLASS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    'شارع واحد': { label: 'أرض على شارع واحد', color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
    'زاوية':     { label: 'أرض زاوية',          color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
    'متظاهرة':   { label: 'شوارع متظاهرة',       color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
    'رأس بلك':   { label: 'رأس بلك',             color: '#ea580c', bg: 'rgba(234,88,12,0.10)' },
    'بلك':       { label: 'بلك',                 color: '#16a34a', bg: 'rgba(34,197,94,0.10)' },
  };
  const landClass = landClassRaw ? (CLASS_STYLE[landClassRaw.type] ?? null) : null;

  // Main facade = longest street side
  const streetFacade = allRows.reduce((best, r) => {
    if (!isStreet(r.type)) return best;
    const len = parseFloat(r.length) || 0;
    return len > best.len ? { len, direction: r.direction, width: r.streetWidth } : best;
  }, { len: 0, direction: '', width: '' });

  // Auto-update dimensions store + analysis store whenever area/street changes.
  // Writing to analysisStore.formInput directly means AnalyzerTab sees the new
  // landArea immediately — no re-entry required.
  useEffect(() => {
    if (landArea > 0) {
      const sw = streetFacade.width ? parseFloat(streetFacade.width) : undefined;
      // projectStore (used for API saves + legacy sync)
      setDimensionsData({ landArea, streetWidth: sw });
      // analysisStore — THE source of truth for form inputs
      const patch: Record<string, string> = { landArea: String(landArea) };
      if (sw) patch.streetWidth = String(sw);
      // Ensure the store is initialised for this project before writing
      if (formProjectId !== project.id) {
        initFormForProject(project.id, patch);
      } else {
        setFormFields(patch);
      }
    }
  }, [landArea, streetFacade.width]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!landArea) { toast.error('أدخل أبعاد القطعة أولاً'); return; }
    setSaving(true);
    try {
      const dims = {
        landArea,
        streetWidth: streetFacade.width ? parseFloat(streetFacade.width) : undefined,
        boundaries:  allRows.filter(r => r.length),
      };
      setDimensionsData(dims);
      await projectsAPI.patch(project.id, {
        name:     project.name,
        location: project.location || '',
        status:   project.status   || 'draft',
        input:    { ...saved, ...dims },
      });
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('✅ تم حفظ الأبعاد');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">

      {/* ── Boundary Table ── */}
      <div style={card}>
        <h3 className="font-bold text-sm mb-5" style={{ color: '#0A0C12' }}>📐 أبعاد القطعة</h3>

        {/* Header */}
        <div className="grid gap-3 mb-2 text-xs font-medium px-1"
          style={{ gridTemplateColumns: '80px 1fr 160px', color: 'rgba(10,12,18,0.45)' }}>
          <span>الاتجاه</span>
          <span>طول الحد (م)</span>
          <span>نوع الحد</span>
        </div>

        {allRows.map((row, i) => (
          <div key={i} className="mb-2">
            {/* Main row */}
            <div className="grid gap-3 items-center"
              style={{ gridTemplateColumns: '80px 1fr 160px' }}>

              {/* Direction — fixed label for first 4, input for extras */}
              {i < 4 ? (
                <span className="text-sm font-medium py-2.5 px-3 rounded-xl text-center"
                  style={{ background: 'rgba(184,146,74,0.07)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.18)' }}>
                  {row.direction}
                </span>
              ) : (
                <input
                  value={row.direction}
                  onChange={e => updateRow(i, 'direction', e.target.value)}
                  placeholder="جهة..."
                  style={field}
                />
              )}

              {/* Length */}
              <input
                type="number"
                value={row.length}
                onChange={e => updateRow(i, 'length', e.target.value)}
                placeholder="0"
                style={{ ...field, fontFamily: 'IBM Plex Mono, monospace' }}
              />

              {/* Type */}
              <select
                value={row.type}
                onChange={e => updateRow(i, 'type', e.target.value as BoundaryType)}
                style={{ ...field, background: 'white', cursor: 'pointer' }}
              >
                {BOUNDARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Street width sub-row */}
            {isStreet(row.type) && (
              <div className="flex items-center gap-2 mt-1.5 pr-[92px]">
                <span className="text-xs shrink-0" style={{ color: '#d97706' }}>↳ عرض الشارع</span>
                <input
                  type="number"
                  value={row.streetWidth}
                  onChange={e => updateRow(i, 'streetWidth', e.target.value)}
                  placeholder="متر"
                  className="w-28"
                  style={{ ...field, fontFamily: 'IBM Plex Mono, monospace', borderColor: 'rgba(245,158,11,0.35)' }}
                />
                <span className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>م</span>
              </div>
            )}
          </div>
        ))}

        {/* Irregular checkbox */}
        <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={irregular}
            onChange={e => {
              setIrregular(e.target.checked);
              if (!e.target.checked) setExtraRows([]);
            }}
            className="w-4 h-4 accent-amber-600"
          />
          <span className="text-xs" style={{ color: 'rgba(10,12,18,0.55)' }}>القطعة غير منتظمة الشكل (مثلثة / خماسية)</span>
        </label>

        {irregular && (
          <button
            onClick={() => setExtraRows(prev => [...prev, { direction: '', length: '', type: 'قطعة', streetWidth: '' }])}
            className="mt-3 text-xs px-3 py-2 rounded-xl transition-all"
            style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.20)' }}
          >
            ➕ إضافة حد إضافي
          </button>
        )}
      </div>

      {/* ── Auto-result ── */}
      {landArea > 0 && (
        <div
          className="rounded-xl p-4 space-y-3 animate-fadeup"
          style={{ background: 'rgba(184,146,74,0.07)', border: '1px solid rgba(184,146,74,0.20)' }}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: streetFacade.len > 0 ? '1fr 1fr' : '1fr' }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>المساحة الكلية</p>
              <p className="text-2xl font-bold num" style={{ color: '#B8924A' }}>
                {landArea.toLocaleString()} <span className="text-sm font-normal">م²</span>
              </p>
              {n !== s && n > 0 && s > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.4)' }}>
                  محسوبة كشبه منحرف: ({n}+{s})/2 × ({e}+{w})/2
                </p>
              )}
            </div>
            {streetFacade.len > 0 && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
                  الواجهة الرئيسية ({streetFacade.direction})
                </p>
                <p className="text-2xl font-bold num" style={{ color: '#0284c7' }}>
                  {streetFacade.len} <span className="text-sm font-normal">م</span>
                </p>
                {streetFacade.width && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.4)' }}>
                    عرض الشارع: {streetFacade.width} م
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Classification badge */}
          {landClass && (
            <div className="pt-2.5" style={{ borderTop: '1px solid rgba(184,146,74,0.20)' }}>
              <p className="text-xs mb-1.5" style={{ color: 'rgba(10,12,18,0.45)' }}>تصنيف الأرض</p>
              <span
                className="text-sm font-bold px-3 py-1.5 rounded-full inline-block"
                style={{
                  color: landClass.color,
                  background: landClass.bg,
                  border: `1px solid ${landClass.color}44`,
                }}
              >
                {landClass.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        disabled={saving || landArea === 0}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
        style={{
          background: landArea === 0 || saving ? 'rgba(184,146,74,0.3)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
          color: landArea === 0 || saving ? 'rgba(10,12,18,0.4)' : '#0A0C12',
          cursor: landArea === 0 || saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الأبعاد'}
      </button>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(10,12,18,0.07)',
  borderRadius: '16px',
  padding: '20px',
};

const field: React.CSSProperties = {
  border: '1px solid rgba(10,12,18,0.12)',
  borderRadius: '10px',
  padding: '9px 12px',
  outline: 'none',
  fontFamily: 'Tajawal, sans-serif',
  fontSize: '13px',
  width: '100%',
};
