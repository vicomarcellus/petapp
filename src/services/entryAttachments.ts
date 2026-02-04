import { supabase } from '../lib/supabase';
import { uploadAttachment, saveAttachmentRecord, loadAttachments, deleteAttachment } from './storage';
import type { Attachment } from '../types';

export type EntryType = 'state' | 'symptom' | 'medication' | 'feeding';

/**
 * Загрузить вложения для записи
 */
export const loadEntryAttachments = async (
  entryType: EntryType,
  entryId: number
): Promise<Attachment[]> => {
  return await loadAttachments(entryType, entryId);
};

/**
 * Загрузить вложения для нескольких записей
 */
export const loadMultipleEntryAttachments = async (
  entries: Array<{ type: EntryType; id: number }>
): Promise<Map<string, Attachment[]>> => {
  const attachmentsMap = new Map<string, Attachment[]>();
  
  await Promise.all(
    entries.map(async (entry) => {
      const attachments = await loadAttachments(entry.type, entry.id);
      const key = `${entry.type}-${entry.id}`;
      attachmentsMap.set(key, attachments);
    })
  );
  
  return attachmentsMap;
};

/**
 * Сохранить новые файлы для записи
 */
export const saveEntryAttachments = async (
  files: File[],
  userId: string,
  petId: number,
  entryType: EntryType,
  entryId: number
): Promise<Attachment[]> => {
  if (files.length === 0) return [];

  const savedAttachments: Attachment[] = [];

  for (const file of files) {
    // Загружаем файл в storage
    const uploadResult = await uploadAttachment(file, userId, petId, 'entry', entryId);
    
    // Сохраняем запись в БД
    const attachment = await saveAttachmentRecord(
      userId,
      petId,
      entryType,
      entryId,
      uploadResult
    );
    
    savedAttachments.push(attachment);
  }

  return savedAttachments;
};

/**
 * Удалить вложение
 */
export const removeEntryAttachment = async (
  attachmentId: number,
  filePath: string
): Promise<void> => {
  await deleteAttachment(attachmentId, filePath);
};

/**
 * Получить ключ для Map вложений
 */
export const getAttachmentKey = (entryType: EntryType, entryId: number): string => {
  return `${entryType}-${entryId}`;
};
