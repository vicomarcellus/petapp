import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type AttachmentType = 'image' | 'pdf';

export interface UploadResult {
  url: string;
  type: AttachmentType;
  name: string;
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

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: data.path, // Store path, not full URL (for flexibility)
    type: attachmentType,
    name: file.name
  };
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
 * Delete attachment from storage
 */
export const deleteAttachment = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
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
