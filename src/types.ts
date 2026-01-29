export interface User {
  id: string; // Supabase User ID (UUID)
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: number;
  password?: string; // Не используется с Supabase
}

export interface Pet {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  name: string;
  type: string; // 'cat', 'dog', 'bird', 'other' и т.д.
  photo?: string; // base64 или URL
  birthDate?: string; // YYYY-MM-DD
  breed?: string;
  color?: string;
  notes?: string;
  created_at?: string;
  is_active?: boolean; // Активный питомец (выбран сейчас)
}

export interface MedicationEntry {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  medication_name: string;
  dosage: string;
  time: string; // HH:mm
  timestamp: number; // полный timestamp
  color?: string;
  note?: string;
  is_scheduled?: boolean; // Было ли запланировано
  completed?: boolean; // Выполнено ли (для запланированных)
  scheduled_time?: number; // Целевое время выполнения (timestamp)
}

export interface Medication {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  name: string;
  color: string;
  default_dosage?: string;
}

export interface MedicationTag {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  name: string;
  color: string;
}

export interface SymptomTag {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  name: string;
  color: string;
}

export interface DayEntry {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  state_score: 1 | 2 | 3 | 4 | 5;
  note: string;
  symptoms: string[]; // Массив симптомов как строки
  created_at?: string;
  updated_at?: string;
}

export interface StateEntry {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number; // полный timestamp для сортировки
  state_score: 1 | 2 | 3 | 4 | 5;
  note?: string; // Опциональная заметка к конкретному состоянию
  is_scheduled?: boolean; // Было ли запланировано
  completed?: boolean; // Выполнено ли (для запланированных)
  scheduled_time?: number; // Целевое время выполнения (timestamp)
  created_at?: string;
}

export interface SymptomEntry {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number; // полный timestamp для сортировки
  symptom: string; // Название симптома
  note?: string; // Опциональная заметка
  is_scheduled?: boolean; // Было ли запланировано
  completed?: boolean; // Выполнено ли (для запланированных)
  scheduled_time?: number; // Целевое время выполнения (timestamp)
  created_at?: string;
}

export interface FeedingEntry {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number; // полный timestamp для сортировки
  food_name: string; // Название корма/воды
  amount: string; // Количество (например "50 г" или "100 мл")
  unit: 'g' | 'ml' | 'none'; // Единица измерения
  note?: string; // Опциональная заметка
  is_scheduled?: boolean; // Было ли запланировано
  completed?: boolean; // Выполнено ли (для запланированных)
  scheduled_time?: number; // Целевое время выполнения (timestamp)
  created_at?: string;
}

export interface FoodTag {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  name: string;
  default_unit?: 'g' | 'ml' | 'none';
  default_amount?: string;
}

export interface ChecklistTask {
  id?: number;
  user_id: string; // Supabase User ID (UUID)
  pet_id: number; // ID питомца
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number; // полный timestamp для сортировки и проверки просрочки
  task: string; // Текст задачи
  completed: boolean; // Выполнена ли задача
  task_type?: 'medication' | 'feeding' | 'other'; // Тип задачи
  linked_item_id?: number; // ID связанного лекарства или корма
  linked_item_name?: string; // Название связанного элемента
  linked_item_amount?: string; // Количество/дозировка
  created_at?: string;
}

export interface HistoryEntry {
  id?: number;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  entityType: 'dayEntry' | 'medication' | 'symptom' | 'note' | 'state';
  entityId?: number;
  date?: string; // Дата записи (для dayEntry)
  description: string; // Человекочитаемое описание
  oldValue?: any; // Старое значение (для отмены)
  newValue?: any; // Новое значение
  source?: 'manual' | 'ai'; // Источник изменения
}

export const STATE_LABELS: Record<number, string> = {
  1: 'Критично',
  2: 'Плохо',
  3: 'Средне',
  4: 'Нормально',
  5: 'Отлично',
};

export const STATE_COLORS: Record<number, string> = {
  1: '#EF4444', // red-500
  2: '#F97316', // orange-500
  3: '#EAB308', // yellow-500
  4: '#84CC16', // lime-500
  5: '#22C55E', // green-500
};

export const MEDICATION_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#10B981', // emerald
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
];

export const SYMPTOM_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
];
