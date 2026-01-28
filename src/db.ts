// ВРЕМЕННАЯ ЗАГЛУШКА - IndexedDB больше не используется
// Все данные теперь в Supabase

import { Table } from 'dexie';

// Пустая заглушка чтобы не ломать импорты
export class CatHealthDB {
  users!: Table<any>;
  pets!: Table<any>;
  dayEntries!: Table<any>;
  stateEntries!: Table<any>;
  symptomEntries!: Table<any>;
  feedingEntries!: Table<any>;
  medicationEntries!: Table<any>;
  medications!: Table<any>;
  symptomTags!: Table<any>;
  medicationTags!: Table<any>;
  foodTags!: Table<any>;
  history!: Table<any>;
  checklistTasks!: Table<any>;

  constructor() {
    // Пустой конструктор - ничего не инициализируем
  }
}

// Экспортируем пустой объект
export const db = {} as CatHealthDB;
