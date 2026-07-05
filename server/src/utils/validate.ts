const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidStatus(status: unknown): status is 'in_progress' | 'completed' {
  return status === 'in_progress' || status === 'completed';
}

export function isValidPriority(priority: unknown): priority is 'low' | 'medium' | 'high' {
  return priority === 'low' || priority === 'medium' || priority === 'high';
}

export function isValidSubtaskStatus(status: unknown): status is 'pending' | 'done' {
  return status === 'pending' || status === 'done';
}

export function isValidTodoStatus(status: unknown): status is 'pending' | 'done' {
  return status === 'pending' || status === 'done';
}

export function isValidDate(value: unknown): value is string | null {
  if (value === null || value === undefined) return true;
  return typeof value === 'string' && DATE_RE.test(value);
}
