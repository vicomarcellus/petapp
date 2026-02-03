import { useState, useEffect } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';

interface NotificationData {
  id: number;
  type: 'medication' | 'feeding';
  data: any;
}

export const useScheduledNotifications = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeMinutes, setPostponeMinutes] = useState('');

  const showNotification = (id: number, type: 'medication' | 'feeding', data: any) => {
    setNotification({ id, type, data });
  };

  const handlePostpone = () => {
    if (notification && postponeMinutes) {
      const minutes = parseInt(postponeMinutes);
      if (minutes > 0) {
        // Отправляем событие для обновления времени
        const event = new CustomEvent('postponeScheduledEvent', { 
          detail: { id: notification.id, type: notification.type, minutes } 
        });
        window.dispatchEvent(event);
        
        setNotification(null);
        setShowPostponeModal(false);
        setPostponeMinutes('');
      }
    }
  };

  const NotificationModal = notification ? () => (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bell size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-black mb-1">Время пришло!</h3>
              <p className="text-gray-600">
                {notification.type === 'medication' && `Дать лекарство: ${notification.data.medication_name} ${notification.data.dosage_amount ? `${notification.data.dosage_amount} ${notification.data.dosage_unit || ''}`.trim() : notification.data.dosage || ''}`}
                {notification.type === 'feeding' && `Покормить: ${notification.data.food_name} ${notification.data.amount} ${notification.data.unit === 'g' ? 'г' : notification.data.unit === 'ml' ? 'мл' : ''}`}
              </p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Событие "выполнено"
                const event = new CustomEvent('completeScheduledEvent', { 
                  detail: { id: notification.id, type: notification.type } 
                });
                window.dispatchEvent(event);
                setNotification(null);
              }}
              className="flex-1 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Выполнено
            </button>
            <button
              onClick={() => setShowPostponeModal(true)}
              className="flex-1 py-3 bg-gray-200 text-black rounded-full font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <Clock size={18} />
              Позже
            </button>
          </div>
        </div>
      </div>

      {/* Модалка "Позже" */}
      {showPostponeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Отложить на сколько?</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Через сколько минут</label>
                <input 
                  type="number" 
                  value={postponeMinutes} 
                  onChange={(e) => setPostponeMinutes(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Например: 15"
                  min="1"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePostpone}
                  disabled={!postponeMinutes}
                  className="flex-1 py-2 bg-black text-white rounded-full disabled:opacity-50"
                >
                  Отложить
                </button>
                <button 
                  onClick={() => {
                    setShowPostponeModal(false);
                    setPostponeMinutes('');
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-full"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ) : null;

  return {
    showNotification,
    NotificationModal
  };
};
