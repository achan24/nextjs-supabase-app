export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      character_areas: {
        Row: {
          id: string
          user_id: string
          name: string
          description?: string
          current_points: number
          target_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      character_subareas: {
        Row: {
          id: string
          area_id: string
          name: string
          description?: string
          current_points: number
          target_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          area_id: string
          name: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          name?: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      character_goals: {
        Row: {
          id: string
          subarea_id: string
          name: string
          description?: string
          current_points: number
          target_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subarea_id: string
          name: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subarea_id?: string
          name?: string
          description?: string
          current_points?: number
          target_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      overview_targets: {
        Row: {
          id: string
          user_id: string
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          created_at?: string
        }
      }
      targets: {
        Row: {
          id: string
          title: string
          description: string
          target_value: number
          current_value: number
          unit: string
          target_type: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          target_value: number
          current_value: number
          unit: string
          target_type: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          target_value?: number
          current_value?: number
          unit?: string
          target_type?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      character_weekly_targets: {
        Row: {
          id: string
          user_id: string
          target_id: string
          target_type: 'area' | 'subarea' | 'goal'
          day_of_week: number
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_id: string
          target_type: 'area' | 'subarea' | 'goal'
          day_of_week: number
          points: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          target_type?: 'area' | 'subarea' | 'goal'
          day_of_week?: number
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
      character_daily_progress: {
        Row: {
          id: string
          user_id: string
          date: string
          area_id: string
          subarea_id: string | null
          goal_id: string | null
          points: number
          target_points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          area_id: string
          subarea_id?: string | null
          goal_id?: string | null
          points: number
          target_points: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          area_id?: string
          subarea_id?: string | null
          goal_id?: string | null
          points?: number
          target_points?: number
          created_at?: string
        }
      }
      life_goal_areas: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          daily_points: number
          daily_target: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          daily_points?: number
          daily_target?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          daily_points?: number
          daily_target?: number
          created_at?: string
          updated_at?: string
        }
      }
      life_goal_subareas: {
        Row: {
          id: string
          area_id: string
          name: string
          description: string | null
          daily_points: number
          daily_target: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          area_id: string
          name: string
          description?: string | null
          daily_points?: number
          daily_target?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          name?: string
          description?: string | null
          daily_points?: number
          daily_target?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_character_daily_points: {
        Args: Record<string, never>
        Returns: void
      }
      reset_character_daily_progress: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      reset_daily_points: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

interface LifeGoalArea {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  daily_points: number;
  daily_target: number;
  created_at: string;
  updated_at: string;
}

interface LifeGoalSubarea {
  id: string;
  area_id: string;
  name: string;
  description: string | null;
  daily_points: number;
  daily_target: number;
  created_at: string;
  updated_at: string;
} 