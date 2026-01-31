import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Plus, Trash2, Pill, Utensils, Clock, Bell, Check, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';
import { ConfirmModal } from './Modal';
import type { MedicationEntry, FeedingEntry } from '../types';
import { useUnits } from '../hooks/useUnits';

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
  const { medicationUnits, feedingUnits } = useUnits();
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);

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

      if (editingEvent) {
        // Редактирование существующего события
        if (editingEvent.type === 'medication' && medicationName && medicationAmount) {
          await supabase.from('medication_entries').update({
            date: eventDate,
            time: eventTime,
            timestamp,
            medication_name: medicationName,
            dosage_amount: medicationAmount,
            dosage_unit: medicationUnit,
            scheduled_time: scheduledTime
          }).eq('id', editingEvent.id);
        } else if (editingEvent.type === 'feeding' && foodName) {
          await supabase.from('feeding_entries').update({
            date: eventDate,
            time: eventTime,
            timestamp,
            food_name: foodName,
            amount: foodAmount,
            unit: foodUnit,
            scheduled_time: scheduledTime
          }).eq('id', editingEvent.id);
        }
      } else {
        // Создание нового события
        if (eventType === 'medication' && medicationName && medicationAmount) {
          await supabase.from('medication_entries').insert({
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

  const handleEditEvent = (event: ScheduledEvent) => {
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
      const match = event.amount.match(/^(\d+)\s*(г|мл)?$/);
      if (match) {
        setFoodAmount(match[1]);
        setFoodUnit(match[2] === 'г' ? 'g' : match[2] === 'мл' ? 'ml' : 'none');
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
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
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Предстоящие ({upcomingEvents.length})
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const dateObj = new Date(event.scheduled_time);
              const dayStr = dateObj.toLocaleString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
              const timeStr = dateObj.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={`${event.type}-${event.id}`} className="py-3 px-6 rounded-xl bg-white/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    {/* Дата и время */}
                    <div className="flex flex-col items-start w-20 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-500">{dayStr}</span>
                      <span className="text-sm font-bold text-gray-800">{timeStr}</span>
                    </div>

                    {/* Иконка */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                      {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : <Utensils className="text-green-600" size={20} />}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-black">
                          {event.type === 'medication' ? 'Лекарство' : 'Питание'}: {event.name}
                          {event.amount ? ` • ${event.amount}` : ''}
                        </span>
                        <span className="text-xs text-gray-400">
                          через {formatTimeLeft(event.scheduled_time)}
                        </span>
                      </div>
                    </div>

                    {/* Действия */}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Выполненные */}
      {completedEvents.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <Check size={16} />
            Выполнено ({completedEvents.length})
          </h3>
          <div className="space-y-2">
            {completedEvents.map(event => {
              const dateObj = new Date(event.timestamp || event.scheduled_time); // Использовать timestamp выполнения если есть
              const timeStr = dateObj.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={`${event.type}-${event.id}`} className="py-3 px-6 rounded-xl bg-white/50 backdrop-blur-sm opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">{timeStr}</div>

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${event.type === 'medication' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                      {event.type === 'medication' ? <Pill className="text-purple-600" size={20} /> : <Utensils className="text-green-600" size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-black line-through">
                        {event.type === 'medication' ? 'Лекарство' : 'Питание'}: {event.name}
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

      <AnimatedModal
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
        }}
        title={editingEvent
          ? (eventType === 'medication' ? 'Редактировать лекарство' : 'Редактировать питание')
          : 'Запланировать событие'}
      >

        <div className="space-y-4">
          {/* Type selector - hide when editing */}
          {!editingEvent && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Тип</label>
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Дата</label>
              <div className="relative">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Время</label>
              <div className="relative">
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
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
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Количество</label>
                  <input
                    type="text"
                    value={medicationAmount}
                    onChange={(e) => setMedicationAmount(e.target.value)}
                    placeholder="0,3"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Единица</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Название корма</label>
                <input
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="Корм"
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
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
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Единица</label>
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

          {editingEvent ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Назад
              </button>
              <button
                onClick={handleAddEvent}
                className="py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Добавить
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddEvent}
              disabled={
                !eventDate ||
                !eventTime ||
                (eventType === 'medication' && (!medicationName || !medicationAmount)) ||
                (eventType === 'feeding' && !foodName)
              }
              className="w-full py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Запланировать
            </button>
          )}

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
