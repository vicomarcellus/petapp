import Dexie, { Table } from 'dexie';
import { DayEntry, MedicationEntry, Medication, SymptomTag, MedicationTag, HistoryEntry, Pet, User, StateEntry, SymptomEntry } from './types';

export class CatHealthDB extends Dexie {
  users!: Table<User>;
  pets!: Table<Pet>;
  dayEntries!: Table<DayEntry>;
  stateEntries!: Table<StateEntry>;
  symptomEntries!: Table<SymptomEntry>;
  medicationEntries!: Table<MedicationEntry>;
  medications!: Table<Medication>;
  symptomTags!: Table<SymptomTag>;
  medicationTags!: Table<MedicationTag>;
  history!: Table<HistoryEntry>;

  constructor() {
    super('CatHealthDB');
    
    // Version 2: добавлены таблицы лекарств
    this.version(2).stores({
      dayEntries: '++id, date, created_at, updated_at',
      medicationEntries: '++id, date, timestamp, medication_name',
      medications: '++id, name',
    });

    // Version 3: миграция симптомов в массив
    this.version(3).stores({
      dayEntries: '++id, date, created_at, updated_at',
      medicationEntries: '++id, date, timestamp, medication_name',
      medications: '++id, name',
    }).upgrade(async (trans) => {
      // Мигрируем старые записи с boolean симптомами в массив строк
      const entries = await trans.table('dayEntries').toArray();
      for (const entry of entries) {
        const symptoms: string[] = [];
        if ((entry as any).ate) symptoms.push('Ел сам');
        if ((entry as any).vomit) symptoms.push('Рвота');
        if ((entry as any).tremor) symptoms.push('Дрожь');
        if ((entry as any).pain) symptoms.push('Боль');
        if ((entry as any).anxiety) symptoms.push('Беспокойство');
        
        await trans.table('dayEntries').update(entry.id, {
          symptoms,
          ate: undefined,
          vomit: undefined,
          tremor: undefined,
          pain: undefined,
          anxiety: undefined,
        });
      }
    });

    // Version 4: добавлена таблица тегов симптомов
    this.version(4).stores({
      dayEntries: '++id, date, created_at, updated_at',
      medicationEntries: '++id, date, timestamp, medication_name',
      medications: '++id, name',
      symptomTags: '++id, name',
    });

    // Version 5: добавлена таблица тегов лекарств
    this.version(5).stores({
      dayEntries: '++id, date, created_at, updated_at',
      medicationEntries: '++id, date, timestamp, medication_name',
      medications: '++id, name',
      symptomTags: '++id, name',
      medicationTags: '++id, name',
    });

    // Version 6: добавлена таблица истории изменений
    this.version(6).stores({
      dayEntries: '++id, date, created_at, updated_at',
      medicationEntries: '++id, date, timestamp, medication_name',
      medications: '++id, name',
      symptomTags: '++id, name',
      medicationTags: '++id, name',
      history: '++id, timestamp, entityType, date',
    });

    // Version 7: добавлена таблица питомцев и petId во все таблицы
    this.version(7).stores({
      pets: '++id, name, type, created_at, isActive',
      dayEntries: '++id, petId, date, created_at, updated_at',
      medicationEntries: '++id, petId, date, timestamp, medication_name',
      medications: '++id, petId, name',
      symptomTags: '++id, petId, name',
      medicationTags: '++id, petId, name',
      history: '++id, timestamp, entityType, date',
    }).upgrade(async (trans) => {
      // Создаем дефолтного питомца
      const defaultPet = await trans.table('pets').add({
        name: 'Мой питомец',
        type: 'cat',
        created_at: Date.now(),
        isActive: true,
      });

      // Привязываем все существующие данные к дефолтному питомцу
      const tables = ['dayEntries', 'medicationEntries', 'medications', 'symptomTags', 'medicationTags'];
      for (const tableName of tables) {
        const items = await trans.table(tableName).toArray();
        for (const item of items) {
          await trans.table(tableName).update(item.id, { petId: defaultPet });
        }
      }
    });

    // Version 8: добавлена таблица пользователей и userId во все таблицы
    this.version(8).stores({
      users: 'id, authDate',
      pets: '++id, userId, name, type, created_at, isActive',
      dayEntries: '++id, userId, petId, date, created_at, updated_at',
      medicationEntries: '++id, userId, petId, date, timestamp, medication_name',
      medications: '++id, userId, petId, name',
      symptomTags: '++id, userId, petId, name',
      medicationTags: '++id, userId, petId, name',
      history: '++id, timestamp, entityType, date',
    });

    // Version 9: добавлена таблица записей состояния (множественные записи в день)
    this.version(9).stores({
      users: 'id, authDate',
      pets: '++id, userId, name, type, created_at, isActive',
      dayEntries: '++id, userId, petId, date, created_at, updated_at',
      stateEntries: '++id, userId, petId, date, timestamp, time',
      medicationEntries: '++id, userId, petId, date, timestamp, medication_name',
      medications: '++id, userId, petId, name',
      symptomTags: '++id, userId, petId, name',
      medicationTags: '++id, userId, petId, name',
      history: '++id, timestamp, entityType, date',
    }).upgrade(async (trans) => {
      // Мигрируем существующие записи состояния из dayEntries в stateEntries
      const dayEntries = await trans.table('dayEntries').toArray();
      for (const entry of dayEntries) {
        if (entry.state_score) {
          // Создаем запись состояния на основе существующей записи дня
          await trans.table('stateEntries').add({
            userId: entry.userId,
            petId: entry.petId,
            date: entry.date,
            time: '12:00', // Дефолтное время для старых записей
            timestamp: entry.created_at,
            state_score: entry.state_score,
            note: entry.note || undefined,
            created_at: entry.created_at,
          });
        }
      }
    });

    // Version 10: добавлена таблица записей симптомов с временем
    this.version(10).stores({
      users: 'id, authDate',
      pets: '++id, userId, name, type, created_at, isActive',
      dayEntries: '++id, userId, petId, date, created_at, updated_at',
      stateEntries: '++id, userId, petId, date, timestamp, time',
      symptomEntries: '++id, userId, petId, date, timestamp, time',
      medicationEntries: '++id, userId, petId, date, timestamp, medication_name',
      medications: '++id, userId, petId, name',
      symptomTags: '++id, userId, petId, name',
      medicationTags: '++id, userId, petId, name',
      history: '++id, timestamp, entityType, date',
    }).upgrade(async (trans) => {
      // Мигрируем существующие симптомы из dayEntries в symptomEntries
      const dayEntries = await trans.table('dayEntries').toArray();
      for (const entry of dayEntries) {
        if (entry.symptoms && entry.symptoms.length > 0) {
          // Создаем записи симптомов на основе существующих
          for (const symptom of entry.symptoms) {
            await trans.table('symptomEntries').add({
              userId: entry.userId,
              petId: entry.petId,
              date: entry.date,
              time: '12:00', // Дефолтное время для старых записей
              timestamp: entry.created_at,
              symptom: symptom,
              created_at: entry.created_at,
            });
          }
        }
      }
    });
  }
}

export const db = new CatHealthDB();
