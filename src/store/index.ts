/* ── Re-exports — backward-compatible single entry point ──
   All existing imports from '../store' or '../../store' continue to work.
── */

export type { User, ProjectInput, Project } from './types';
export { useAuthStore }     from './authStore';
export { useProjectsStore } from './projectStore';
export { useUIStore }       from './uiStore';
