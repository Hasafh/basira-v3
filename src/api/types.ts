/* ── API types ── */

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ChatRequest {
  message: string;
  projectId?: string;
  history?: any[];
}
