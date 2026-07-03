import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const tasksApi = {
  list: (date?: string) => api.get('/tasks', { params: { date } }).then(r => r.data),
  create: (data: { content: string; tags?: string }) => api.post('/tasks', data).then(r => r.data),
  update: (id: number, data: { content?: string; tags?: string }) => api.put(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/tasks/${id}`).then(r => r.data),
};

export const todosApi = {
  list: (status?: string) => api.get('/todos', { params: { status } }).then(r => r.data),
  create: (data: { content: string; priority?: string; due_date?: string | null; tags?: string }) => api.post('/todos', data).then(r => r.data),
  update: (id: number, data: Record<string, any>) => api.put(`/todos/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/todos/${id}`).then(r => r.data),
};

export const meetingsApi = {
  list: (date?: string) => api.get('/meetings', { params: { date } }).then(r => r.data),
  create: (data: { title: string; content?: string; tags?: string; meeting_date: string }) => api.post('/meetings', data).then(r => r.data),
  update: (id: number, data: Record<string, any>) => api.put(`/meetings/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/meetings/${id}`).then(r => r.data),
};

export const learningsApi = {
  list: () => api.get('/learnings').then(r => r.data),
  create: (data: { title: string; content?: string; tags?: string }) => api.post('/learnings', data).then(r => r.data),
  update: (id: number, data: Record<string, any>) => api.put(`/learnings/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/learnings/${id}`).then(r => r.data),
};

export const issuesApi = {
  list: (status?: string) => api.get('/issues', { params: { status } }).then(r => r.data),
  create: (data: { content: string; tags?: string }) => api.post('/issues', data).then(r => r.data),
  update: (id: number, data: Record<string, any>) => api.put(`/issues/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/issues/${id}`).then(r => r.data),
};

export const dashboardApi = {
  get: (date?: string) => api.get('/dashboard', { params: { date } }).then(r => r.data),
};

export const weeklyReportApi = {
  get: (weekStart?: string) => api.get('/weekly-report', { params: { week_start: weekStart } }).then(r => r.data),
};

export const tagsApi = {
  list: () => api.get('/tags').then(r => r.data),
};

export const backupApi = {
  create: () => api.post('/backup').then(r => r.data),
};

export default api;
