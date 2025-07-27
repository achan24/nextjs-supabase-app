export type RelationshipRole = 'romantic' | 'friend' | 'acquaintance' | 'mentor' | 'mentee' | 'professional';
export type RelationshipStatus = 'active' | 'inactive' | 'archived';
export type ActionType = 'planned' | 'completed';
export type EmotionalResponse = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface Person {
  id: string;
  user_id: string;
  name: string;
  nickname?: string;
  role: RelationshipRole;
  status: RelationshipStatus;
  first_met_date?: string;
  first_met_context?: string;
  location?: string;
  birthday?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonMetadata {
  id: string;
  person_id: string;
  category: 'interests' | 'personality' | 'values' | 'emotional_hooks' | 'conversation_starters' | 'signals';
  key: string;
  value: string;
  created_at: string;
}

export interface Track {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  user_id: string;
}

export interface Stage {
  id: string;
  track_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
}

export interface PersonTrack {
  id: string;
  person_id: string;
  track_id: string;
  current_stage_id: string;
  started_at: string;
  last_progress_at: string;
  track?: Track;
  current_stage?: Stage;
}

export interface CrmAction {
  id: string;
  user_id: string;
  person_id: string;
  track_id?: string;
  stage_id?: string;
  type: ActionType;
  title: string;
  description?: string;
  planned_date?: string;
  completed_date?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
  feedback?: CrmActionFeedback[];
}

export interface CrmActionFeedback {
  id: string;
  action_id: string;
  what_went_well?: string[];
  what_went_wrong?: string[];
  their_reaction?: string;
  emotional_response?: EmotionalResponse;
  self_rating?: number;
  future_adjustments?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonWithMetadata extends Person {
  metadata?: PersonMetadata[];
  tracks?: PersonTrack[];
  actions?: CrmAction[];
}

export interface StageAction {
  id: string;
  stage_id: string;
  title: string;
  description?: string;
  importance: number;
  expected_outcome?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonStageAction {
  id: string;
  person_id: string;
  user_id: string;
  stage_action_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
} 