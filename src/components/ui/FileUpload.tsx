import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { validateFile, getAttachmentUrl } from '../../services/storage';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  currentAttachment?: {
    url: string;
    type: 'image' | 'pdf';
    name: string;
  } | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export const FileUpload = ({ onFileSelect, currentAttachment, onRemove, disabled }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove?.();
  };

  // Show current attachment if exists
  if (currentAttachment) {
    const fullUrl = getAttachmentUrl(currentAttachment.url);
    
    return (
      <div className="relative">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
          Прикреплённый файл
        </label>
        <div className="relative bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
          {currentAttachment.type === 'image' ? (
            <img 
              src={fullUrl} 
              alt={currentAttachment.name}
              className="w-full h-auto rounded-xl"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FileText className="text-red-600" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentAttachment.name}
                </p>
                <a 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Открыть PDF
                </a>
              </div>
            </div>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
            >
              <X size={16} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show preview if file selected
  if (preview) {
    return (
      <div className="relative">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
          Предпросмотр
        </label>
        <div className="relative bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
          <img 
            src={preview} 
            alt="Preview"
            className="w-full h-auto rounded-xl"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
            >
              <X size={16} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show upload area
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
        Прикрепить файл (необязательно)
      </label>
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
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
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
            <Upload className="text-gray-500" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Нажмите или перетащите файл
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Изображения или PDF до 10 MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
