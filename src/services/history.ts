// DEPRECATED - история больше не используется

import { HistoryEntry } from '../types';

export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  // Не используется
}

export async function getHistory(limit: number = 50): Promise<HistoryEntry[]> {
  return [];
}

export async function clearHistory(): Promise<void> {
  // Не используется
}

export async function undoLastChange(): Promise<boolean> {
  return false;
}
