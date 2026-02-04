import { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface SingleFileUploadProps {
  onFileSelect: (file: File) => void;
  currentAttachment?: {
    url: string;
    type: 'image' | 'pdf';
    name: string;
  } | null;
  onRemove: () => void;
  disabled?: boolean;
}

export const SingleFileUpload = ({ 
  onFileSelect, 
  currentAttachment, 
  onRemove,
  disabled 
}: SingleFileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {currentAttachment && (
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
            {currentAttachment.type === 'image' ? (
              <ImageIcon size={20} className="text-blue-600" />
            ) : (
              <FileText size={20} className="text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentAttachment.name}
            </p>
            <p className="text-xs text-gray-500">
              {currentAttachment.type === 'image' ? 'Изображение' : 'PDF'}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
          {currentAttachment ? 'Заменить файл' : 'Прикрепить файл (необязательно)'}
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
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
              <Upload className="text-gray-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Нажмите чтобы выбрать файл
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Изображение или PDF до 10 MB
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
