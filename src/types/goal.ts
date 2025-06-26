export interface LifeGoalArea {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  current_points: number;
  target_points: number;
  created_at: string;
  updated_at: string;
  subareas: LifeGoalSubarea[];
  area_notes: AreaNoteLink[];
}

export interface LifeGoalSubarea {
  id: string;
  name: string;
  description?: string;
  area_id: string;
  current_points: number;
  target_points: number;
  created_at: string;
  updated_at: string;
  goals: LifeGoal[];
  subarea_notes: SubareaNoteLink[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LifeGoalTask {
  id: string;
  goal_id: string;
  task_id: string;
  time_worth: number;
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface TimerSequence {
  id: string;
  title: string;
  description?: string;
  tasks: any[];
  created_at: string;
  updated_at: string;
}

export interface LifeGoalSequenceContribution {
  id: string;
  sequence_id: string;
  metric_id: string;
  contribution_value: number;
  created_at: string;
  sequence?: TimerSequence;
}

export interface LifeGoal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  subarea_id: string;
  current_points: number;
  target_points: number;
  created_at: string;
  updated_at: string;
  milestones: LifeGoalMilestone[];
  metrics: LifeGoalMetric[];
  goal_notes: GoalNoteLink[];
  tasks: LifeGoalTask[];
  sequence_contributions?: LifeGoalSequenceContribution[];
  process_flows?: {
    id: string;
    title: string;
    description?: string;
    flow_id: string;
    created_at: string;
  }[];
}

export interface LifeGoalMilestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  due_date?: string;
  goal_id: string;
  created_at: string;
  updated_at: string;
}

export interface LifeGoalMetric {
  id: string;
  goal_id: string;
  name: string;
  type: string;
  current_value: number;
  unit?: string;
  created_at: string;
  updated_at: string;
  thresholds: LifeGoalMetricThreshold[];
  sequence_contributions: LifeGoalSequenceContribution[];
}

export interface LifeGoalMetricThreshold {
  id: string;
  metric_id: string;
  milestone_id: string;
  target_value: number;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  name: string;
  description?: string;
  current_value: number;
  target_value: number;
  unit: string;
  created_at: Date;
  updated_at: Date;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'archived';
  due_date?: Date;
  metrics: Metric[];
  milestones: Milestone[];
  created_at: Date;
  updated_at: Date;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Subarea {
  id: string;
  name: string;
  description?: string;
  goals: Goal[];
  created_at: Date;
  updated_at: Date;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  subareas: Subarea[];
  created_at: Date;
  updated_at: Date;
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

export interface NoteLink {
  id: string;
  note_id: string;
  user_id: string;
  created_at: string;
  display_order: number;
  note: Note;
}

export interface AreaNoteLink extends NoteLink {
  area_id: string;
}

export interface SubareaNoteLink extends NoteLink {
  subarea_id: string;
}

export interface GoalNoteLink extends NoteLink {
  goal_id: string;
} 