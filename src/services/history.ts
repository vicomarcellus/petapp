import { db } from '../db';
import { HistoryEntry } from '../types';

/**
 * Добавляет запись в историю
 */
export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  await db.history.add({
    ...entry,
    timestamp: Date.now(),
  });
}

/**
 * Получает историю за период
 */
export async function getHistory(limit: number = 50): Promise<HistoryEntry[]> {
  return await db.history
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Получает историю для конкретной даты
 */
export async function getHistoryForDate(date: string): Promise<HistoryEntry[]> {
  return await db.history
    .where('date')
    .equals(date)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Очищает старую историю (старше N дней)
 */
export async function cleanOldHistory(daysToKeep: number = 90): Promise<void> {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  await db.history.where('timestamp').below(cutoffDate).delete();
}

/**
 * Отменяет последнее действие
 */
export async function undoLastAction(): Promise<boolean> {
  const lastEntry = await db.history
    .orderBy('timestamp')
    .reverse()
    .first();

  if (!lastEntry) return false;

  try {
    // Восстанавливаем старое значение в зависимости от типа
    switch (lastEntry.entityType) {
      case 'dayEntry':
        if (lastEntry.action === 'create' && lastEntry.entityId) {
          await db.dayEntries.delete(lastEntry.entityId);
        } else if (lastEntry.action === 'delete' && lastEntry.oldValue) {
          await db.dayEntries.add(lastEntry.oldValue);
        } else if (lastEntry.action === 'update' && lastEntry.entityId && lastEntry.oldValue) {
          await db.dayEntries.update(lastEntry.entityId, lastEntry.oldValue);
        }
        break;

      case 'medication':
        if (lastEntry.action === 'create' && lastEntry.entityId) {
          await db.medicationEntries.delete(lastEntry.entityId);
        } else if (lastEntry.action === 'delete' && lastEntry.oldValue) {
          await db.medicationEntries.add(lastEntry.oldValue);
        }
        break;

      case 'symptom':
      case 'note':
      case 'state':
        // Эти изменения хранятся как update dayEntry
        if (lastEntry.entityId && lastEntry.oldValue) {
          await db.dayEntries.update(lastEntry.entityId, lastEntry.oldValue);
        }
        break;
    }

    // Удаляем запись из истории
    if (lastEntry.id) {
      await db.history.delete(lastEntry.id);
    }

    return true;
  } catch (error) {
    console.error('Ошибка отмены действия:', error);
    return false;
  }
}

/**
 * Форматирует описание действия
 */
export function formatHistoryDescription(entry: HistoryEntry): string {
  return entry.description;
}

/**
 * Получает иконку для типа действия
 */
export function getActionIcon(action: HistoryEntry['action']): string {
  switch (action) {
    case 'create': return '➕';
    case 'update': return '✏️';
    case 'delete': return '🗑️';
    default: return '•';
  }
}

/**
 * Получает цвет для типа действия
 */
export function getActionColor(action: HistoryEntry['action']): string {
  switch (action) {
    case 'create': return '#10B981'; // green
    case 'update': return '#3B82F6'; // blue
    case 'delete': return '#EF4444'; // red
    default: return '#6B7280'; // gray
  }
}
