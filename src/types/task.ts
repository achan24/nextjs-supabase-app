export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
  time_spent?: number;
  due_date?: string;
} 