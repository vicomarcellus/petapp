import { useEffect, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const AnimatedModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md',
  showCloseButton = true 
}: AnimatedModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isAnimating ? 'bg-opacity-50 backdrop-blur-sm' : 'bg-opacity-0'
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-white border border-white/60 rounded-[32px] p-6 ${maxWidthClasses[maxWidth]} w-full shadow-2xl transition-all duration-300 ${
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
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && <h3 className="text-xl font-bold">{title}</h3>}
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 ml-auto"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
