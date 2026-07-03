import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const tasksApi = {
  list: (params?: { status?: string; date?: string }) => api.get('/tasks', { params }).then(r => r.data),
  create: (data: { content: string; tags?: string; status?: string; due_date?: string | null }) => api.post('/tasks', data).then(r => r.data),
  update: (id: number, data: Record<string, any>) => api.put(`/tasks/${id}`, data).then(r => r.data),
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
  create: (data: { name: string; color?: string }) => api.post('/tags', data).then(r => r.data),
  update: (id: number, data: { name?: string; color?: string }) => api.put(`/tags/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/tags/${id}`).then(r => r.data),
};

export const backupApi = {
  create: () => api.post('/backup').then(r => r.data),
};

export const subtasksApi = {
  list: (taskId: number) => api.get(`/tasks/${taskId}/subtasks`).then(r => r.data),
  create: (taskId: number, content: string, parentSubtaskId?: number | null) => api.post(`/tasks/${taskId}/subtasks`, { content, parent_subtask_id: parentSubtaskId ?? null }).then(r => r.data),
  update: (taskId: number, id: number, data: { content?: string; status?: string; sort_order?: number; parent_subtask_id?: number | null }) => api.put(`/tasks/${taskId}/subtasks/${id}`, data).then(r => r.data),
  delete: (taskId: number, id: number) => api.delete(`/tasks/${taskId}/subtasks/${id}`).then(r => r.data),
};

export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then(r => r.data),
};

export default api;
