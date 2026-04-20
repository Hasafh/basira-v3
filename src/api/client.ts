import axios from 'axios';
import { useAuthStore } from '../store';

export const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Auth Request Interceptor ── */
api.interceptors.request.use(config => {
  try {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }
    const raw = localStorage.getItem('basira-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = parsed?.state?.token;
      if (t) config.headers.Authorization = `Bearer ${t}`;
    }
  } catch {
    // silent
  }
  return config;
});

/* ── Response Interceptor ── */
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      localStorage.removeItem('basira-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
