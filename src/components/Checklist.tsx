import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Clock, Check, Edit3 } from 'lucide-react';
import { formatDisplayDate } from '../utils';

export const Checklist = () => {
  const { setView, currentPetId, currentUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [timeAmount, setTimeAmount] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState<'medication' | 'feeding' | 'other'>('other');
  const [linkedItemId, setLinkedItemId] = useState<number | null>(null);

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

  // Обновляем текущее время каждые 2 секунды для таймеров (оптимизация производительности)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
    
    targetTime.setMinutes(targetTime.getMinutes() + amount);

    const today = now.toISOString().split('T')[0];
    const time = `${targetTime.getHours().toString().padStart(2, '0')}:${targetTime.getMinutes().toString().padStart(2, '0')}`;

    // Получаем данные связанного элемента
    let linkedName = '';
    let linkedAmount = '';
    
    if (taskType === 'medication' && linkedItemId) {
      const med = savedMedications?.find(m => m.id === linkedItemId);
      if (med) {
        linkedName = med.name;
        linkedAmount = med.default_dosage || '';
      }
    } else if (taskType === 'feeding' && linkedItemId) {
      const food = savedFoods?.find(f => f.id === linkedItemId);
      if (food) {
        linkedName = food.name;
        linkedAmount = food.default_amount ? `${food.default_amount} ${food.default_unit === 'g' ? 'г' : food.default_unit === 'ml' ? 'мл' : ''}`.trim() : '';
      }
    }

    if (editingTaskId) {
      // Обновляем существующую задачу
      await db.checklistTasks.update(editingTaskId, {
        task: taskText.trim(),
        time,
        timestamp: targetTime.getTime(),
        taskType,
        linkedItemId: linkedItemId || undefined,
        linkedItemName: linkedName || undefined,
        linkedItemAmount: linkedAmount || undefined,
      });
    } else {
      // Создаём новую задачу
      const newTask = {
        userId: currentUser.id,
        petId: currentPetId,
        date: today,
        time,
        timestamp: targetTime.getTime(),
        task: taskText.trim(),
        completed: false,
        taskType,
        linkedItemId: linkedItemId || undefined,
        linkedItemName: linkedName || undefined,
        linkedItemAmount: linkedAmount || undefined,
        created_at: Date.now(),
      };
      await db.checklistTasks.add(newTask);
    }

    setTaskText('');
    setTimeAmount('');
    setTaskType('other');
    setLinkedItemId(null);
    setEditingTaskId(null);
    setShowAddForm(false);
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskText(task.task);
    setTaskType(task.taskType || 'other');
    setLinkedItemId(task.linkedItemId || null);
    
    // Вычисляем разницу во времени в минутах
    const diff = task.timestamp - Date.now();
    const minutes = Math.floor(diff / 60000);
    setTimeAmount(Math.max(1, minutes).toString());
    
    setShowAddForm(true);
  };

  const handleToggleTask = async (id: number, completed: boolean, task?: any) => {
    // Если отмечаем как выполненную и это задача с лекарством/кормлением
    if (!completed && task && currentPetId && currentUser) {
      // Записываем в лог дня если задача связана с лекарством или кормлением
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const timestamp = now.getTime();
      
      if (task.taskType === 'medication' && task.linkedItemName) {
        // Создаем запись о приеме лекарства
        const medEntry = {
          userId: currentUser.id,
          petId: currentPetId,
          date: today,
          time: currentTime,
          timestamp,
          medication_name: task.linkedItemName,
          dosage: task.linkedItemAmount || '',
          color: savedMedications?.find(m => m.id === task.linkedItemId)?.color || '#3B82F6',
        };
        await db.medicationEntries.add(medEntry);
      } else if (task.taskType === 'feeding' && task.linkedItemName) {
        // Создаем запись о кормлении
        const food = savedFoods?.find(f => f.id === task.linkedItemId);
        const feedEntry = {
          userId: currentUser.id,
          petId: currentPetId,
          date: today,
          time: currentTime,
          timestamp,
          food_name: task.linkedItemName,
          amount: task.linkedItemAmount || '',
          unit: food?.default_unit || 'none',
          created_at: Date.now(),
        };
        await db.feedingEntries.add(feedEntry);
      }
    }

    // Обновляем статус задачи
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

  const handleAddTimeToAll = async (minutes: number) => {
    if (!tasks || tasks.length === 0) return;
    
    const now = Date.now();
    const addMilliseconds = minutes * 60 * 1000;
    
    for (const task of tasks) {
      if (!task.completed && task.id) {
        const newTimestamp = task.timestamp + addMilliseconds;
        
        // Не даём уйти в прошлое - минимум через 1 минуту от текущего времени
        const finalTimestamp = Math.max(newTimestamp, now + 60000);
        
        const newDate = new Date(finalTimestamp);
        const newTime = `${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}`;
        
        await db.checklistTasks.update(task.id, {
          timestamp: finalTimestamp,
          time: newTime,
        });
      }
    }
  };

  // Проверяем просроченные задачи
  const now = Date.now();

  // Сортируем задачи: невыполненные сначала, потом по времени
  const sortedTasks = tasks?.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.timestamp - b.timestamp;
  }) || [];

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

        {/* Быстрое добавление времени ко всем задачам */}
        {sortedTasks.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Изменить время всех задач
            </div>
            <div className="grid grid-cols-6 gap-2">
              <button
                onClick={() => handleAddTimeToAll(-10)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                -10м
              </button>
              <button
                onClick={() => handleAddTimeToAll(10)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                +10м
              </button>
              <button
                onClick={() => handleAddTimeToAll(-30)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                -30м
              </button>
              <button
                onClick={() => handleAddTimeToAll(30)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                +30м
              </button>
              <button
                onClick={() => handleAddTimeToAll(-60)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                -60м
              </button>
              <button
                onClick={() => handleAddTimeToAll(60)}
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all"
              >
                +60м
              </button>
            </div>
          </div>
        )}

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
                      onClick={() => handleToggleTask(task.id!, task.completed, task)}
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
                      {/* Показываем детали лекарства или еды */}
                      {task.linkedItemName && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {task.taskType === 'medication' && (
                            <>
                              <span className="text-xs">💊</span>
                              <span className="text-xs font-semibold text-gray-700">
                                {task.linkedItemName}
                              </span>
                              {task.linkedItemAmount && (
                                <span className="text-xs text-gray-500">
                                  • {task.linkedItemAmount}
                                </span>
                              )}
                            </>
                          )}
                          {task.taskType === 'feeding' && (
                            <>
                              <span className="text-xs">🍽️</span>
                              <span className="text-xs font-semibold text-gray-700">
                                {task.linkedItemName}
                              </span>
                              {task.linkedItemAmount && (
                                <span className="text-xs text-gray-500">
                                  • {task.linkedItemAmount}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
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
                  Тип задачи
                </label>
                <select
                  value={taskType}
                  onChange={(e) => {
                    setTaskType(e.target.value as 'medication' | 'feeding' | 'other');
                    setLinkedItemId(null);
                  }}
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
                >
                  <option value="other">Другое</option>
                  <option value="medication">💊 Лекарство</option>
                  <option value="feeding">🍽️ Кормление</option>
                </select>
              </div>

              {taskType === 'medication' && savedMedications && savedMedications.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Выберите лекарство
                  </label>
                  <select
                    value={linkedItemId || ''}
                    onChange={(e) => setLinkedItemId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="">Не выбрано</option>
                    {savedMedications.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name} {med.default_dosage ? `(${med.default_dosage})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {taskType === 'feeding' && savedFoods && savedFoods.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Выберите корм
                  </label>
                  <select
                    value={linkedItemId || ''}
                    onChange={(e) => setLinkedItemId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="">Не выбрано</option>
                    {savedFoods.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name} {food.default_amount ? `(${food.default_amount} ${food.default_unit === 'g' ? 'г' : food.default_unit === 'ml' ? 'мл' : ''})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Через сколько минут?
                </label>
                <input
                  type="number"
                  value={timeAmount}
                  onChange={(e) => setTimeAmount(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black placeholder-gray-400 outline-none"
                  required
                />
                <div className="grid grid-cols-6 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setTimeAmount(Math.max(1, parseInt(timeAmount || '0') - 10).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeAmount((parseInt(timeAmount || '0') + 10).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeAmount(Math.max(1, parseInt(timeAmount || '0') - 30).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    -30
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeAmount((parseInt(timeAmount || '0') + 30).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    +30
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeAmount(Math.max(1, parseInt(timeAmount || '0') - 60).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    -60
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeAmount((parseInt(timeAmount || '0') + 60).toString())}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    +60
                  </button>
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
                    setTaskType('other');
                    setLinkedItemId(null);
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
    </div>
  );
};
