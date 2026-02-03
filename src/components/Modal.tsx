import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export const AlertModal = ({ isOpen, title, message, onClose }: AlertModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Небольшая задержка для запуска анимации
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 transition-all duration-300 ${
        isAnimating ? 'bg-opacity-50 backdrop-blur-sm' : 'bg-opacity-0'
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transition-all duration-300 ${
          isAnimating 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4'
        }`}
        style={{ 
          transitionTimingFunction: isAnimating 
            ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : 'ease-out' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-black">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm, 
  onCancel,
  danger = false
}: ConfirmModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 transition-all duration-300 ${
        isAnimating ? 'bg-opacity-50 backdrop-blur-sm' : 'bg-opacity-0'
      }`}
      onClick={onCancel}
    >
      <div 
        className={`bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transition-all duration-300 ${
          isAnimating 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4'
        }`}
        style={{ 
          transitionTimingFunction: isAnimating 
            ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : 'ease-out' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-black">{title}</h3>
          <button 
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              danger 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-200 text-black rounded-full font-medium hover:bg-gray-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
