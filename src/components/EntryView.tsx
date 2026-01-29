import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { formatDisplayDate } from '../utils';
import { Trash2, Plus, Activity, AlertCircle, Pill, Utensils, X, Edit2, ArrowLeft, Clock, Bell } from 'lucide-react';
import { Header } from './Header';
import { useScheduledEvents } from '../hooks/useScheduledEvents';
import type { StateEntry, SymptomEntry, MedicationEntry, FeedingEntry } from '../types';

type TimelineEntry = 
  | { type: 'state'; data: StateEntry }
  | { type: 'symptom'; data: SymptomEntry }
  | { type: 'medication'; data: MedicationEntry }
  | { type: 'feeding'; data: FeedingEntry };

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const { scheduleEvent, cancelEvent, updateEvent, events, NotificationModal } = useScheduledEvents();
  const [stateEntries, setStateEntries] = useState<StateEntry[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [feedingEntries, setFeedingEntries] = useState<FeedingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [savedMedications, setSavedMedications] = useState<Array<{name: string, dosage: string}>>([]);
  const [savedFoods, setSavedFoods] = useState<Array<{name: string, amount: string, unit: 'g' | 'ml' | 'none'}>>([]);
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
  
  const [stateScore, setStateScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stateTime, setStateTime] = useState('');
  const [stateNote, setStateNote] = useState('');

  const [symptomName, setSymptomName] = useState('');
  const [symptomTime, setSymptomTime] = useState('');
  const [symptomNote, setSymptomNote] = useState('');

  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState('');
  const [medicationTime, setMedicationTime] = useState('');

  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<'g' | 'ml' | 'none'>('g');
  const [foodTime, setFoodTime] = useState('');
  const [foodNote, setFoodNote] = useState('');

  useEffect(() => {
    if (selectedDate && currentPetId && currentUser) {
      loadData();
      loadSavedItems();
    }
  }, [selectedDate, currentPetId, currentUser]);

  const loadSavedItems = async () => {
    if (!currentUser || !currentPetId) return;
    
    try {
      // Загружаем уникальные лекарства
      const { data: meds } = await supabase
        .from('medication_entries')
        .select('medication_name, dosage')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (meds) {
        const uniqueMeds = Array.from(new Map(meds.map(m => [m.medication_name, { name: m.medication_name, dosage: m.dosage }])).values());
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
      
      if (editingEntry && editingEntry.type === 'state') {
        // Обновление
        await supabase.from('state_entries').update({
          time: timeToUse,
          timestamp,
          state_score: stateScore,
          note: stateNote || null
        }).eq('id', editingEntry.data.id);
      } else {
        // Создание
        await supabase.from('state_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          state_score: stateScore,
          note: stateNote || null
        });
      }
      
      setShowAddState(false);
      setEditingEntry(null);
      setStateTime('');
      setStateNote('');
      setStateScore(3);
      loadData();
    } catch (error) {
      console.error('Error saving state:', error);
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
    } catch (error) {
      console.error('Error saving symptom:', error);
    }
  };

  const handleAddMedication = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !medicationName) return;
    
    // Если планируем событие
    if (isScheduling && scheduleMinutes) {
      const minutes = parseInt(scheduleMinutes);
      if (minutes > 0) {
        scheduleEvent('medication', {
          medication_name: medicationName,
          dosage: medicationDosage
        }, minutes);
        
        // Показываем подтверждение
        alert(`Запланировано: дать ${medicationName} ${medicationDosage} через ${minutes} минут`);
        
        setShowAddMedication(false);
        setIsScheduling(false);
        setScheduleMinutes('');
        setMedicationName('');
        setMedicationDosage('');
        setMedicationTime('');
        return;
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
          dosage: medicationDosage,
        }).eq('id', editingEntry.data.id);
      } else {
        // Создаем запись лекарства
        const { data: medData } = await supabase.from('medication_entries').insert({
          user_id: currentUser.id,
          pet_id: currentPetId,
          date: selectedDate,
          time: timeToUse,
          timestamp,
          medication_name: medicationName,
          dosage: medicationDosage,
          color: '#8B5CF6',
          is_scheduled: false // Добавлено сейчас, не было запланировано
        }).select().single();

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
            linked_item_amount: medicationDosage
          });
        }
      }
      
      setShowAddMedication(false);
      setEditingEntry(null);
      setIsScheduling(false);
      setScheduleMinutes('');
      setMedicationName('');
      setMedicationDosage('');
      setMedicationTime('');
      loadData();
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
        scheduleEvent('feeding', {
          food_name: foodName,
          amount: foodAmount,
          unit: foodUnit
        }, minutes);
        
        // Показываем подтверждение
        const unitText = foodUnit === 'g' ? 'г' : foodUnit === 'ml' ? 'мл' : '';
        alert(`Запланировано: покормить ${foodName} ${foodAmount} ${unitText} через ${minutes} минут`);
        
        setShowAddFeeding(false);
        setIsScheduling(false);
        setScheduleMinutes('');
        setFoodName('');
        setFoodAmount('');
        setFoodUnit('g');
        setFoodTime('');
        setFoodNote('');
        return;
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
    } catch (error) {
      console.error('Error saving feeding:', error);
    }
  };

  const handleDelete = async (entry: TimelineEntry) => {
    if (!confirm('Удалить запись?')) return;
    
    try {
      if (entry.type === 'state') {
        await supabase.from('state_entries').delete().eq('id', entry.data.id);
      } else if (entry.type === 'symptom') {
        await supabase.from('symptom_entries').delete().eq('id', entry.data.id);
      } else if (entry.type === 'medication') {
        await supabase.from('medication_entries').delete().eq('id', entry.data.id);
      } else if (entry.type === 'feeding') {
        await supabase.from('feeding_entries').delete().eq('id', entry.data.id);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    
    if (entry.type === 'state') {
      setStateScore(entry.data.state_score);
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
      setMedicationDosage(entry.data.dosage);
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
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: STATE_COLORS[data.state_score] }}>
            <Activity className="text-white" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-black">Состояние: {STATE_LABELS[data.state_score]}</div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  запланировано
                </span>
              )}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
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
                  запланировано
                </span>
              )}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
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
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-black">Лекарство: {data.medication_name}</div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  запланировано
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">{data.dosage}</div>
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
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
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-black">Питание: {data.food_name}</div>
              {data.is_scheduled && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                  <Bell size={10} />
                  запланировано
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.amount} {data.unit === 'g' ? 'г' : data.unit === 'ml' ? 'мл' : ''}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleEdit(entry)} className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 flex-shrink-0">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4">
        <div className="max-w-5xl mx-auto">
          <Header showBackButton onBack={() => setView('calendar')} />
          <div className="text-center py-8 text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />
        
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
            className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {showAddMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMenu(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить запись</h3>
                <button onClick={() => setShowAddMenu(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowAddState(true); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-100"
                >
                  <Activity size={24} className="text-blue-600" />
                  <span className="text-sm font-medium">Состояние</span>
                </button>
                <button
                  onClick={() => { setShowAddSymptom(true); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-100"
                >
                  <AlertCircle size={24} className="text-red-600" />
                  <span className="text-sm font-medium">Симптом</span>
                </button>
                <button
                  onClick={() => { setShowAddMedication(true); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-100"
                >
                  <Pill size={24} className="text-purple-600" />
                  <span className="text-sm font-medium">Лекарство</span>
                </button>
                <button
                  onClick={() => { setShowAddFeeding(true); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors border-2 border-gray-100"
                >
                  <Utensils size={24} className="text-green-600" />
                  <span className="text-sm font-medium">Питание</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-bold text-black mb-4">Лог дня</h3>
          
          {timeline.length === 0 && events.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Нет записей за этот день</p>
          ) : (
            <div className="space-y-4">
              {/* Объединяем запланированные и выполненные в хронологическом порядке */}
              {(() => {
                // Создаем объединенный массив с запланированными событиями
                const scheduledItems = events.map(event => ({
                  isScheduled: true,
                  timestamp: event.targetTime,
                  event
                }));
                
                const completedItems = timeline.map(entry => ({
                  isScheduled: false,
                  timestamp: entry.data.timestamp,
                  entry
                }));
                
                const allItems = [...scheduledItems, ...completedItems].sort((a, b) => a.timestamp - b.timestamp);
                
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
                              onClick={() => {/* TODO: развернуть */}}
                              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              ... еще {hiddenCount} записей ...
                            </button>
                          </div>
                        );
                      }
                      
                      if (item.isScheduled) {
                        const event = 'event' in item ? item.event : null;
                        if (!event) return null;
                        
                        const targetDate = new Date(event.targetTime);
                        const timeStr = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;
                        
                        return (
                          <div key={event.id} className="p-3 rounded-xl bg-gray-50 opacity-50">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{timeStr}</div>
                              
                              {/* Иконка как у обычных карточек */}
                              {event.type === 'medication' && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 flex-shrink-0">
                                  <Pill className="text-purple-600" size={20} />
                                </div>
                              )}
                              {event.type === 'feeding' && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 flex-shrink-0">
                                  <Utensils className="text-green-600" size={20} />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-black">
                                  {event.type === 'medication' && `Лекарство: ${event.data.medication_name}`}
                                  {event.type === 'feeding' && `Питание: ${event.data.food_name}`}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {event.type === 'medication' && event.data.dosage}
                                  {event.type === 'feeding' && `${event.data.amount} ${event.data.unit === 'g' ? 'г' : event.data.unit === 'ml' ? 'мл' : ''}`}
                                </div>
                              </div>
                              
                              {/* Таймер справа */}
                              <div className="text-xs font-medium text-blue-600 px-2 py-1 bg-blue-100 rounded-full flex-shrink-0">
                                {event.minutesLeft > 0 ? `${event.minutesLeft}м` : 'сейчас'}
                              </div>
                              
                              <button 
                                onClick={() => {
                                  setEditingScheduledId(event.id);
                                  setScheduleMinutes(event.minutesLeft.toString());
                                }} 
                                className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 flex-shrink-0"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => cancelEvent(event.id)} 
                                className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        const entry = 'entry' in item ? item.entry : null;
                        if (!entry) return null;
                        
                        return (
                          <div key={`${entry.type}-${entry.data.id}-${idx}`} className="p-3 rounded-xl bg-gray-50">
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

        {showAddState && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddState(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editingEntry ? 'Редактировать состояние' : 'Добавить состояние'}</h3>
                <button onClick={() => setShowAddState(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время (необязательно)</label>
                  <input type="time" value={stateTime} onChange={(e) => setStateTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Текущее время" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Оценка состояния</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button key={score} onClick={() => setStateScore(score as 1 | 2 | 3 | 4 | 5)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${stateScore === score ? 'text-white scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={{ backgroundColor: stateScore === score ? STATE_COLORS[score] : undefined }}>{score}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Заметка (опционально)</label>
                  <textarea value={stateNote} onChange={(e) => setStateNote(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} placeholder="Дополнительная информация..." />
                </div>

                <button onClick={handleAddState} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {showAddSymptom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSymptom(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editingEntry ? 'Редактировать симптом' : 'Добавить симптом'}</h3>
                <button onClick={() => setShowAddSymptom(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время (необязательно)</label>
                  <input type="time" value={symptomTime} onChange={(e) => setSymptomTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Симптом</label>
                  <input 
                    type="text" 
                    value={symptomName} 
                    onChange={(e) => setSymptomName(e.target.value)} 
                    list="symptoms-list"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
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
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Заметка (опционально)</label>
                  <textarea value={symptomNote} onChange={(e) => setSymptomNote(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} placeholder="Дополнительная информация..." />
                </div>

                <button onClick={handleAddSymptom} disabled={!symptomName} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {showAddMedication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMedication(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editingEntry ? 'Редактировать лекарство' : 'Добавить лекарство'}</h3>
                <button onClick={() => setShowAddMedication(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время (необязательно)</label>
                  <input type="time" value={medicationTime} onChange={(e) => setMedicationTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                  <input 
                    type="text" 
                    value={medicationName} 
                    onChange={(e) => {
                      setMedicationName(e.target.value);
                      // Автозаполнение дозировки при выборе из списка
                      const saved = savedMedications.find(m => m.name === e.target.value);
                      if (saved && !medicationDosage) {
                        setMedicationDosage(saved.dosage);
                      }
                    }}
                    list="medications-list"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
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
                            setMedicationDosage(med.dosage);
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {med.name} {med.dosage}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дозировка</label>
                  <input type="text" value={medicationDosage} onChange={(e) => setMedicationDosage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Например: 0,3 мл" />
                </div>

                {!editingEntry && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input 
                        type="checkbox" 
                        id="schedule-med"
                        checked={isScheduling}
                        onChange={(e) => setIsScheduling(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="schedule-med" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Clock size={16} />
                        Запланировать
                      </label>
                    </div>
                    {isScheduling && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Дать через (минут)</label>
                        <input 
                          type="number" 
                          value={scheduleMinutes} 
                          onChange={(e) => setScheduleMinutes(e.target.value)} 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="Например: 30"
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleAddMedication} disabled={!medicationName || (isScheduling && !scheduleMinutes)} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isScheduling ? 'Запланировать' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddFeeding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddFeeding(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{editingEntry ? 'Редактировать питание' : 'Добавить питание'}</h3>
                <button onClick={() => setShowAddFeeding(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время (необязательно)</label>
                  <input type="time" value={foodTime} onChange={(e) => setFoodTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                  <input 
                    type="text" 
                    value={foodName} 
                    onChange={(e) => {
                      setFoodName(e.target.value);
                      // Автозаполнение количества и единицы
                      const saved = savedFoods.find(f => f.name === e.target.value);
                      if (saved && !foodAmount) {
                        setFoodAmount(saved.amount);
                        setFoodUnit(saved.unit);
                      }
                    }}
                    list="foods-list"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
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
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {food.name} {food.amount} {food.unit === 'g' ? 'г' : food.unit === 'ml' ? 'мл' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Количество</label>
                    <input type="text" value={foodAmount} onChange={(e) => setFoodAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Единица</label>
                    <select value={foodUnit} onChange={(e) => setFoodUnit(e.target.value as 'g' | 'ml' | 'none')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="g">г</option>
                      <option value="ml">мл</option>
                      <option value="none">-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Заметка (опционально)</label>
                  <textarea value={foodNote} onChange={(e) => setFoodNote(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} placeholder="Дополнительная информация..." />
                </div>

                {!editingEntry && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input 
                        type="checkbox" 
                        id="schedule-feed"
                        checked={isScheduling}
                        onChange={(e) => setIsScheduling(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="schedule-feed" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Clock size={16} />
                        Запланировать
                      </label>
                    </div>
                    {isScheduling && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Покормить через (минут)</label>
                        <input 
                          type="number" 
                          value={scheduleMinutes} 
                          onChange={(e) => setScheduleMinutes(e.target.value)} 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="Например: 30"
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleAddFeeding} disabled={!foodName || (isScheduling && !scheduleMinutes)} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isScheduling ? 'Запланировать' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {NotificationModal && <NotificationModal />}

        {/* Модалка редактирования запланированного события */}
        {editingScheduledId && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingScheduledId(null)}
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
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
                    onClick={() => {
                      const minutes = parseInt(scheduleMinutes);
                      if (minutes > 0) {
                        updateEvent(editingScheduledId, minutes);
                        setEditingScheduledId(null);
                        setScheduleMinutes('');
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
    </div>
  );
};
