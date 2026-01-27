import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Clock, Check, Bell, Edit3 } from 'lucide-react';
import { formatDisplayDate } from '../utils';

export const Checklist = () => {
  const { setView, currentPetId, currentUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [timeAmount, setTimeAmount] = useState('');
  const [timeUnit, setTimeUnit] = useState<'minutes' | 'hours'>('minutes');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [notificationTask, setNotificationTask] = useState<any>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const tasks = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      const today = new Date().toISOString().split('T')[0];
      return await db.checklistTasks
        .where('date').equals(today)
        .filter(t => t.petId === currentPetId && t.userId === currentUser.id)
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
  }, [tasks, currentTime]);

  // Функция форматирования времени до задачи
  const formatTimeRemaining = (timestamp: number) => {
    const diff = timestamp - currentTime;
    
    if (diff <= 0) {
      return 'Сейчас!';
    }

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `через ${days}д ${hours % 24}ч`;
    } else if (hours > 0) {
      return `через ${hours}ч ${minutes % 60}м`;
    } else if (minutes > 0) {
      return `через ${minutes}м`;
    } else {
      const seconds = Math.floor(diff / 1000);
      return `через ${seconds}с`;
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || !timeAmount || !currentPetId || !currentUser) return;

    const now = new Date();
    const amount = parseInt(timeAmount);
    const targetTime = new Date(now);
    
    if (timeUnit === 'minutes') {
      targetTime.setMinutes(targetTime.getMinutes() + amount);
    } else {
      targetTime.setHours(targetTime.getHours() + amount);
    }

    const today = now.toISOString().split('T')[0];
    const time = `${targetTime.getHours().toString().padStart(2, '0')}:${targetTime.getMinutes().toString().padStart(2, '0')}`;

    if (editingTaskId) {
      // Обновляем существующую задачу
      await db.checklistTasks.update(editingTaskId, {
        task: taskText.trim(),
        time,
        timestamp: targetTime.getTime(),
      });
    } else {
      // Создаём новую задачу
      await db.checklistTasks.add({
        userId: currentUser.id,
        petId: currentPetId,
        date: today,
        time,
        timestamp: targetTime.getTime(),
        task: taskText.trim(),
        completed: false,
        created_at: Date.now(),
      });
    }

    setTaskText('');
    setTimeAmount('');
    setEditingTaskId(null);
    setShowAddForm(false);
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskText(task.task);
    
    // Вычисляем разницу во времени
    const diff = task.timestamp - Date.now();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      setTimeAmount(Math.max(1, minutes).toString());
      setTimeUnit('minutes');
    } else {
      const hours = Math.floor(minutes / 60);
      setTimeAmount(hours.toString());
      setTimeUnit('hours');
    }
    
    setShowAddForm(true);
  };

  const handleToggleTask = async (id: number, completed: boolean) => {
    await db.checklistTasks.update(id, { completed: !completed });
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Удалить задачу?')) {
      await db.checklistTasks.delete(id);
    }
  };

  const handleBack = () => {
    setView('calendar');
  };

  // Сортируем задачи: невыполненные сначала, потом по времени
  const sortedTasks = tasks?.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.timestamp - b.timestamp;
  }) || [];

  const handleCloseNotification = async () => {
    if (notificationTask) {
      await handleToggleTask(notificationTask.id, notificationTask.completed);
    }
    setNotificationTask(null);
  };

  // Проверяем просроченные задачи
  const now = Date.now();

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-black" />
          </button>
          <h1 className="text-2xl font-bold flex-1 text-black">
            Чеклист на сегодня
          </h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Список задач */}
        <div className="space-y-2">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task) => {
              const isOverdue = !task.completed && task.timestamp < now;
              
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-4 transition-all group ${
                    task.completed ? 'opacity-60' : ''
                  } ${isOverdue ? 'border-2 border-red-200' : 'border border-gray-100'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Чекбокс */}
                    <button
                      onClick={() => handleToggleTask(task.id!, task.completed)}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {task.completed && <Check size={16} className="text-white" />}
                    </button>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        task.completed ? 'line-through text-gray-400' : 'text-black'
                      }`}>
                        {task.task}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                        <span className={`text-xs ${
                          isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'
                        }`}>
                          {task.time}
                        </span>
                        {!task.completed && (
                          <span className={`text-xs font-semibold ${
                            isOverdue ? 'text-red-500' : task.timestamp - now < 300000 ? 'text-orange-500' : 'text-blue-500'
                          }`}>
                            • {formatTimeRemaining(task.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id!)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Clock size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Нет задач на сегодня</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно добавления/редактирования задачи */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-black mb-4">
              {editingTaskId ? 'Редактировать задачу' : 'Добавить задачу'}
            </h2>
            
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Что нужно сделать?
                </label>
                <input
                  type="text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Например: Дать лекарство"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black placeholder-gray-400 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Через сколько?
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={timeAmount}
                    onChange={(e) => setTimeAmount(e.target.value)}
                    placeholder="30"
                    min="1"
                    className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black placeholder-gray-400 outline-none"
                    required
                  />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as 'minutes' | 'hours')}
                    className="px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="minutes">минут</option>
                    <option value="hours">часов</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!taskText.trim() || !timeAmount}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {editingTaskId ? 'Сохранить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setTaskText('');
                    setTimeAmount('');
                    setEditingTaskId(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-black rounded-full hover:bg-gray-200 transition-colors font-semibold"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка уведомления о задаче */}
      {notificationTask && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn">
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
                onClick={handleCloseNotification}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Выполнено
              </button>
              <button
                onClick={() => setNotificationTask(null)}
                className="px-6 py-3 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors font-semibold"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
