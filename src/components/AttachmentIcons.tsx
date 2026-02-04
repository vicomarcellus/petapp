import { Image as ImageIcon, FileText } from 'lucide-react';
import { getAttachmentUrl } from '../services/storage';
import type { Attachment } from '../types';

interface AttachmentIconsProps {
  attachments: Attachment[];
  size?: 'sm' | 'md';
}

export const AttachmentIcons = ({ attachments, size = 'sm' }: AttachmentIconsProps) => {
  if (attachments.length === 0) return null;

  const iconSize = size === 'sm' ? 14 : 18;
  const containerClass = size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <div className={`flex items-center ${containerClass}`}>
      {attachments.map((attachment) => {
        const fullUrl = getAttachmentUrl(attachment.file_url);
        
        return (
          <button
            key={attachment.id}
            onClick={(e) => {
              e.stopPropagation();
              window.open(fullUrl, '_blank');
            }}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title={attachment.file_name}
          >
            {attachment.file_type === 'image' ? (
              <ImageIcon size={iconSize} className="text-blue-600" />
            ) : (
              <FileText size={iconSize} className="text-red-600" />
            )}
          </button>
        );
      })}
    </div>
  );
};
