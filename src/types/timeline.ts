export interface TimelineEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type: 'general' | 'goal' | 'skill' | 'deadline' | 'milestone';
  category: 'personal' | 'work' | 'health' | 'learning' | 'social' | 'financial';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_completed: boolean;
  related_goal_id?: string;
  related_skill_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTimelineEventData {
  title: string;
  description?: string;
  event_date: string;
  event_type?: TimelineEvent['event_type'];
  category?: TimelineEvent['category'];
  priority?: TimelineEvent['priority'];
  related_goal_id?: string;
  related_skill_id?: string;
}

export interface UpdateTimelineEventData {
  title?: string;
  description?: string;
  event_date?: string;
  event_type?: TimelineEvent['event_type'];
  category?: TimelineEvent['category'];
  priority?: TimelineEvent['priority'];
  is_completed?: boolean;
  related_goal_id?: string;
  related_skill_id?: string;
}

export interface TimelineFilters {
  start_date?: string;
  end_date?: string;
  event_type?: TimelineEvent['event_type'];
  category?: TimelineEvent['category'];
  priority?: TimelineEvent['priority'];
  is_completed?: boolean;
  related_goal_id?: string;
  related_skill_id?: string;
}
