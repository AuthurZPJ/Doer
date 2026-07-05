import axios from 'axios';
import type { Task, Todo, Meeting, Learning, Tag, Subtask, DashboardData, WeeklyReport, SearchResults } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout'));
    }
    return Promise.reject(error);
  }
);

export const tasksApi = {
  list: (params?: { status?: string; date?: string }): Promise<Task[]> => api.get('/tasks', { params }).then(r => r.data),
  create: (data: { content: string; tags?: string; status?: string; due_date?: string | null }): Promise<{ id: number }> => api.post('/tasks', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<Task, 'content' | 'tags' | 'status' | 'due_date'>>): Promise<{ ok: boolean }> => api.put(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<{ ok: boolean }> => api.delete(`/tasks/${id}`).then(r => r.data),
};

export const todosApi = {
  list: (status?: string): Promise<Todo[]> => api.get('/todos', { params: { status } }).then(r => r.data),
  create: (data: { content: string; priority?: string; due_date?: string | null; tags?: string }): Promise<{ id: number }> => api.post('/todos', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<Todo, 'content' | 'priority' | 'due_date' | 'tags' | 'status'>>): Promise<{ ok: boolean }> => api.put(`/todos/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<{ ok: boolean }> => api.delete(`/todos/${id}`).then(r => r.data),
};

export const meetingsApi = {
  list: (date?: string): Promise<Meeting[]> => api.get('/meetings', { params: { date } }).then(r => r.data),
  create: (data: { title: string; content?: string; tags?: string; meeting_date: string }): Promise<{ id: number }> => api.post('/meetings', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<Meeting, 'title' | 'content' | 'tags' | 'meeting_date'>>): Promise<{ ok: boolean }> => api.put(`/meetings/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<{ ok: boolean }> => api.delete(`/meetings/${id}`).then(r => r.data),
};

export const learningsApi = {
  list: (): Promise<Learning[]> => api.get('/learnings').then(r => r.data),
  create: (data: { title: string; content?: string; tags?: string }): Promise<{ id: number }> => api.post('/learnings', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<Learning, 'title' | 'content' | 'tags'>>): Promise<{ ok: boolean }> => api.put(`/learnings/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<{ ok: boolean }> => api.delete(`/learnings/${id}`).then(r => r.data),
};

export const dashboardApi = {
  get: (date?: string): Promise<DashboardData> => api.get('/dashboard', { params: { date } }).then(r => r.data),
};

export const weeklyReportApi = {
  get: (weekStart?: string): Promise<WeeklyReport> => api.get('/weekly-report', { params: { week_start: weekStart } }).then(r => r.data),
};

export const tagsApi = {
  list: (): Promise<Tag[]> => api.get('/tags').then(r => r.data),
  create: (data: { name: string; color?: string }): Promise<{ id: number }> => api.post('/tags', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<Tag, 'name' | 'color'>>): Promise<{ ok: boolean }> => api.put(`/tags/${id}`, data).then(r => r.data),
  delete: (id: number): Promise<{ ok: boolean }> => api.delete(`/tags/${id}`).then(r => r.data),
};

export const backupApi = {
  create: (): Promise<{ ok: boolean; filename: string }> => api.post('/backup').then(r => r.data),
  list: (): Promise<string[]> => api.get('/backup').then(r => r.data),
  restore: (filename: string): Promise<{ ok: boolean }> => api.post('/backup/restore', { filename }).then(r => r.data),
  delete: (filename: string): Promise<{ ok: boolean }> => api.delete('/backup', { data: { filename } }).then(r => r.data),
};

export const subtasksApi = {
  list: (taskId: number): Promise<Subtask[]> => api.get(`/tasks/${taskId}/subtasks`).then(r => r.data),
  create: (taskId: number, content: string, parentSubtaskId?: number | null): Promise<{ id: number }> => api.post(`/tasks/${taskId}/subtasks`, { content, parent_subtask_id: parentSubtaskId ?? null }).then(r => r.data),
  update: (taskId: number, id: number, data: Partial<Pick<Subtask, 'content' | 'status' | 'sort_order' | 'parent_subtask_id'>>): Promise<{ ok: boolean }> => api.put(`/tasks/${taskId}/subtasks/${id}`, data).then(r => r.data),
  delete: (taskId: number, id: number): Promise<{ ok: boolean }> => api.delete(`/tasks/${taskId}/subtasks/${id}`).then(r => r.data),
};

export const searchApi = {
  search: (q: string): Promise<SearchResults> => api.get('/search', { params: { q } }).then(r => r.data),
};
