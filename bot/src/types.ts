// Типы из основного приложения
export interface Pet {
  id?: number;
  user_id: string;
  name: string;
  type: string;
  photo?: string;
  birthDate?: string;
  breed?: string;
  color?: string;
  notes?: string;
  created_at?: string;
  is_active?: boolean;
}

export interface StateEntry {
  id?: number;
  user_id: string;
  pet_id: number;
  date: string;
  time: string;
  timestamp: number;
  state_score: 1 | 2 | 3 | 4 | 5;
  trend?: 'up' | 'same' | 'down';
  note?: string;
  created_at?: string;
}

export interface SymptomEntry {
  id?: number;
  user_id: string;
  pet_id: number;
  date: string;
  time: string;
  timestamp: number;
  symptom: string;
  note?: string;
  created_at?: string;
}

export interface MedicationEntry {
  id?: number;
  user_id: string;
  pet_id: number;
  date: string;
  medication_name: string;
  dosage_amount: string;
  dosage_unit: string;
  time: string;
  timestamp: number;
  color?: string;
  note?: string;
  is_scheduled?: boolean;
  completed?: boolean;
  scheduled_time?: number;
}

export interface FeedingEntry {
  id?: number;
  user_id: string;
  pet_id: number;
  date: string;
  time: string;
  timestamp: number;
  food_name: string;
  amount: string;
  unit: 'g' | 'ml' | 'none';
  note?: string;
  is_scheduled?: boolean;
  completed?: boolean;
  scheduled_time?: number;
  created_at?: string;
}

// Контекст пользователя в боте
export interface UserContext {
  telegram_id: number;
  supabase_user_id?: string;
  current_pet_id?: number;
  state?: 'idle' | 'adding_state' | 'adding_symptom' | 'adding_medication' | 'adding_feeding';
  temp_data?: any;
}

export const STATE_LABELS: Record<number, string> = {
  1: 'Критично 😰',
  2: 'Плохо 😟',
  3: 'Средне 😐',
  4: 'Нормально 🙂',
  5: 'Отлично 😊',
};
