import { api } from './client';
import type { ChatRequest } from './types';

export const analysisAPI = {
  runFull:           (d: any) => api.post('/analysis/v3/run', d),
  runRLV:            (d: any) => api.post('/analysis/v3/rlv', d),
  runDryPowder:      (d: any) => api.post('/analysis/v3/dry-powder', d),
  runStressTest:     (d: any) => api.post('/analysis/v3/stress-test', d),
  runSensitivity:    (d: any) => api.post('/analysis/v3/sensitivity', d),
  runHBU:            (d: any) => api.post('/analysis/v3/hbu', d),
  runAuction:        (d: any) => api.post('/analysis/v3/auction', d),
  runTimeSensitivity:(d: any) => api.post('/analysis/v3/time-sensitivity', d),
};

export const aiAPI = {
  chat: (d: ChatRequest) => api.post('/ai/chat', d),
};
