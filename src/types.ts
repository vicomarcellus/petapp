export interface Pet {
  id?: number;
  name: string;
  type: string; // 'cat', 'dog', 'bird', 'other' и т.д.
  photo?: string; // base64 или URL
  birthDate?: string; // YYYY-MM-DD
  breed?: string;
  color?: string;
  notes?: string;
  created_at: number;
  isActive?: boolean; // Активный питомец (выбран сейчас)
}

export interface MedicationEntry {
  id?: number;
  petId: number; // ID питомца
  date: string; // YYYY-MM-DD
  medication_name: string;
  dosage: string;
  time: string; // HH:mm
  timestamp: number; // полный timestamp
  color?: string;
  note?: string;
}

export interface Medication {
  id?: number;
  petId: number; // ID питомца
  name: string;
  color: string;
  default_dosage?: string;
}

export interface MedicationTag {
  id?: number;
  petId: number; // ID питомца
  name: string;
  color: string;
}

export interface SymptomTag {
  id?: number;
  petId: number; // ID питомца
  name: string;
  color: string;
}

export interface DayEntry {
  id?: number;
  petId: number; // ID питомца
  date: string; // YYYY-MM-DD
  state_score: 1 | 2 | 3 | 4 | 5;
  note: string;
  symptoms: string[]; // Массив симптомов как строки
  created_at: number;
  updated_at: number;
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
