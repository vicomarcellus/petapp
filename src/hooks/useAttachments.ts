import { useState, useCallback } from 'react';
import { uploadAttachment, saveAttachmentRecord, loadAttachments, deleteAttachment } from '../services/storage';
import type { Attachment } from '../types';

export const useAttachments = (userId: string, petId: number) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузить вложения для записи
  const loadEntryAttachments = useCallback(async (
    parentType: Attachment['parent_type'],
    parentId: number
  ) => {
    const data = await loadAttachments(parentType, parentId);
    setAttachments(data);
  }, []);

  // Добавить новые файлы для загрузки
  const addFiles = useCallback((files: File[]) => {
    setNewFiles(prev => [...prev, ...files]);
  }, []);

  // Удалить файл из списка новых
  const removeNewFile = useCallback((index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Удалить существующее вложение
  const removeAttachment = useCallback(async (attachmentId: number, filePath: string) => {
    await deleteAttachment(attachmentId, filePath);
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  // Загрузить все новые файлы и сохранить записи
  const uploadNewFiles = useCallback(async (
    parentType: Attachment['parent_type'],
    parentId: number,
    category: 'diagnosis' | 'entry' | 'note'
  ): Promise<Attachment[]> => {
    if (newFiles.length === 0) return [];

    setLoading(true);
    const uploadedAttachments: Attachment[] = [];

    try {
      for (const file of newFiles) {
        // Загружаем файл в storage
        const uploadResult = await uploadAttachment(file, userId, petId, category, parentId);
        
        // Сохраняем запись в БД
        const attachment = await saveAttachmentRecord(
          userId,
          petId,
          parentType,
          parentId,
          uploadResult
        );
        
        uploadedAttachments.push(attachment);
      }

      // Очищаем список новых файлов
      setNewFiles([]);
      
      // Обновляем список вложений
      setAttachments(prev => [...prev, ...uploadedAttachments]);

      return uploadedAttachments;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [newFiles, userId, petId]);

  // Очистить все состояния
  const reset = useCallback(() => {
    setAttachments([]);
    setNewFiles([]);
    setLoading(false);
  }, []);

  return {
    attachments,
    newFiles,
    loading,
    loadEntryAttachments,
    addFiles,
    removeNewFile,
    removeAttachment,
    uploadNewFiles,
    reset
  };
};
