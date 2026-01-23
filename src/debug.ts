// Утилиты для отладки
import { db } from './db';

// Экспортируем для использования в консоли браузера
(window as any).debugDB = {
  // Показать все записи
  async showAllEntries() {
    const entries = await db.dayEntries.toArray();
    console.table(entries);
    return entries;
  },
  
  // Показать все лекарства
  async showAllMedications() {
    const meds = await db.medicationEntries.toArray();
    console.table(meds);
    return meds;
  },
  
  // Удалить все данные
  async clearAll() {
    await db.dayEntries.clear();
    await db.medicationEntries.clear();
    await db.medications.clear();
    await db.symptomTags.clear();
    await db.medicationTags.clear();
    console.log('All data cleared!');
  },
  
  // Удалить запись по дате
  async deleteByDate(date: string) {
    const entries = await db.dayEntries.where('date').equals(date).toArray();
    const meds = await db.medicationEntries.where('date').equals(date).toArray();
    
    console.log('Found entries:', entries.length);
    console.log('Found medications:', meds.length);
    
    for (const entry of entries) {
      if (entry.id) await db.dayEntries.delete(entry.id);
    }
    
    for (const med of meds) {
      if (med.id) await db.medicationEntries.delete(med.id);
    }
    
    console.log('Deleted!');
  },
  
  // Показать запись по дате
  async showByDate(date: string) {
    const entry = await db.dayEntries.where('date').equals(date).first();
    const meds = await db.medicationEntries.where('date').equals(date).toArray();
    
    console.log('Entry:', entry);
    console.log('Medications:', meds);
    
    return { entry, meds };
  }
};

console.log('Debug utilities loaded! Use window.debugDB in console');
console.log('Available commands:');
console.log('- debugDB.showAllEntries()');
console.log('- debugDB.showAllMedications()');
console.log('- debugDB.clearAll()');
console.log('- debugDB.deleteByDate("2026-01-23")');
console.log('- debugDB.showByDate("2026-01-23")');
