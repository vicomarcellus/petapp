import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Plus, Trash2, Pill, Utensils, Clock, Bell, Check, Calendar as CalendarIcon } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';
import { ConfirmModal } from './Modal';
import type { MedicationEntry, FeedingEntry } from '../types';

interface ScheduledEvent {
  id: number;
  type: 'medication' | 'feeding';
  date: string;
  time: string;
  timestamp: number;
  scheduled_time: number;
  completed: boolean;
  name: string;
  amount: string;
}

export const Scheduler = () => {
  const { currentUser, currentPetId } = useStore();
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form fields
  const [eventType, setEventType] = useState<'medication' | 'feeding'>('medication');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState('');
  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<'g' | 'ml' | 'none'>('g');

  // Таймер для обновления
  const [, setTick] = useState(0);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadEvents();

      // Обновляем каждую секунду
      const interval = setInterval(() => {
        setTick(t => t + 1);
        checkNotifications();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentUser, currentPetId]);

  const loadEvents = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      const [medRes, feedRes] = await Promise.all([
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
          .order('scheduled_time', { ascending: true })
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
        amount: m.dosage
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
        amount: `${f.amount} ${f.unit === 'g' ? 'г' : f.unit === 'ml' ? 'мл' : ''}`
      }));

      setEvents([...medEvents, ...feedEvents].sort((a, b) => a.scheduled_time - b.scheduled_time));
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
        body: `${event.type === 'medication' ? 'Дать лекарство' : 'Покормить'}: ${event.name} ${event.amount}`,
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

  const handleAddEvent = async () => {
    if (!currentUser || !currentPetId || !eventDate || !eventTime) return;

    try {
      const scheduledTime = new Date(`${eventDate}T${eventTime}`).getTime();
      const timestamp = scheduledTime;

      if (eventType === 'medication' && medicationName) {
        await supabase.from('medication_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: eventDate,
          time: eventTime,
          timestamp,
          medication_name: medicationName,
          dosage: medicationDosage,
          color: '#8B5CF6',
          is_scheduled: true,
          completed: false,
          scheduled_time: scheduledTime
        });
      } else if (eventType === 'feeding' && foodName) {
        await supabase.from('feeding_entries').insert({
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
        });
      }

      // Reset form
      setShowAddModal(false);
      setEventDate('');
      setEventTime('');
      setMedicationName('');
      setMedicationDosage('');
      setFoodName('');
      setFoodAmount('');
      setFoodUnit('g');
      loadEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleCompleteEvent = async (event: ScheduledEvent) => {
    try {
      const now = Date.now();
      const timeStr = `${new Date(now).getHours().toString().padStart(2, '0')}:${new Date(now).getMinutes().toString().padStart(2, '0')}`;

      if (event.type === 'medication') {
        await supabase.from('medication_entries').update({
          completed: true,
          time: timeStr,
          timestamp: now
        }).eq('id', event.id);
      } else {
        await supabase.from('feeding_entries').update({
          completed: true,
          time: timeStr,
          timestamp: now
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
      } else {
        await supabase.from('feeding_entries').delete().eq('id', event.id);
      }
      loadEvents();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
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
        <button
          onClick={() => setShowAddModal(true)}
          className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Plus size={20} />
        </button>
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
                    event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
                  }`}>
                    {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : <Utensils className="text-green-600" size={20} />}
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
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Предстоящие ({upcomingEvents.length})
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div key={`${event.type}-${event.id}`} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
                  }`}>
                    {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : <Utensils className="text-green-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{event.name}</div>
                    <div className="text-xs text-gray-600">{event.amount}</div>
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <CalendarIcon size={12} />
                      {new Date(event.scheduled_time).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      <span className="text-gray-500">• через {formatTimeLeft(event.scheduled_time)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteEvent(event)}
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all"
                  >
                    <Check size={16} />
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

      {/* Выполненные */}
      {completedEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Check size={16} />
            Выполнено ({completedEvents.length})
          </h3>
          <div className="space-y-2">
            {completedEvents.map(event => (
              <div key={`${event.type}-${event.id}`} className="bg-green-50 border border-green-200 rounded-2xl p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
                  }`}>
                    {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : <Utensils className="text-green-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm line-through">{event.name}</div>
                    <div className="text-xs text-gray-600">{event.amount}</div>
                  </div>
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

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Нет запланированных событий
        </div>
      )}

      {/* Add Modal */}
      <AnimatedModal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <h3 className="text-xl font-bold mb-4">Запланировать событие</h3>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Тип</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEventType('medication')}
                className={`py-3 px-4 rounded-2xl font-medium transition-all ${
                  eventType === 'medication'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                <Pill size={20} className="mx-auto mb-1" />
                Лекарство
              </button>
              <button
                onClick={() => setEventType('feeding')}
                className={`py-3 px-4 rounded-2xl font-medium transition-all ${
                  eventType === 'feeding'
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                <Utensils size={20} className="mx-auto mb-1" />
                Питание
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Дата</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Время</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          {/* Medication fields */}
          {eventType === 'medication' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Название лекарства</label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="Преднизолон"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Дозировка</label>
                <input
                  type="text"
                  value={medicationDosage}
                  onChange={(e) => setMedicationDosage(e.target.value)}
                  placeholder="0,3 мл"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
                />
              </div>
            </>
          )}

          {/* Feeding fields */}
          {eventType === 'feeding' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Название корма</label>
                <input
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Корм"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Количество</label>
                  <input
                    type="text"
                    value={foodAmount}
                    onChange={(e) => setFoodAmount(e.target.value)}
                    placeholder="50"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Единица</label>
                  <select
                    value={foodUnit}
                    onChange={(e) => setFoodUnit(e.target.value as 'g' | 'ml' | 'none')}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none"
                  >
                    <option value="g">г</option>
                    <option value="ml">мл</option>
                    <option value="none">-</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleAddEvent}
            disabled={
              !eventDate ||
              !eventTime ||
              (eventType === 'medication' && !medicationName) ||
              (eventType === 'feeding' && !foodName)
            }
            className="w-full py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Запланировать
          </button>
        </div>
      </AnimatedModal>

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
    </div>
  );
};
