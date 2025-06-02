export type RelationshipRole = 'romantic' | 'friend' | 'acquaintance' | 'mentor' | 'mentee' | 'professional';
export type RelationshipStatus = 'active' | 'inactive' | 'archived';

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
  category: 'interests' | 'personality' | 'values' | 'emotional_hooks' | 'conversation_starters';
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
  stages?: Stage[];
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
  current_stage_id?: string;
  started_at: string;
  last_progress_at: string;
  track?: Track;
  current_stage?: Stage;
}

export interface Action {
  id: string;
  person_id: string;
  track_id?: string;
  stage_id?: string;
  type: 'planned' | 'completed';
  title: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
  feedback?: ActionFeedback;
}

export interface ActionFeedback {
  id: string;
  action_id: string;
  what_went_right?: string;
  what_went_wrong?: string;
  their_reaction?: string;
  emotional_response?: string;
  self_rating?: number;
  future_adjustments?: string;
  created_at: string;
}

export interface PersonWithMetadata extends Person {
  metadata: PersonMetadata[];
  tracks: (PersonTrack & { track: Track; current_stage?: Stage })[];
  actions: (Action & { feedback?: ActionFeedback })[];
} 