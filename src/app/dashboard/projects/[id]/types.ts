export interface Project {
  id: string;
  title: string;
  description?: string;
  goals: Goal[];
  tasks: Task[];
  project_targets: ProjectTargetLink[];
  project_node_links: ProjectNodeLink[];
  project_notes: ProjectNoteLink[];
  created_at: string;
  updated_at: string;
}

export interface ProjectTargetLink {
  id: string;
  target: Target;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  due_date: string;
  status: 'todo' | 'in_progress' | 'completed';
}

export interface TaskLink {
  id: string;
  task_id: string;
  task: Task;
}

export interface Target {
  id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  target_type: 'count' | 'percentage' | 'time' | 'custom';
  created_at: string;
  updated_at: string;
  target_tasks?: TargetTask[];
  goal_target_links?: GoalTargetLink[];
}

export interface TargetTask {
  id: string;
  target_id: string;
  task_id: string;
  contribution_value: number;
  created_at: string;
  updated_at: string;
}

export interface GoalTask {
  id: string;
  task_id: string;
  time_worth: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  goal_tasks?: GoalTask[];
  goal_target_links?: ProjectTargetLink[];
}

export interface Node {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
  };
}

export interface ProjectNodeLink {
  id: string;
  project_id: string;
  linked_flow_id: string;
  linked_node_id: string;
  description?: string;
  created_at: string;
  user_id: string;
  display_order: number;
  flow: {
    id: string;
    title: string;
  };
  node: {
    id: string;
    data: {
      label: string;
      description?: string;
    };
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  user_id: string;
}

export interface ProjectNoteLink {
  id: string;
  project_id: string;
  note_id: string;
  note: Note;
  created_at: string;
  user_id: string;
  display_order: number;
}

export interface GoalTargetLink {
  id: string;
  goal_id: string;
  target_id: string;
  created_at: string;
  user_id: string;
}

export interface TaskWrapper {
  task: Task;
}

export interface NewTask {
  title: string;
  description: string;
  priority: number;
  status: 'todo' | 'in_progress' | 'completed';
  due_date: string;
}

export interface ProcessFlow {
  id: string;
  title: string;
  description?: string;
  nodes: ProcessFlowNode[];
}

export interface ProcessFlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
  };
}

export interface EditedGoalData {
  title: string;
  description?: string;
  target_date: string;
}

export interface ProcessFlowWithNodes {
  id: string;
  title: string;
  nodes: ProcessFlowNode[];
}

export interface TaskWithWrapper {
  task: Task;
}

export interface SupabaseNoteLink {
  id: string;
  note: Note[];
}

export interface ProjectNodeLinkFromDB extends Omit<ProjectNodeLink, 'flow' | 'node'> {
  flow: ProcessFlowWithNodes | ProcessFlowWithNodes[];
}

export interface ProjectWithNodesAndTasksFromDB extends Omit<Project, 'tasks' | 'project_node_links' | 'project_notes'> {
  tasks: TaskWithWrapper[];
  project_node_links: ProjectNodeLinkFromDB[];
  project_notes: {
    id: string;
    project_id: string;
    note_id: string;
    created_at: string;
    user_id: string;
    display_order: number;
    note: Note;
  }[];
} 