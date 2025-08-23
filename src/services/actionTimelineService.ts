import { createClient } from '@/lib/supabase/client';
import { TimelineEngine } from '@/app/dashboard/action-timeline/types';

// Define types locally to avoid import issues
interface ActionTimeline {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  data: any;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  total_execution_time: number;
  favorite: boolean;
}

interface ActionTimelineExecution {
  id: string;
  timeline_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  status: 'running' | 'completed' | 'paused' | 'stopped';
  execution_path: any[];
  notes?: string;
}

export class ActionTimelineService {
  private supabase = createClient();

  // Save a timeline to the database
  async saveTimeline(
    name: string,
    description: string,
    timelineEngine: TimelineEngine,
    isPublic: boolean = false,
    tags: string[] = [],
    favorite: boolean = false
  ): Promise<ActionTimeline | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return null;
      }

      const timelineData = timelineEngine.toJSON();
      
      const timeline = {
        user_id: user.id,
        name,
        description,
        data: timelineData,
        is_public: isPublic,
        tags,
        favorite
      };

      const { data, error } = await this.supabase
        .from('action_timelines')
        .insert(timeline)
        .select()
        .single();

      if (error) {
        console.error('[ActionTimelineService] Error saving timeline:', error);
        return null;
      }

      return data as ActionTimeline;
    } catch (error) {
      console.error('[ActionTimelineService] Error saving timeline:', error);
      return null;
    }
  }

  // Update an existing timeline
  async updateTimeline(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      data: any;
      is_public: boolean;
      tags: string[];
      favorite: boolean;
    }>
  ): Promise<ActionTimeline | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return null;
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[ActionTimelineService] Error updating timeline:', error);
        return null;
      }

      return data as ActionTimeline;
    } catch (error) {
      console.error('[ActionTimelineService] Error updating timeline:', error);
      return null;
    }
  }

  // Load a timeline from the database
  async loadTimeline(id: string): Promise<ActionTimeline | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return null;
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('*')
        .eq('id', id)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .single();

      if (error) {
        console.error('[ActionTimelineService] Error loading timeline:', error);
        return null;
      }

      return data as ActionTimeline;
    } catch (error) {
      console.error('[ActionTimelineService] Error loading timeline:', error);
      return null;
    }
  }

  // Get all timelines for the current user
  async getUserTimelines(): Promise<ActionTimeline[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return [];
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ActionTimelineService] Error fetching user timelines:', error);
        return [];
      }

      return data as ActionTimeline[];
    } catch (error) {
      console.error('[ActionTimelineService] Error fetching user timelines:', error);
      return [];
    }
  }

  // Get public timelines
  async getPublicTimelines(): Promise<ActionTimeline[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return [];
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', user.id) // Exclude user's own timelines
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ActionTimelineService] Error fetching public timelines:', error);
        return [];
      }

      return data as ActionTimeline[];
    } catch (error) {
      console.error('[ActionTimelineService] Error fetching public timelines:', error);
      return [];
    }
  }

  // Get favorite timelines
  async getFavoriteTimelines(): Promise<ActionTimeline[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return [];
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('*')
        .eq('user_id', user.id)
        .eq('favorite', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ActionTimelineService] Error fetching favorite timelines:', error);
        return [];
      }

      return data as ActionTimeline[];
    } catch (error) {
      console.error('[ActionTimelineService] Error fetching favorite timelines:', error);
      return [];
    }
  }

  // Search timelines by tags
  async searchTimelinesByTags(tags: string[]): Promise<ActionTimeline[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return [];
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('*')
        .overlaps('tags', tags)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ActionTimelineService] Error searching timelines by tags:', error);
        return [];
      }

      return data as ActionTimeline[];
    } catch (error) {
      console.error('[ActionTimelineService] Error searching timelines by tags:', error);
      return [];
    }
  }

  // Delete a timeline
  async deleteTimeline(id: string): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return false;
      }

      const { error } = await this.supabase
        .from('action_timelines')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[ActionTimelineService] Error deleting timeline:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ActionTimelineService] Error deleting timeline:', error);
      return false;
    }
  }

  // Toggle favorite status
  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return false;
      }

      const timeline = await this.loadTimeline(id);
      if (!timeline) return false;

      const { error } = await this.supabase
        .from('action_timelines')
        .update({ favorite: !timeline.favorite })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[ActionTimelineService] Error toggling favorite:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ActionTimelineService] Error toggling favorite:', error);
      return false;
    }
  }

  // Record timeline execution
  async recordExecution(
    timelineId: string,
    status: 'running' | 'completed' | 'paused' | 'stopped',
    executionPath: any[],
    duration?: number,
    notes?: string
  ): Promise<ActionTimelineExecution | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return null;
      }

      const execution = {
        timeline_id: timelineId,
        user_id: user.id,
        status,
        execution_path: executionPath,
        duration,
        notes,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      };

      const { data, error } = await this.supabase
        .from('action_timeline_executions')
        .insert(execution)
        .select()
        .single();

      if (error) {
        console.error('[ActionTimelineService] Error recording execution:', error);
        return null;
      }

      // Update timeline execution stats
      if (status === 'completed' && duration) {
        // Get current timeline to update stats
        const { data: currentTimeline } = await this.supabase
          .from('action_timelines')
          .select('execution_count, total_execution_time')
          .eq('id', timelineId)
          .eq('user_id', user.id)
          .single();

        if (currentTimeline) {
          await this.supabase
            .from('action_timelines')
            .update({
              execution_count: currentTimeline.execution_count + 1,
              total_execution_time: currentTimeline.total_execution_time + duration,
              last_executed_at: new Date().toISOString()
            })
            .eq('id', timelineId)
            .eq('user_id', user.id);
        }
      }

      return data as ActionTimelineExecution;
    } catch (error) {
      console.error('[ActionTimelineService] Error recording execution:', error);
      return null;
    }
  }

  // Get execution history for a timeline
  async getExecutionHistory(timelineId: string): Promise<ActionTimelineExecution[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return [];
      }

      const { data, error } = await this.supabase
        .from('action_timeline_executions')
        .select('*')
        .eq('timeline_id', timelineId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('[ActionTimelineService] Error fetching execution history:', error);
        return [];
      }

      return data as ActionTimelineExecution[];
    } catch (error) {
      console.error('[ActionTimelineService] Error fetching execution history:', error);
      return [];
    }
  }

  // Get user's execution statistics
  async getUserExecutionStats(): Promise<{
    totalExecutions: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    mostUsedTimeline: string | null;
  }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ActionTimelineService] Authentication error:', authError);
        return {
          totalExecutions: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          mostUsedTimeline: null
        };
      }

      const { data, error } = await this.supabase
        .from('action_timelines')
        .select('name, execution_count, total_execution_time')
        .eq('user_id', user.id)
        .gt('execution_count', 0);

      if (error) {
        console.error('[ActionTimelineService] Error fetching execution stats:', error);
        return {
          totalExecutions: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          mostUsedTimeline: null
        };
      }

      const totalExecutions = data.reduce((sum, timeline) => sum + timeline.execution_count, 0);
      const totalExecutionTime = data.reduce((sum, timeline) => sum + timeline.total_execution_time, 0);
      const averageExecutionTime = totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0;
      
      const mostUsedTimeline = data.length > 0 
        ? data.reduce((max, timeline) => 
            timeline.execution_count > max.execution_count ? timeline : max
          ).name
        : null;

      return {
        totalExecutions,
        totalExecutionTime,
        averageExecutionTime,
        mostUsedTimeline
      };
    } catch (error) {
      console.error('[ActionTimelineService] Error fetching execution stats:', error);
      return {
        totalExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        mostUsedTimeline: null
      };
    }
  }
}

export const actionTimelineService = new ActionTimelineService();
