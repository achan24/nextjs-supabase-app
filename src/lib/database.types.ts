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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 