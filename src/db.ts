import Dexie, { Table } from 'dexie';
import { DayEntry, MedicationEntry, Medication, SymptomTag, MedicationTag, HistoryEntry, Pet } from './types';

export class CatHealthDB extends Dexie {
  pets!: Table<Pet>;
  dayEntries!: Table<DayEntry>;
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
  }
}

export const db = new CatHealthDB();
