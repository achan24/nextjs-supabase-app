export interface Project {
  id: string;
  title: string;
  description?: string;
  priority: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
  time_spent?: number;
  due_date?: string;
  project_id?: string;
  project?: Project;
} 