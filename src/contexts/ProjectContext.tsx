/**
 * ProjectContext — single source of truth for the current project workspace.
 *
 * Architecture:
 *  - Provided at AppLayout level (wraps all routes).
 *  - ProjectPage sets `project` when it loads.
 *  - Sidebar, AppHeader, and any deep child read from `useProjectContext()`.
 *  - `liveResult` is the LIVE feasibility computation — updated on every keystroke
 *    by `useLiveAnalysis`. This way it's computed ONCE and consumed many places.
 */
import { createContext, useContext } from 'react';
import type { FeasibilityResult } from '../engines/feasibility/types';

export interface ProjectContextValue {
  project:       any | null;
  isProjectMode: boolean;
  liveResult:    FeasibilityResult | null;
}

export const ProjectContext = createContext<ProjectContextValue>({
  project:       null,
  isProjectMode: false,
  liveResult:    null,
});

export function useProjectContext() {
  return useContext(ProjectContext);
}
