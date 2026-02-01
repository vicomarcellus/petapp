import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { formatDisplayDate } from '../utils';
import { Trash2, Plus, Activity, AlertCircle, Pill, Utensils, X, Edit2, ArrowLeft, Clock, Bell, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useScheduledNotifications } from '../hooks/useScheduledNotifications';
import { AlertModal, ConfirmModal } from './Modal';
import { AnimatedModal } from './AnimatedModal';
import type { StateEntry, SymptomEntry, MedicationEntry, FeedingEntry } from '../types';
import { useUnits } from '../hooks/useUnits';

type TimelineEntry =
  | { type: 'state'; data: StateEntry }
  | { type: 'symptom'; data: SymptomEntry }
  | { type: 'medication'; data: MedicationEntry }
  | { type: 'feeding'; data: FeedingEntry };

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const { showNotification, NotificationModal } = useScheduledNotifications();
  const { medicationUnits, feedingUnits } = useUnits();
  const [stateEntries, setStateEntries] = useState<StateEntry[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [feedingEntries, setFeedingEntries] = useState<FeedingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Таймеры для запланированных событий (обновляются каждую секунду)
  const [, setTick] = useState(0);

  const [savedMedications, setSavedMedications] = useState<Array<{ name: string, dosage: string }>>([]);
  const [savedFoods, setSavedFoods] = useState<Array<{ name: string, amount: string, unit: 'g' | 'ml' | 'none' }>>([]);
  const [savedSymptoms, setSavedSymptoms] = useState<string[]>([]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddState, setShowAddState] = useState(false);
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddFeeding, setShowAddFeeding] = useState(false);

  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [editingScheduledId, setEditingScheduledId] = useState<string | null>(null);

  // Поля для планирования
  const [scheduleMinutes, setScheduleMinutes] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Модалки
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TimelineEntry | null>(null);

  // Функция форматирования времени до события
  const formatTimeLeft = (scheduledTime: number) => {
    const diff = scheduledTime - Date.now();
    if (diff <= 0) return 'сейчас';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (hours > 0) {
      return `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    } else {
      return `${seconds}с`;
    }
  };

  // Функция выполнения запланированного события
  const handleCompleteScheduled = async (id: number, type: 'medication' | 'feeding') => {
    if (!currentUser) return;

    try {
      const now = Date.now();
      const timeStr = `${new Date(now).getHours().toString().padStart(2, '0')}:${new Date(now).getMinutes().toString().padStart(2, '0')}`;

      if (type === 'medication') {
        await supabase.from('medication_entries').update({
          completed: true,
          time: timeStr,
          timestamp: now
        }).eq('id', id);
      } else if (type === 'feeding') {
        await supabase.from('feeding_entries').update({
          completed: true,
          time: timeStr,
          timestamp: now
        }).eq('id', id);
      }

      loadData();
    } catch (error) {
      console.error('Error completing event:', error);
    }
  };

  const [stateScore, setStateScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stateTrend, setStateTrend] = useState<'up' | 'same' | 'down' | null>(null);
  const [stateTime, setStateTime] = useState('');
  const [stateNote, setStateNote] = useState('');
  const [previousDayScore, setPreviousDayScore] = useState<number | null>(null);

  const [symptomName, setSymptomName] = useState('');
  const [symptomTime, setSymptomTime] = useState('');
  const [symptomNote, setSymptomNote] = useState('');

  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState(''); // Deprecated - for backward compatibility
  const [medicationAmount, setMedicationAmount] = useState('');
  const [medicationUnit, setMedicationUnit] = useState<string>('мл');
  const [medicationTime, setMedicationTime] = useState('');

  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<string>('g');
  const [foodTime, setFoodTime] = useState('');
  const [foodNote, setFoodNote] = useState('');

  useEffect(() => {
    if (selectedDate && currentPetId && currentUser) {
      loadData();
      loadSavedItems();
      loadPreviousDayScore();
    }
  }, [selectedDate, currentPetId, currentUser]);

  const loadPreviousDayScore = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;

    try {
      // Получаем предыдущий день
      const currentDate = new Date(selectedDate);
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const prevDateStr = previousDate.toISOString().split('T')[0];

      // Загружаем состояния предыдущего дня
      const { data } = await supabase
        .from('state_entries')
        .select('state_score')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('date', prevDateStr)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setPreviousDayScore(data[0].state_score);
      } else {
        setPreviousDayScore(null);
      }
    } catch (error) {
      console.error('Error loading previous day score:', error);
      setPreviousDayScore(null);
    }
  };

  // Обновление таймеров каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);

      // Проверяем запланированные события на истечение времени
      const now = Date.now();

      medicationEntries.forEach(entry => {
        if (!entry.completed && entry.scheduled_time && entry.scheduled_time <= now) {
          showNotification(entry.id!, 'medication', entry);
        }
      });

      feedingEntries.forEach(entry => {
        if (!entry.completed && entry.scheduled_time && entry.scheduled_time <= now) {
          showNotification(entry.id!, 'feeding', entry);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [medicationEntries, feedingEntries, showNotification]);

  // Обработчик выполнения запланированного события
  useEffect(() => {
    const handleComplete = async (e: any) => {
      const { id, type } = e.detail;
      if (!currentUser) return;

      try {
        const now = Date.now();
        const timeStr = `${new Date(now).getHours().toString().padStart(2, '0')}:${new Date(now).getMinutes().toString().padStart(2, '0')}`;

        if (type === 'medication') {
          await supabase.from('medication_entries').update({
            completed: true,
            time: timeStr,
            timestamp: now
          }).eq('id', id);
        } else if (type === 'feeding') {
          await supabase.from('feeding_entries').update({
            completed: true,
            time: timeStr,
            timestamp: now
          }).eq('id', id);
        }

        loadData();
      } catch (error) {
        console.error('Error completing event:', error);
      }
    };

    const handlePostpone = async (e: any) => {
      const { id, type, minutes } = e.detail;
      if (!currentUser) return;

      try {
        const newScheduledTime = Date.now() + minutes * 60000;

        if (type === 'medication') {
          await supabase.from('medication_entries').update({
            scheduled_time: newScheduledTime
          }).eq('id', id);
        } else if (type === 'feeding') {
          await supabase.from('feeding_entries').update({
            scheduled_time: newScheduledTime
          }).eq('id', id);
        }

        loadData();
      } catch (error) {
        console.error('Error postponing event:', error);
      }
    };

    window.addEventListener('completeScheduledEvent', handleComplete);
    window.addEventListener('postponeScheduledEvent', handlePostpone);

    return () => {
      window.removeEventListener('completeScheduledEvent', handleComplete);
      window.removeEventListener('postponeScheduledEvent', handlePostpone);
    };
  }, [currentUser]);

  const loadSavedItems = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      // Загружаем уникальные лекарства
      const { data: meds } = await supabase
        .from('medication_entries')
        .select('medication_name, dosage, dosage_amount, dosage_unit')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (meds) {
        const uniqueMeds = Array.from(new Map(meds.map(m => {
          // Формируем dosage для обратной совместимости
          const dosage = m.dosage_amount && m.dosage_unit
            ? `${m.dosage_amount} ${m.dosage_unit}`
            : m.dosage || '';
          return [m.medication_name, { name: m.medication_name, dosage }];
        })).values());
        setSavedMedications(uniqueMeds);
      }

      // Загружаем уникальные корма
      const { data: foods } = await supabase
        .from('feeding_entries')
        .select('food_name, amount, unit')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (foods) {
        const uniqueFoods = Array.from(new Map(foods.map(f => [f.food_name, { name: f.food_name, amount: f.amount, unit: f.unit }])).values());
        setSavedFoods(uniqueFoods);
      }

      // Загружаем уникальные симптомы
      const { data: symptoms } = await supabase
        .from('symptom_entries')
        .select('symptom')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (symptoms) {
        const uniqueSymptoms = Array.from(new Set(symptoms.map(s => s.symptom)));
        setSavedSymptoms(uniqueSymptoms);
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const loadData = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;

    try {
      setLoading(true);
      const [stateRes, symptomRes, medRes, feedRes] = await Promise.all([
        supabase.from('state_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true }),
        supabase.from('symptom_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true }),
        supabase.from('medication_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true }),
        supabase.from('feeding_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true })
      ]);

      if (stateRes.data) setStateEntries(stateRes.data);
      if (symptomRes.data) setSymptomEntries(symptomRes.data);
      if (medRes.data) setMedicationEntries(medRes.data);
      if (feedRes.data) setFeedingEntries(feedRes.data);
    } catch (error) {
      console.error('Error loading entry data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Объединяем все записи в единый таймлайн
  const timeline: TimelineEntry[] = [
    ...stateEntries.map(data => ({ type: 'state' as const, data })),
    ...symptomEntries.map(data => ({ type: 'symptom' as const, data })),
    ...medicationEntries.map(data => ({ type: 'medication' as const, data })),
    ...feedingEntries.map(data => ({ type: 'feeding' as const, data }))
  ].sort((a, b) => a.data.timestamp - b.data.timestamp);

  const handleAddState = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;

    try {
      const timeToUse = stateTime || new Date().toTimeString().slice(0, 5);
      const timestamp = new Date(`${selectedDate}T${timeToUse}`).getTime();

      // Автоматически определяем тренд на основе предыдущего дня
      let trend: 'up' | 'same' | 'down' | undefined = stateTrend || undefined;
      if (!trend && previousDayScore !== null) {
        if (stateScore > previousDayScore) {
          trend = 'up';
        } else if (stateScore < previousDayScore) {
          trend = 'down';
        } else {
          trend = 'same';
        }
      }

      if (editingEntry && editingEntry.type === 'state') {
        // Обновление
        const updateData: any = {
          time: timeToUse,
          timestamp,
          state_score: stateScore,
          note: stateNote || null
        };
        
        // Добавляем trend только если он определен
        if (trend) {
          updateData.trend = trend;
        }
        
        await supabase.from('state_entries').update(updateData).eq('id', editingEntry.data.id);
      } else {
        // Создание
        const insertData: any = {
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          state_score: stateScore,
          note: stateNote || null
        };
        
        // Добавляем trend только если он определен
        if (trend) {
          insertData.trend = trend;
        }
        
        await supabase.from('state_entries').insert(insertData);
      }

      setShowAddState(false);
      setEditingEntry(null);
      setStateTime('');
      setStateNote('');
      setStateScore(3);
      setStateTrend(null);
      loadData();
    } catch (error) {
      console.error('Error saving state:', error);
      // Показываем ошибку пользователю
      setErrorModal({ 
        title: 'Ошибка сохранения', 
        message: error instanceof Error ? error.message : 'Не удалось сохранить состояние' 
      });
    }
  };

  const handleAddSymptom = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !symptomName) return;

    try {
      const timeToUse = symptomTime || new Date().toTimeString().slice(0, 5);
      const timestamp = new Date(`${selectedDate}T${timeToUse}`).getTime();

      if (editingEntry && editingEntry.type === 'symptom') {
        await supabase.from('symptom_entries').update({
          time: timeToUse,
          timestamp,
          symptom: symptomName,
          note: symptomNote || null
        }).eq('id', editingEntry.data.id);
      } else {
        await supabase.from('symptom_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          symptom: symptomName,
          note: symptomNote || null
        });
      }

      setShowAddSymptom(false);
      setEditingEntry(null);
      setSymptomName('');
      setSymptomTime('');
      setSymptomNote('');
      loadData();
      loadSavedItems(); // Обновляем список сохранённых вариантов
    } catch (error) {
      console.error('Error saving symptom:', error);
    }
  };

  const handleAddMedication = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !medicationName || !medicationAmount) return;

    // Если планируем событие
    if (isScheduling && scheduleMinutes) {
      const minutes = parseInt(scheduleMinutes);
      if (minutes > 0) {
        try {
          const scheduledTime = Date.now() + minutes * 60000;
          const targetDate = new Date(scheduledTime);
          const dateStr = targetDate.toISOString().split('T')[0]; // Используем дату из scheduledTime
          const timeStr = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

          console.log('Планирование лекарства:', {
            scheduledTime,
            dateStr,
            timeStr,
            medicationName,
            medicationAmount,
            medicationUnit
          });

          const { data, error } = await supabase.from('medication_entries').insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: dateStr,
            time: timeStr,
            timestamp: scheduledTime,
            medication_name: medicationName,
            dosage_amount: medicationAmount,
            dosage_unit: medicationUnit,
            color: '#8B5CF6',
            is_scheduled: true,
            completed: false,
            scheduled_time: scheduledTime
          }).select();

          if (error) {
            console.error('Ошибка при планировании:', error);
            setErrorModal({ title: 'Ошибка планирования', message: error.message });
            return;
          }

          console.log('Запланировано успешно:', data);

          setShowAddMedication(false);
          setIsScheduling(false);
          setScheduleMinutes('');
          setMedicationName('');
          setMedicationAmount('');
          setMedicationUnit('мл');
          setMedicationTime('');
          loadData();
          loadSavedItems(); // Обновляем список сохранённых вариантов
          return;
        } catch (error) {
          console.error('Error scheduling medication:', error);
          setErrorModal({ title: 'Ошибка планирования', message: String(error) });
          return;
        }
      }
    }

    try {
      const timeToUse = medicationTime || new Date().toTimeString().slice(0, 5);
      const timestamp = new Date(`${selectedDate}T${timeToUse}`).getTime();

      if (editingEntry && editingEntry.type === 'medication') {
        await supabase.from('medication_entries').update({
          time: timeToUse,
          timestamp,
          medication_name: medicationName,
          dosage_amount: medicationAmount,
          dosage_unit: medicationUnit,
        }).eq('id', editingEntry.data.id);
      } else {
        // Создаем запись лекарства
        const { data: medData, error: medError } = await supabase.from('medication_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          medication_name: medicationName,
          dosage_amount: medicationAmount,
          dosage_unit: medicationUnit,
          color: '#8B5CF6',
          is_scheduled: false
        }).select().single();
        
        if (medError) {
          console.error('Ошибка при сохранении лекарства:', medError);
          setErrorModal({ title: 'Ошибка сохранения', message: medError.message });
          return;
        }

        // Автоматически создаем задачу в чеклисте
        if (medData) {
          await supabase.from('checklist_tasks').insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: selectedDate,
            time: timeToUse,
            timestamp,
            task: `Дать лекарство`,
            completed: true, // Сразу отмечаем как выполненную, т.к. уже дали
            task_type: 'medication',
            linked_item_id: medData.id,
            linked_item_name: medicationName,
            linked_item_amount: `${medicationAmount} ${medicationUnit}`
          });
        }
      }

      setShowAddMedication(false);
      setEditingEntry(null);
      setIsScheduling(false);
      setScheduleMinutes('');
      setMedicationName('');
      setMedicationAmount('');
      setMedicationUnit('мл');
      setMedicationTime('');
      loadData();
      loadSavedItems(); // Обновляем список сохранённых вариантов
    } catch (error) {
      console.error('Error saving medication:', error);
    }
  };

  const handleAddFeeding = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !foodName) return;

    // Если планируем событие
    if (isScheduling && scheduleMinutes) {
      const minutes = parseInt(scheduleMinutes);
      if (minutes > 0) {
        try {
          const scheduledTime = Date.now() + minutes * 60000;
          const targetDate = new Date(scheduledTime);
          const dateStr = targetDate.toISOString().split('T')[0]; // Используем дату из scheduledTime
          const timeStr = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

          console.log('Планирование питания:', {
            scheduledTime,
            dateStr,
            timeStr,
            foodName,
            foodAmount,
            foodUnit
          });

          const { data, error } = await supabase.from('feeding_entries').insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: dateStr, // Используем правильную дату
            time: timeStr,
            timestamp: scheduledTime,
            food_name: foodName,
            amount: foodAmount,
            unit: foodUnit,
            note: foodNote || null,
            is_scheduled: true,
            completed: false,
            scheduled_time: scheduledTime
          }).select();

          if (error) {
            console.error('Ошибка при планировании:', error);
            setErrorModal({ title: 'Ошибка планирования', message: error.message });
            return;
          }

          console.log('Запланировано успешно:', data);

          setShowAddFeeding(false);
          setIsScheduling(false);
          setScheduleMinutes('');
          setFoodName('');
          setFoodAmount('');
          setFoodUnit('g');
          setFoodTime('');
          setFoodNote('');
          loadData();
          return;
        } catch (error) {
          console.error('Error scheduling feeding:', error);
          setErrorModal({ title: 'Ошибка планирования', message: String(error) });
          return;
        }
      }
    }

    try {
      const timeToUse = foodTime || new Date().toTimeString().slice(0, 5);
      const timestamp = new Date(`${selectedDate}T${timeToUse}`).getTime();

      if (editingEntry && editingEntry.type === 'feeding') {
        await supabase.from('feeding_entries').update({
          time: timeToUse,
          timestamp,
          food_name: foodName,
          amount: foodAmount,
          unit: foodUnit,
          note: foodNote || null
        }).eq('id', editingEntry.data.id);
      } else {
        // Создаем запись питания
        const { data: feedData } = await supabase.from('feeding_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          food_name: foodName,
          amount: foodAmount,
          unit: foodUnit,
          note: foodNote || null,
          is_scheduled: false // Добавлено сейчас, не было запланировано
        }).select().single();

        // Автоматически создаем задачу в чеклисте
        if (feedData) {
          const unitText = foodUnit === 'g' ? 'г' : foodUnit === 'ml' ? 'мл' : '';
          await supabase.from('checklist_tasks').insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            date: selectedDate,
            time: timeToUse,
            timestamp,
            task: `Покормить`,
            completed: true, // Сразу отмечаем как выполненную, т.к. уже покормили
            task_type: 'feeding',
            linked_item_id: feedData.id,
            linked_item_name: foodName,
            linked_item_amount: `${foodAmount} ${unitText}`
          });
        }
      }

      setShowAddFeeding(false);
      setEditingEntry(null);
      setIsScheduling(false);
      setScheduleMinutes('');
      setFoodName('');
      setFoodAmount('');
      setFoodUnit('g');
      setFoodTime('');
      setFoodNote('');
      loadData();
      loadSavedItems(); // Обновляем список сохранённых вариантов
    } catch (error) {
      console.error('Error saving feeding:', error);
    }
  };

  const handleDelete = async (entry: TimelineEntry) => {
    setDeleteConfirm(entry);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'state') {
        await supabase.from('state_entries').delete().eq('id', deleteConfirm.data.id);
      } else if (deleteConfirm.type === 'symptom') {
        await supabase.from('symptom_entries').delete().eq('id', deleteConfirm.data.id);
      } else if (deleteConfirm.type === 'medication') {
        await supabase.from('medication_entries').delete().eq('id', deleteConfirm.data.id);
      } else if (deleteConfirm.type === 'feeding') {
        await supabase.from('feeding_entries').delete().eq('id', deleteConfirm.data.id);
      }
      loadData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);

    if (entry.type === 'state') {
      setStateScore(entry.data.state_score);
      setStateTrend(entry.data.trend || null);
      setStateTime(entry.data.time);
      setStateNote(entry.data.note || '');
      setShowAddState(true);
    } else if (entry.type === 'symptom') {
      setSymptomName(entry.data.symptom);
      setSymptomTime(entry.data.time);
      setSymptomNote(entry.data.note || '');
      setShowAddSymptom(true);
    } else if (entry.type === 'medication') {
      setMedicationName(entry.data.medication_name);
      // Парсим дозировку: сначала пробуем новые поля, потом старое
      if (entry.data.dosage_amount && entry.data.dosage_unit) {
        setMedicationAmount(entry.data.dosage_amount);
        setMedicationUnit(entry.data.dosage_unit as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
      } else if (entry.data.dosage) {
        // Парсим старое поле dosage
        const match = entry.data.dosage.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
        if (match) {
          setMedicationAmount(match[1]);
          setMedicationUnit((match[2] || 'мл') as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
        } else {
          setMedicationAmount(entry.data.dosage);
          setMedicationUnit('мл');
        }
      }
      setMedicationTime(entry.data.time);
      setShowAddMedication(true);
    } else if (entry.type === 'feeding') {
      setFoodName(entry.data.food_name);
      setFoodAmount(entry.data.amount);
      setFoodUnit(entry.data.unit);
      setFoodTime(entry.data.time);
      setFoodNote(entry.data.note || '');
      setShowAddFeeding(true);
    }
  };

  const renderTimelineEntry = (entry: TimelineEntry) => {
    const { type, data } = entry;

    if (type === 'state') {
      const hasSecondLine = !!data.note || !!data.is_scheduled;
      
      return (
        <div className="flex items-center gap-3">
          <div className={`text-sm font-medium text-gray-600 w-16 flex-shrink-0 ${hasSecondLine ? 'self-start pt-1' : ''}`}>{data.time}</div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative ${hasSecondLine ? 'self-start' : ''}`} style={{ backgroundColor: STATE_COLORS[data.state_score] }}>
            <Activity className="text-white" size={20} />
            {data.trend && (
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                style={{
                  backgroundColor: data.trend === 'up' ? '#10B981' : data.trend === 'down' ? '#EF4444' : '#3B82F6'
                }}
              >
                {data.trend === 'up' && <TrendingUp size={14} className="text-white" strokeWidth={2.5} />}
                {data.trend === 'down' && <TrendingDown size={14} className="text-white" strokeWidth={2.5} />}
                {data.trend === 'same' && <Minus size={14} className="text-white" strokeWidth={2.5} />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-black">
                Состояние: {STATE_LABELS[data.state_score]}
                {data.trend && (
                  <span className="text-gray-500 font-normal">
                    {' — '}
                    {data.trend === 'up' && 'лучше'}
                    {data.trend === 'down' && 'хуже'}
                    {data.trend === 'same' && 'так же'}
                  </span>
                )}
              </div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  по таймеру
                </span>
              )}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (type === 'symptom') {
      const hasSecondLine = !!data.note || !!data.is_scheduled;
      return (
        <div className="flex items-center gap-3">
          <div className={`text-sm font-medium text-gray-600 w-16 flex-shrink-0 ${hasSecondLine ? 'self-start pt-1' : ''}`}>{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 flex-shrink-0">
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-black">Симптом: {data.symptom}</div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  по таймеру
                </span>
              )}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (type === 'medication') {
      return (
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 flex-shrink-0">
            <Pill className="text-purple-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-medium text-black">
                Лекарство: {data.medication_name}
                {data.dosage_amount
                  ? ` • ${data.dosage_amount} ${data.dosage_unit || ''}`.trim()
                  : data.dosage ? ` • ${data.dosage}` : ''}
              </div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  по таймеру
                </span>
              )}
            </div>
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }

    if (type === 'feeding') {
      const hasNote = !!data.note || !!data.is_scheduled;
      return (
        <div className="flex items-center gap-3">
          <div className={`text-sm font-medium text-gray-600 w-16 flex-shrink-0 ${hasNote ? 'self-start pt-1' : ''}`}>{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 flex-shrink-0">
            <Utensils className="text-green-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-medium text-black">
                Питание: {data.food_name}
                {data.amount ? ` • ${data.amount} ${data.unit === 'g' ? 'г' : data.unit === 'ml' ? 'мл' : ''}` : ''}
              </div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  по таймеру
                </span>
              )}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="pb-28">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('calendar')}
            className="p-2 hover:bg-white rounded-full transition-all"
          >
            <ArrowLeft size={20} className="text-black" />
          </button>
          <h2 className="text-2xl font-bold text-black">{formatDisplayDate(selectedDate || '')}</h2>
        </div>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      <AnimatedModal
        isOpen={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        title="Добавить запись"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setShowAddState(true); setShowAddMenu(false); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-100 hover:scale-105 active:scale-95"
          >
            <Activity size={24} className="text-blue-600" />
            <span className="text-sm font-medium">Состояние</span>
          </button>
          <button
            onClick={() => { setShowAddSymptom(true); setShowAddMenu(false); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-100 hover:scale-105 active:scale-95"
          >
            <AlertCircle size={24} className="text-red-600" />
            <span className="text-sm font-medium">Симптом</span>
          </button>
          <button
            onClick={() => { setShowAddMedication(true); setShowAddMenu(false); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-100 hover:scale-105 active:scale-95"
          >
            <Pill size={24} className="text-purple-600" />
            <span className="text-sm font-medium">Лекарство</span>
          </button>
          <button
            onClick={() => { setShowAddFeeding(true); setShowAddMenu(false); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-100 hover:scale-105 active:scale-95"
          >
            <Utensils size={24} className="text-green-600" />
            <span className="text-sm font-medium">Питание</span>
          </button>
        </div>
      </AnimatedModal>

      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6">
        <h3 className="font-bold text-black mb-4">Лог дня</h3>

        {timeline.length === 0 && medicationEntries.filter(e => !e.completed).length === 0 && feedingEntries.filter(e => !e.completed).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Нет записей за этот день</p>
        ) : (
          <div className="space-y-2">
            {/* Объединяем запланированные и выполненные в хронологическом порядке */}
            {(() => {
              // Объединяем все записи (включая запланированные невыполненные)
              const allItems: Array<{
                isScheduled: boolean;
                timestamp: number;
                entry?: TimelineEntry;
                scheduledEntry?: { type: 'medication' | 'feeding'; data: MedicationEntry | FeedingEntry };
              }> = [];

              // Добавляем выполненные записи
              timeline.forEach(entry => {
                if (!('completed' in entry.data) || entry.data.completed !== false) {
                  allItems.push({
                    isScheduled: false,
                    timestamp: entry.data.timestamp,
                    entry
                  });
                }
              });

              // Добавляем невыполненные запланированные лекарства
              medicationEntries.forEach(entry => {
                if (entry.completed === false && entry.scheduled_time) {
                  allItems.push({
                    isScheduled: true,
                    timestamp: entry.scheduled_time,
                    scheduledEntry: { type: 'medication', data: entry }
                  });
                }
              });

              // Добавляем невыполненные запланированные кормления
              feedingEntries.forEach(entry => {
                if (entry.completed === false && entry.scheduled_time) {
                  allItems.push({
                    isScheduled: true,
                    timestamp: entry.scheduled_time,
                    scheduledEntry: { type: 'feeding', data: entry }
                  });
                }
              });

              // Сортируем по времени
              allItems.sort((a, b) => a.timestamp - b.timestamp);

              // Если больше 10 записей, сворачиваем средние
              const shouldCollapse = allItems.length > 10;
              const visibleItems = shouldCollapse
                ? [...allItems.slice(0, 5), ...allItems.slice(-5)]
                : allItems;
              const hiddenCount = shouldCollapse ? allItems.length - 10 : 0;

              return (
                <>
                  {visibleItems.map((item, idx) => {
                    // Показываем разделитель после первых 5 элементов
                    if (shouldCollapse && idx === 5) {
                      return (
                        <div key="divider" className="py-2">
                          <button
                            onClick={() => {/* TODO: развернуть */ }}
                            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            ... еще {hiddenCount} записей ...
                          </button>
                        </div>
                      );
                    }

                    if (item.isScheduled) {
                      const scheduledEntry = item.scheduledEntry!;
                      const data = scheduledEntry.data;
                      const targetDate = new Date(data.scheduled_time!);
                      const timeStr = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

                      return (
                        <div key={`scheduled-${scheduledEntry.type}-${data.id}`} className="py-3 px-6 rounded-xl bg-white/50 backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0 opacity-50">{timeStr}</div>

                            {/* Иконка как у обычных карточек */}
                            {scheduledEntry.type === 'medication' && (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 flex-shrink-0 opacity-50">
                                <Pill className="text-purple-600" size={20} />
                              </div>
                            )}
                            {scheduledEntry.type === 'feeding' && (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 flex-shrink-0 opacity-50">
                                <Utensils className="text-green-600" size={20} />
                              </div>
                            )}

                            <div className="flex-1 min-w-0 opacity-50">
                              <div className="text-sm font-medium text-black">
                                {scheduledEntry.type === 'medication' && (
                                  `Лекарство: ${(data as MedicationEntry).medication_name} • ${(data as MedicationEntry).dosage_amount
                                    ? `${(data as MedicationEntry).dosage_amount} ${(data as MedicationEntry).dosage_unit || ''}`.trim()
                                    : (data as MedicationEntry).dosage || ''
                                  }`
                                )}
                                {scheduledEntry.type === 'feeding' && (
                                  `Питание: ${(data as FeedingEntry).food_name} • ${(data as FeedingEntry).amount} ${(data as FeedingEntry).unit === 'g' ? 'г' : (data as FeedingEntry).unit === 'ml' ? 'мл' : ''}`
                                )}
                              </div>
                            </div>

                            {/* Таймер справа - БЕЗ opacity */}
                            <div className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-200 rounded-full flex-shrink-0">
                              {formatTimeLeft(data.scheduled_time!)}
                            </div>

                            {/* Кнопки - БЕЗ opacity */}
                            <button
                              onClick={() => handleCompleteScheduled(data.id!, scheduledEntry.type)}
                              className="p-2 hover:bg-green-100 rounded-full transition-colors text-green-600 flex-shrink-0"
                              title="Выполнено"
                            >
                              <Check size={16} />
                            </button>

                            <button
                              onClick={() => {
                                setEditingScheduledId(data.id!.toString());
                                const minutesLeft = Math.ceil((data.scheduled_time! - Date.now()) / 60000);
                                setScheduleMinutes(Math.max(1, minutesLeft).toString());
                              }}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete({ type: scheduledEntry.type, data } as any)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      const entry = item.entry!;

                      return (
                        <div key={`${entry.type}-${entry.data.id}-${idx}`} className="py-3 px-6 rounded-xl bg-white/50 backdrop-blur-sm">
                          {renderTimelineEntry(entry)}
                        </div>
                      );
                    }
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <AnimatedModal
        isOpen={showAddState}
        onClose={() => setShowAddState(false)}
        title={editingEntry ? 'Редактировать состояние' : 'Добавить состояние'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Время (необязательно)</label>
            <div className="relative">
              <input
                type="time"
                value={stateTime}
                onChange={(e) => setStateTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 [&::-webkit-calendar-picker-indicator]:hidden"
                placeholder="Текущее время"
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Оценка состояния</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button key={score} onClick={() => setStateScore(score as 1 | 2 | 3 | 4 | 5)} className={`flex-1 py-3 rounded-2xl font-bold transition-all duration-200 ${stateScore === score ? 'text-white scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'}`} style={{ backgroundColor: stateScore === score ? STATE_COLORS[score] : undefined }}>{score}</button>
              ))}
            </div>
          </div>

          {previousDayScore !== null && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Динамика <span className="text-gray-400 font-normal">(вчера было: {previousDayScore})</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStateTrend('down')}
                  className={`group relative py-4 rounded-2xl font-semibold transition-all duration-200 overflow-hidden ${
                    stateTrend === 'down' 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <TrendingDown size={20} className={stateTrend === 'down' ? 'text-white' : 'text-red-600'} />
                    <span className="text-xs">Хуже</span>
                  </div>
                  {stateTrend === 'down' && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStateTrend('same')}
                  className={`group relative py-4 rounded-2xl font-semibold transition-all duration-200 overflow-hidden ${
                    stateTrend === 'same' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Minus size={20} className={stateTrend === 'same' ? 'text-white' : 'text-blue-600'} />
                    <span className="text-xs">Так же</span>
                  </div>
                  {stateTrend === 'same' && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStateTrend('up')}
                  className={`group relative py-4 rounded-2xl font-semibold transition-all duration-200 overflow-hidden ${
                    stateTrend === 'up' 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <TrendingUp size={20} className={stateTrend === 'up' ? 'text-white' : 'text-green-600'} />
                    <span className="text-xs">Лучше</span>
                  </div>
                  {stateTrend === 'up' && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Автоматически определится, если не выбрать
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Заметка (опционально)</label>
            <textarea
              value={stateNote}
              onChange={(e) => setStateNote(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none resize-none text-gray-900 placeholder-gray-400"
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setShowAddState(false); setShowAddMenu(true); }}
              className="py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Назад
            </button>
            <button
              onClick={handleAddState}
              className="py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Добавить
            </button>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showAddSymptom}
        onClose={() => setShowAddSymptom(false)}
        title={editingEntry ? 'Редактировать симптом' : 'Добавить симптом'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Время (необязательно)</label>
            <div className="relative">
              <input
                type="time"
                value={symptomTime}
                onChange={(e) => setSymptomTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Симптом</label>
            <input
              type="text"
              value={symptomName}
              onChange={(e) => setSymptomName(e.target.value)}
              list="symptoms-list"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
              placeholder="Например: Рвота, Дрожь..."
            />
            {savedSymptoms.length > 0 && (
              <datalist id="symptoms-list">
                {savedSymptoms.map((symptom, idx) => (
                  <option key={idx} value={symptom} />
                ))}
              </datalist>
            )}
            {savedSymptoms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {savedSymptoms.slice(0, 5).map((symptom, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSymptomName(symptom)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Заметка (опционально)</label>
            <textarea
              value={symptomNote}
              onChange={(e) => setSymptomNote(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none resize-none text-gray-900 placeholder-gray-400"
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setShowAddSymptom(false); setShowAddMenu(true); }}
              className="py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Назад
            </button>
            <button
              onClick={handleAddSymptom}
              disabled={!symptomName}
              className="py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Добавить
            </button>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showAddMedication}
        onClose={() => setShowAddMedication(false)}
        title={editingEntry ? 'Редактировать лекарство' : 'Добавить лекарство'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Время (необязательно)</label>
            <div className="relative">
              <input
                type="time"
                value={medicationTime}
                onChange={(e) => setMedicationTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
            <input
              type="text"
              value={medicationName}
              onChange={(e) => {
                setMedicationName(e.target.value);
                const saved = savedMedications.find(m => m.name === e.target.value);
                if (saved && !medicationAmount) {
                  // Парсим dosage на amount и unit
                  const match = saved.dosage.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
                  if (match) {
                    setMedicationAmount(match[1]);
                    setMedicationUnit((match[2] || 'мл') as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
                  }
                }
              }}
              list="medications-list"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
              placeholder="Например: Преднизолон"
            />
            {savedMedications.length > 0 && (
              <datalist id="medications-list">
                {savedMedications.map((med, idx) => (
                  <option key={idx} value={med.name} />
                ))}
              </datalist>
            )}
            {savedMedications.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {savedMedications.slice(0, 5).map((med, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMedicationName(med.name);
                      // Парсим dosage на amount и unit
                      const match = med.dosage.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
                      if (match) {
                        setMedicationAmount(match[1]);
                        setMedicationUnit((match[2] || 'мл') as 'мл' | 'мг' | 'г' | 'таб' | 'капс');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {med.name} {med.dosage}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Количество</label>
              <input
                type="text"
                value={medicationAmount}
                onChange={(e) => setMedicationAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                placeholder="0,3"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Единица</label>
              <select
                value={medicationUnit}
                onChange={(e) => setMedicationUnit(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 appearance-none cursor-pointer"
              >
                {medicationUnits.map(unit => (
                  <option key={unit.code} value={unit.name}>{unit.name}</option>
                ))}
              </select>
            </div>
          </div>

          {!editingEntry && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="schedule-med"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <label htmlFor="schedule-med" className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                  <Clock size={18} />
                  Запланировать
                </label>
              </div>
              {isScheduling && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Дать через (минут)</label>
                  <input
                    type="number"
                    value={scheduleMinutes}
                    onChange={(e) => setScheduleMinutes(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Например: 30"
                    min="1"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setShowAddMedication(false); setShowAddMenu(true); }}
              className="py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Назад
            </button>
            <button
              onClick={handleAddMedication}
              disabled={!medicationName || !medicationAmount || (isScheduling && !scheduleMinutes)}
              className="py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isScheduling ? 'Запланировать' : 'Добавить'}
            </button>
          </div>
        </div>
      </AnimatedModal>

      <AnimatedModal
        isOpen={showAddFeeding}
        onClose={() => setShowAddFeeding(false)}
        title={editingEntry ? 'Редактировать питание' : 'Добавить питание'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Время (необязательно)</label>
            <div className="relative">
              <input
                type="time"
                value={foodTime}
                onChange={(e) => setFoodTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => {
                setFoodName(e.target.value);
                const saved = savedFoods.find(f => f.name === e.target.value);
                if (saved && !foodAmount) {
                  setFoodAmount(saved.amount);
                  setFoodUnit(saved.unit);
                }
              }}
              list="foods-list"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
              placeholder="Например: Корм, Вода"
            />
            {savedFoods.length > 0 && (
              <datalist id="foods-list">
                {savedFoods.map((food, idx) => (
                  <option key={idx} value={food.name} />
                ))}
              </datalist>
            )}
            {savedFoods.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {savedFoods.slice(0, 5).map((food, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFoodName(food.name);
                      setFoodAmount(food.amount);
                      setFoodUnit(food.unit);
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {food.name} {food.amount} {food.unit === 'g' ? 'г' : food.unit === 'ml' ? 'мл' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Количество</label>
              <input
                type="text"
                value={foodAmount}
                onChange={(e) => setFoodAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Единица</label>
              <select
                value={foodUnit}
                onChange={(e) => setFoodUnit(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 appearance-none cursor-pointer"
              >
                {feedingUnits.map(unit => (
                  <option key={unit.code} value={unit.code}>{unit.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Заметка (опционально)</label>
            <textarea
              value={foodNote}
              onChange={(e) => setFoodNote(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none resize-none text-gray-900 placeholder-gray-400"
              rows={2}
              placeholder="Дополнительная информация..."
            />
          </div>

          {!editingEntry && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="schedule-feed"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <label htmlFor="schedule-feed" className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                  <Clock size={18} />
                  Запланировать
                </label>
              </div>
              {isScheduling && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Покормить через (минут)</label>
                  <input
                    type="number"
                    value={scheduleMinutes}
                    onChange={(e) => setScheduleMinutes(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Например: 30"
                    min="1"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setShowAddFeeding(false); setShowAddMenu(true); }}
              className="py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Назад
            </button>
            <button
              onClick={handleAddFeeding}
              disabled={!foodName || (isScheduling && !scheduleMinutes)}
              className="py-3.5 bg-black text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isScheduling ? 'Запланировать' : 'Добавить'}
            </button>
          </div>
        </div>
      </AnimatedModal>

      {NotificationModal && <NotificationModal />}

      <AlertModal
        isOpen={!!errorModal}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
        onClose={() => setErrorModal(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Удалить запись?"
        message="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Модалка редактирования запланированного события */}
      {editingScheduledId && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingScheduledId(null)}
        >
          <div className="bg-white border border-white/60 rounded-[32px] p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Изменить время</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Через сколько минут</label>
                <input
                  type="number"
                  value={scheduleMinutes}
                  onChange={(e) => setScheduleMinutes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Например: 30"
                  min="1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const minutes = parseInt(scheduleMinutes);
                    if (minutes > 0) {
                      const newScheduledTime = Date.now() + minutes * 60000;
                      const id = parseInt(editingScheduledId);

                      // Определяем тип события
                      const medEntry = medicationEntries.find(e => e.id === id);
                      const feedEntry = feedingEntries.find(e => e.id === id);

                      try {
                        if (medEntry) {
                          await supabase.from('medication_entries').update({
                            scheduled_time: newScheduledTime
                          }).eq('id', id);
                        } else if (feedEntry) {
                          await supabase.from('feeding_entries').update({
                            scheduled_time: newScheduledTime
                          }).eq('id', id);
                        }

                        setEditingScheduledId(null);
                        setScheduleMinutes('');
                        loadData();
                      } catch (error) {
                        console.error('Error updating scheduled time:', error);
                      }
                    }
                  }}
                  disabled={!scheduleMinutes}
                  className="flex-1 py-2 bg-black text-white rounded-full disabled:opacity-50"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setEditingScheduledId(null);
                    setScheduleMinutes('');
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-full"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
