import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Header } from './Header';
import { Plus, Check, Trash2 } from 'lucide-react';
import type { ChecklistTask } from '../types';

export const Checklist = () => {
  const { currentUser, currentPetId } = useStore();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [loading, setLoading] = useState(true);

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
        task_type: 'other'
      });
      
      setShowAdd(false);
      setTaskText('');
      setTaskTime('');
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
    if (!confirm('Удалить задачу?')) return;
    
    try {
      await supabase.from('checklist_tasks').delete().eq('id', id);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
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
            <button onClick={() => setShowAdd(true)} className="p-2 hover:bg-gray-100 rounded-full">
              <Plus size={20} />
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет задач</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <button onClick={() => handleToggleTask(task)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                    {task.completed && <Check size={14} className="text-white" />}
                  </button>
                  <div className="text-sm font-medium text-gray-600 w-16">{task.time}</div>
                  <div className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-black'}`}>{task.task}</div>
                  <button onClick={() => handleDeleteTask(task.id!)} className="p-2 hover:bg-red-100 rounded-full text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Новая задача</h3>
              <div className="space-y-4">
                <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Описание задачи" className="w-full px-4 py-2 border rounded-lg" />
                <div className="flex gap-2">
                  <button onClick={handleAddTask} disabled={!taskText || !taskTime} className="flex-1 py-2 bg-black text-white rounded-full disabled:opacity-50">Добавить</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 rounded-full">Отмена</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
