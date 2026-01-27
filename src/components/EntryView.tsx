import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS, SYMPTOM_COLORS, MEDICATION_COLORS } from '../types';
import { formatDisplayDate } from '../utils';
import { ArrowLeft, Trash2, Plus, Edit3, X, Clock, Pill } from 'lucide-react';
import { QuickChat } from './QuickChat';
import { MedicationManager } from './MedicationManager';
import { addHistoryEntry } from '../services/history';

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addType, setAddType] = useState<'state' | 'symptom' | 'medication' | null>(null);
  
  // State form
  const [stateScore, setStateScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stateTime, setStateTime] = useState('');
  const [stateNote, setStateNote] = useState('');
  const [editingStateId, setEditingStateId] = useState<number | null>(null);
  
  // Symptom form
  const [symptomName, setSymptomName] = useState('');
  const [symptomTime, setSymptomTime] = useState('');
  const [symptomNote, setSymptomNote] = useState('');
  const [editingSymptomId, setEditingSymptomId] = useState<number | null>(null);
  
  // Medication form
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medTime, setMedTime] = useState('');
  const [medColor, setMedColor] = useState(MEDICATION_COLORS[0]);
  
  // General note
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  // Old medication manager (for editing)
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [showMedForm, setShowMedForm] = useState(false);

  const entry = useLiveQuery(
    async () => {
      if (!selectedDate || !currentPetId || !currentUser) return null;
      return await db.dayEntries
        .where('date').equals(selectedDate)
        .filter(e => e.petId === currentPetId && e.userId === currentUser.id)
        .first();
    },
    [selectedDate, currentPetId, currentUser]
  );

  const stateEntries = useLiveQuery(
    async () => {
      if (!selectedDate || !currentPetId || !currentUser) return [];
      const entries = await db.stateEntries.where('date').equals(selectedDate).toArray();
      return entries
        .filter(e => e.petId === currentPetId && e.userId === currentUser.id)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    },
    [selectedDate, currentPetId, currentUser]
  );

  const symptomEntries = useLiveQuery(
    async () => {
      if (!selectedDate || !currentPetId || !currentUser) return [];
      const entries = await db.symptomEntries.where('date').equals(selectedDate).toArray();
      return entries
        .filter(e => e.petId === currentPetId && e.userId === currentUser.id)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    },
    [selectedDate, currentPetId, currentUser]
  );

  const medications = useLiveQuery(
    async () => {
      if (!selectedDate || !currentPetId || !currentUser) return [];
      const entries = await db.medicationEntries.where('date').equals(selectedDate).toArray();
      return entries
        .filter(e => e.petId === currentPetId && e.userId === currentUser.id)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    },
    [selectedDate, currentPetId, currentUser]
  );

  const symptomTags = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      return await db.symptomTags
        .where('petId').equals(currentPetId)
        .filter(t => t.userId === currentUser.id)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  const savedMedications = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      return await db.medications
        .where('petId').equals(currentPetId)
        .filter(m => m.userId === currentUser.id)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  const updateDayEntryAverage = async () => {
    if (!selectedDate || !currentPetId || !currentUser) return;

    // Получаем все записи состояния за день
    const states = await db.stateEntries
      .where('date').equals(selectedDate)
      .filter(s => s.petId === currentPetId && s.userId === currentUser.id)
      .toArray();

    if (states.length === 0) {
      // Если нет записей состояния, удаляем или обнуляем state_score в dayEntry
      if (entry?.id) {
        await db.dayEntries.update(entry.id, {
          state_score: 3, // дефолтное значение
          updated_at: Date.now(),
        });
      }
      return;
    }

    // Вычисляем среднее
    const avgScore = Math.round(
      states.reduce((sum, s) => sum + s.state_score, 0) / states.length
    ) as 1 | 2 | 3 | 4 | 5;

    // Создаем или обновляем dayEntry
    if (entry?.id) {
      await db.dayEntries.update(entry.id, {
        state_score: avgScore,
        updated_at: Date.now(),
      });
    } else {
      await db.dayEntries.add({
        userId: currentUser.id,
        date: selectedDate,
        petId: currentPetId,
        state_score: avgScore,
        note: '',
        symptoms: [],
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  };

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !currentPetId || !currentUser || !stateTime) return;

    const [hours, minutes] = stateTime.split(':');
    const timestamp = new Date(selectedDate).setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (editingStateId) {
      // Обновляем существующую запись
      await db.stateEntries.update(editingStateId, {
        time: stateTime,
        timestamp,
        state_score: stateScore,
        note: stateNote || undefined,
      });
    } else {
      // Создаем новую запись
      const id = await db.stateEntries.add({
        userId: currentUser.id,
        petId: currentPetId,
        date: selectedDate,
        time: stateTime,
        timestamp,
        state_score: stateScore,
        note: stateNote || undefined,
        created_at: Date.now(),
      });

      // Логируем создание
      await addHistoryEntry({
        action: 'create',
        entityType: 'state',
        entityId: id as number,
        date: selectedDate,
        description: `Состояние ${stateTime}: ${stateScore}/5 (${STATE_LABELS[stateScore]})`,
        newValue: { state_score: stateScore, time: stateTime },
        source: 'manual',
      });
    }

    // Обновляем среднее состояние дня
    await updateDayEntryAverage();

    // Сбрасываем форму
    setAddType(null);
    setEditingStateId(null);
    setStateScore(3);
    setStateTime('');
    setStateNote('');
  };

  const handleEditState = (state: any) => {
    setEditingStateId(state.id);
    setStateScore(state.state_score);
    setStateTime(state.time);
    setStateNote(state.note || '');
    setAddType('state');
  };

  const handleDeleteState = async (id: number) => {
    if (confirm('Удалить эту запись состояния?')) {
      await db.stateEntries.delete(id);
      // Обновляем среднее состояние дня после удаления
      await updateDayEntryAverage();
    }
  };

  const handleAddSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomName.trim() || !symptomTime || !selectedDate || !currentPetId || !currentUser) return;

    const [hours, minutes] = symptomTime.split(':');
    const timestamp = new Date(selectedDate).setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (editingSymptomId) {
      // Обновляем существующую запись
      await db.symptomEntries.update(editingSymptomId, {
        time: symptomTime,
        timestamp,
        symptom: symptomName.trim(),
        note: symptomNote || undefined,
      });
    } else {
      // Добавляем новую запись симптома с временем
      await db.symptomEntries.add({
        userId: currentUser.id,
        petId: currentPetId,
        date: selectedDate,
        time: symptomTime,
        timestamp,
        symptom: symptomName.trim(),
        note: symptomNote || undefined,
        created_at: Date.now(),
      });

      // Создаем или обновляем dayEntry для совместимости
      if (!entry) {
        await db.dayEntries.add({
          userId: currentUser.id,
          date: selectedDate,
          petId: currentPetId,
          state_score: 3,
          note: '',
          symptoms: [symptomName.trim()],
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      } else {
        // Добавляем симптом в список если его еще нет
        const currentSymptoms = entry.symptoms || [];
        if (!currentSymptoms.includes(symptomName.trim())) {
          await db.dayEntries.update(entry.id!, {
            symptoms: [...currentSymptoms, symptomName.trim()],
            updated_at: Date.now(),
          });
        }
      }

      // Создаем тег симптома если его еще нет
      const existingTag = await db.symptomTags
        .where('name').equals(symptomName.trim())
        .filter(t => t.petId === currentPetId && t.userId === currentUser.id)
        .first();
      if (!existingTag) {
        const allTags = await db.symptomTags
          .where('petId').equals(currentPetId)
          .filter(t => t.userId === currentUser.id)
          .toArray();
        const colorIndex = allTags.length % SYMPTOM_COLORS.length;
        await db.symptomTags.add({
          userId: currentUser.id,
          name: symptomName.trim(),
          petId: currentPetId,
          color: SYMPTOM_COLORS[colorIndex],
        });
      }
    }

    // Сбрасываем форму
    setAddType(null);
    setEditingSymptomId(null);
    setSymptomName('');
    setSymptomTime('');
    setSymptomNote('');
  };

  const handleEditSymptom = (symptom: any) => {
    setEditingSymptomId(symptom.id);
    setSymptomName(symptom.symptom);
    setSymptomTime(symptom.time);
    setSymptomNote(symptom.note || '');
    setAddType('symptom');
  };

  const handleDeleteSymptom = async (id: number) => {
    if (confirm('Удалить эту запись симптома?')) {
      await db.symptomEntries.delete(id);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDosage.trim() || !medTime || !selectedDate || !currentPetId || !currentUser) return;

    const [hours, minutes] = medTime.split(':');
    const timestamp = new Date(selectedDate).setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Получаем или создаем тег лекарства
    let medTag = await db.medicationTags
      .where('name').equals(medName.trim())
      .filter(t => t.petId === currentPetId && t.userId === currentUser.id)
      .first();
    
    if (!medTag) {
      const allTags = await db.medicationTags
        .where('petId').equals(currentPetId)
        .filter(t => t.userId === currentUser.id)
        .toArray();
      const colorIndex = allTags.length % MEDICATION_COLORS.length;
      const tagId = await db.medicationTags.add({
        userId: currentUser.id,
        name: medName.trim(),
        petId: currentPetId,
        color: MEDICATION_COLORS[colorIndex],
      });
      medTag = await db.medicationTags.get(tagId);
    }

    const finalColor = medTag?.color || medColor;

    // Добавляем запись лекарства
    await db.medicationEntries.add({
      userId: currentUser.id,
      petId: currentPetId,
      date: selectedDate,
      time: medTime,
      timestamp,
      medication_name: medName.trim(),
      dosage: medDosage,
      color: finalColor,
    });

    // Сохраняем в список лекарств если новое
    const existing = savedMedications?.find(m => m.name === medName.trim());
    if (!existing) {
      await db.medications.add({
        userId: currentUser.id,
        name: medName.trim(),
        petId: currentPetId,
        color: finalColor,
        default_dosage: medDosage,
      });
    }

    // Сбрасываем форму
    setAddType(null);
    setMedName('');
    setMedDosage('');
    setMedTime('');
    setMedColor(MEDICATION_COLORS[0]);
  };

  const handleSelectSavedMed = (med: any) => {
    setMedName(med.name);
    setMedDosage(med.default_dosage || '');
    setMedColor(med.color);
  };

  const getSymptomColor = (symptomName: string) => {
    const tag = symptomTags?.find(t => t.name === symptomName);
    return tag?.color || '#6B7280';
  };

  const handleRemoveSymptom = async (symptom: string) => {
    if (!entry?.id) return;
    const currentSymptoms = entry.symptoms || [];
    await db.dayEntries.update(entry.id, {
      symptoms: currentSymptoms.filter(s => s !== symptom),
      updated_at: Date.now(),
    });
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedDate || !currentPetId || !currentUser) return;
    
    if (entry?.id) {
      // Обновляем существующую запись
      await db.dayEntries.update(entry.id, {
        note: noteText,
        updated_at: Date.now(),
      });
    } else {
      // Создаем новую запись с заметкой
      await db.dayEntries.add({
        userId: currentUser.id,
        date: selectedDate,
        petId: currentPetId,
        state_score: 3,
        note: noteText,
        symptoms: [],
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
    setEditingNote(false);
  };

  const handleDeleteMed = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить это лекарство?')) {
      await db.medicationEntries.delete(id);
    }
  };

  const handleEditMed = (id: number) => {
    setEditingMedId(id);
    setShowMedForm(true);
  };

  const handleDelete = async () => {
    if (!entry?.id || !selectedDate) return;
    
    if (confirm('Удалить эту запись? Будут удалены все состояния, лекарства и симптомы за этот день.')) {
      try {
        const entryId = entry.id;
        const dateToDelete = selectedDate;
        
        console.log('Deleting entry:', entryId, 'for date:', dateToDelete);
        
        // Удаляем все записи состояния за этот день для текущего питомца
        const states = await db.stateEntries.where('date').equals(dateToDelete).filter(s => s.petId === currentPetId).toArray();
        console.log('Found state entries to delete:', states.length);
        
        for (const state of states) {
          if (state.id) {
            console.log('Deleting state entry:', state.id);
            await db.stateEntries.delete(state.id);
          }
        }
        
        // Удаляем все лекарства за этот день для текущего питомца
        const meds = await db.medicationEntries.where('date').equals(dateToDelete).filter(m => m.petId === currentPetId).toArray();
        console.log('Found medications to delete:', meds.length);
        
        for (const med of meds) {
          if (med.id) {
            console.log('Deleting medication:', med.id);
            await db.medicationEntries.delete(med.id);
          }
        }
        
        // Удаляем запись
        console.log('Deleting day entry:', entryId);
        await db.dayEntries.delete(entryId);
        
        // Проверяем что запись удалена
        const checkEntry = await db.dayEntries.get(entryId);
        console.log('Entry after deletion:', checkEntry);
        
        const checkStates = await db.stateEntries.where('date').equals(dateToDelete).filter(s => s.petId === currentPetId).toArray();
        console.log('State entries after deletion:', checkStates.length);
        
        const checkMeds = await db.medicationEntries.where('date').equals(dateToDelete).filter(m => m.petId === currentPetId).toArray();
        console.log('Medications after deletion:', checkMeds.length);
        
        console.log('Deletion complete, reloading page');
        
        // Перезагружаем страницу чтобы обновить UI
        window.location.href = '/';
        
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Ошибка при удалении записи: ' + error);
      }
    }
  };

  const handleBack = () => {
    setView('calendar');
  };

  if (!selectedDate) return null;

  // Объединяем все записи в единую временную ленту
  type TimelineItem = {
    type: 'state' | 'symptom' | 'medication';
    time: string;
    timestamp: number;
    data: any;
  };

  const timelineItems: TimelineItem[] = [
    ...(stateEntries?.map(s => ({ type: 'state' as const, time: s.time, timestamp: s.timestamp, data: s })) || []),
    ...(symptomEntries?.map(s => ({ type: 'symptom' as const, time: s.time, timestamp: s.timestamp, data: s })) || []),
    ...(medications?.map(m => ({ type: 'medication' as const, time: m.time, timestamp: m.timestamp, data: m })) || []),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Собираем уникальные симптомы за день для блока сводки
  const symptoms = entry?.symptoms || [];
  const hasEntry = !!entry || timelineItems.length > 0;

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
            {formatDisplayDate(selectedDate)}
          </h1>
          {hasEntry && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Среднее состояние за день */}
          {stateEntries && stateEntries.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Среднее за день
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${STATE_COLORS[entry?.state_score || 3]}, ${STATE_COLORS[entry?.state_score || 3]}dd)` 
                  }}
                >
                  <span className="text-3xl font-bold text-white">
                    {entry?.state_score || 3}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {STATE_LABELS[entry?.state_score || 3]}
                  </div>
                  <div className="text-sm text-gray-400">
                    Из {stateEntries.length} {stateEntries.length === 1 ? 'записи' : 'записей'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Временная лента - все записи за день */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Лог дня
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  setStateTime(currentTime);
                  setSymptomTime(currentTime);
                  setMedTime(currentTime);
                  setShowAddMenu(!showAddMenu);
                }}
                className="px-3 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-xs font-medium"
              >
                + Добавить
              </button>
            </div>

            {/* Меню выбора типа записи */}
            {showAddMenu && !addType && (
              <div className="mb-3 p-3 bg-gray-50 rounded-2xl">
                <div className="text-xs font-semibold text-gray-500 mb-2">Что добавить?</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAddType('state')}
                    className="p-3 bg-white rounded-xl hover:bg-blue-50 transition-all text-center border-2 border-transparent hover:border-blue-200"
                  >
                    <div className="text-2xl mb-1">😊</div>
                    <div className="text-xs font-medium text-gray-700">Состояние</div>
                  </button>
                  <button
                    onClick={() => setAddType('symptom')}
                    className="p-3 bg-white rounded-xl hover:bg-red-50 transition-all text-center border-2 border-transparent hover:border-red-200"
                  >
                    <div className="text-2xl mb-1">🤒</div>
                    <div className="text-xs font-medium text-gray-700">Симптом</div>
                  </button>
                  <button
                    onClick={() => setAddType('medication')}
                    className="p-3 bg-white rounded-xl hover:bg-green-50 transition-all text-center border-2 border-transparent hover:border-green-200"
                  >
                    <div className="text-2xl mb-1">💊</div>
                    <div className="text-xs font-medium text-gray-700">Лекарство</div>
                  </button>
                </div>
              </div>
            )}

            {/* Форма добавления состояния */}
            {addType === 'state' && (
              <form onSubmit={handleAddState} className="mb-3 p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="text-sm font-semibold text-gray-700">
                  {editingStateId ? 'Редактировать состояние' : 'Добавить состояние'}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setStateScore(score as 1 | 2 | 3 | 4 | 5)}
                      className="group relative p-3 rounded-xl transition-all hover:scale-105"
                      style={{
                        background: stateScore === score
                          ? `linear-gradient(135deg, ${STATE_COLORS[score]}, ${STATE_COLORS[score]}dd)`
                          : '#fff',
                      }}
                    >
                      <div className={`text-xl font-bold mb-0.5 ${
                        stateScore === score ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                      }`}>
                        {score}
                      </div>
                      <div className={`text-[10px] font-medium ${
                        stateScore === score ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                      }`}>
                        {STATE_LABELS[score]}
                      </div>
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={stateTime}
                  onChange={(e) => setStateTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black outline-none text-sm"
                  required
                />
                <input
                  type="text"
                  value={stateNote}
                  onChange={(e) => setStateNote(e.target.value)}
                  placeholder="Заметка (опционально)..."
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!stateTime}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddType(null);
                      setShowAddMenu(false);
                      setEditingStateId(null);
                      setStateScore(3);
                      setStateTime('');
                      setStateNote('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* Форма добавления симптома */}
            {addType === 'symptom' && (
              <form onSubmit={handleAddSymptom} className="mb-3 p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="text-sm font-semibold text-gray-700">
                  {editingSymptomId ? 'Редактировать симптом' : 'Добавить симптом'}
                </div>
                <input
                  type="text"
                  value={symptomName}
                  onChange={(e) => setSymptomName(e.target.value)}
                  placeholder="Название симптома..."
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                  required
                  autoFocus
                />
                <input
                  type="time"
                  value={symptomTime}
                  onChange={(e) => setSymptomTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black outline-none text-sm"
                  required
                />
                <input
                  type="text"
                  value={symptomNote}
                  onChange={(e) => setSymptomNote(e.target.value)}
                  placeholder="Заметка (опционально)..."
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!symptomName.trim() || !symptomTime}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddType(null);
                      setShowAddMenu(false);
                      setEditingSymptomId(null);
                      setSymptomName('');
                      setSymptomTime('');
                      setSymptomNote('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* Форма добавления лекарства */}
            {addType === 'medication' && (
              <form onSubmit={handleAddMedication} className="mb-3 p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="text-sm font-semibold text-gray-700">Добавить лекарство</div>
                
                {/* Быстрый выбор */}
                {savedMedications && savedMedications.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Быстрый выбор
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {savedMedications.map((med) => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => handleSelectSavedMed(med)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: med.color }}
                        >
                          <Pill size={12} />
                          {med.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Название
                    </label>
                    <input
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="Преднизолон"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Дозировка
                    </label>
                    <input
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="0.3 мг"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Время
                  </label>
                  <input
                    type="time"
                    value={medTime}
                    onChange={(e) => setMedTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-black transition-all text-black outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Цвет
                  </label>
                  <div className="flex gap-1.5">
                    {MEDICATION_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setMedColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          medColor === color ? 'ring-2 ring-black scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!medName.trim() || !medDosage.trim() || !medTime}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddType(null);
                      setShowAddMenu(false);
                      setMedName('');
                      setMedDosage('');
                      setMedTime('');
                      setMedColor(MEDICATION_COLORS[0]);
                    }}
                    className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* Временная лента */}
            {timelineItems.length > 0 ? (
              <div className="space-y-2">
                {timelineItems.map((item, index) => (
                  <div
                    key={`${item.type}-${item.data.id}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-sm font-bold text-gray-600 flex items-center gap-1">
                        <Clock size={14} />
                        {item.time}
                      </div>
                    </div>

                    {item.type === 'state' && (
                      <>
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                          style={{ 
                            background: `linear-gradient(135deg, ${STATE_COLORS[item.data.state_score]}, ${STATE_COLORS[item.data.state_score]}dd)` 
                          }}
                        >
                          <span className="text-xl font-bold text-white">
                            {item.data.state_score}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-black">
                            {STATE_LABELS[item.data.state_score]}
                          </div>
                          {item.data.note && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {item.data.note}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditState(item.data)}
                          className="p-2 hover:bg-blue-100 rounded-full transition-all text-blue-600 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteState(item.data.id!)}
                          className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}

                    {item.type === 'symptom' && (
                      <>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                          🤒
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-black">
                            {item.data.symptom}
                          </div>
                          {item.data.note && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {item.data.note}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditSymptom(item.data)}
                          className="p-2 hover:bg-blue-100 rounded-full transition-all text-blue-600 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSymptom(item.data.id!)}
                          className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}

                    {item.type === 'medication' && (
                      <>
                        <div
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.data.color }}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-black text-sm">{item.data.medication_name}</div>
                          <div className="text-xs font-semibold text-gray-600">
                            {item.data.dosage}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditMed(item.data.id!)}
                          className="p-2 hover:bg-blue-100 rounded-full transition-all text-blue-600 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteMed(item.data.id!, e)}
                          className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-8">
                Нет записей за этот день
              </div>
            )}
          </div>

          {/* Симптомы - сводка за день */}
          {symptoms.length > 0 && (
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Симптомы за день
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: getSymptomColor(symptom) }}
                  >
                    {symptom}
                    <button
                      onClick={() => handleRemoveSymptom(symptom)}
                      className="hover:scale-110 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Заметка */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Заметка
              </div>
              {!editingNote && entry?.note && (
                <button
                  onClick={() => {
                    setNoteText(entry.note);
                    setEditingNote(true);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Edit3 size={14} className="text-gray-600" />
                </button>
              )}
            </div>

            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-black transition-all text-black placeholder-gray-400 resize-none outline-none text-sm"
                  rows={3}
                  placeholder="Опишите состояние..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : entry?.note ? (
              <div className="text-sm text-gray-700 leading-relaxed">
                {entry.note}
              </div>
            ) : (
              <button
                onClick={() => {
                  setNoteText('');
                  setEditingNote(true);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Добавить заметку...
              </button>
            )}
          </div>

          {/* Лекарства - сводка за день */}
          {medications && medications.length > 0 && (
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Лекарства за день
                </div>
              </div>

              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-gray-50"
                  >
                    <div className="flex-shrink-0 text-xs font-bold text-gray-600">
                      {med.time}
                    </div>
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: med.color }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-black text-sm">{med.medication_name}</div>
                      <div className="text-xs text-gray-600">{med.dosage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Форма добавления лекарства */}
          {showMedForm && (
            <div className="bg-white rounded-2xl p-4">
              <MedicationManager 
                date={selectedDate} 
                editingMedId={editingMedId} 
                onEditComplete={() => {
                  setEditingMedId(null);
                  setShowMedForm(false);
                }} 
              />
            </div>
          )}
        </div>
      </div>

      <QuickChat />
    </div>
  );
};
