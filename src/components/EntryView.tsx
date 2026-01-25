import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { STATE_COLORS, STATE_LABELS, SYMPTOM_COLORS } from '../types';
import { formatDisplayDate } from '../utils';
import { ArrowLeft, Trash2, Plus, Edit3, X } from 'lucide-react';
import { QuickChat } from './QuickChat';
import { MedicationManager } from './MedicationManager';
import { addHistoryEntry } from '../services/history';

export const EntryView = () => {
  const { selectedDate, setView, currentPetId, currentUser } = useStore();
  const [showStateSelector, setShowStateSelector] = useState(false);
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

  const handleStateChange = async (newScore: 1 | 2 | 3 | 4 | 5) => {
    if (!currentUser) return;
    const oldScore = entry?.state_score;
    
    if (entry?.id) {
      // Обновляем существующую запись
      await db.dayEntries.update(entry.id, {
        state_score: newScore,
        updated_at: Date.now(),
      });
      
      // Логируем изменение
      await addHistoryEntry({
        action: 'update',
        entityType: 'state',
        entityId: entry.id,
        date: selectedDate || undefined,
        description: `Состояние изменено: ${oldScore}/5 → ${newScore}/5 (${STATE_LABELS[newScore]})`,
        oldValue: { state_score: oldScore },
        newValue: { state_score: newScore },
        source: 'manual',
      });
    } else if (selectedDate && currentPetId) {
      // Создаем новую запись
      const id = await db.dayEntries.add({
        userId: currentUser.id,
        date: selectedDate,
        petId: currentPetId,
        state_score: newScore,
        note: '',
        symptoms: [],
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      
      // Логируем создание
      await addHistoryEntry({
        action: 'create',
        entityType: 'state',
        entityId: id as number,
        date: selectedDate,
        description: `Состояние установлено: ${newScore}/5 (${STATE_LABELS[newScore]})`,
        newValue: { state_score: newScore },
        source: 'manual',
      });
    }
    setShowStateSelector(false);
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
    
    if (confirm('Удалить эту запись?')) {
      try {
        const entryId = entry.id;
        const dateToDelete = selectedDate;
        
        console.log('Deleting entry:', entryId, 'for date:', dateToDelete);
        
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
          {/* Состояние */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Состояние
              </div>
              <button
                onClick={() => setShowStateSelector(!showStateSelector)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Изменить
              </button>
            </div>
            
            {!showStateSelector ? (
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
                  <div className="text-xl font-bold text-black">
                    {STATE_LABELS[entry?.state_score || 3]}
                  </div>
                  <div className="text-sm text-gray-500">
                    Оценка состояния
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleStateChange(score as 1 | 2 | 3 | 4 | 5)}
                    className="group relative p-4 rounded-xl transition-all hover:scale-110"
                    style={{
                      background: (entry?.state_score || 3) === score
                        ? `linear-gradient(135deg, ${STATE_COLORS[score]}, ${STATE_COLORS[score]}dd)`
                        : '#f5f5f5',
                    }}
                  >
                    <div className={`text-2xl font-bold mb-1 ${
                      (entry?.state_score || 3) === score ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      {score}
                    </div>
                    <div className={`text-xs font-medium ${
                      (entry?.state_score || 3) === score ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      {STATE_LABELS[score]}
                    </div>
                  </button>
                ))}
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
