import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Clock, Check } from 'lucide-react';
import { formatDisplayDate } from '../utils';

export const Checklist = () => {
  const { setView, currentPetId, currentUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [timeAmount, setTimeAmount] = useState('');
  const [timeUnit, setTimeUnit] = useState<'minutes' | 'hours'>('minutes');

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

    setTaskText('');
    setTimeAmount('');
    setShowAddForm(false);
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
                  className={`bg-white rounded-2xl p-4 transition-all ${
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
                          {isOverdue && ' (просрочено)'}
                        </span>
                      </div>
                    </div>

                    {/* Кнопка удаления */}
                    <button
                      onClick={() => handleDeleteTask(task.id!)}
                      className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                    >
                      <X size={16} />
                    </button>
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

      {/* Модальное окно добавления задачи */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-black mb-4">Добавить задачу</h2>
            
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
                    className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none"
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
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setTaskText('');
                    setTimeAmount('');
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
