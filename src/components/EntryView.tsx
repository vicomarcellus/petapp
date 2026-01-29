import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { formatDisplayDate } from '../utils';
import { Trash2, Plus, X } from 'lucide-react';
import { Header } from './Header';
import type { DayEntry, StateEntry, SymptomEntry, MedicationEntry } from '../types';

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const [entry, setEntry] = useState<DayEntry | null>(null);
  const [stateEntries, setStateEntries] = useState<StateEntry[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddState, setShowAddState] = useState(false);
  const [stateScore, setStateScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stateTime, setStateTime] = useState('');
  const [stateNote, setStateNote] = useState('');

  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [symptomName, setSymptomName] = useState('');
  const [symptomTime, setSymptomTime] = useState('');
  const [symptomNote, setSymptomNote] = useState('');

  const [showAddMedication, setShowAddMedication] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState('');
  const [medicationTime, setMedicationTime] = useState('');

  useEffect(() => {
    if (selectedDate && currentPetId && currentUser) {
      loadData();
    }
  }, [selectedDate, currentPetId, currentUser]);

  const loadData = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;
    
    try {
      setLoading(true);
      const [dayRes, stateRes, symptomRes, medRes] = await Promise.all([
        supabase.from('day_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).single(),
        supabase.from('state_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true }),
        supabase.from('symptom_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true }),
        supabase.from('medication_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).order('timestamp', { ascending: true })
      ]);

      if (dayRes.data) setEntry(dayRes.data);
      if (stateRes.data) setStateEntries(stateRes.data);
      if (symptomRes.data) setSymptomEntries(symptomRes.data);
      if (medRes.data) setMedicationEntries(medRes.data);
    } catch (error) {
      console.error('Error loading entry data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      await updateDayEntry();
      setShowAddState(false);
      setStateTime('');
      setStateNote('');
      setStateScore(3);
      loadData();
    } catch (error) {
      console.error('Error adding state:', error);
    }
  };

  const updateDayEntry = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;
    
    const { data: states } = await supabase.from('state_entries').select('state_score').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate);
    if (!states || states.length === 0) return;
    
    const avgScore = Math.round(states.reduce((sum, s) => sum + s.state_score, 0) / states.length) as 1 | 2 | 3 | 4 | 5;
    const { data: existing } = await supabase.from('day_entries').select('id').eq('user_id', currentUser.id).eq('pet_id', currentPetId).eq('date', selectedDate).single();

    if (existing) {
      await supabase.from('day_entries').update({ state_score: avgScore }).eq('id', existing.id);
    } else {
      await supabase.from('day_entries').insert({ user_id: currentUser.id, pet_id: currentPetId, date: selectedDate, state_score: avgScore, note: '', symptoms: [] });
    }
  };

  const handleDeleteState = async (id: number) => {
    if (!confirm('Удалить запись?')) return;
    await supabase.from('state_entries').delete().eq('id', id);
    await updateDayEntry();
    loadData();
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

  const handleDeleteSymptom = async (id: number) => {
    if (!confirm('Удалить симптом?')) return;
    await supabase.from('symptom_entries').delete().eq('id', id);
    loadData();
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

  const handleDeleteMedication = async (id: number) => {
    if (!confirm('Удалить лекарство?')) return;
    await supabase.from('medication_entries').delete().eq('id', id);
    loadData();
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
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-black">{formatDisplayDate(selectedDate || '')}</h2>
        </div>

        <div className="bg-white rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-black">Состояние</h3>
            <button onClick={() => setShowAddState(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Plus size={20} className="text-black" />
            </button>
          </div>

          {stateEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Нет записей состояния</p>
          ) : (
            <div className="space-y-2">
              {stateEntries.map((state) => (
                <div key={state.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-sm font-medium text-gray-600 w-16">{state.time}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: STATE_COLORS[state.state_score] }}>{state.state_score}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black">{STATE_LABELS[state.state_score]}</div>
                    {state.note && <div className="text-xs text-gray-600 mt-1">{state.note}</div>}
                  </div>
                  <button onClick={() => handleDeleteState(state.id!)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-black">Симптомы</h3>
            <button onClick={() => setShowAddSymptom(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Plus size={20} className="text-black" />
            </button>
          </div>

          {symptomEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Нет симптомов</p>
          ) : (
            <div className="space-y-2">
              {symptomEntries.map((symptom) => (
                <div key={symptom.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-sm font-medium text-gray-600 w-16">{symptom.time}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black">{symptom.symptom}</div>
                    {symptom.note && <div className="text-xs text-gray-600 mt-1">{symptom.note}</div>}
                  </div>
                  <button onClick={() => handleDeleteSymptom(symptom.id!)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-black">Лекарства</h3>
            <button onClick={() => setShowAddMedication(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Plus size={20} className="text-black" />
            </button>
          </div>

          {medicationEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Нет лекарств</p>
          ) : (
            <div className="space-y-2">
              {medicationEntries.map((med) => (
                <div key={med.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-sm font-medium text-gray-600 w-16">{med.time}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black">{med.medication_name}</div>
                    <div className="text-xs text-gray-600 mt-1">{med.dosage}</div>
                  </div>
                  <button onClick={() => handleDeleteMedication(med.id!)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600">
                    <Trash2 size={16} />
                  </button>
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
      </div>
    </div>
  );
};
