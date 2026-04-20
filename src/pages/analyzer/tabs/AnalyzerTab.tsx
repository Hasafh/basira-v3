import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectContext } from '../../../contexts/ProjectContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { analysisAPI, projectsAPI } from '../../../api';
import { useProjectsStore } from '../../../store';
import { useAnalysis } from '../../../hooks/useAnalysis';
import { runFeasibility } from '../../../engines/feasibility';
import { checkRegulation } from '../../../engines/regulation';

/* ══════════════════════════════════════════════════════
   BUILDING CODES — Saudi Zoning System
══════════════════════════════════════════════════════ */
interface BuildingCode {
  nameAr: string;
  landType: 'سكني' | 'تجاري';
  minStreetWidth: number;
  maxStreetWidth: number;
  maxFloors: number;
  hasAnnex: boolean;
  annexPct: number;
  groundCoverage: number;
  groundCoverageUpper?: number;
  setbackFront: number;
  setbackSide: number;
  setbackMainStreetText: string;
  setbackNeighborText: string;
  setbackSecondaryText?: string;
  floorDescription: string;
  allowedUses: string[];
  parkingNote: string;
  depthRule?: string;
}

/* Helper: compute actual setback from rule text + street width */
const computeSetback = (rule: string, sw: number): string => {
  if (!rule || !sw) return rule;
  if (rule.includes('1/5') || rule.includes('خمس')) {
    const min = rule.includes('حد أدنى 3م') ? 3 : 2;
    const calc = parseFloat((sw / 5).toFixed(1));
    const result = Math.max(calc, min);
    return `${rule} (= ${result}م)`;
  }
  return rule;
};

const BUILDING_CODES: Record<string, BuildingCode> = {
  /* ── رموز لائحة اشتراطات البناء السعودية ── */
  'س111': {
    nameAr: 'سكني — فيلا (أرض ≤ 500م²)',
    landType: 'سكني',
    minStreetWidth: 10, maxStreetWidth: 20,
    maxFloors: 2, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.65,
    setbackFront: 2, setbackSide: 1.5,
    setbackMainStreetText: '1/5 عرض الشارع، حد أدنى 2م',
    setbackNeighborText: '1.5م',
    floorDescription: 'دور أرضي + دور أول + ملحق (50٪)',
    allowedUses: ['فيلا منفصلة', 'فيلا متلاصقة'],
    parkingNote: 'وحدة ≤180م²: موقف واحد · وحدة >180م²: موقفان',
  },
  'س112': {
    nameAr: 'سكني — فيلا (أرض > 500م²)',
    landType: 'سكني',
    minStreetWidth: 15, maxStreetWidth: 999,
    maxFloors: 2, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.60,
    setbackFront: 3, setbackSide: 2,
    setbackMainStreetText: '1/5 عرض الشارع، حد أدنى 3م',
    setbackNeighborText: '2م',
    floorDescription: 'دور أرضي + دور أول + ملحق (50٪)',
    allowedUses: ['فيلا منفصلة', 'فيلا متلاصقة'],
    parkingNote: 'وحدة ≤180م²: موقف واحد · وحدة >180م²: موقفان',
  },
  'س121': {
    nameAr: 'سكني — شقق منخفض الارتفاع (≤ 4 أدوار)',
    landType: 'سكني',
    minStreetWidth: 20, maxStreetWidth: 30,
    maxFloors: 4, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.60,
    groundCoverageUpper: 0.75,
    setbackFront: 4, setbackSide: 2,
    setbackMainStreetText: '1/5 عرض الشارع، حد أدنى 4م',
    setbackNeighborText: '2م',
    setbackSecondaryText: 'خمس عرض الشارع، حد أدنى 3م',
    floorDescription: 'حتى 4 أدوار + ملحق (50٪)',
    allowedUses: ['شقق سكنية'],
    parkingNote: 'وحدة ≤180م²: موقف واحد · وحدة >180م²: موقفان',
    depthRule: 'لا يتجاوز 3.5 دور عن 30م من الشارع الرئيسي',
  },
  'س122': {
    nameAr: 'سكني — شقق متوسط الارتفاع (5–9 أدوار)',
    landType: 'سكني',
    minStreetWidth: 30, maxStreetWidth: 60,
    maxFloors: 9, hasAnnex: false, annexPct: 0,
    groundCoverage: 0.55,
    setbackFront: 6, setbackSide: 3,
    setbackMainStreetText: '6م أو 1/5 عرض الشارع',
    setbackNeighborText: '3م',
    floorDescription: '5 إلى 9 أدوار',
    allowedUses: ['شقق سكنية', 'عمارة سكنية'],
    parkingNote: 'موقف لكل وحدة',
  },
  'ت111': {
    nameAr: 'تجاري — محلات تجارية (شارع ≤ 30م)',
    landType: 'تجاري',
    minStreetWidth: 15, maxStreetWidth: 30,
    maxFloors: 2, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.70,
    setbackFront: 0, setbackSide: 0,
    setbackMainStreetText: 'على حد الملك',
    setbackNeighborText: 'على حد الملك',
    floorDescription: 'دور أرضي + أول (تجاري)',
    allowedUses: ['محلات تجارية', 'مطاعم', 'خدمات'],
    parkingNote: 'موقف لكل 45م² من المساحة التجارية',
  },
  'ت121': {
    nameAr: 'تجاري — مكاتب ومختلط (شارع > 30م)',
    landType: 'تجاري',
    minStreetWidth: 30, maxStreetWidth: 999,
    maxFloors: 6, hasAnnex: false, annexPct: 0,
    groundCoverage: 0.60,
    setbackFront: 6, setbackSide: 2,
    setbackMainStreetText: '6م',
    setbackNeighborText: '2م',
    setbackSecondaryText: '1/5 عرض الشارع، حد أدنى 2م',
    floorDescription: 'حتى 6 أدوار — تجاري/مكاتب/مختلط',
    allowedUses: ['مكاتب', 'تجاري', 'سكني/تجاري مختلط'],
    parkingNote: 'سكني: موقف/وحدة · تجاري: موقف/45م²',
    depthRule: 'يجب مراجعة أمانة المنطقة للمباني فوق 4 أدوار',
  },
  /* ── أكواد مخصصة (للأغراض العامة) ── */
  'كود-1': {
    nameAr: 'سكني — فلل، فلل متلاصقة، أدوار سكنية',
    landType: 'سكني',
    minStreetWidth: 10, maxStreetWidth: 999,
    maxFloors: 2, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.60,
    setbackFront: 2, setbackSide: 2,
    setbackMainStreetText: '1/5 عرض الشارع، حد أدنى 2م',
    setbackNeighborText: '2م',
    setbackSecondaryText: '1/5 عرض الشارع، حد أدنى 2م',
    floorDescription: 'دور أرضي + دور أول + ملحق (50٪ من مساحة الدور الأخير)',
    allowedUses: ['فيلا منفصلة', 'فيلا متلاصقة', 'أدوار سكنية'],
    parkingNote: 'وحدة ≤180م²: موقف واحد · وحدة >180م²: موقفان',
  },
  'كود-2': {
    nameAr: 'مختلط — سكني / تجاري / مكتبي',
    landType: 'تجاري',
    minStreetWidth: 30, maxStreetWidth: 999,
    maxFloors: 2, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.60,
    setbackFront: 6, setbackSide: 2,
    setbackMainStreetText: '6م',
    setbackNeighborText: '2م',
    setbackSecondaryText: '1/5 عرض الشارع، حد أدنى 2م',
    floorDescription: 'دور أرضي + دور أول + ملحق (50٪ من مساحة الدور الأخير)',
    allowedUses: ['سكني', 'تجاري', 'مكتبي'],
    parkingNote: 'سكني: موقف/وحدة · تجاري: موقف/45م²',
    depthRule: 'يجب مراجعة أمانة منطقة الرياض',
  },
  'كود-3': {
    nameAr: 'شقق سكنية',
    landType: 'سكني',
    minStreetWidth: 30, maxStreetWidth: 999,
    maxFloors: 3, hasAnnex: true, annexPct: 0.5,
    groundCoverage: 0.60,
    groundCoverageUpper: 0.75,
    setbackFront: 6, setbackSide: 2,
    setbackMainStreetText: '6م',
    setbackNeighborText: '2م',
    setbackSecondaryText: 'خمس عرض الشارع، حد أدنى 3م',
    floorDescription: 'دور أرضي + دور أول + دور ثاني + ملحق (50٪ من مساحة الدور الأخير)',
    allowedUses: ['شقق سكنية'],
    parkingNote: 'وحدة ≤180م²: موقف واحد · وحدة >180م²: موقفان',
    depthRule: 'لا يتجاوز 3.5 دور عن 30م من الشارع الرئيسي — باقي العمق: دورين ونصف سكني فقط',
  },
};

const TOTAL_FLOORS = (c: BuildingCode) => c.maxFloors + (c.hasAnnex ? 1 : 0);
const inp = (v: any) => (v != null ? String(v) : '');

/* ── Default empty code form ── */
const EMPTY_CODE_FORM = {
  code: '', nameAr: '', landType: 'سكني', maxFloors: '2',
  hasAnnex: 'true', groundCoverage: '0.6',
  minStreetWidth: '10', maxStreetWidth: '999',
  setbackFront: '3', setbackSide: '2', allowedUses: '',
};

export default function AnalyzerTab({ project }: { project: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setAnalysisResult, setLastInput, dimensionsData, addAnalysisVersion } = useProjectsStore();
  const {
    setAnalysis,
    formInput, formProjectId,
    initFormForProject, setFormField, setFormFields,
    projectResults, setProjectResult,
    financingStructure,
  } = useAnalysis();

  /**
   * `form` is NOT local state — it IS the Zustand store slice.
   * Reading form.xxx reads directly from the persisted global store.
   * No useState, no divergence.
   */
  const form = formInput;

  const saved  = project?.input || {};
  const merged = { ...saved, ...dimensionsData };

  /* ── Build initial form values ── */
  const buildDefaults = (): Record<string, string> => ({
    landArea:               inp(merged.landArea),
    landType:               merged.landType            || 'سكني',
    usageType:              merged.usageType           || '',
    streetWidth:            inp(merged.streetWidth),
    floors:                 inp(merged.floors)         || '4',
    basementFloors:         inp(merged.basementFloors) || '0',
    groundCoverageRatio:    inp(merged.groundCoverageRatio) || '0.6',
    landPricePerM2:         inp(merged.landPricePerM2),
    buildCostPerM2:         inp(merged.buildCostPerM2) || '2000',
    sellPricePerM2:         inp(merged.sellPricePerM2),
    profitTarget:           inp(merged.profitTarget)   || '0.25',
    operationMode:          merged.operationMode       || 'sell',
    selfPct:                inp(merged.selfPct)        || '1',
    bankPct:                inp(merged.bankPct)        || '0',
    zoningCode:             merged.zoningCode          || '',
    manualNetSellableArea:  inp(merged.manualNetSellableArea) || '',
    servicesAreaPct:        inp(merged.servicesAreaPct) || '0.15',
  });

  /* ── Init store when switching to this project ──
     initFormForProject merges server-saved data with any previously entered
     inputs (projectInputs[id]) — so no keystroke is ever lost.           */
  useEffect(() => {
    if (formProjectId !== project.id) {
      initFormForProject(project.id, buildDefaults());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  /* ── Advanced Settings toggle ── */
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Custom codes (session-only) ── */
  const [customCodes, setCustomCodes] = useState<Record<string, BuildingCode>>({});
  const allCodes = { ...BUILDING_CODES, ...customCodes };

  /* ── Code selection ── */
  const [selectedCode, setSelectedCode] = useState(form.zoningCode || '');
  const [streetWarning, setStreetWarning] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeForm, setCodeForm] = useState(EMPTY_CODE_FORM);
  const code = allCodes[selectedCode];

  /* ── Central field setter — writes directly to global store ── */
  const setField = (k: string, v: string) => setFormField(k, v);

  /* ── Apply a building code — bulk write avoids multiple re-renders ── */
  const applyCode = (rawCode: string, codesMap = allCodes) => {
    const c = codesMap[rawCode];
    if (!c) return;
    setSelectedCode(rawCode);
    setFormFields({
      zoningCode:          rawCode,
      groundCoverageRatio: String(c.groundCoverage),
      floors:              String(TOTAL_FLOORS(c)),
      landType:            c.landType,
      servicesAreaPct:     c.landType === 'تجاري' ? '0.20' : '0.15',
    });
  };

  /* ── Sync when dimensionsData updates (belt-and-suspenders fallback) ──
     DimensionsTab now writes directly to analysisStore.formInput via setFormFields,
     so this effect is only a safety net for data arriving from the API.    */
  useEffect(() => {
    if (Object.keys(dimensionsData).length === 0) return;
    const patch: Record<string, string> = {};
    if (dimensionsData.landArea)    patch.landArea    = inp(dimensionsData.landArea);
    if (dimensionsData.streetWidth) patch.streetWidth = inp(dimensionsData.streetWidth);
    if (dimensionsData.zoningCode) {
      setSelectedCode(dimensionsData.zoningCode);
      patch.zoningCode = dimensionsData.zoningCode;
    }
    if (Object.keys(patch).length > 0) setFormFields(patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensionsData]);

  /* ── Enforce floor limit ── */
  const enforceFloors = (v: string) => {
    if (!code) { setField('floors', v); return; }
    const max = TOTAL_FLOORS(code);
    const entered = parseInt(v, 10);
    if (entered > max) {
      setField('floors', String(max));
      toast.error(`⛔ الكود ${selectedCode} يسمح بـ ${max} دور فقط (${code.floorDescription})`, { duration: 5000 });
    } else {
      setField('floors', v);
    }
  };

  /* ── Street width validation ── */
  useEffect(() => {
    if (!code || !form.streetWidth) { setStreetWarning(''); return; }
    const sw = parseFloat(form.streetWidth);
    if (sw < code.minStreetWidth) {
      setStreetWarning(`⚠️ عرض الشارع ${sw}م أقل من الحد الأدنى (${code.minStreetWidth}م) للكود ${selectedCode}`);
    } else if (code.maxStreetWidth < 999 && sw > code.maxStreetWidth) {
      setStreetWarning(`⚠️ عرض الشارع ${sw}م يتجاوز الحد الأقصى (${code.maxStreetWidth}م) للكود ${selectedCode}`);
    } else {
      setStreetWarning('');
    }
  }, [form.streetWidth, selectedCode, code]);

  /* ── Add custom code from modal ── */
  const addCustomCode = () => {
    if (!codeForm.code.trim() || !codeForm.nameAr.trim()) {
      toast.error('رمز الكود والاسم مطلوبان');
      return;
    }
    const floors = parseInt(codeForm.maxFloors) || 2;
    const annex  = codeForm.hasAnnex === 'true';
    const sf = parseFloat(codeForm.setbackFront) || 3;
    const ss = parseFloat(codeForm.setbackSide) || 2;
    const newCode: BuildingCode = {
      nameAr:               codeForm.nameAr,
      landType:             codeForm.landType as 'سكني' | 'تجاري',
      minStreetWidth:       parseFloat(codeForm.minStreetWidth) || 10,
      maxStreetWidth:       parseFloat(codeForm.maxStreetWidth) || 999,
      maxFloors:            floors,
      hasAnnex:             annex,
      annexPct:             0.5,
      groundCoverage:       parseFloat(codeForm.groundCoverage) || 0.6,
      setbackFront:         sf,
      setbackSide:          ss,
      setbackMainStreetText: `${sf}م`,
      setbackNeighborText:   `${ss}م`,
      floorDescription:     `${floors} دور${annex ? ' + ملحق (50٪ من الدور الأخير)' : ''}`,
      allowedUses:          codeForm.allowedUses.split('،').map(s => s.trim()).filter(Boolean),
      parkingNote:          'حسب اشتراطات البلدية',
    };
    const updatedCustom = { ...customCodes, [codeForm.code.trim()]: newCode };
    setCustomCodes(updatedCustom);
    applyCode(codeForm.code.trim(), { ...BUILDING_CODES, ...updatedCustom });
    setShowCodeModal(false);
    setCodeForm(EMPTY_CODE_FORM);
    toast.success(`✅ تم إضافة الكود ${codeForm.code.trim()}`);
  };

  /* ── Live analysis from context (computed once, shared everywhere) ── */
  const { liveResult } = useProjectContext();

  // Read from per-project store — survives navigation, project switches, and app restarts
  const result = projectResults[project.id] ?? project?.result ?? null;
  const setResult = (r: any) => setProjectResult(project.id, r);
  const [loading, setLoading] = useState(false);
  const num = (v: string) => parseFloat(v) || 0;

  const submit = async () => {
    const missing: string[] = [];
    if (!form.landArea        || parseFloat(form.landArea)        <= 0) missing.push('مساحة الأرض');
    if (!form.landPricePerM2  || parseFloat(form.landPricePerM2)  <= 0) missing.push('سعر الأرض/م²');
    if (!form.sellPricePerM2  || parseFloat(form.sellPricePerM2)  <= 0) missing.push('سعر البيع/م²');
    if (missing.length > 0) {
      toast.error(`يجب إدخال: ${missing.join(' · ')}`, { duration: 4000 });
      return;
    }
    if (streetWarning) {
      toast('⚠️ تحذير عرض الشارع — التحليل سيستمر', { icon: '⚠️', duration: 3000 });
    }
    setLoading(true);
    try {
      const payload = {
        projectId:              project.id,
        landArea:               num(form.landArea),
        landType:               form.landType,
        usageType:              form.usageType,
        streetWidth:            num(form.streetWidth),
        floors:                 num(form.floors),
        basementFloors:         num(form.basementFloors),
        groundCoverageRatio:    num(form.groundCoverageRatio),
        landPricePerM2:         num(form.landPricePerM2),
        buildCostPerM2:         num(formInput.buildCostPerM2 as string) || num(form.buildCostPerM2) || 2000,
        sellPricePerM2:         num(form.sellPricePerM2),
        profitTarget:           num(form.profitTarget),
        operationMode:          form.operationMode,
        selfPct:                num(formInput.selfPct as string) || num(form.selfPct) || 1,
        bankPct:                num(formInput.bankPct as string) || num(form.bankPct) || financingStructure.bankPct || 0,
        softCostsPct:           num(formInput.softCostsPct as string) || 0.05,
        contingencyPct:         num(formInput.contingencyPct as string) || 0.05,
        servicesAreaPct:        num(form.servicesAreaPct) || 0.15,
        zoningCode:             selectedCode || undefined,
        manualNetSellableArea:  form.manualNetSellableArea ? num(form.manualNetSellableArea) : undefined,
      };
      const res    = await analysisAPI.runFull(payload);
      const apiR   = res.data?.data || res.data;
      // Embed the exact bankPct used so BankReport can always find it,
      // even if project.input on the server is stale.
      const r = { ...apiR, _inputs: { bankPct: payload.bankPct } };

      setResult(r);
      setAnalysis(r, payload);
      setAnalysisResult(r);
      setLastInput(payload);
      addAnalysisVersion(project.id, payload, r);
      // Persist result to project so it survives logout / page refresh
      projectsAPI.patch(project.id, {
        name:     project.name,
        location: project.location || '',
        status:   project.status   || 'draft',
        result:   r,
      }).then(() => qc.invalidateQueries({ queryKey: ['project', project.id] })).catch(
        () => qc.invalidateQueries({ queryKey: ['project', project.id] })
      );
      toast.success('✅ تم التحليل — النتائج محفوظة');
      setTimeout(() => navigate(`/project/${id ?? project.id}#results`), 1200);
    } catch (e: any) {
      // Local fallback — run engines directly without API
      try {
        const feasInput = {
          landArea:              num(form.landArea),
          landPricePerM2:        num(form.landPricePerM2),
          floors:                num(form.floors) || 4,
          basementFloors:        num(form.basementFloors),
          groundCoverageRatio:   num(form.groundCoverageRatio) || 0.6,
          buildCostPerM2:        num(formInput.buildCostPerM2 as string) || num(form.buildCostPerM2) || 2000,
          sellPricePerM2:        num(form.sellPricePerM2),
          softCostsPct:          num(formInput.softCostsPct as string) || 0.05,
          contingencyPct:        num(formInput.contingencyPct as string) || 0.05,
          bankPct:               num(formInput.bankPct as string) || num(form.bankPct) || financingStructure.bankPct || 0,
          interestRate:          0.07,
          projectDurationMonths: num(formInput.projectDurationMonths as string) || 24,
          operationMode:         (form.operationMode as any) || 'sell',
          profitTarget:          num(form.profitTarget) || 0.25,
          servicesAreaPct:       num(form.servicesAreaPct) || 0.15,
          manualNetSellableArea: form.manualNetSellableArea ? num(form.manualNetSellableArea) : undefined,
        };
        const feasResult = runFeasibility(feasInput);

        const regResult = checkRegulation({
          zoningCode: selectedCode || 'كود-1',
          landArea:   feasInput.landArea,
          floors:     feasInput.floors,
          gcr:        feasInput.groundCoverageRatio,
        });

        // Flatten so all readers (Summary, ResultsTab, SensitivityPage…) find
        // financials / costs / areas at the top level — same shape as API result.
        const localResult = { ...feasResult, regulation: regResult, _local: true, _inputs: { bankPct: feasInput.bankPct } };
        setResult(localResult);
        setAnalysis(localResult, feasInput);
        setAnalysisResult(localResult);
        setLastInput(feasInput);
        addAnalysisVersion(project.id, feasInput, localResult);
        // Persist result to server so it survives logout / page refresh
        projectsAPI.patch(project.id, {
          name:     project.name,
          location: project.location || '',
          status:   project.status   || 'draft',
          result:   localResult,
        }).then(() => qc.invalidateQueries({ queryKey: ['project', project.id] })).catch(() => {});
        toast.success('✅ تم التحليل — النتائج محفوظة');
        setTimeout(() => navigate(`/project/${id ?? project.id}#results`), 1200);
      } catch {
        toast.error(e?.response?.data?.error || e?.response?.data?.message || 'تعذّر التحليل');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-5 p-6" dir="rtl" style={{ alignItems: 'flex-start' }}>

      {/* ════════ Form column (right in RTL) ════════ */}
      <div className="flex-1 min-w-0 space-y-5">

      {/* ── Building Code ── */}
      <div style={cardStyle}>
        <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>🏛 الكود النظامي</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              اختر الكود
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCode}
                onChange={e => { if (e.target.value) applyCode(e.target.value); else setSelectedCode(''); }}
                style={{ ...fieldStyle, background: 'white', cursor: 'pointer', flex: 1 }}
              >
                <option value="">-- اختر الكود --</option>
                {Object.keys(allCodes).map(c => (
                  <option key={c} value={c}>{c} — {allCodes[c].nameAr}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowCodeModal(true); setCodeForm(EMPTY_CODE_FORM); }}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap"
                style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.20)' }}
              >
                + إضافة كود
              </button>
            </div>
          </div>

          {/* Code summary */}
          {code ? (
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(184,146,74,0.05)', border: '1px solid rgba(184,146,74,0.25)' }}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs" style={{ color: '#B8924A' }}>{selectedCode} | {code.nameAr}</p>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}>
                  {code.landType}
                </span>
              </div>
              <p className="text-xs font-medium" style={{ color: '#0A0C12' }}>
                أقصى أدوار: {TOTAL_FLOORS(code)} ({code.floorDescription})
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'rgba(10,12,18,0.6)' }}>
                <span>تغطية أرضي: <b style={{ color: '#0A0C12' }}>{(code.groundCoverage * 100).toFixed(0)}٪</b></span>
                {code.groundCoverageUpper && (
                  <span>تغطية متكررة: <b style={{ color: '#0284c7' }}>{(code.groundCoverageUpper * 100).toFixed(0)}٪</b></span>
                )}
                <span>ملحق: <b style={{ color: '#0A0C12' }}>{(code.annexPct * 100).toFixed(0)}٪ من الدور الأخير</b></span>
                <span>شارع: <b style={{ color: '#0A0C12' }}>{code.minStreetWidth}م{code.maxStreetWidth < 999 ? `–${code.maxStreetWidth}م` : '+'}</b></span>
              </div>
              <div className="space-y-1 pt-1 text-xs" style={{ borderTop: '1px solid rgba(10,12,18,0.07)', color: 'rgba(10,12,18,0.6)' }}>
                <p>ارتداد رئيسي: <b style={{ color: '#0A0C12' }}>{computeSetback(code.setbackMainStreetText, parseFloat(form.streetWidth))}</b></p>
                <p>ارتداد جار: <b style={{ color: '#0A0C12' }}>{code.setbackNeighborText}</b></p>
                {code.setbackSecondaryText && (
                  <p>ارتداد ثانوي: <b style={{ color: '#0A0C12' }}>{computeSetback(code.setbackSecondaryText, parseFloat(form.streetWidth))}</b></p>
                )}
              </div>
              {code.depthRule && (
                <p className="text-xs rounded-lg px-2 py-1.5 font-medium"
                  style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.20)' }}>
                  ⚠️ {code.depthRule}
                </p>
              )}
              <p className="text-xs pt-1" style={{ color: 'rgba(10,12,18,0.45)', borderTop: '1px solid rgba(10,12,18,0.07)' }}>
                🚗 {code.parkingNote}
              </p>
            </div>
          ) : (
            <div className="rounded-xl p-4 flex items-center justify-center"
              style={{ background: '#F4F3EF', border: '1px dashed rgba(10,12,18,0.12)' }}>
              <p className="text-xs text-center" style={{ color: 'rgba(10,12,18,0.4)' }}>
                اختر الكود لتطبيق القيود تلقائياً
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Land ── */}
      <div style={cardStyle}>
        <h3 className="font-bold text-sm mb-4" style={{ color: '#0A0C12' }}>📐 بيانات الأرض</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="مساحة الأرض (م²) *" k="landArea"  form={form} setField={setField} />

          {/* landType — read-only from DimensionsTab / building code */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              نوع الأرض
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.10)', color: '#0A0C12' }}>
              <span className="font-medium">{form.landType || 'سكني'}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}>
                من الكود 🏛
              </span>
            </div>
          </div>

          <Sel label="الاستخدام المقترح" k="usageType" form={form} setField={setField}
            opts={[
              { v: '', l: '-- اختر --' },
              ...((form.landType === 'سكني'
                ? ['فيلا منفصلة', 'فيلا متلاصقة', 'أدوار سكنية', 'شقق سكنية']
                : form.landType === 'تجاري'
                ? ['معارض', 'مكاتب', 'مختلط', 'فندقي']
                : ['مستودع', 'مصنع', 'ورشة']
              ).map(v => ({ v, l: v })))
            ]}
          />

          {/* Street width — read-only from DimensionsTab */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              عرض الشارع (م)
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: '#F4F3EF', border: '1px solid rgba(10,12,18,0.10)', color: '#0A0C12' }}>
              <span className="font-medium num">{form.streetWidth || '—'}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}>
                من الأبعاد 📐
              </span>
            </div>
            {streetWarning && (
              <p className="text-xs mt-1 font-medium" style={{ color: '#d97706' }}>{streetWarning}</p>
            )}
          </div>

          {/* Floors with enforcement */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
              عدد الأدوار {code && <span style={{ color: '#B8924A' }}>(أقصى: {TOTAL_FLOORS(code)})</span>}
            </label>
            <input
              type="number" value={form.floors}
              onChange={e => enforceFloors(e.target.value)}
              style={fieldStyle}
            />
            {code && (
              <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>{code.floorDescription}</p>
            )}
          </div>

          <F label="أدوار البدروم"       k="basementFloors"      form={form} setField={setField} />
          <F label="نسبة البناء الأرضي"  k="groundCoverageRatio" step="0.05" form={form} setField={setField} />
        </div>
      </div>

      {/* ── Pricing ── */}
      <div style={cardStyle}>
        <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>💰 التسعير</h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
          تكلفة البناء في تبويب التكاليف · هيكل التمويل في تبويب التمويل
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="سعر الأرض (ر.س/م²) *"        k="landPricePerM2"  form={form} setField={setField} />
          <F label="سعر البيع المتوقع (ر.س/م²) *" k="sellPricePerM2"  form={form} setField={setField} />
          <Sel label="هدف الربح" k="profitTarget" form={form} setField={setField}
            opts={[.15,.20,.25,.30,.35].map(v => ({ v: String(v), l: `${v*100}٪` }))} />
          <Sel label="طريقة الخروج" k="operationMode" form={form} setField={setField}
            opts={[{ v: 'sell', l: 'بيع' }, { v: 'rent', l: 'إيجار' }]} />
        </div>
      </div>

      {/* ── Area Metrics (computed live from inputs) ── */}
      {parseFloat(form.landArea) > 0 && (() => {
        const la      = parseFloat(form.landArea)             || 0;
        const fl      = parseFloat(form.floors)               || 4;
        const gcr     = parseFloat(form.groundCoverageRatio)  || 0.6;
        const bf      = parseFloat(form.basementFloors)       || 0;
        const svcPct  = parseFloat(form.servicesAreaPct)      || 0.15;
        const agArea  = la * gcr * fl;
        const bsmArea = la * 0.90 * bf;
        const gba     = agArea + bsmArea;
        const nsa     = agArea * (1 - svcPct);
        const svcArea = gba - nsa;
        return (
          <div style={cardStyle}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#0A0C12' }}>📏 المساحات المحسوبة</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>
              تُحسب آلياً من الأبعاد — الإيرادات تستخدم المساحة القابلة للبيع (NSA)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'إجمالي مساحة البناء (GBA)', value: gba,     unit: 'م²', color: '#2563eb', desc: 'فوق الأرض + بدروم' },
                { label: 'مساحة الخدمات',              value: svcArea, unit: 'م²', color: '#d97706', desc: `${(svcPct*100).toFixed(0)}٪ من المساحة الفوقية` },
                { label: 'المساحة القابلة للبيع (NSA)', value: nsa,     unit: 'م²', color: '#16a34a', desc: `${((1-svcPct)*100).toFixed(0)}٪ من المساحة الفوقية` },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3 text-center"
                  style={{ background: '#F4F3EF', border: `1px solid ${m.color}22` }}>
                  <p className="text-xs mb-1 leading-tight" style={{ color: 'rgba(10,12,18,0.5)' }}>{m.label}</p>
                  <p className="text-lg font-bold num" style={{ color: m.color }}>{m.value.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} {m.unit}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.35)' }}>{m.desc}</p>
                </div>
              ))}
            </div>

            {/* Advanced Settings toggle */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
              <button
                onClick={() => setShowAdvanced(s => !s)}
                className="flex items-center gap-2 text-xs font-medium transition-colors"
                style={{ color: showAdvanced ? '#B8924A' : 'rgba(10,12,18,0.4)' }}
              >
                {showAdvanced ? '▲' : '▼'} إعدادات متقدمة
              </button>

              {showAdvanced && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                      نسبة مساحة الخدمات ٪ (افتراضي: سكني 15٪، تجاري 20٪)
                    </label>
                    <input
                      type="number" min="0" max="0.5" step="0.01"
                      value={form.servicesAreaPct || '0.15'}
                      onChange={e => setField('servicesAreaPct', e.target.value)}
                      className="w-full text-sm"
                      style={{ border: '1px solid rgba(184,146,74,0.30)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(184,146,74,0.30)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                      تحديد NSA يدوياً (يتجاوز الحساب الآلي)
                    </label>
                    <input
                      type="number"
                      value={form.manualNetSellableArea || ''}
                      onChange={e => setField('manualNetSellableArea', e.target.value)}
                      placeholder={`${Math.round(nsa).toLocaleString()} م² (محسوبة)`}
                      className="w-full text-sm"
                      style={{ border: '1px solid rgba(22,163,74,0.30)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(22,163,74,0.30)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <button onClick={submit} disabled={loading}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
        style={{
          background: loading ? 'rgba(184,146,74,0.4)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
          color:      loading ? 'rgba(10,12,18,0.5)' : '#0A0C12',
          cursor:     loading ? 'not-allowed' : 'pointer',
        }}>
        {loading ? '⏳ جاري التحليل...' : '💾 حفظ وتزامن مع المشروع'}
      </button>

      </div>{/* end form column */}

      {/* ════════ Live panel (left in RTL) — sticky ════════ */}
      <div className="w-72 shrink-0" style={{ position: 'sticky', top: '16px' }}>
        <LiveAnalysisPanel liveResult={liveResult} onGoToResults={() => navigate(`/project/${id}#results`)} />
      </div>

      {/* ── Add Code Modal — fixed overlay, outside columns ── */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,12,18,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCodeModal(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto"
            style={{ background: 'white', maxHeight: '90vh' }}
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: '#0A0C12' }}>➕ إضافة كود نظامي جديد</h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.5)' }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MF label="رمز الكود *"    v={codeForm.code}        onChange={v => setCodeForm(f => ({ ...f, code: v }))} placeholder="مثال: س131" />
              <MF label="الاسم *"        v={codeForm.nameAr}      onChange={v => setCodeForm(f => ({ ...f, nameAr: v }))} placeholder="مثال: فيلات فاخرة" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>نوع الأرض</label>
                <select value={codeForm.landType} onChange={e => setCodeForm(f => ({ ...f, landType: e.target.value }))} style={{ ...fieldStyle, background: 'white' }}>
                  <option value="سكني">سكني</option>
                  <option value="تجاري">تجاري</option>
                </select>
              </div>
              <MF label="أقصى أدوار"       v={codeForm.maxFloors}      onChange={v => setCodeForm(f => ({ ...f, maxFloors: v }))}      type="number" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>آخر دور ملحق؟</label>
                <select value={codeForm.hasAnnex} onChange={e => setCodeForm(f => ({ ...f, hasAnnex: e.target.value }))} style={{ ...fieldStyle, background: 'white' }}>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>
              <MF label="نسبة البناء (0–1)" v={codeForm.groundCoverage}  onChange={v => setCodeForm(f => ({ ...f, groundCoverage: v }))}  type="number" step="0.05" />
              <MF label="عرض الشارع أدنى (م)" v={codeForm.minStreetWidth} onChange={v => setCodeForm(f => ({ ...f, minStreetWidth: v }))} type="number" />
              <MF label="عرض الشارع أقصى (م)" v={codeForm.maxStreetWidth} onChange={v => setCodeForm(f => ({ ...f, maxStreetWidth: v }))} type="number" />
              <MF label="ارتداد أمامي (م)"    v={codeForm.setbackFront}   onChange={v => setCodeForm(f => ({ ...f, setbackFront: v }))}   type="number" />
              <MF label="ارتداد جانبي (م)"    v={codeForm.setbackSide}    onChange={v => setCodeForm(f => ({ ...f, setbackSide: v }))}    type="number" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                الاستخدامات (مفصولة بفاصلة عربية ،)
              </label>
              <input
                value={codeForm.allowedUses}
                onChange={e => setCodeForm(f => ({ ...f, allowedUses: e.target.value }))}
                placeholder="مثال: فيلا منفصلة، أدوار سكنية"
                style={fieldStyle}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={addCustomCode}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
              >
                إضافة الكود وتطبيقه
              </button>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.5)' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LIVE ANALYSIS PANEL — sticky left column (RTL)
   Reads liveResult computed once in ProjectContextBridge.
   Shows IRR / margin / net / NSA / decision in real time.
══════════════════════════════════════════════════════ */
const panelKpiVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

function LiveAnalysisPanel({
  liveResult,
  onGoToResults,
}: {
  liveResult: import('../../../engines/feasibility/types').FeasibilityResult | null;
  onGoToResults: () => void;
}) {
  const fin   = liveResult?.financials;
  const sum   = liveResult?.summary;
  const areas = liveResult?.areas;
  const rlv   = liveResult?.rlv;
  const targetMargin = 25;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(10,12,18,0.07)', background: '#F4F3EF' }}>
        <p className="font-bold text-xs" style={{ color: '#0A0C12' }}>المؤشرات الحية</p>
        <span className="flex items-center gap-1.5">
          {fin ? (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'rgba(10,12,18,0.2)' }} />
          )}
          <span className="text-xs" style={{ color: fin ? '#16a34a' : 'rgba(10,12,18,0.35)' }}>
            {fin ? 'مباشر' : 'في انتظار البيانات'}
          </span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {fin ? (
          <motion.div key="live-data"
            variants={panelKpiVariants} initial="initial" animate="animate" exit="exit"
            className="p-4 space-y-3"
          >
            {/* IRR */}
            <PanelKpi
              label="معدل العائد الداخلي (IRR)"
              value={`${fin.irr.toFixed(1)}٪`}
              color={fin.irr >= 15 ? '#16a34a' : fin.irr >= 8 ? '#d97706' : '#dc2626'}
              sub={fin.irr >= 15 ? 'مؤشر ممتاز ✓' : fin.irr >= 8 ? 'مقبول' : 'دون المستهدف'}
            />
            {/* Margin */}
            <PanelKpi
              label={`هامش الربح (هدف ${targetMargin}٪)`}
              value={`${fin.margin.toFixed(1)}٪`}
              color={fin.margin >= targetMargin ? '#16a34a' : fin.margin >= targetMargin * 0.85 ? '#d97706' : '#dc2626'}
              sub={fin.margin >= targetMargin ? 'يتجاوز الهدف ✓' : fin.margin >= targetMargin * 0.85 ? 'قريب من الهدف' : 'دون الهدف'}
            />
            {/* ROI */}
            <PanelKpi
              label="العائد على التكلفة (ROI)"
              value={`${fin.roi.toFixed(1)}٪`}
              color="#2563eb"
            />
            {/* Net profit */}
            <PanelKpi
              label="صافي الربح"
              value={`${(fin.net / 1e6).toFixed(2)} م ر.س`}
              color="#7c3aed"
              mono
            />

            {/* NSA if available */}
            {areas?.sellableArea != null && (
              <div className="pt-2" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
                  المساحة القابلة للبيع (NSA)
                </p>
                <p className="font-bold text-sm num" style={{ color: '#0A0C12' }}>
                  {areas.sellableArea.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} م²
                </p>
              </div>
            )}

            {/* RLV signal */}
            {rlv && (
              <div className="pt-2" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
                  أقصى سعر أرض مبرر (RLV)
                </p>
                <p className="font-bold text-sm num" style={{ color: '#7c3aed', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {rlv.maxLandPerM2.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س/م²
                </p>
              </div>
            )}

            {/* Decision banner */}
            {sum?.decision && (
              <div className="rounded-xl px-3 py-2.5 text-xs font-medium leading-snug"
                style={{
                  background: sum.isBuy ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border:     sum.isBuy ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(239,68,68,0.22)',
                  color:      sum.isBuy ? '#16a34a' : '#dc2626',
                }}>
                {sum.decision}
              </div>
            )}

            {/* Go to full results */}
            <button
              onClick={onGoToResults}
              className="w-full py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.20)' }}
            >
              النتائج التفصيلية ←
            </button>
          </motion.div>
        ) : (
          <motion.div key="no-data"
            variants={panelKpiVariants} initial="initial" animate="animate" exit="exit"
            className="p-6 text-center space-y-2"
          >
            <p className="text-2xl">📊</p>
            <p className="text-xs font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>
              أدخل مساحة الأرض وسعريها لرؤية المؤشرات فوراً
            </p>
            <p className="text-xs" style={{ color: 'rgba(10,12,18,0.3)' }}>
              بدون ضغط أي زر
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save note */}
      <div className="px-4 py-2.5"
        style={{ borderTop: '1px solid rgba(10,12,18,0.07)', background: '#F4F3EF' }}>
        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)', lineHeight: 1.5 }}>
          زر "حفظ" يحفظ لقطة في سجل المشروع ويزامن مع الخادم
        </p>
      </div>
    </div>
  );
}

function PanelKpi({
  label, value, color, sub, mono,
}: {
  label: string; value: string; color: string; sub?: string; mono?: boolean;
}) {
  return (
    <div className="rounded-xl px-3 py-2.5"
      style={{ background: `${color}09`, border: `1px solid ${color}1f` }}>
      <p className="text-xs mb-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>{label}</p>
      <p className="font-bold text-base"
        style={{ color, fontFamily: mono ? 'IBM Plex Mono, monospace' : undefined, lineHeight: 1.3 }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
    </div>
  );
}

/* ── Field helpers ── */
const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(10,12,18,0.07)',
  borderRadius: '16px',
  padding: '20px',
};

const fieldStyle: React.CSSProperties = {
  border: '1px solid rgba(10,12,18,0.12)',
  borderRadius: '12px',
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'Tajawal, sans-serif',
  fontSize: '14px',
  width: '100%',
};

function F({ label, k, step, form, setField }: {
  label: string; k: string; step?: string; form: any; setField: (k: string, v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <input type="number" step={step} value={form[k] ?? ''}
        onChange={e => setField(k, e.target.value)}
        style={{ ...fieldStyle, fontFamily: 'IBM Plex Mono, monospace' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function Sel({ label, k, opts, form, setField }: {
  label: string; k: string; opts: { v: string; l: string }[]; form: any; setField: (k: string, v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <select value={form[k] ?? ''} onChange={e => setField(k, e.target.value)}
        style={{ ...fieldStyle, background: 'white', cursor: 'pointer' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

/* ── Modal field helper ── */
function MF({ label, v, onChange, type = 'text', placeholder, step }: {
  label: string; v: string; onChange: (v: string) => void; type?: string; placeholder?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>{label}</label>
      <input
        type={type} step={step} value={v}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: '1px solid rgba(10,12,18,0.12)', borderRadius: '10px',
          padding: '9px 12px', outline: 'none',
          fontFamily: type === 'number' ? 'IBM Plex Mono, monospace' : 'Tajawal, sans-serif',
          fontSize: '13px', width: '100%',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.10)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}
