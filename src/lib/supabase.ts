import { createClient } from '@supabase/supabase-js';

// Хардкод значений для Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jweegvbywvixwzcliyzr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZWVndmJ5d3ZpeHd6Y2xpeXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTIxNzMsImV4cCI6MjA4NTE4ODE3M30.rdjZy9d1kbbtJ-54XMesPifBkowYD3SpKnigmrOKWEM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      pets: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          type: string;
          created_at: string;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['pets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['pets']['Insert']>;
      };
      day_entries: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          state_score: number;
          note: string;
          symptoms: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['day_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['day_entries']['Insert']>;
      };
      state_entries: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          time: string;
          timestamp: number;
          state_score: number;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['state_entries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['state_entries']['Insert']>;
      };
      symptom_entries: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          time: string;
          timestamp: number;
          symptom: string;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['symptom_entries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['symptom_entries']['Insert']>;
      };
      medication_entries: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          time: string;
          timestamp: number;
          medication_name: string;
          dosage: string;
          color: string;
        };
        Insert: Database['public']['Tables']['medication_entries']['Row'];
        Update: Partial<Database['public']['Tables']['medication_entries']['Insert']>;
      };
      feeding_entries: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          time: string;
          timestamp: number;
          food_name: string;
          amount: string;
          unit: string;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feeding_entries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['feeding_entries']['Insert']>;
      };
      medications: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          name: string;
          color: string;
          default_dosage: string | null;
        };
        Insert: Omit<Database['public']['Tables']['medications']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['medications']['Insert']>;
      };
      symptom_tags: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          name: string;
          color: string;
        };
        Insert: Omit<Database['public']['Tables']['symptom_tags']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['symptom_tags']['Insert']>;
      };
      medication_tags: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          name: string;
          color: string;
        };
        Insert: Omit<Database['public']['Tables']['medication_tags']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['medication_tags']['Insert']>;
      };
      food_tags: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          name: string;
          default_amount: string | null;
          default_unit: string;
        };
        Insert: Omit<Database['public']['Tables']['food_tags']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['food_tags']['Insert']>;
      };
      checklist_tasks: {
        Row: {
          id: number;
          user_id: string;
          pet_id: number;
          date: string;
          time: string;
          timestamp: number;
          task: string;
          completed: boolean;
          task_type: string;
          linked_item_id: number | null;
          linked_item_name: string | null;
          linked_item_amount: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['checklist_tasks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['checklist_tasks']['Insert']>;
      };
    };
  };
}
