import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';

interface ScheduledEvent {
  id: string;
  type: 'state' | 'symptom' | 'medication' | 'feeding';
  data: any;
  targetTime: number;
  minutesLeft: number;
}

export const useScheduledEvents = () => {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [notification, setNotification] = useState<ScheduledEvent | null>(null);

  // Проверка событий каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const now = Date.now();
        const updated = prev.map(event => ({
          ...event,
          minutesLeft: Math.ceil((event.targetTime - now) / 60000)
        }));

        // Проверяем, есть ли события, время которых пришло
        const dueEvent = updated.find(e => e.minutesLeft <= 0 && !notification);
        if (dueEvent) {
          setNotification(dueEvent);
        }

        // Удаляем события с истекшим временем
        return updated.filter(e => e.minutesLeft > -5); // Даем 5 минут на реакцию
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
      minutesLeft: minutes
    }]);

    return id;
  }, []);

  const cancelEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const dismissNotification = useCallback(() => {
    if (notification) {
      setEvents(prev => prev.filter(e => e.id !== notification.id));
      setNotification(null);
    }
  }, [notification]);

  const NotificationModal = notification ? () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Bell size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-black mb-1">Время пришло!</h3>
            <p className="text-gray-600">
              {notification.type === 'medication' && `Дать лекарство: ${notification.data.medication_name} ${notification.data.dosage}`}
              {notification.type === 'feeding' && `Покормить: ${notification.data.food_name} ${notification.data.amount} ${notification.data.unit === 'g' ? 'г' : notification.data.unit === 'ml' ? 'мл' : ''}`}
              {notification.type === 'state' && `Записать состояние`}
              {notification.type === 'symptom' && `Проверить симптом: ${notification.data.symptom}`}
            </p>
          </div>
          <button 
            onClick={dismissNotification}
            className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        <button
          onClick={dismissNotification}
          className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
        >
          Понятно
        </button>
      </div>
    </div>
  ) : null;

  return {
    events,
    scheduleEvent,
    cancelEvent,
    NotificationModal,
    hasNotification: !!notification
  };
};
