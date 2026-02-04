import { supabase } from '../lib/supabase';
import type { Attachment } from '../types';

const BUCKET_NAME = 'attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type AttachmentType = 'image' | 'pdf';

export interface UploadResult {
  url: string;
  type: AttachmentType;
  name: string;
  size: number;
}

/**
 * Compress image before upload
 */
const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Upload file to Supabase Storage
 */
export const uploadAttachment = async (
  file: File,
  userId: string,
  petId: number,
  category: 'diagnosis' | 'entry' | 'note',
  itemId?: number
): Promise<UploadResult> => {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Файл слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024} MB`);
  }

  // Determine file type
  const fileType = file.type;
  let attachmentType: AttachmentType;
  let processedFile: File | Blob = file;

  if (fileType.startsWith('image/')) {
    attachmentType = 'image';
    // Compress image
    try {
      processedFile = await compressImage(file);
    } catch (error) {
      console.error('Image compression failed, using original:', error);
    }
  } else if (fileType === 'application/pdf') {
    attachmentType = 'pdf';
  } else {
    throw new Error('Неподдерживаемый формат файла. Только изображения и PDF');
  }

  // Generate unique file path
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${petId}/${category}/${itemId || 'temp'}/${timestamp}_${sanitizedName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, processedFile, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Ошибка загрузки: ${error.message}`);
  }

  return {
    url: data.path, // Store path, not full URL (for flexibility)
    type: attachmentType,
    name: file.name,
    size: file.size
  };
};

/**
 * Save attachment record to database
 */
export const saveAttachmentRecord = async (
  userId: string,
  petId: number,
  parentType: Attachment['parent_type'],
  parentId: number,
  uploadResult: UploadResult
): Promise<Attachment> => {
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      user_id: userId,
      pet_id: petId,
      parent_type: parentType,
      parent_id: parentId,
      file_url: uploadResult.url,
      file_type: uploadResult.type,
      file_name: uploadResult.name,
      file_size: uploadResult.size
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving attachment record:', error);
    throw new Error(`Ошибка сохранения записи: ${error.message}`);
  }

  return data;
};

/**
 * Load attachments for a parent record
 */
export const loadAttachments = async (
  parentType: Attachment['parent_type'],
  parentId: number
): Promise<Attachment[]> => {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('parent_type', parentType)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading attachments:', error);
    return [];
  }

  return data || [];
};

/**
 * Get public URL for attachment
 */
export const getAttachmentUrl = (path: string): string => {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

/**
 * Delete attachment from storage and database
 */
export const deleteAttachment = async (attachmentId: number, filePath: string): Promise<void> => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    console.error('Database delete error:', dbError);
    throw new Error(`Ошибка удаления: ${dbError.message}`);
  }
};

/**
 * Delete attachment by URL (legacy - for old single-file components)
 */
export const deleteAttachmentByUrl = async (fileUrl: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fileUrl]);

  if (error) {
    console.error('Storage delete error:', error);
    throw new Error(`Ошибка удаления: ${error.message}`);
  }
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024} MB`
    };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Неподдерживаемый формат. Только изображения (JPEG, PNG, GIF, WebP) и PDF'
    };
  }

  return { valid: true };
};

