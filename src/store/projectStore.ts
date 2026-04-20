import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectInput } from './types';

/* ── Analysis version snapshot ── */
export interface AnalysisVersion {
  id:         string;
  projectId:  string;
  timestamp:  string;       // ISO-8601
  versionNum: number;
  inputs:     Record<string, any>;
  result:     any;
}

interface ProjectState {
  projects:        Project[];
  currentProject:  Project | null;
  analysisResult:  any;
  lastInput:       Partial<ProjectInput>;
  dimensionsData:  Partial<ProjectInput>;
  /** Version history keyed by projectId — max 20 per project */
  analysisHistory: Record<string, AnalysisVersion[]>;

  setProjects:          (list: Project[]) => void;
  setCurrentProject:    (p: Project | null) => void;
  setAnalysisResult:    (r: any) => void;
  setLastInput:         (i: Partial<ProjectInput>) => void;
  setDimensionsData:    (d: Partial<ProjectInput>) => void;
  clearAnalysis:        () => void;
  addAnalysisVersion:   (projectId: string, inputs: any, result: any) => void;
}

export const useProjectsStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects:        [],
      currentProject:  null,
      analysisResult:  null,
      lastInput:       {},
      dimensionsData:  {},
      analysisHistory: {},

      setProjects:       (list) => set({ projects: list }),
      setCurrentProject: (p)    => set({ currentProject: p }),
      setAnalysisResult: (r)    => set({ analysisResult: r }),
      setLastInput:      (i)    => set({ lastInput: i }),
      setDimensionsData: (d)    => set({ dimensionsData: d }),
      clearAnalysis:     ()     => set({ analysisResult: null, lastInput: {} }),

      addAnalysisVersion: (projectId, inputs, result) => {
        const hist     = get().analysisHistory;
        const existing = hist[projectId] || [];
        const version: AnalysisVersion = {
          id:         `${projectId}-v${existing.length + 1}-${Date.now()}`,
          projectId,
          timestamp:  new Date().toISOString(),
          versionNum: existing.length + 1,
          inputs,
          result,
        };
        set({
          analysisHistory: {
            ...hist,
            [projectId]: [version, ...existing].slice(0, 20),
          },
        });
      },
    }),
    {
      name: 'basira-projects',
      partialize: (state) => ({
        analysisResult:  state.analysisResult,
        lastInput:       state.lastInput,
        analysisHistory: state.analysisHistory,
      }),
    }
  )
);
