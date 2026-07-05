export interface Task {
  id: number;
  content: string;
  tags: string;
  status: 'in_progress' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  subtask_done?: number;
  subtask_total?: number;
}

export interface Todo {
  id: number;
  content: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  tags: string;
  status: 'pending' | 'done';
  done_at: string | null;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  content: string;
  tags: string;
  meeting_date: string;
  created_at: string;
}

export interface Learning {
  id: number;
  title: string;
  content: string;
  tags: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  parent_subtask_id: number | null;
  content: string;
  status: 'pending' | 'done';
  sort_order: number;
  created_at: string;
  done_at: string | null;
}

export interface DashboardData {
  inProgressTasks: Task[];
  meetings: Meeting[];
  todos: Todo[];
  learnings: Learning[];
}

export interface SubtaskNode {
  id: number;
  content: string;
  status: string;
  parent_subtask_id: number | null;
  children: SubtaskNode[];
}

export interface WeeklyReportDay {
  date: string;
  tasks: (Task & { done_subtasks: number; total_subtasks: number; subtask_tree: SubtaskNode[] })[];
  standalone_groups: {
    parent_task_id: number;
    parent_task_content: string;
    parent_tags: string;
    done_subtasks: number;
    total_subtasks: number;
    subtask_tree: SubtaskNode[];
  }[];
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  days: WeeklyReportDay[];
  summary_by_tag: Record<string, { content: string; done_subtasks: number; total_subtasks: number; subtask_tree: SubtaskNode[]; is_in_progress_parent: boolean }[]>;
  subtask_stats: { total_done: number; total_subtasks: number };
}

export interface SearchResults {
  tasks: Task[];
  todos: Todo[];
  meetings: Meeting[];
  learnings: Learning[];
}
