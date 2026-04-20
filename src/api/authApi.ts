import { api } from './client';

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  demo: () => api.post('/auth/demo', {}),
  me:   () => api.get('/auth/me'),
};
