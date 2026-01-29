import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { AlertCircle, X } from 'lucide-react';
import type { ChecklistTask } from '../types';

export const useTaskNotifications = () => {
  const { currentUser, currentPetId } = useStore();
  const [overdueTasks, setOverdueTasks] = useState<ChecklistTask[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!currentUser || !currentPetId) return;

    const checkOverdueTasks = async () => {
      try {
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('checklist_tasks')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .eq('date', today)
          .eq('completed', false)
          .lt('timestamp', now);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setOverdueTasks(data);
          setShowNotification(true);
        }
      } catch (error) {
        console.error('Error checking overdue tasks:', error);
      }
    };

    // Проверяем сразу
    checkOverdueTasks();

    // Проверяем каждую минуту
    const interval = setInterval(checkOverdueTasks, 60000);

    return () => clearInterval(interval);
  }, [currentUser, currentPetId]);

  const NotificationModal = showNotification && overdueTasks.length > 0 ? () => (
    <div className="fixed top-4 right-4 bg-white rounded-2xl shadow-2xl p-4 max-w-sm z-50 border-2 border-red-200">
      <div className="flex items-start gap-3">
        <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-bold text-red-600 mb-2">Просроченные задачи!</h3>
          <p className="text-sm text-gray-600 mb-2">
            У вас {overdueTasks.length} {overdueTasks.length === 1 ? 'просроченная задача' : 'просроченных задач'}
          </p>
          <div className="space-y-1">
            {overdueTasks.slice(0, 3).map(task => (
              <div key={task.id} className="text-xs text-gray-500">
                • {task.time} - {task.task}
              </div>
            ))}
            {overdueTasks.length > 3 && (
              <div className="text-xs text-gray-400">
                и еще {overdueTasks.length - 3}...
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={() => setShowNotification(false)}
          className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  ) : null;

  return { NotificationModal };
};
