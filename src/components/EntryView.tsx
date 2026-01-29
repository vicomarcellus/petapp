import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { formatDisplayDate } from '../utils';
import { Trash2, Plus, Activity, AlertCircle, Pill, Utensils, X } from 'lucide-react';
import { Header } from './Header';
import type { StateEntry, SymptomEntry, MedicationEntry, FeedingEntry } from '../types';

type TimelineEntry = 
  | { type: 'state'; data: StateEntry }
  | { type: 'symptom'; data: SymptomEntry }
  | { type: 'medication'; data: MedicationEntry }
  | { type: 'feeding'; data: FeedingEntry };

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const [stateEntries, setStateEntries] = useState<StateEntry[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [feedingEntries, setFeedingEntries] = useState<FeedingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddState, setShowAddState] = useState(false);
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddFeeding, setShowAddFeeding] = useState(false);
  
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
    }
  }, [selectedDate, currentPetId, currentUser]);

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
    if (!selectedDate || !currentPetId || !currentUser || !stateTime) return;
    
    try {
      const timestamp = new Date(`${selectedDate}T${stateTime}`).getTime();
      await supabase.from('state_entries').insert({
        user_id: currentUser.id,
        pet_id: currentPetId,
        date: selectedDate,
        time: stateTime,
        timestamp,
        state_score: stateScore,
        note: stateNote || null
      });
      
      setShowAddState(false);
      setStateTime('');
      setStateNote('');
      setStateScore(3);
      loadData();
    } catch (error) {
      console.error('Error adding state:', error);
    }
  };

  const handleAddSymptom = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !symptomTime || !symptomName) return;
    
    try {
      const timestamp = new Date(`${selectedDate}T${symptomTime}`).getTime();
      await supabase.from('symptom_entries').insert({
        user_id: currentUser.id,
        pet_id: currentPetId,
        date: selectedDate,
        time: symptomTime,
        timestamp,
        symptom: symptomName,
        note: symptomNote || null
      });
      
      setShowAddSymptom(false);
      setSymptomName('');
      setSymptomTime('');
      setSymptomNote('');
      loadData();
    } catch (error) {
      console.error('Error adding symptom:', error);
    }
  };

  const handleAddMedication = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !medicationTime || !medicationName) return;
    
    try {
      const timestamp = new Date(`${selectedDate}T${medicationTime}`).getTime();
      await supabase.from('medication_entries').insert({
        user_id: currentUser.id,
        pet_id: currentPetId,
        date: selectedDate,
        time: medicationTime,
        timestamp,
        medication_name: medicationName,
        dosage: medicationDosage,
        color: '#8B5CF6'
      });
      
      setShowAddMedication(false);
      setMedicationName('');
      setMedicationDosage('');
      setMedicationTime('');
      loadData();
    } catch (error) {
      console.error('Error adding medication:', error);
    }
  };

  const handleAddFeeding = async () => {
    if (!selectedDate || !currentPetId || !currentUser || !foodTime || !foodName) return;
    
    try {
      const timestamp = new Date(`${selectedDate}T${foodTime}`).getTime();
      await supabase.from('feeding_entries').insert({
        user_id: currentUser.id,
        pet_id: currentPetId,
        date: selectedDate,
        time: foodTime,
        timestamp,
        food_name: foodName,
        amount: foodAmount,
        unit: foodUnit,
        note: foodNote || null
      });
      
      setShowAddFeeding(false);
      setFoodName('');
      setFoodAmount('');
      setFoodUnit('g');
      setFoodTime('');
      setFoodNote('');
      loadData();
    } catch (error) {
      console.error('Error adding feeding:', error);
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

  const renderTimelineEntry = (entry: TimelineEntry) => {
    const { type, data } = entry;
    
    if (type === 'state') {
      return (
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: STATE_COLORS[data.state_score] }}>
            <Activity className="text-white" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-black">Состояние: {STATE_LABELS[data.state_score]}</div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
    
    if (type === 'symptom') {
      return (
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 flex-shrink-0">
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-black">Симптом: {data.symptom}</div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
    
    if (type === 'medication') {
      return (
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 flex-shrink-0">
            <Pill className="text-purple-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-black">Лекарство: {data.medication_name}</div>
            <div className="text-xs text-gray-600 mt-1">{data.dosage}</div>
          </div>
          <button onClick={() => handleDelete(entry)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
    
    if (type === 'feeding') {
      return (
        <div className="flex items-start gap-3">
          <div className="text-sm font-medium text-gray-600 w-16 flex-shrink-0">{data.time}</div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 flex-shrink-0">
            <Utensils className="text-green-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-black">Питание: {data.food_name}</div>
            <div className="text-xs text-gray-600 mt-1">
              {data.amount} {data.unit === 'g' ? 'г' : data.unit === 'ml' ? 'мл' : ''}
            </div>
            {data.note && <div className="text-xs text-gray-600 mt-1">{data.note}</div>}
          </div>
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
        <Header showBackButton onBack={() => setView('calendar')} />
        
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">{formatDisplayDate(selectedDate || '')}</h2>
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {showAddMenu && (
          <div className="bg-white rounded-2xl p-3 mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShowAddState(true); setShowAddMenu(false); }}
              className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Activity size={18} className="text-blue-600" />
              <span className="text-sm font-medium">Состояние</span>
            </button>
            <button
              onClick={() => { setShowAddSymptom(true); setShowAddMenu(false); }}
              className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <AlertCircle size={18} className="text-red-600" />
              <span className="text-sm font-medium">Симптом</span>
            </button>
            <button
              onClick={() => { setShowAddMedication(true); setShowAddMenu(false); }}
              className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Pill size={18} className="text-purple-600" />
              <span className="text-sm font-medium">Лекарство</span>
            </button>
            <button
              onClick={() => { setShowAddFeeding(true); setShowAddMenu(false); }}
              className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Utensils size={18} className="text-green-600" />
              <span className="text-sm font-medium">Питание</span>
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-bold text-black mb-4">Лог дня</h3>
          
          {timeline.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Нет записей за этот день</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry, idx) => (
                <div key={`${entry.type}-${entry.data.id}-${idx}`} className="p-3 rounded-xl bg-gray-50">
                  {renderTimelineEntry(entry)}
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddState && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить состояние</h3>
                <button onClick={() => setShowAddState(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
                  <input type="time" value={stateTime} onChange={(e) => setStateTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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

                <button onClick={handleAddState} disabled={!stateTime} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {showAddSymptom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить симптом</h3>
                <button onClick={() => setShowAddSymptom(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
                  <input type="time" value={symptomTime} onChange={(e) => setSymptomTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Симптом</label>
                  <input type="text" value={symptomName} onChange={(e) => setSymptomName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Например: Рвота, Дрожь..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Заметка (опционально)</label>
                  <textarea value={symptomNote} onChange={(e) => setSymptomNote(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} placeholder="Дополнительная информация..." />
                </div>

                <button onClick={handleAddSymptom} disabled={!symptomTime || !symptomName} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {showAddMedication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить лекарство</h3>
                <button onClick={() => setShowAddMedication(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
                  <input type="time" value={medicationTime} onChange={(e) => setMedicationTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                  <input type="text" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Например: Преднизолон" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дозировка</label>
                  <input type="text" value={medicationDosage} onChange={(e) => setMedicationDosage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Например: 0,3 мл" />
                </div>

                <button onClick={handleAddMedication} disabled={!medicationTime || !medicationName} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}

        {showAddFeeding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Добавить питание</h3>
                <button onClick={() => setShowAddFeeding(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
                  <input type="time" value={foodTime} onChange={(e) => setFoodTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                  <input type="text" value={foodName} onChange={(e) => setFoodName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Например: Корм, Вода" />
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

                <button onClick={handleAddFeeding} disabled={!foodTime || !foodName} className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Добавить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
