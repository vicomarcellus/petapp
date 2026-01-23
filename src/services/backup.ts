import { db } from '../db';

export interface BackupData {
  version: string;
  exportDate: string;
  data: {
    dayEntries: any[];
    medicationEntries: any[];
    medications: any[];
    symptomTags: any[];
    medicationTags: any[];
    history: any[];
  };
}

/**
 * Экспортирует все данные из базы в JSON
 */
export async function exportData(): Promise<BackupData> {
  const [dayEntries, medicationEntries, medications, symptomTags, medicationTags, history] = await Promise.all([
    db.dayEntries.toArray(),
    db.medicationEntries.toArray(),
    db.medications.toArray(),
    db.symptomTags.toArray(),
    db.medicationTags.toArray(),
    db.history.toArray(),
  ]);

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      dayEntries,
      medicationEntries,
      medications,
      symptomTags,
      medicationTags,
      history,
    },
  };
}

/**
 * Скачивает данные как JSON файл
 */
export async function downloadBackup(): Promise<void> {
  const data = await exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cat-health-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Импортирует данные из JSON
 */
export async function importData(data: BackupData, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
  if (mode === 'replace') {
    // Очищаем все таблицы
    await db.dayEntries.clear();
    await db.medicationEntries.clear();
    await db.medications.clear();
    await db.symptomTags.clear();
    await db.medicationTags.clear();
    await db.history.clear();
  }

  // Импортируем данные
  if (data.data.dayEntries.length > 0) {
    await db.dayEntries.bulkAdd(data.data.dayEntries);
  }
  if (data.data.medicationEntries.length > 0) {
    await db.medicationEntries.bulkAdd(data.data.medicationEntries);
  }
  if (data.data.medications.length > 0) {
    await db.medications.bulkAdd(data.data.medications);
  }
  if (data.data.symptomTags.length > 0) {
    await db.symptomTags.bulkAdd(data.data.symptomTags);
  }
  if (data.data.medicationTags.length > 0) {
    await db.medicationTags.bulkAdd(data.data.medicationTags);
  }
  if (data.data.history && data.data.history.length > 0) {
    await db.history.bulkAdd(data.data.history);
  }
}

/**
 * Загружает данные из файла
 */
export async function uploadBackup(file: File, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data: BackupData = JSON.parse(text);
        
        // Валидация
        if (!data.version || !data.data) {
          throw new Error('Неверный формат файла бэкапа');
        }
        
        await importData(data, mode);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

/**
 * Автоматический бэкап в localStorage
 */
export async function autoBackup(): Promise<void> {
  const data = await exportData();
  localStorage.setItem('cat-health-auto-backup', JSON.stringify(data));
  localStorage.setItem('cat-health-auto-backup-date', new Date().toISOString());
}

/**
 * Восстановление из автоматического бэкапа
 */
export async function restoreAutoBackup(): Promise<boolean> {
  const backup = localStorage.getItem('cat-health-auto-backup');
  if (!backup) return false;
  
  try {
    const data: BackupData = JSON.parse(backup);
    await importData(data, 'replace');
    return true;
  } catch (error) {
    console.error('Ошибка восстановления автобэкапа:', error);
    return false;
  }
}

/**
 * Получить дату последнего автобэкапа
 */
export function getLastAutoBackupDate(): string | null {
  return localStorage.getItem('cat-health-auto-backup-date');
}
