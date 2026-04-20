/* ── Re-exports — backward-compatible single entry point ──
   All existing imports from '../api' or '../../api' continue to work.
── */

export { api }          from './client';
export { authAPI }      from './authApi';
export { projectsAPI, documentsAPI } from './projectsApi';
export { analysisAPI, aiAPI }        from './analysisApi';
export { marketAPI }    from './marketApi';
