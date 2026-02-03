import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Header } from './Header';
import { Plus, Check, Trash2, Pill, UtensilsCrossed, AlertCircle, Clock } from 'lucide-react';
import { ConfirmModal } from './Modal';
import { Input } from './ui/Input';
import { Modal, ModalActions } from './ui/Modal';
import type { ChecklistTask } from '../types';
import { useTaskNotifications } from '../hooks/useTaskNotifications';

export const Checklist = () => {
  const { currentUser, currentPetId } = useStore();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskType, setTaskType] = useState<'medication' | 'feeding' | 'other'>('other');
  const [linkedItemName, setLinkedItemName] = useState('');
  const [linkedItemAmount, setLinkedItemAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const { NotificationModal } = useTaskNotifications();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadTasks();
      
      const channel = supabase
        .channel('checklist_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'checklist_tasks', filter: `pet_id=eq.${currentPetId}` },
          () => loadTasks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, currentPetId]);

  const loadTasks = async () => {
    if (!currentUser || !currentPetId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .gte('date', today)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!currentUser || !currentPetId || !taskText || !taskTime) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date(`${today}T${taskTime}`).getTime();
      
      await supabase.from('checklist_tasks').insert({
        user_id: currentUser.id,
        pet_id: currentPetId,
        date: today,
        time: taskTime,
        timestamp,
        task: taskText,
        completed: false,
        task_type: taskType,
        linked_item_name: linkedItemName || null,
        linked_item_amount: linkedItemAmount || null
      });
      
      setShowAdd(false);
      setTaskText('');
      setTaskTime('');
      setTaskType('other');
      setLinkedItemName('');
      setLinkedItemAmount('');
      loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleTask = async (task: ChecklistTask) => {
    try {
      await supabase
        .from('checklist_tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id);
      
      loadTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await supabase.from('checklist_tasks').delete().eq('id', id);
      loadTasks();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getTaskIcon = (taskType?: string) => {
    switch (taskType) {
      case 'medication':
        return <Pill size={16} className="text-blue-600" />;
      case 'feeding':
        return <UtensilsCrossed size={16} className="text-green-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const isOverdue = (task: ChecklistTask) => {
    if (task.completed) return false;
    return task.timestamp < Date.now();
  };

  const groupedTasks = {
    overdue: tasks.filter(t => isOverdue(t)),
    upcoming: tasks.filter(t => !isOverdue(t) && !t.completed),
    completed: tasks.filter(t => t.completed)
  };

  const renderTaskGroup = (title: string, taskList: ChecklistTask[], showIcon?: boolean) => {
    if (taskList.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {showIcon && <AlertCircle size={18} className="text-red-500" />}
          <h3 className="text-sm font-semibold text-gray-600 uppercase">{title}</h3>
          <span className="text-xs text-gray-400">({taskList.length})</span>
        </div>
        <div className="space-y-2">
          {taskList.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center gap-3 p-3 rounded-xl ${
                task.completed ? 'bg-green-50' : 
                isOverdue(task) ? 'bg-red-50 border border-red-200' : 
                'bg-gray-50'
              }`}
            >
              <button 
                onClick={() => handleToggleTask(task)} 
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.completed ? 'bg-green-500 border-green-500' : 
                  isOverdue(task) ? 'border-red-400' : 
                  'border-gray-300'
                }`}
              >
                {task.completed && <Check size={14} className="text-white" />}
              </button>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {getTaskIcon(task.task_type)}
                <div className={`text-sm font-medium w-14 ${
                  isOverdue(task) && !task.completed ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {task.time}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`${task.completed ? 'line-through text-gray-400' : 'text-black'}`}>
                  {task.task}
                </div>
                {task.linked_item_name && (
                  <div className="text-xs text-gray-500 mt-1">
                    {task.linked_item_name}
                    {task.linked_item_amount && ` • ${task.linked_item_amount}`}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setDeleteConfirm(task.id!)} 
                className="p-2 hover:bg-red-100 rounded-full text-red-600 flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4">
        <div className="max-w-5xl mx-auto">
          <Header />
          <div className="text-center py-8 text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Чеклист задач</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSchedule(true)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"
              >
                Запланировать
              </button>
              <button 
                onClick={() => setShowAdd(true)} 
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет задач</p>
          ) : (
            <>
              {renderTaskGroup('Просрочено', groupedTasks.overdue, true)}
              {renderTaskGroup('Предстоящие', groupedTasks.upcoming)}
              {renderTaskGroup('Выполнено', groupedTasks.completed)}
            </>
          )}
        </div>

        {/* Add Task Modal */}
        <Modal 
          isOpen={showAdd} 
          onClose={() => setShowAdd(false)} 
          title="Новая задача"
          maxWidth="lg"
        >
          <div className="space-y-5">
            <Input
              label="Время"
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
            />
            <Input
              label="Описание задачи"
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Описание задачи"
            />
          </div>

          <ModalActions
            onCancel={() => setShowAdd(false)}
            onSubmit={handleAddTask}
            cancelText="Отмена"
            submitText="Добавить"
            submitDisabled={!taskText || !taskTime}
          />
        </Modal>

        {/* Schedule Task Modal */}
        <Modal 
          isOpen={showSchedule} 
          onClose={() => {
            setShowSchedule(false);
            setTaskText('');
            setTaskTime('');
            setTaskType('other');
            setLinkedItemName('');
            setLinkedItemAmount('');
          }} 
          title="Запланировать задачу"
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Тип задачи</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTaskType('medication')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    taskType === 'medication' 
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' 
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  <Pill size={16} className="mx-auto mb-1" />
                  Лекарство
                </button>
                <button
                  onClick={() => setTaskType('feeding')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    taskType === 'feeding' 
                      ? 'bg-green-100 text-green-700 border-2 border-green-500' 
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  <UtensilsCrossed size={16} className="mx-auto mb-1" />
                  Питание
                </button>
                <button
                  onClick={() => setTaskType('other')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    taskType === 'other' 
                      ? 'bg-gray-200 text-gray-700 border-2 border-gray-500' 
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  <Clock size={16} className="mx-auto mb-1" />
                  Другое
                </button>
              </div>
            </div>

            <Input
              label="Время"
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
            />

            <Input
              label="Описание"
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder={
                taskType === 'medication' ? 'Дать лекарство' :
                taskType === 'feeding' ? 'Покормить' :
                'Описание задачи'
              }
            />

            {(taskType === 'medication' || taskType === 'feeding') && (
              <>
                <Input
                  label={taskType === 'medication' ? 'Название лекарства' : 'Название корма'}
                  type="text"
                  value={linkedItemName}
                  onChange={(e) => setLinkedItemName(e.target.value)}
                  placeholder={taskType === 'medication' ? 'Преднизолон' : 'Корм'}
                />
                <Input
                  label={taskType === 'medication' ? 'Дозировка' : 'Количество'}
                  type="text"
                  value={linkedItemAmount}
                  onChange={(e) => setLinkedItemAmount(e.target.value)}
                  placeholder={taskType === 'medication' ? '0,3 мл' : '50 г'}
                />
              </>
            )}
          </div>

          <ModalActions
            onCancel={() => {
              setShowSchedule(false);
              setTaskText('');
              setTaskTime('');
              setTaskType('other');
              setLinkedItemName('');
              setLinkedItemAmount('');
            }}
            onSubmit={handleAddTask}
            cancelText="Отмена"
            submitText="Запланировать"
            submitDisabled={!taskText || !taskTime}
          />
        </Modal>

        {NotificationModal && <NotificationModal />}

        <ConfirmModal
          isOpen={deleteConfirm !== null}
          title="Удалить задачу?"
          message="Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          danger={true}
          onConfirm={() => deleteConfirm !== null && handleDeleteTask(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      </div>
    </div>
  );
};
