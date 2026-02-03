import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, maxWidth = 'lg' }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-[40px] w-full ${maxWidthClasses[maxWidth]} animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ModalActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  cancelText?: string;
  submitText?: string;
  submitDisabled?: boolean;
  loading?: boolean;
}

export function ModalActions({
  onCancel,
  onSubmit,
  cancelText = 'Отмена',
  submitText = 'Сохранить',
  submitDisabled = false,
  loading = false,
}: ModalActionsProps) {
  return (
    <div className="flex gap-3 mt-8">
      <button
        onClick={onCancel}
        type="button"
        className="px-8 py-4 bg-gray-100 text-gray-800 rounded-[24px] font-bold hover:bg-gray-200 transition-all"
      >
        {cancelText}
      </button>
      <button
        onClick={onSubmit}
        type="button"
        disabled={submitDisabled || loading}
        className="flex-1 py-4 bg-black text-white rounded-[24px] font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Загрузка...' : submitText}
      </button>
    </div>
  );
}
