import { useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { validateFile, getAttachmentUrl } from '../../services/storage';
import type { Attachment } from '../../types';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  currentAttachments?: Attachment[];
  newFiles?: Array<{ file: File; preview: string | null }>;
  onRemoveAttachment?: (attachmentId: number, filePath: string) => void;
  onRemoveNewFile?: (index: number) => void;
  disabled?: boolean;
}

export const FileUpload = ({ 
  onFilesSelect, 
  currentAttachments = [], 
  newFiles = [],
  onRemoveAttachment, 
  onRemoveNewFile,
  disabled 
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles: File[] = [];

    files.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing attachments */}
      {currentAttachments.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
            Прикреплённые файлы
          </label>
          <div className="space-y-1">
            {currentAttachments.map((attachment) => {
              const fullUrl = getAttachmentUrl(attachment.file_url);
              
              return (
                <div key={attachment.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  {/* Thumbnail */}
                  <div 
                    className="w-6 h-6 rounded flex-shrink-0 overflow-hidden cursor-pointer bg-gray-200"
                    onClick={() => window.open(fullUrl, '_blank')}
                  >
                    {attachment.file_type === 'image' ? (
                      <img 
                        src={fullUrl} 
                        alt={attachment.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-100">
                        <FileText className="text-red-600" size={12} />
                      </div>
                    )}
                  </div>
                  
                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                  </div>
                  
                  {/* Remove button */}
                  {!disabled && onRemoveAttachment && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id!, attachment.file_url)}
                      className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    >
                      <X size={14} className="text-gray-600 hover:text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New file previews */}
      {newFiles.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
            Новые файлы
          </label>
          <div className="space-y-1">
            {newFiles.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                {/* Thumbnail */}
                <div className="w-6 h-6 rounded flex-shrink-0 overflow-hidden bg-gray-200">
                  {item.preview ? (
                    <img 
                      src={item.preview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-100">
                      <FileText className="text-red-600" size={12} />
                    </div>
                  )}
                </div>
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                </div>
                
                {/* Remove button */}
                {!disabled && onRemoveNewFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveNewFile(index)}
                    className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  >
                    <X size={14} className="text-gray-600 hover:text-red-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
          Добавить файлы (необязательно)
        </label>
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          className={`w-full border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
            disabled 
              ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleChange}
            disabled={disabled}
            multiple
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
              <Upload className="text-gray-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Нажмите чтобы выбрать файлы
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Изображения или PDF до 10 MB
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

