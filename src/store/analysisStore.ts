import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectInput } from './types';
import type { AdvisoryRequiredInputs, ProjectSnapshot, ReportBuilderData } from '../lib/types/report';
import { DEFAULT_ZONING_CONFIGS, DEFAULT_LOCATION_CONFIG, type ZoningConfig } from '../lib/config/locationConfig';
import type { LocationConfig } from '../lib/types/report';

export type FlowStep = 'analysis' | 'report_builder';
export interface ProjectFlowEntry {
  step: FlowStep;
}

/* ── Financing structure — single source of truth ── */
export interface FinancingStructure {
  selfPct:              number;   // 0–1
  bankPct:              number;   // 0–1
  partnerPct:           number;   // 0–1
  bankInterestRate:     number;   // % e.g. 7
  bankYears:            number;   // e.g. 2
  bankLTV:              number;   // % e.g. 70
  gracePeriodMonths:    number;
  penaltyRate:          number;   // % — early repayment reward (interest discount)
  loanDelayPenaltyPct:  number;   // % of loan balance charged by bank for late payment
  // Loan lifecycle — Module 2
  loanStartMonth:       number;   // month when bank starts disbursing (0 = before construction)
  loanTranches:         number;   // number of equal disbursement tranches (1–6)
  capitalizeInterest:   boolean;  // during grace period: add interest to principal instead of paying
}

const DEFAULT_FINANCING: FinancingStructure = {
  selfPct:             1,
  bankPct:             0,
  partnerPct:          0,
  bankInterestRate:    7,
  bankYears:           2,
  bankLTV:             70,
  gracePeriodMonths:   0,
  penaltyRate:         2,
  loanDelayPenaltyPct: 0,
  loanStartMonth:      1,
  loanTranches:        3,
  capitalizeInterest:  false,
};

export interface AnalysisState {
  /* Project info */
  projectName:     string;
  projectLocation: string;

  /* Land inputs */
  landArea:       number;
  streetWidth:    number;
  landType:       string;
  regulatoryCode: string;
  usageType:      string;

  /* Pricing */
  landPricePerM2: number;
  sellPricePerM2: number;

  /* Build params */
  buildCostPerM2: number;
  softCostsPct:   number;
  contingencyPct: number;
  floors:         number;
  groundCoverage: number;

  /* Financing */
  financingStructure: FinancingStructure;

  /* Results */
  lastResult:  any;
  lastInput:   Partial<ProjectInput>;
  isAnalyzed:  boolean;

  /**
   * Active project's flat form dict — this IS the single source of truth for all
   * form inputs. Every tab reads/writes here. No local useState for form fields.
   */
  formInput:    Record<string, string>;
  formProjectId: string | null;

  /**
   * Per-project persisted inputs — keyed by projectId.
   * Survives app restarts even if the active project changes.
   * Shape: projectInputs[projectId][fieldName] = value (string)
   */
  projectInputs: Record<string, Record<string, string>>;

  /**
   * Per-project analysis results — keyed by projectId.
   * Fixes the "analysis forgotten on navigation" bug.
   * Every submit() saves here; every page load reads from here.
   */
  projectResults: Record<string, any>;

  /**
   * Per-project advisory tab inputs — keyed by projectId.
   * Same persistence pattern as projectInputs/projectResults.
   */
  projectAdvisoryInputs: Record<string, AdvisoryRequiredInputs>;

  /**
   * Per-project report snapshots — keyed by projectId, array (most recent first).
   * Saved at every advisory report generation. Used for future calibration.
   * Max 20 snapshots per project.
   */
  projectSnapshots: Record<string, ProjectSnapshot[]>;

  /**
   * Per-project flow state (step + mode) — keyed by projectId.
   * Persisted so navigating away and back restores the correct step.
   */
  projectFlowState: Record<string, ProjectFlowEntry>;

  /** Per-project report builder data — keyed by projectId. */
  reportBuilder: Record<string, ReportBuilderData>;

  /** Funding report issuance log — most-recent first, max 100 entries. */
  reportIssuanceLogs: ReportIssuanceLog[];

  /** Zoning configs — persisted, editable per client. */
  zoningConfigs: ZoningConfig[];

  /** Location scoring config — persisted, editable per client. */
  locationConfig: LocationConfig;
}

export interface ReportIssuanceLog {
  id:              string;
  projectId:       string;
  projectName:     string;
  timestamp:       string;   // ISO string
  target:          'bank' | 'institutional_investor' | 'individual_investor';
  institutionName: string;
  confidence:      number;
  irr?:            number;
  dscr?:           number;
}

interface AnalysisActions {
  setAnalysis:            (result: any, input: Partial<ProjectInput>) => void;
  clearAnalysis:          () => void;
  /**
   * Write a single field for the active project.
   * Also persists to projectInputs[formProjectId] so data survives project switches.
   */
  setFormField:           (key: string, value: string) => void;
  /**
   * Switch the active project. Merges defaults with any previously saved
   * projectInputs[projectId] so no data is lost on re-entry.
   */
  initFormForProject:     (projectId: string, defaults: Record<string, string>) => void;
  /** Bulk-write multiple fields for the active project at once. */
  setFormFields:          (fields: Record<string, string>) => void;

  /**
   * Persist one project's analysis result.
   * Called after every successful submit so results survive navigation.
   */
  setProjectResult:       (projectId: string, result: any) => void;

  /** Persist advisory tab inputs for a project. */
  setAdvisoryInputs:      (projectId: string, inputs: AdvisoryRequiredInputs) => void;

  /** Save a report snapshot (called at generation time, not for display). */
  saveProjectSnapshot:    (snapshot: ProjectSnapshot) => void;

  /** Persist flow step + mode for a project. */
  setProjectFlowState:    (projectId: string, entry: ProjectFlowEntry) => void;

  /** Log a funding report issuance. */
  logReportIssuance:      (log: ReportIssuanceLog) => void;

  /** Persist report builder data for a project. */
  setReportBuilder:       (projectId: string, data: ReportBuilderData) => void;
  updateReportBuilder:    (projectId: string, partial: Partial<ReportBuilderData>) => void;

  /* Zoning config actions */
  setZoningConfigs:    (configs: ZoningConfig[]) => void;
  addZoningConfig:     (config: ZoningConfig) => void;
  updateZoningConfig:  (code: string, updates: Partial<ZoningConfig>) => void;
  deleteZoningConfig:  (code: string) => void;
  resetZoningConfigs:  () => void;

  /* Location config actions */
  setLocationConfig:   (config: LocationConfig) => void;
  resetLocationConfig: () => void;

  /* Typed setters */
  setProjectInfo:         (name: string, location: string) => void;
  setLandInput:           (key: keyof Pick<AnalysisState, 'landArea' | 'streetWidth' | 'landType' | 'regulatoryCode' | 'usageType' | 'landPricePerM2' | 'sellPricePerM2' | 'buildCostPerM2' | 'softCostsPct' | 'contingencyPct' | 'floors' | 'groundCoverage'>, value: number | string) => void;
  setFinancingStructure:  (fs: Partial<FinancingStructure>) => void;
}

export type AnalysisStore = AnalysisState & AnalysisActions;

const INITIAL: AnalysisState = {
  projectName:        '',
  projectLocation:    '',
  landArea:           0,
  streetWidth:        0,
  landType:           '',
  regulatoryCode:     '',
  usageType:          '',
  landPricePerM2:     0,
  sellPricePerM2:     0,
  buildCostPerM2:     2000,
  softCostsPct:       0.05,
  contingencyPct:     0.05,
  floors:             4,
  groundCoverage:     0.6,
  financingStructure: DEFAULT_FINANCING,
  lastResult:         null,
  lastInput:          {},
  isAnalyzed:         false,
  formInput:          {},
  formProjectId:      null,
  projectInputs:      {},
  projectResults:          {},
  projectAdvisoryInputs:   {},
  projectSnapshots:        {},
  projectFlowState:        {},
  reportBuilder:           {},
  reportIssuanceLogs:      [],
  zoningConfigs:           DEFAULT_ZONING_CONFIGS,
  locationConfig:          DEFAULT_LOCATION_CONFIG,
};

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setAnalysis: (result, input) =>
        set((s) => ({
          lastResult:     result,
          lastInput:      input,
          isAnalyzed:     true,
          projectResults: s.formProjectId
            ? { ...s.projectResults, [s.formProjectId]: result }
            : s.projectResults,
        })),

      clearAnalysis: () =>
        set({ lastResult: null, lastInput: {}, isAnalyzed: false }),

      /**
       * Write one field — updates both formInput (live) and
       * projectInputs[formProjectId] (durable per-project persistence).
       */
      setFormField: (key, value) =>
        set((s) => {
          const next = { ...s.formInput, [key]: value };
          const pid  = s.formProjectId;
          return {
            formInput:    next,
            projectInputs: pid
              ? { ...s.projectInputs, [pid]: { ...s.projectInputs[pid], [key]: value } }
              : s.projectInputs,
          };
        }),

      /**
       * Bulk-write. Used by DimensionsTab and code-apply helpers that set
       * multiple fields at once.
       */
      setFormFields: (fields) =>
        set((s) => {
          const next = { ...s.formInput, ...fields };
          const pid  = s.formProjectId;
          return {
            formInput:    next,
            projectInputs: pid
              ? { ...s.projectInputs, [pid]: { ...s.projectInputs[pid], ...fields } }
              : s.projectInputs,
          };
        }),

      /**
       * Switch active project. Merges caller-supplied defaults with any inputs
       * the user previously entered for this project so no re-entry is needed.
       */
      initFormForProject: (projectId, defaults) => {
        const saved  = get().projectInputs[projectId] ?? {};
        // saved values win over defaults — user's keystrokes take priority
        const merged = { ...defaults, ...saved };
        set((s) => ({
          formInput:     merged,
          formProjectId: projectId,
          projectInputs: { ...s.projectInputs, [projectId]: merged },
        }));
      },

      setProjectResult: (projectId, result) =>
        set((s) => ({
          projectResults: { ...s.projectResults, [projectId]: result },
        })),

      setAdvisoryInputs: (projectId, inputs) =>
        set((s) => ({
          projectAdvisoryInputs: { ...s.projectAdvisoryInputs, [projectId]: inputs },
        })),

      saveProjectSnapshot: (snapshot) =>
        set((s) => {
          const existing = s.projectSnapshots[snapshot.projectId] ?? [];
          return {
            projectSnapshots: {
              ...s.projectSnapshots,
              [snapshot.projectId]: [snapshot, ...existing].slice(0, 20),
            },
          };
        }),

      setProjectFlowState: (projectId, entry) =>
        set((s) => ({
          projectFlowState: { ...s.projectFlowState, [projectId]: entry },
        })),

      logReportIssuance: (log) =>
        set((s) => ({
          reportIssuanceLogs: [log, ...(s.reportIssuanceLogs ?? [])].slice(0, 100),
        })),

      setReportBuilder: (projectId, data) =>
        set((s) => ({
          reportBuilder: { ...s.reportBuilder, [projectId]: data },
        })),

      updateReportBuilder: (projectId, partial) =>
        set((s) => ({
          reportBuilder: {
            ...s.reportBuilder,
            [projectId]: { ...s.reportBuilder[projectId], ...partial },
          },
        })),

      /* ── Zoning config actions ── */
      setZoningConfigs: (configs) => set({ zoningConfigs: configs }),

      addZoningConfig: (config) =>
        set(s => ({ zoningConfigs: [...s.zoningConfigs, config] })),

      updateZoningConfig: (code, updates) =>
        set(s => ({
          zoningConfigs: s.zoningConfigs.map(z =>
            z.code === code ? { ...z, ...updates } : z,
          ),
        })),

      deleteZoningConfig: (code) =>
        set(s => ({
          zoningConfigs: s.zoningConfigs.filter(z => z.code !== code),
        })),

      resetZoningConfigs: () => set({ zoningConfigs: DEFAULT_ZONING_CONFIGS }),

      /* ── Location config actions ── */
      setLocationConfig:   (config) => set({ locationConfig: config }),
      resetLocationConfig: () => set({ locationConfig: DEFAULT_LOCATION_CONFIG }),

      /* ── Typed setters ── */
      setProjectInfo: (name, location) =>
        set({ projectName: name, projectLocation: location }),

      setLandInput: (key, value) =>
        set({ [key]: value } as any),

      setFinancingStructure: (fs) =>
        set((s) => ({
          financingStructure: { ...s.financingStructure, ...fs },
        })),
    }),
    {
      name:    'basira-analysis-v2',
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        // v1 → v2: replace old 3-code configs (م122,م123,ت) with the 9 real building codes
        if (fromVersion < 2) {
          const OLD_CODES = new Set(['م122', 'م123', 'ت']);
          const savedCodes: string[] = (persisted?.zoningConfigs ?? []).map((z: any) => z.code);
          const hasOnlyOldCodes = savedCodes.length > 0 && savedCodes.every(c => OLD_CODES.has(c));
          if (hasOnlyOldCodes || savedCodes.length === 0) {
            persisted.zoningConfigs = DEFAULT_ZONING_CONFIGS;
          }
        }
        return persisted;
      },
      partialize: (s) => ({
        lastResult:             s.lastResult,
        lastInput:              s.lastInput,
        isAnalyzed:             s.isAnalyzed,
        financingStructure:     s.financingStructure,
        formInput:              s.formInput,
        formProjectId:          s.formProjectId,
        projectInputs:          s.projectInputs,
        projectResults:         s.projectResults,
        projectAdvisoryInputs:  s.projectAdvisoryInputs,
        projectSnapshots:       s.projectSnapshots,
        projectFlowState:       s.projectFlowState,
        reportBuilder:          s.reportBuilder,
        zoningConfigs:          s.zoningConfigs,
        locationConfig:         s.locationConfig,
      }),
    },
  ),
);

/** Convenience hook — same API as the old useAnalysis() */
export function useAnalysis() {
  return useAnalysisStore();
}
