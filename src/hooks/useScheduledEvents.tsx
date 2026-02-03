import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';

interface ScheduledEvent {
  id: string;
  type: 'state' | 'symptom' | 'medication' | 'feeding';
  data: any;
  targetTime: number;
  minutesLeft: number;
  secondsLeft: number;
}

export const useScheduledEvents = () => {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [notification, setNotification] = useState<ScheduledEvent | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeMinutes, setPostponeMinutes] = useState('');

  // Загрузка событий из localStorage при инициализации
  useEffect(() => {
    const saved = localStorage.getItem('scheduledEvents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEvents(parsed);
      } catch (error) {
        console.error('Error loading scheduled events:', error);
      }
    }
  }, []);

  // Сохранение событий в localStorage при изменении
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('scheduledEvents', JSON.stringify(events));
    } else {
      localStorage.removeItem('scheduledEvents');
    }
  }, [events]);

  // Проверка событий каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const now = Date.now();
        const updated = prev.map(event => {
          const diff = event.targetTime - now;
          return {
            ...event,
            minutesLeft: Math.floor(diff / 60000),
            secondsLeft: Math.floor((diff % 60000) / 1000)
          };
        });

        // Проверяем, есть ли события, время которых пришло
        const dueEvent = updated.find(e => e.minutesLeft <= 0 && e.secondsLeft <= 0 && !notification);
        if (dueEvent) {
          setNotification(dueEvent);
        }

        // Удаляем события с истекшим временем (даем 5 минут на реакцию)
        return updated.filter(e => e.minutesLeft > -5);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [notification]);

  const scheduleEvent = useCallback((type: ScheduledEvent['type'], data: any, minutes: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    const targetTime = Date.now() + minutes * 60000;
    
    setEvents(prev => [...prev, {
      id,
      type,
      data,
      targetTime,
      minutesLeft: minutes,
      secondsLeft: 0
    }]);

    return id;
  }, []);

  const cancelEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateEvent = useCallback((id: string, minutes: number) => {
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        const targetTime = Date.now() + minutes * 60000;
        return {
          ...e,
          targetTime,
          minutesLeft: minutes,
          secondsLeft: 0
        };
      }
      return e;
    }));
  }, []);

  const handlePostpone = useCallback(() => {
    if (notification && postponeMinutes) {
      const minutes = parseInt(postponeMinutes);
      if (minutes > 0) {
        updateEvent(notification.id, minutes);
        setNotification(null);
        setShowPostponeModal(false);
        setPostponeMinutes('');
      }
    }
  }, [notification, postponeMinutes, updateEvent]);

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
                {notification.type === 'state' && `Записать состояние`}
                {notification.type === 'symptom' && `Проверить симптом: ${notification.data.symptom}`}
              </p>
            </div>
            <button 
              onClick={() => {
                cancelEvent(notification.id);
                setNotification(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Событие "выполнено" будет обработано в EntryView
                const event = new CustomEvent('scheduledEventCompleted', { detail: notification });
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

  const formatTimeLeft = useCallback((minutesLeft: number, secondsLeft: number) => {
    if (minutesLeft < 0 || (minutesLeft === 0 && secondsLeft <= 0)) {
      return 'сейчас';
    }
    
    const hours = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;
    const secs = Math.max(0, secondsLeft);
    
    if (hours > 0) {
      return `${hours}ч ${mins}м ${secs}с`;
    } else if (mins > 0) {
      return `${mins}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  }, []);

  return {
    events,
    scheduleEvent,
    cancelEvent,
    updateEvent,
    formatTimeLeft,
    NotificationModal,
    hasNotification: !!notification
  };
};
