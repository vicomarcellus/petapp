import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Plus, Trash2, Pill, Utensils, Clock, Bell, Check, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';
import { ConfirmModal } from './Modal';
import { Input } from './ui/Input';
import { Modal, ModalActions } from './ui/Modal';
import { SingleFileUpload } from './ui/SingleFileUpload';
import { uploadAttachment, deleteAttachmentByUrl } from '../services/storage';
import type { MedicationEntry, FeedingEntry } from '../types';
import { useUnits } from '../hooks/useUnits';

interface ScheduledEvent {
  id: number;
  type: 'medication' | 'feeding' | 'task';
  date: string;
  time: string;
  timestamp: number;
  scheduled_time: number;
  completed: boolean;
  name: string;
  amount: string;
  task_type?: string; // Для задач из checklist
}

export const Scheduler = () => {
  const { currentUser, currentPetId } = useStore();
  const { medicationUnits, feedingUnits } = useUnits();
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: number; name: string } | null>(null);
  
  // Массовое удаление
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Saved medications and food tags
  const [savedMedications, setSavedMedications] = useState<Array<{ name: string; amount: string; unit: string }>>([]);
  const [savedFood, setSavedFood] = useState<Array<{ name: string; amount: string; unit: string }>>([]);

  // Form fields
  const [eventType, setEventType] = useState<'medication' | 'feeding'>('medication');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [medicationAmount, setMedicationAmount] = useState('');
  const [medicationUnit, setMedicationUnit] = useState<string>('мл');
  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<string>('g');
  const [schedulerFile, setSchedulerFile] = useState<File | null>(null);

  // Таймер для обновления
  const [, setTick] = useState(0);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadEvents();
      loadSavedMedicationsAndFood();

      // Подписка на изменения в таблицах
      const channel = supabase
        .channel('scheduler_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'medication_entries', filter: `pet_id=eq.${currentPetId}` },
          () => setTimeout(() => loadEvents(), 100)
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'feeding_entries', filter: `pet_id=eq.${currentPetId}` },
          () => setTimeout(() => loadEvents(), 100)
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'checklist_tasks', filter: `pet_id=eq.${currentPetId}` },
          () => setTimeout(() => loadEvents(), 100)
        )
        .subscribe();

      // Обновляем каждую секунду
      const interval = setInterval(() => {
        setTick(t => t + 1);
        checkNotifications();
      }, 1000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [currentUser, currentPetId]);

  const loadSavedMedicationsAndFood = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      // Load medication tags
      const { data: medTags } = await supabase
        .from('medication_tags')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId);

      if (medTags) {
        setSavedMedications(medTags.map(tag => ({
          name: tag.name,
          amount: tag.default_dosage_amount || '',
          unit: tag.default_dosage_unit || 'мл'
        })));
      }

      // Load food tags
      const { data: foodTags } = await supabase
        .from('food_tags')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId);

      if (foodTags) {
        setSavedFood(foodTags.map(tag => ({
          name: tag.name,
          amount: tag.default_amount || '',
          unit: tag.default_unit || 'g'
        })));
      }
    } catch (error) {
      console.error('Error loading saved medications and food:', error);
    }
  };

  const loadEvents = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      const [medRes, feedRes, taskRes] = await Promise.all([
        supabase
          .from('medication_entries')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .eq('is_scheduled', true)
          .gte('date', today)
          .order('scheduled_time', { ascending: true }),
        supabase
          .from('feeding_entries')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .eq('is_scheduled', true)
          .gte('date', today)
          .order('scheduled_time', { ascending: true }),
        supabase
          .from('checklist_tasks')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', today)
          .order('timestamp', { ascending: true })
      ]);

      const medEvents: ScheduledEvent[] = (medRes.data || []).map(m => ({
        id: m.id!,
        type: 'medication',
        date: m.date,
        time: m.time,
        timestamp: m.timestamp,
        scheduled_time: m.scheduled_time!,
        completed: m.completed || false,
        name: m.medication_name,
        amount: m.dosage_amount
          ? `${m.dosage_amount} ${m.dosage_unit || 'мл'}`
          : m.dosage || ''
      }));

      const feedEvents: ScheduledEvent[] = (feedRes.data || []).map(f => ({
        id: f.id!,
        type: 'feeding',
        date: f.date,
        time: f.time,
        timestamp: f.timestamp,
        scheduled_time: f.scheduled_time!,
        completed: f.completed || false,
        name: f.food_name,
        amount: f.amount 
          ? `${f.amount} ${f.unit === 'g' ? 'г' : f.unit === 'ml' ? 'мл' : ''}` 
          : ''
      }));

      const taskEvents: ScheduledEvent[] = (taskRes.data || []).map(t => ({
        id: t.id!,
        type: 'task',
        date: t.date,
        time: t.time,
        timestamp: t.timestamp,
        scheduled_time: t.timestamp, // Для задач используем timestamp как scheduled_time
        completed: t.completed || false,
        name: t.task,
        amount: '', // У задач нет количества
        task_type: t.task_type
      }));

      setEvents([...medEvents, ...feedEvents, ...taskEvents].sort((a, b) => a.scheduled_time - b.scheduled_time));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotifications = () => {
    const now = Date.now();
    events.forEach(event => {
      if (!event.completed && event.scheduled_time <= now && event.scheduled_time > now - 60000) {
        // Показываем уведомление если время пришло (в пределах последней минуты)
        showBrowserNotification(event);
      }
    });
  };

  const showBrowserNotification = (event: ScheduledEvent) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Напоминание', {
        body: `${event.type === 'medication' ? 'Дать лекарство' : event.type === 'feeding' ? 'Покормить' : 'Задача'}: ${event.name} ${event.amount}`,
        icon: '/favicon.ico',
        tag: `event-${event.id}` // Предотвращает дубликаты
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const openAddModal = (isNext = false) => {
    const now = new Date();
    
    if (isNext) {
      // Умное событие - анализируем интервал
      const recentEvents = events
        .filter(e => !e.completed && (e.type === 'medication' || e.type === 'feeding'))
        .sort((a, b) => b.scheduled_time - a.scheduled_time)
        .slice(0, 2);

      if (recentEvents.length >= 2) {
        const interval = recentEvents[0].scheduled_time - recentEvents[1].scheduled_time;
        const nextTime = new Date(recentEvents[0].scheduled_time + interval);
        
        setEventDate(nextTime.toISOString().split('T')[0]);
        setEventTime(`${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`);
        
        // Копируем данные последнего события
        const lastEvent = recentEvents[0];
        setEventType(lastEvent.type as 'medication' | 'feeding');
        if (lastEvent.type === 'medication') {
          setMedicationName(lastEvent.name);
          const match = lastEvent.amount.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
          if (match) {
            setMedicationAmount(match[1]);
            setMedicationUnit((match[2] || 'мл') as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
          }
        } else if (lastEvent.type === 'feeding') {
          setFoodName(lastEvent.name);
          const match = lastEvent.amount.match(/^(\d+)\s*(г|мл)?$/);
          if (match) {
            setFoodAmount(match[1]);
            setFoodUnit(match[2] === 'г' ? 'g' : match[2] === 'мл' ? 'ml' : 'none');
          }
        }
      } else {
        // Если недостаточно событий, просто добавляем 30 минут к текущему времени
        const nextTime = new Date(now.getTime() + 30 * 60000);
        setEventDate(nextTime.toISOString().split('T')[0]);
        setEventTime(`${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`);
      }
    } else {
      // Обычное событие - текущая дата и время
      setEventDate(now.toISOString().split('T')[0]);
      setEventTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
    
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!currentUser || !currentPetId || !eventDate || !eventTime) return;

    try {
      const scheduledTime = new Date(`${eventDate}T${eventTime}`).getTime();
      const timestamp = scheduledTime;

      let uploadResult = null;
      
      // Upload file if selected
      if (schedulerFile) {
        uploadResult = await uploadAttachment(
          schedulerFile,
          currentUser.id,
          currentPetId,
          'entry'
        );
      }

      if (editingEvent) {
        // Редактирование существующего события
        if (editingEvent.type === 'medication' && medicationName && medicationAmount) {
          // Get existing entry to check for old attachment
          const { data: existingEntry } = await supabase
            .from('medication_entries')
            .select('attachment_url')
            .eq('id', editingEvent.id)
            .single();

          // Delete old attachment if replacing
          if (uploadResult && existingEntry?.attachment_url) {
            await deleteAttachmentByUrl(existingEntry.attachment_url);
          }

          const updateData: any = {
            date: eventDate,
            time: eventTime,
            timestamp,
            medication_name: medicationName,
            dosage_amount: medicationAmount,
            dosage_unit: medicationUnit,
            scheduled_time: scheduledTime
          };

          if (uploadResult) {
            updateData.attachment_url = uploadResult.url;
            updateData.attachment_type = uploadResult.type;
            updateData.attachment_name = uploadResult.name;
          }

          await supabase.from('medication_entries').update(updateData).eq('id', editingEvent.id);
        } else if (editingEvent.type === 'feeding' && foodName) {
          // Get existing entry to check for old attachment
          const { data: existingEntry } = await supabase
            .from('feeding_entries')
            .select('attachment_url')
            .eq('id', editingEvent.id)
            .single();

          // Delete old attachment if replacing
          if (uploadResult && existingEntry?.attachment_url) {
            await deleteAttachmentByUrl(existingEntry.attachment_url);
          }

          const updateData: any = {
            date: eventDate,
            time: eventTime,
            timestamp,
            food_name: foodName,
            amount: foodAmount,
            unit: foodUnit,
            scheduled_time: scheduledTime
          };

          if (uploadResult) {
            updateData.attachment_url = uploadResult.url;
            updateData.attachment_type = uploadResult.type;
            updateData.attachment_name = uploadResult.name;
          }

          await supabase.from('feeding_entries').update(updateData).eq('id', editingEvent.id);
        }
      } else {
        // Создание нового события
        if (eventType === 'medication' && medicationName && medicationAmount) {
          const insertData: any = {
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: eventDate,
            time: eventTime,
            timestamp,
            medication_name: medicationName,
            dosage_amount: medicationAmount,
            dosage_unit: medicationUnit,
            color: '#8B5CF6',
            is_scheduled: true,
            completed: false,
            scheduled_time: scheduledTime
          };

          if (uploadResult) {
            insertData.attachment_url = uploadResult.url;
            insertData.attachment_type = uploadResult.type;
            insertData.attachment_name = uploadResult.name;
          }

          await supabase.from('medication_entries').insert(insertData);
        } else if (eventType === 'feeding' && foodName) {
          const insertData: any = {
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: eventDate,
            time: eventTime,
            timestamp,
            food_name: foodName,
            amount: foodAmount,
            unit: foodUnit,
            is_scheduled: true,
            completed: false,
            scheduled_time: scheduledTime
          };

          if (uploadResult) {
            insertData.attachment_url = uploadResult.url;
            insertData.attachment_type = uploadResult.type;
            insertData.attachment_name = uploadResult.name;
          }

          await supabase.from('feeding_entries').insert(insertData);
        }
      }

      // Reset form
      setShowAddModal(false);
      setEditingEvent(null);
      setEventDate('');
      setEventTime('');
      setMedicationName('');
      setMedicationAmount('');
      setMedicationUnit('мл');
      setFoodName('');
      setFoodAmount('');
      setFoodUnit('g');
      setSchedulerFile(null);
      
      // Небольшая задержка для обновления данных в базе
      setTimeout(() => loadEvents(), 100);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleCompleteEvent = async (event: ScheduledEvent) => {
    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const timeStr = `${new Date(now).getHours().toString().padStart(2, '0')}:${new Date(now).getMinutes().toString().padStart(2, '0')}`;

      if (event.type === 'medication') {
        // Создаем обычную запись в логе
        await supabase.from('medication_entries').insert({
          user_id: currentUser!.id,
          pet_id: currentPetId!,
          date: today,
          time: timeStr,
          timestamp: now,
          medication_name: event.name,
          dosage_amount: event.amount.match(/^([0-9.,]+)/)?.[1] || '',
          dosage_unit: event.amount.match(/([а-яa-z]+)$/i)?.[1] || 'мл',
          dosage: event.amount,
          color: '#8B5CF6'
        });
        
        // Удаляем запланированное событие
        await supabase.from('medication_entries').delete().eq('id', event.id);
        
      } else if (event.type === 'feeding') {
        // Создаем обычную запись в логе
        await supabase.from('feeding_entries').insert({
          user_id: currentUser!.id,
          pet_id: currentPetId!,
          date: today,
          time: timeStr,
          timestamp: now,
          food_name: event.name,
          amount: event.amount.match(/^([0-9.,]+)/)?.[1] || event.amount,
          unit: event.amount.includes('г') ? 'g' : event.amount.includes('мл') ? 'ml' : 'none'
        });
        
        // Удаляем запланированное событие
        await supabase.from('feeding_entries').delete().eq('id', event.id);
        
      } else if (event.type === 'task') {
        // Для задач просто помечаем выполненными
        await supabase.from('checklist_tasks').update({
          completed: true
        }).eq('id', event.id);
      }

      loadEvents();
    } catch (error) {
      console.error('Error completing event:', error);
    }
  };

  const handleDeleteEvent = async (event: ScheduledEvent) => {
    try {
      if (event.type === 'medication') {
        await supabase.from('medication_entries').delete().eq('id', event.id);
      } else if (event.type === 'feeding') {
        await supabase.from('feeding_entries').delete().eq('id', event.id);
      } else if (event.type === 'task') {
        await supabase.from('checklist_tasks').delete().eq('id', event.id);
      }
      loadEvents();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const toggleEventSelection = (event: ScheduledEvent) => {
    const key = `${event.type}-${event.id}`;
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedEvents(newSelected);
  };

  const selectAllEvents = (eventList: ScheduledEvent[]) => {
    const newSelected = new Set(selectedEvents);
    eventList.forEach(event => {
      newSelected.add(`${event.type}-${event.id}`);
    });
    setSelectedEvents(newSelected);
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  const deleteSelected = async () => {
    if (selectedEvents.size === 0) return;
    
    try {
      const toDelete = {
        medications: [] as number[],
        feedings: [] as number[],
        tasks: [] as number[]
      };

      selectedEvents.forEach(key => {
        const [type, id] = key.split('-');
        const numId = parseInt(id);
        if (type === 'medication') toDelete.medications.push(numId);
        else if (type === 'feeding') toDelete.feedings.push(numId);
        else if (type === 'task') toDelete.tasks.push(numId);
      });

      await Promise.all([
        toDelete.medications.length > 0 && supabase.from('medication_entries').delete().in('id', toDelete.medications),
        toDelete.feedings.length > 0 && supabase.from('feeding_entries').delete().in('id', toDelete.feedings),
        toDelete.tasks.length > 0 && supabase.from('checklist_tasks').delete().in('id', toDelete.tasks)
      ]);

      setSelectedEvents(new Set());
      setIsSelectionMode(false);
      loadEvents();
    } catch (error) {
      console.error('Error deleting selected events:', error);
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.name.trim()) return;
    
    try {
      await supabase.from('checklist_tasks')
        .update({ task: editingTask.name.trim() })
        .eq('id', editingTask.id);
      
      setEditingTask(null);
      loadEvents();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const clearCompletedEvents = async () => {
    if (completedEvents.length === 0) return;
    
    try {
      // Удаляем только выполненные задачи (лекарства и питание уже удалены при выполнении)
      const tasksToDelete = completedEvents
        .filter(e => e.type === 'task')
        .map(e => e.id);

      if (tasksToDelete.length > 0) {
        await supabase.from('checklist_tasks').delete().in('id', tasksToDelete);
      }

      loadEvents();
    } catch (error) {
      console.error('Error clearing completed events:', error);
    }
  };

  const handleEditEvent = (event: ScheduledEvent) => {
    // Задачи из checklist_tasks редактируем через отдельную модалку
    if (event.type === 'task') {
      setEditingTask({ id: event.id, name: event.name });
      return;
    }
    
    setEditingEvent(event);
    setEventType(event.type);
    setEventDate(event.date);
    setEventTime(event.time);

    if (event.type === 'medication') {
      setMedicationName(event.name);
      // Парсим amount на число и единицу
      const match = event.amount.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
      if (match) {
        setMedicationAmount(match[1]);
        setMedicationUnit((match[2] || 'мл') as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
      } else {
        setMedicationAmount(event.amount);
        setMedicationUnit('мл');
      }
    } else {
      setFoodName(event.name);
      // Парсим amount на число (с запятой или точкой) и единицу
      const match = event.amount.match(/^([0-9.,]+)\s*(г|мл)?$/);
      if (match) {
        setFoodAmount(match[1]);
        setFoodUnit(match[2] === 'г' ? 'g' : match[2] === 'мл' ? 'ml' : 'none');
      } else {
        setFoodAmount('');
        setFoodUnit('g');
      }
    }

    setShowAddModal(true);
  };

  const formatTimeLeft = (scheduledTime: number) => {
    const diff = scheduledTime - Date.now();
    if (diff <= 0) return 'сейчас';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  };

  const isOverdue = (event: ScheduledEvent) => {
    return !event.completed && event.scheduled_time < Date.now();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  }

  const upcomingEvents = events.filter(e => !e.completed && e.scheduled_time >= Date.now());
  const overdueEvents = events.filter(e => isOverdue(e));
  const completedEvents = events.filter(e => e.completed);

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Планировщик</h2>
        <div className="flex items-center gap-2">
          {!isSelectionMode ? (
            <>
              <button
                onClick={() => setIsSelectionMode(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
              >
                Выбрать
              </button>
              <button
                onClick={() => openAddModal(false)}
                className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Plus size={20} />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-600">
                Выбрано: {selectedEvents.size}
              </span>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
              >
                Снять все
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedEvents.size === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить ({selectedEvents.size})
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedEvents(new Set());
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
              >
                Отмена
              </button>
            </>
          )}
        </div>
      </div>

      {/* Просроченные */}
      {overdueEvents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <Bell size={16} />
            Просрочено ({overdueEvents.length})
          </h3>
          <div className="space-y-2">
            {overdueEvents.map(event => (
              <div key={`${event.type}-${event.id}`} className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'medication' ? 'bg-purple-100' : 
                    event.type === 'feeding' ? 'bg-green-100' : 
                    'bg-blue-100'
                  }`}>
                    {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : 
                     event.type === 'feeding' ? <Utensils className="text-green-600" size={20} /> :
                     <Clock className="text-blue-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{event.name}</div>
                    <div className="text-xs text-gray-600">{event.amount}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {new Date(event.scheduled_time).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteEvent(event)}
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(event.id)}
                    className="p-2 hover:bg-red-100 rounded-full text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Предстоящие */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Clock size={16} />
              Предстоящие ({upcomingEvents.length})
            </h3>
            {isSelectionMode && (
              <button
                onClick={() => selectAllEvents(upcomingEvents)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Выбрать все
              </button>
            )}
          </div>
          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const dateObj = new Date(event.scheduled_time);
              const dayStr = dateObj.toLocaleString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
              const timeStr = dateObj.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              const isSelected = selectedEvents.has(`${event.type}-${event.id}`);
              
              return (
                <div 
                  key={`${event.type}-${event.id}`} 
                  onClick={() => isSelectionMode && toggleEventSelection(event)}
                  className={`py-3 px-6 rounded-xl backdrop-blur-sm transition-all duration-200 ${
                    isSelectionMode ? 'cursor-pointer hover:scale-[1.02]' : ''
                  } ${
                    isSelected 
                      ? 'bg-blue-100 border-2 border-blue-500' 
                      : 'bg-white/50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Дата и время */}
                    <div className="flex flex-col items-start w-20 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-500">{dayStr}</span>
                      <span className="text-sm font-bold text-gray-800">{timeStr}</span>
                    </div>

                    {/* Иконка */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.type === 'medication' ? 'bg-purple-100' : 
                      event.type === 'feeding' ? 'bg-green-100' : 
                      'bg-blue-100'
                    }`}>
                      {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : 
                       event.type === 'feeding' ? <Utensils className="text-green-600" size={20} /> :
                       <Clock className="text-blue-600" size={20} />}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-black">
                          {event.type === 'medication' ? 'Лекарство' : 
                           event.type === 'feeding' ? 'Питание' : 
                           'Задача'}: {event.name}
                          {event.amount ? ` • ${event.amount}` : ''}
                        </span>
                        <span className="text-xs text-gray-400">
                          через {formatTimeLeft(event.scheduled_time)}
                        </span>
                      </div>
                    </div>

                    {/* Действия */}
                    {!isSelectionMode && (
                      <>
                        <button
                          onClick={() => handleCompleteEvent(event)}
                          className="p-2 hover:bg-green-100 rounded-full transition-colors text-green-600 flex-shrink-0"
                          title="Выполнено"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(event.id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    
                    {/* Индикатор выделения */}
                    {isSelectionMode && isSelected && (
                      <div className="flex-shrink-0">
                        <Check size={20} className="text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Кнопка "Следующее событие" */}
            {!isSelectionMode && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => openAddModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 text-sm font-medium"
                >
                  Следующее событие
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Выполненные */}
      {completedEvents.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Check size={16} />
              Выполнено ({completedEvents.length})
            </h3>
            <button
              onClick={clearCompletedEvents}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 size={14} />
              Очистить все
            </button>
          </div>
          <div className="space-y-2">
            {completedEvents.map(event => {
              const dateObj = new Date(event.timestamp || event.scheduled_time); // Использовать timestamp выполнения если есть
              const timeStr = dateObj.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={`${event.type}-${event.id}`} className="py-3 px-6 rounded-xl bg-white/50 backdrop-blur-sm opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">{timeStr}</div>

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.type === 'medication' ? 'bg-purple-100' : 
                      event.type === 'feeding' ? 'bg-green-100' : 
                      'bg-blue-100'
                    }`}>
                      {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : 
                       event.type === 'feeding' ? <Utensils className="text-green-600" size={20} /> :
                       <Clock className="text-blue-600" size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-black line-through">
                        {event.type === 'medication' ? 'Лекарство' : 
                         event.type === 'feeding' ? 'Питание' : 
                         'Задача'}: {event.name}
                        {event.amount ? ` • ${event.amount}` : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteConfirm(event.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Нет запланированных событий
        </div>
      )}

      {/* Add/Edit Event Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingEvent(null);
          setEventDate('');
          setEventTime('');
          setMedicationName('');
          setMedicationAmount('');
          setMedicationUnit('мл');
          setFoodName('');
          setFoodAmount('');
          setFoodUnit('g');
          setSchedulerFile(null);
        }}
        title={editingEvent
          ? (eventType === 'medication' ? 'Редактировать лекарство' : 'Редактировать питание')
          : 'Запланировать событие'}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Type selector - hide when editing */}
          {!editingEvent && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Тип</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEventType('medication')}
                  className={`py-3 px-4 rounded-2xl font-medium transition-all ${eventType === 'medication'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                >
                  <Pill size={20} className="mx-auto mb-1" />
                  Лекарство
                </button>
                <button
                  onClick={() => setEventType('feeding')}
                  className={`py-3 px-4 rounded-2xl font-medium transition-all ${eventType === 'feeding'
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                >
                  <Utensils size={20} className="mx-auto mb-1" />
                  Питание
                </button>
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Дата"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker()}
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Время"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          {/* Medication fields */}
          {eventType === 'medication' && (
            <>
              <div>
                <Input
                  label="Название лекарства"
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="Преднизолон"
                />
                {savedMedications.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {savedMedications.map((med, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setMedicationName(med.name);
                          setMedicationAmount(med.amount);
                          setMedicationUnit(med.unit);
                        }}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
                      >
                        {med.name}{med.amount ? ` ${med.amount} ${med.unit}` : ''}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Нет сохраненных лекарств. Добавьте в Настройках.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Количество"
                  type="text"
                  value={medicationAmount}
                  onChange={(e) => setMedicationAmount(e.target.value.replace('.', ','))}
                  placeholder="0,3"
                />
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Единица</label>
                  <select
                    value={medicationUnit}
                    onChange={(e) => setMedicationUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 appearance-none cursor-pointer"
                  >
                    {medicationUnits.map(unit => (
                      <option key={unit.code} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Feeding fields */}
          {eventType === 'feeding' && (
            <>
              <div>
                <Input
                  label="Название корма"
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Корм"
                />
                {savedFood.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {savedFood.map((food, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setFoodName(food.name);
                          setFoodAmount(food.amount);
                          setFoodUnit(food.unit);
                        }}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        {food.name}{food.amount ? ` ${food.amount} ${food.unit === 'g' ? 'г' : food.unit === 'ml' ? 'мл' : ''}` : ''}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Нет сохраненной еды. Добавьте в Настройках.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Количество"
                  type="text"
                  value={foodAmount}
                  onChange={(e) => setFoodAmount(e.target.value.replace('.', ','))}
                  placeholder="50"
                />
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Единица</label>
                  <select
                    value={foodUnit}
                    onChange={(e) => setFoodUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 appearance-none cursor-pointer"
                  >
                    {feedingUnits.map(unit => (
                      <option key={unit.code} value={unit.code}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* File Upload */}
          <SingleFileUpload
            onFileSelect={(file) => setSchedulerFile(file)}
            currentAttachment={null}
            onRemove={() => setSchedulerFile(null)}
          />
        </div>

        <ModalActions
          onCancel={() => {
            setShowAddModal(false);
            setEditingEvent(null);
            setSchedulerFile(null);
          }}
          onSubmit={handleAddEvent}
          cancelText="Отмена"
          submitText={editingEvent ? 'Сохранить' : 'Запланировать'}
          submitDisabled={
            !eventDate ||
            !eventTime ||
            (eventType === 'medication' && (!medicationName || !medicationAmount)) ||
            (eventType === 'feeding' && !foodName)
          }
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Удалить событие?"
        message="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={() => {
          const event = events.find(e => e.id === deleteConfirm);
          if (event) handleDeleteEvent(event);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Edit Task Modal */}
      <Modal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title="Редактировать задачу"
        maxWidth="lg"
      >
        <div className="space-y-5">
          <Input
            label="Название задачи"
            type="text"
            value={editingTask?.name || ''}
            onChange={(e) => setEditingTask(editingTask ? { ...editingTask, name: e.target.value } : null)}
            placeholder="Например: Дать воду 1 мл"
          />
        </div>

        <ModalActions
          onCancel={() => setEditingTask(null)}
          onSubmit={handleSaveTask}
          cancelText="Отмена"
          submitText="Сохранить"
          submitDisabled={!editingTask?.name.trim()}
        />
      </Modal>
    </div>
  );
};
