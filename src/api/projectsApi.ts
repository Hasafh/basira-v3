import { api } from './client';

export const projectsAPI = {
  list:   ()                   => api.get('/projects'),
  get:    (id: string)         => api.get(`/projects/${id}`),
  create: (d: any)             => api.post('/projects', d),
  update: (id: string, d: any) => api.put(`/projects/${id}`, d),
  patch:  (id: string, d: any) => api.patch(`/projects/${id}`, d),
  delete: (id: string)         => api.delete(`/projects/${id}`),
};

export const documentsAPI = {
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list:    (projectId: string) => api.get(`/documents?projectId=${projectId}`),
  get:     (id: string)        => api.get(`/documents/${id}`),
  delete:  (id: string)        => api.delete(`/documents/${id}`),
  extract: (id: string)        => api.post(`/documents/${id}/extract`, {}),
};
