import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Bell, Check } from 'lucide-react';

export const useTaskNotifications = () => {
  const { currentPetId, currentUser } = useStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [notificationTask, setNotificationTask] = useState<any>(null);

  const tasks = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      const today = new Date().toISOString().split('T')[0];
      return await db.checklistTasks
        .where('date').equals(today)
        .filter(t => t.petId === currentPetId && t.userId === currentUser.id && !t.completed)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  const savedMedications = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      return await db.medications
        .where('petId').equals(currentPetId)
        .filter(m => m.userId === currentUser.id)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  const savedFoods = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      return await db.foodTags
        .where('petId').equals(currentPetId)
        .filter(f => f.userId === currentUser.id)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  // Обновляем текущее время каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Проверяем задачи на срабатывание уведомлений
  useEffect(() => {
    if (!tasks) return;

    const now = Date.now();
    const dueTask = tasks.find(task => 
      !task.completed && 
      task.timestamp <= now && 
      task.timestamp > now - 60000 // В течение последней минуты
    );

    if (dueTask && (!notificationTask || notificationTask.id !== dueTask.id)) {
      setNotificationTask(dueTask);
    }
  }, [tasks, currentTime, notificationTask]);

  const handleCompleteTask = async () => {
    if (notificationTask && currentPetId && currentUser) {
      // Отмечаем задачу как выполненную
      await db.checklistTasks.update(notificationTask.id, { completed: true });
      
      // Записываем в лог дня если задача связана с лекарством или кормлением
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const timestamp = now.getTime();
      
      if (notificationTask.taskType === 'medication' && notificationTask.linkedItemName) {
        // Создаем запись о приеме лекарства
        const medEntry = {
          userId: currentUser.id,
          petId: currentPetId,
          date: today,
          time: currentTime,
          timestamp,
          medication_name: notificationTask.linkedItemName,
          dosage: notificationTask.linkedItemAmount || '',
          color: savedMedications?.find(m => m.id === notificationTask.linkedItemId)?.color || '#3B82F6',
        };
        await db.medicationEntries.add(medEntry);
      } else if (notificationTask.taskType === 'feeding' && notificationTask.linkedItemName) {
        // Создаем запись о кормлении
        const food = savedFoods?.find(f => f.id === notificationTask.linkedItemId);
        const feedEntry = {
          userId: currentUser.id,
          petId: currentPetId,
          date: today,
          time: currentTime,
          timestamp,
          food_name: notificationTask.linkedItemName,
          amount: notificationTask.linkedItemAmount || '',
          unit: food?.default_unit || 'none',
          created_at: Date.now(),
        };
        await db.feedingEntries.add(feedEntry);
      }
    }
    setNotificationTask(null);
  };

  const handleDismissTask = () => {
    setNotificationTask(null);
  };

  // Компонент модалки уведомления
  const NotificationModal = notificationTask ? (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center animate-bounce">
            <Bell size={32} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-black mb-2">
          Время пришло!
        </h2>
        
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-lg font-semibold text-center text-gray-900">
            {notificationTask.task}
          </p>
          <p className="text-sm text-center text-gray-500 mt-1">
            Запланировано на {notificationTask.time}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCompleteTask}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Выполнено
          </button>
          <button
            onClick={handleDismissTask}
            className="px-6 py-3 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors font-semibold"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { NotificationModal };
};
