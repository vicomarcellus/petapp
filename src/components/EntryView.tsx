import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS, SYMPTOM_COLORS } from '../types';
import { formatDisplayDate } from '../utils';
import { ArrowLeft, Trash2, Plus, Edit3, X, Clock } from 'lucide-react';
import { QuickChat } from './QuickChat';
import { MedicationManager } from './MedicationManager';
import { addHistoryEntry } from '../services/history';

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const [showStateForm, setShowStateForm] = useState(false);
  const [stateScore, setStateScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stateTime, setStateTime] = useState('');
  const [stateNote, setStateNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [newSymptom, setNewSymptom] = useState('');
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

    // Обновляем среднее состояние дня
    await updateDayEntryAverage();

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

    // Сбрасываем форму
    setShowStateForm(false);
    setStateScore(3);
    setStateTime('');
    setStateNote('');
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
    if (!newSymptom.trim() || !selectedDate || !currentPetId || !currentUser) return;

    if (entry?.id) {
      // Обновляем существующую запись
      const currentSymptoms = entry.symptoms || [];
      if (!currentSymptoms.includes(newSymptom.trim())) {
        await db.dayEntries.update(entry.id, {
          symptoms: [...currentSymptoms, newSymptom.trim()],
          updated_at: Date.now(),
        });

        // Создаем тег симптома если его еще нет
        const existingTag = await db.symptomTags
          .where('name').equals(newSymptom.trim())
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
            name: newSymptom.trim(),
            petId: currentPetId,
            color: SYMPTOM_COLORS[colorIndex],
          });
        }
      }
    } else {
      // Создаем новую запись с симптомом
      await db.dayEntries.add({
        userId: currentUser.id,
        date: selectedDate,
        petId: currentPetId,
        state_score: 3,
        note: '',
        symptoms: [newSymptom.trim()],
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // Создаем тег симптома
      const existingTag = await db.symptomTags
        .where('name').equals(newSymptom.trim())
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
          name: newSymptom.trim(),
          petId: currentPetId,
          color: SYMPTOM_COLORS[colorIndex],
        });
      }
    }
    setNewSymptom('');
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

  // Если записи нет, показываем пустую форму (не создаем запись автоматически)
  const symptoms = entry?.symptoms || [];
  const hasEntry = !!entry;

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

          {/* Состояние - множественные записи */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Записи состояния
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  setStateTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                  setShowStateForm(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Добавить
              </button>
            </div>
            
            {stateEntries && stateEntries.length > 0 ? (
              <div className="space-y-2">
                {stateEntries.map((state) => (
                  <div
                    key={state.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-sm font-bold text-gray-600 flex items-center gap-1">
                        <Clock size={14} />
                        {state.time}
                      </div>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${STATE_COLORS[state.state_score]}, ${STATE_COLORS[state.state_score]}dd)` 
                      }}
                    >
                      <span className="text-xl font-bold text-white">
                        {state.state_score}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-black">
                        {STATE_LABELS[state.state_score]}
                      </div>
                      {state.note && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {state.note}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteState(state.id!)}
                      className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600 opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-4">
                Нет записей состояния
              </div>
            )}

            {showStateForm && (
              <div className="mt-3 p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
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
                    onClick={handleAddState}
                    disabled={!stateTime}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setShowStateForm(false);
                      setStateScore(3);
                      setStateTime('');
                      setStateNote('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Симптомы */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Симптомы
              </div>
            </div>

            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
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
            )}

            <form onSubmit={handleAddSymptom} className="flex gap-2">
              <input
                type="text"
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                placeholder="Добавить симптом..."
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:bg-white focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!newSymptom.trim()}
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </form>
          </div>

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

          {/* Лекарства */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Лекарства
              </div>
            </div>

            {medications && medications.length > 0 && (
              <div className="space-y-2 mb-3">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-lg font-bold text-black">{med.time}</div>
                    </div>
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: med.color }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-black text-sm">{med.medication_name}</div>
                      <div className="text-xs font-semibold text-gray-600">
                        {med.dosage}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditMed(med.id!)}
                      className="p-2 hover:bg-blue-100 rounded-full transition-all text-blue-600"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteMed(med.id!, e)}
                      className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showMedForm ? (
              <MedicationManager 
                date={selectedDate} 
                editingMedId={editingMedId} 
                onEditComplete={() => {
                  setEditingMedId(null);
                  setShowMedForm(false);
                }} 
              />
            ) : (
              <button
                onClick={() => setShowMedForm(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                + Добавить лекарство
              </button>
            )}
          </div>
        </div>
      </div>

      <QuickChat />
    </div>
  );
};
