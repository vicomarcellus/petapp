import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { parseEntryFromText } from '../services/ai';
import { analyzeTrends, generateContextualHints } from '../services/aiAnalytics';
import { db } from '../db';
import { formatDate } from '../utils';
import { format } from 'date-fns';
import { DayEntry, MEDICATION_COLORS, SYMPTOM_COLORS } from '../types';
import { useStore } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';

// Функция для обновления среднего состояния в DayEntry
async function updateDayEntryAverage(date: string, petId: number, userId: number) {
  const stateEntries = await db.stateEntries
    .where('date').equals(date)
    .filter(e => e.petId === petId && e.userId === userId)
    .toArray();
  
  if (stateEntries.length === 0) {
    return;
  }
  
  // Вычисляем среднее
  const sum = stateEntries.reduce((acc, e) => acc + e.state_score, 0);
  const average = Math.round(sum / stateEntries.length) as 1 | 2 | 3 | 4 | 5;
  
  // Обновляем или создаем DayEntry
  const existingEntry = await db.dayEntries
    .where('date').equals(date)
    .filter(e => e.petId === petId && e.userId === userId)
    .first();
  
  if (existingEntry) {
    await db.dayEntries.update(existingEntry.id!, {
      state_score: average,
      updated_at: Date.now(),
    });
  } else {
    await db.dayEntries.add({
      userId,
      petId,
      date,
      state_score: average,
      note: '',
      symptoms: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }
}

export const QuickChat = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [navigateToDate, setNavigateToDate] = useState<string | null>(null); // Дата для кнопки перехода
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const { selectedDate, view, setSelectedDate, setView, currentPetId, currentUser } = useStore();
  const currentYear = useStore(state => state.currentYear);
  const currentMonth = useStore(state => state.currentMonth);

  // Проверка авторизации
  if (!currentUser) {
    return null;
  }

  // Получаем данные для контекстных подсказок - только последние 30 дней
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

  const dayEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.dayEntries
        .where('petId').equals(currentPetId)
        .filter(e => e.date >= startDateStr)
        .toArray();
    },
    [currentPetId, startDateStr]
  );
  const medicationEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.medicationEntries
        .where('petId').equals(currentPetId)
        .filter(e => e.date >= startDateStr)
        .toArray();
    },
    [currentPetId, startDateStr]
  );
  
  const targetDate = (view === 'add' || view === 'edit' || view === 'view') && selectedDate 
    ? selectedDate 
    : formatDate(new Date());
  
  const currentEntry = dayEntries?.find(e => e.date === targetDate);
  const currentMeds = medicationEntries?.filter(m => m.date === targetDate);

  useEffect(() => {
    // Проверка поддержки Web Speech API
    const hasSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(hasSupport);

    if (hasSupport) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.maxAlternatives = 1;

      // Увеличиваем время ожидания речи
      if (recognitionRef.current.hasOwnProperty('speechTimeout')) {
        recognitionRef.current.speechTimeout = 10000; // 10 секунд
      }

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setFeedback('Слушаю...');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Обновляем полный текст
        const fullTranscript = (currentTranscriptRef.current + ' ' + finalTranscript + ' ' + interimTranscript).trim();
        
        setInput(fullTranscript);
        
        // Сохраняем только финальную часть
        if (finalTranscript) {
          currentTranscriptRef.current = (currentTranscriptRef.current + ' ' + finalTranscript).trim();
        }

        // Сбрасываем таймер молчания при получении новых результатов
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Запускаем новый таймер на 2 секунды - просто останавливаем запись
        if (fullTranscript.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {
                // Игнорируем ошибку
              }
            }
          }, 2000);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMsg = 'Ошибка распознавания';
        let shouldRestart = false;
        
        if (event.error === 'no-speech') {
          errorMsg = 'Речь не обнаружена. Попробуйте еще раз';
          shouldRestart = true; // Автоматически перезапускаем
        } else if (event.error === 'not-allowed') {
          errorMsg = 'Доступ к микрофону запрещен';
          setIsRecording(false);
        } else if (event.error === 'network') {
          errorMsg = 'Ошибка сети';
          setIsRecording(false);
        } else if (event.error === 'aborted') {
          // Игнорируем ошибку прерывания
          return;
        } else {
          setIsRecording(false);
        }
        
        setFeedback(errorMsg);
        setIsError(true);
        
        // Автоматически перезапускаем при no-speech
        if (shouldRestart && isRecording) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setFeedback('Попробуйте еще раз...');
              setIsError(false);
            } catch (e) {
              console.error('Failed to restart:', e);
            }
          }, 500);
        } else {
          setTimeout(() => {
            setFeedback(null);
            setIsError(false);
          }, 3000);
        }
      };

      recognitionRef.current.onend = () => {
        // Очищаем таймер молчания
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        
        setIsRecording(false);
        
        if (feedback === '🎤 Слушаю...' || feedback === 'Слушаю...') {
          setFeedback(null);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [feedback]);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      setFeedback('Голосовой ввод не поддерживается в этом браузере');
      setIsError(true);
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 3000);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      // Очищаем таймер молчания
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      try {
        // Очищаем предыдущий текст
        setInput('');
        currentTranscriptRef.current = '';
        
        // Запрашиваем разрешение на микрофон
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
      } catch (err) {
        console.error('Microphone access error:', err);
        setFeedback('Не удалось получить доступ к микрофону');
        setIsError(true);
        setTimeout(() => {
          setFeedback(null);
          setIsError(false);
        }, 3000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Останавливаем запись если она активна
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    
    // Очищаем таймер
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (!input.trim()) {
      return;
    }
    
    if (!currentPetId) {
      setIsError(true);
      setFeedback('Сначала добавьте питомца в настройках');
      setTimeout(() => {
        setIsError(false);
        setFeedback(null);
      }, 3000);
      return;
    }
    
    if (loading) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    setShowHints(false); // Скрываем подсказки при отправке

    try {
      // Если мы на странице редактирования/просмотра, используем выбранную дату
      const targetDate = (view === 'add' || view === 'edit' || view === 'view') && selectedDate 
        ? selectedDate 
        : formatDate(new Date());
      
      const existingEntry = await db.dayEntries.where('date').equals(targetDate).filter(e => e.petId === currentPetId).first();
      const existingMeds = await db.medicationEntries.where('date').equals(targetDate).filter(m => m.petId === currentPetId).toArray();
      const existingStates = await db.stateEntries.where('date').equals(targetDate).filter(s => s.petId === currentPetId && s.userId === currentUser.id).toArray();
      const existingSymptoms = await db.symptomEntries.where('date').equals(targetDate).filter(s => s.petId === currentPetId && s.userId === currentUser.id).toArray();
      
      // Формируем контекст для AI с реальными данными
      const context = {
        hasEntry: !!existingEntry,
        currentState: existingEntry?.state_score,
        hasNote: !!(existingEntry?.note && existingEntry.note.length > 0),
        existingSymptoms: existingSymptoms.map(s => `${s.symptom} в ${s.time}`),
        existingMedications: existingMeds.map(m => `${m.medication_name} ${m.dosage} в ${m.time}`),
        existingStates: existingStates.map(s => `${s.state_score}/5 в ${s.time}`),
        currentView: view,
        currentDate: targetDate,
        currentMonth: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`, // YYYY-MM
      };
      
      const parsed = await parseEntryFromText(input, context);
      
      let message = '';
      const action = parsed.action || 'add';

      // ОБРАБОТКА ОШИБОК
      if (action === 'error') {
        setFeedback(parsed.message || 'Не могу выполнить команду');
        setIsError(true);
        setTimeout(() => {
          setFeedback(null);
          setIsError(false);
        }, 5000);
        return; // setLoading и setInput в finally
      }

      // РЕЖИМ ЧАТА - AI отвечает на вопросы
      if (action === 'chat') {
        setFeedback(parsed.message || 'Чем могу помочь?');
        setIsError(false);
        
        // Сохраняем дату для кнопки перехода
        if (parsed.navigateToDate && parsed.showDetails) {
          setNavigateToDate(parsed.navigateToDate);
        } else {
          setNavigateToDate(null);
        }
        
        // Просто показываем ответ без автоматического перехода
        setTimeout(() => {
          setFeedback(null);
          setNavigateToDate(null);
        }, 10000); // Показываем дольше чтобы успеть нажать кнопку
        
        return; // setLoading и setInput в finally
      }

      // КОМАНДЫ УДАЛЕНИЯ
      if (action === 'remove') {
        const normalizeText = (text: string) => 
          text.toLowerCase().replace(/[-\s]/g, '').trim();
        
        if (parsed.target === 'symptom' && parsed.itemName) {
          // Удаляем все записи симптома из SymptomEntry
          const searchTerm = normalizeText(parsed.itemName);
          const symptoms = await db.symptomEntries
            .where('date').equals(targetDate)
            .filter(s => {
              if (s.petId !== currentPetId || s.userId !== currentUser.id) return false;
              const symptomName = normalizeText(s.symptom);
              return symptomName.includes(searchTerm) || searchTerm.includes(symptomName);
            })
            .toArray();
          
          if (symptoms.length > 0) {
            for (const symptom of symptoms) {
              if (symptom.id) await db.symptomEntries.delete(symptom.id);
            }
            message = `Симптом "${symptoms[0].symptom}" удален (${symptoms.length} ${symptoms.length === 1 ? 'запись' : 'записей'})`;
          } else {
            message = `Симптом "${parsed.itemName}" не найден`;
          }
        } else if (parsed.target === 'state') {
          // Удаляем конкретную запись состояния по времени или все
          if (parsed.time) {
            const stateEntry = await db.stateEntries
              .where('date').equals(targetDate)
              .filter(s => s.petId === currentPetId && s.userId === currentUser.id && s.time === parsed.time)
              .first();
            
            if (stateEntry && stateEntry.id) {
              await db.stateEntries.delete(stateEntry.id);
              await updateDayEntryAverage(targetDate, currentPetId, currentUser.id);
              message = `Состояние в ${parsed.time} удалено`;
            } else {
              message = `Состояние в ${parsed.time} не найдено`;
            }
          } else {
            // Удаляем все записи состояния
            const states = await db.stateEntries
              .where('date').equals(targetDate)
              .filter(s => s.petId === currentPetId && s.userId === currentUser.id)
              .toArray();
            
            for (const state of states) {
              if (state.id) await db.stateEntries.delete(state.id);
            }
            
            // Обновляем среднее (или удаляем если записей нет)
            await updateDayEntryAverage(targetDate, currentPetId, currentUser.id);
            message = `Все записи состояния удалены (${states.length} ${states.length === 1 ? 'запись' : 'записей'})`;
          }
        } else if (parsed.target === 'medication' && parsed.itemName) {
          // Гибкий поиск лекарства
          const searchTerm = normalizeText(parsed.itemName);
          const meds = await db.medicationEntries
            .where('date').equals(targetDate)
            .filter(m => {
              if (m.petId !== currentPetId) return false;
              const medName = normalizeText(m.medication_name);
              return medName.includes(searchTerm) || searchTerm.includes(medName);
            })
            .toArray();
          
          if (meds.length > 0) {
            for (const med of meds) {
              if (med.id) await db.medicationEntries.delete(med.id);
            }
            message = `Лекарство "${meds[0].medication_name}" удалено (${meds.length} ${meds.length === 1 ? 'запись' : 'записей'})`;
          } else {
            message = `Лекарство "${parsed.itemName}" не найдено`;
          }
        } else if (parsed.target === 'entry') {
          // Удаляем всю запись за день
          const dateToDelete = parsed.date || targetDate;
          const entryToDelete = await db.dayEntries.where('date').equals(dateToDelete).filter(e => e.petId === currentPetId).first();
          
          if (entryToDelete) {
            // Удаляем все связанные данные
            const meds = await db.medicationEntries.where('date').equals(dateToDelete).filter(m => m.petId === currentPetId).toArray();
            for (const med of meds) {
              if (med.id) await db.medicationEntries.delete(med.id);
            }
            
            const states = await db.stateEntries.where('date').equals(dateToDelete).filter(s => s.petId === currentPetId && s.userId === currentUser.id).toArray();
            for (const state of states) {
              if (state.id) await db.stateEntries.delete(state.id);
            }
            
            const symptoms = await db.symptomEntries.where('date').equals(dateToDelete).filter(s => s.petId === currentPetId && s.userId === currentUser.id).toArray();
            for (const symptom of symptoms) {
              if (symptom.id) await db.symptomEntries.delete(symptom.id);
            }
            
            await db.dayEntries.delete(entryToDelete.id!);
            message = `Запись за ${dateToDelete} удалена`;
          } else {
            message = `Запись за ${dateToDelete} не найдена`;
          }
        }
      }
      
      // КОМАНДЫ ОЧИСТКИ
      else if (action === 'clear') {
        if (parsed.target === 'symptom') {
          // Удаляем все записи симптомов из SymptomEntry
          const symptoms = await db.symptomEntries
            .where('date').equals(targetDate)
            .filter(s => s.petId === currentPetId && s.userId === currentUser.id)
            .toArray();
          
          for (const symptom of symptoms) {
            if (symptom.id) await db.symptomEntries.delete(symptom.id);
          }
          message = `Все симптомы удалены (${symptoms.length} ${symptoms.length === 1 ? 'запись' : 'записей'})`;
        } else if (parsed.target === 'state') {
          // Удаляем все записи состояния из StateEntry
          const states = await db.stateEntries
            .where('date').equals(targetDate)
            .filter(s => s.petId === currentPetId && s.userId === currentUser.id)
            .toArray();
          
          for (const state of states) {
            if (state.id) await db.stateEntries.delete(state.id);
          }
          
          // Обновляем среднее (или удаляем DayEntry если записей нет)
          await updateDayEntryAverage(targetDate, currentPetId, currentUser.id);
          message = `Все записи состояния удалены (${states.length} ${states.length === 1 ? 'запись' : 'записей'})`;
        } else if (parsed.target === 'medication') {
          const meds = await db.medicationEntries.where('date').equals(targetDate).filter(m => m.petId === currentPetId).toArray();
          for (const med of meds) {
            if (med.id) await db.medicationEntries.delete(med.id);
          }
          message = `Все лекарства удалены (${meds.length} ${meds.length === 1 ? 'запись' : 'записей'})`;
        } else if (parsed.target === 'note' && existingEntry) {
          await db.dayEntries.update(existingEntry.id!, {
            note: '',
            updated_at: Date.now(),
          });
          message = 'Заметка очищена';
        }
      }
      
      // КОМАНДЫ ОБНОВЛЕНИЯ
      else if (action === 'update') {
        if (parsed.target === 'state' && parsed.state_score) {
          if (existingEntry) {
            await db.dayEntries.update(existingEntry.id!, {
              state_score: parsed.state_score,
              updated_at: Date.now(),
            });
          } else {
            await db.dayEntries.add({
              userId: currentUser.id,
              date: targetDate,
              petId: currentPetId,
              state_score: parsed.state_score,
              note: '',
              symptoms: [],
              created_at: Date.now(),
              updated_at: Date.now(),
            });
          }
          message = `Состояние изменено на ${parsed.state_score}/5`;
        } else if (parsed.target === 'note' && parsed.note) {
          if (existingEntry) {
            await db.dayEntries.update(existingEntry.id!, {
              note: parsed.note,
              updated_at: Date.now(),
            });
          } else {
            await db.dayEntries.add({
              userId: currentUser.id,
              date: targetDate,
              petId: currentPetId,
              state_score: 3,
              note: parsed.note,
              symptoms: [],
              created_at: Date.now(),
              updated_at: Date.now(),
            });
          }
          message = 'Заметка обновлена';
        }
      }
      
      // КОМАНДЫ ДОБАВЛЕНИЯ (по умолчанию)
      else {
        // Функция нормализации текста для сравнения
        const normalizeText = (text: string) => 
          text.toLowerCase().replace(/[-\s]/g, '').trim();
        
        // Обрабатываем записи состояния (новая структура)
        if (parsed.states && parsed.states.length > 0) {
          for (const state of parsed.states) {
            // Парсим время для создания timestamp
            const [hours, minutes] = state.time.split(':').map(Number);
            const dateObj = new Date(targetDate);
            dateObj.setHours(hours, minutes, 0, 0);
            
            await db.stateEntries.add({
              userId: currentUser.id,
              petId: currentPetId,
              date: targetDate,
              time: state.time,
              timestamp: dateObj.getTime(),
              state_score: state.score,
              note: state.note,
              created_at: Date.now(),
            });
          }
          
          // Обновляем среднее состояние в DayEntry
          await updateDayEntryAverage(targetDate, currentPetId, currentUser.id);
        }
        
        // Обрабатываем записи симптомов (новая структура)
        if (parsed.symptoms && parsed.symptoms.length > 0) {
          for (const symptom of parsed.symptoms) {
            // Парсим время для создания timestamp
            const [hours, minutes] = symptom.time.split(':').map(Number);
            const dateObj = new Date(targetDate);
            dateObj.setHours(hours, minutes, 0, 0);
            
            // Создаем или получаем тег симптома
            const normalizedSymptomName = normalizeText(symptom.name);
            const allSymptomTags = await db.symptomTags
              .where('petId').equals(currentPetId)
              .filter(t => t.userId === currentUser.id)
              .toArray();
            let symptomTag = allSymptomTags.find(tag => 
              normalizeText(tag.name) === normalizedSymptomName
            );
            
            if (!symptomTag) {
              const colorIndex = allSymptomTags.length % SYMPTOM_COLORS.length;
              const tagId = await db.symptomTags.add({
                userId: currentUser.id,
                name: symptom.name,
                petId: currentPetId,
                color: SYMPTOM_COLORS[colorIndex],
              });
              symptomTag = await db.symptomTags.get(tagId);
            }
            
            await db.symptomEntries.add({
              userId: currentUser.id,
              petId: currentPetId,
              date: targetDate,
              time: symptom.time,
              timestamp: dateObj.getTime(),
              symptom: symptomTag?.name || symptom.name,
              note: symptom.note,
              created_at: Date.now(),
            });
          }
        }
        
        // Обрабатываем лекарства
        if (parsed.medications && parsed.medications.length > 0) {
          for (const med of parsed.medications) {
            // Парсим время для создания timestamp
            const [hours, minutes] = med.time.split(':').map(Number);
            const dateObj = new Date(targetDate);
            dateObj.setHours(hours, minutes, 0, 0);
            
            // Нормализуем название для поиска
            const normalizedMedName = normalizeText(med.name);
            
            // Получаем или создаем тег лекарства (гибкий поиск)
            const allMedTags = await db.medicationTags
              .where('petId').equals(currentPetId)
              .filter(t => t.userId === currentUser.id)
              .toArray();
            let medTag = allMedTags.find(tag => 
              normalizeText(tag.name) === normalizedMedName
            );
            
            if (!medTag) {
              const colorIndex = allMedTags.length % MEDICATION_COLORS.length;
              const tagId = await db.medicationTags.add({
                userId: currentUser.id,
                name: med.name,
                petId: currentPetId,
                color: MEDICATION_COLORS[colorIndex],
              });
              medTag = await db.medicationTags.get(tagId);
            }

            const medColor = medTag?.color || MEDICATION_COLORS[0];

            // Добавляем лекарство
            await db.medicationEntries.add({
              userId: currentUser.id,
              date: targetDate,
              petId: currentPetId,
              medication_name: medTag?.name || med.name,
              dosage: med.dosage,
              time: med.time,
              timestamp: dateObj.getTime(),
              color: medColor,
            });

            // Сохраняем в справочник (гибкий поиск)
            const allMeds = await db.medications
              .where('petId').equals(currentPetId)
              .filter(m => m.userId === currentUser.id)
              .toArray();
            const existing = allMeds.find(m => 
              normalizeText(m.name) === normalizedMedName
            );
            
            if (!existing) {
              await db.medications.add({
                userId: currentUser.id,
                name: medTag?.name || med.name,
                petId: currentPetId,
                color: medColor,
                default_dosage: med.dosage,
              });
            }
          }
        }
        
        // Обрабатываем заметку (если есть)
        if (parsed.note) {
          if (existingEntry) {
            const newNote = parsed.note.length > 20 
              ? parsed.note
              : existingEntry.note 
                ? `${existingEntry.note}. ${parsed.note}`
                : parsed.note;
            
            await db.dayEntries.update(existingEntry.id!, {
              note: newNote,
              updated_at: Date.now(),
            });
          } else {
            // Создаем запись дня если её нет
            await db.dayEntries.add({
              userId: currentUser.id,
              date: targetDate,
              petId: currentPetId,
              state_score: 3, // Дефолтное значение
              note: parsed.note,
              symptoms: [],
              created_at: Date.now(),
              updated_at: Date.now(),
            });
          }
        }
        
        // Обработка старого формата для обратной совместимости
        if (parsed.state_score && !parsed.states) {
          // Старый формат - создаем StateEntry с текущим временем
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          await db.stateEntries.add({
            userId: currentUser.id,
            petId: currentPetId,
            date: targetDate,
            time: currentTime,
            timestamp: now.getTime(),
            state_score: parsed.state_score,
            note: parsed.note,
            created_at: Date.now(),
          });
          
          await updateDayEntryAverage(targetDate, currentPetId, currentUser.id);
        }

        // Формируем детальное сообщение для добавления
        if (parsed.states && parsed.states.length > 0) {
          const statesList = parsed.states.map(s => `${s.score}/5 в ${s.time}`).join(', ');
          message += `${parsed.states.length === 1 ? 'Состояние' : 'Состояния'}: ${statesList}. `;
        } else if (parsed.state_score) {
          message += `Состояние: ${parsed.state_score}/5. `;
        }
        
        if (parsed.symptoms && parsed.symptoms.length > 0) {
          const symptomsList = parsed.symptoms.map(s => `"${s.name}" в ${s.time}`).join(', ');
          message += `${parsed.symptoms.length === 1 ? 'Симптом' : 'Симптомы'}: ${symptomsList}. `;
        }
        
        if (parsed.medications && parsed.medications.length > 0) {
          const medsList = parsed.medications.map(m => `${m.name} ${m.dosage} в ${m.time}`).join(', ');
          message += `${parsed.medications.length === 1 ? 'Лекарство' : 'Лекарства'}: ${medsList}. `;
        }
        
        if (parsed.note && parsed.note.length <= 20) {
          message += `Заметка добавлена.`;
        }
      }
      
      setFeedback(message || 'Готово');
      setIsError(false);
      
      setTimeout(() => setFeedback(null), 5000);
      
      // НЕ перезагружаем страницу - данные обновятся автоматически через useLiveQuery
    } catch (err) {
      const errorMessage = 'Ошибка: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка');
      
      setFeedback(errorMessage);
      setIsError(true);
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 3000);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleAnalyzeTrends = async () => {
    if (!dayEntries || dayEntries.length < 3) {
      setFeedback('Недостаточно данных для анализа (минимум 3 записи)');
      setIsError(true);
      setShowHints(false); // Скрываем подсказки
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 3000);
      return;
    }

    setFeedback('Анализирую тренды...');
    setShowHints(false); // Скрываем подсказки

    try {
      const analysis = await analyzeTrends(
        dayEntries.map(e => ({
          date: e.date,
          state_score: e.state_score,
          symptoms: e.symptoms,
          note: e.note,
        })),
        medicationEntries || [],
        7
      );

      let message = `📊 ${analysis.trendDescription}\n\n`;
      
      if (analysis.insights.length > 0) {
        message += `💡 Инсайты:\n${analysis.insights.map(i => `• ${i}`).join('\n')}\n\n`;
      }
      
      if (analysis.warnings.length > 0) {
        message += `⚠️ Предупреждения:\n${analysis.warnings.map(w => `• ${w}`).join('\n')}\n\n`;
      }
      
      if (analysis.recommendations.length > 0) {
        message += `✅ Рекомендации:\n${analysis.recommendations.map(r => `• ${r}`).join('\n')}`;
      }

      setFeedback(message);
      setIsError(false);
      setTimeout(() => setFeedback(null), 15000); // Показываем дольше
    } catch (error) {
      console.error('QuickChat error:', error);
      setFeedback('Ошибка: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      setIsError(true);
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 5000);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleHintClick = (hint: string) => {
    setInput(hint);
    setShowHints(false);
  };

  const handleNavigateToDate = () => {
    if (navigateToDate) {
      setSelectedDate(navigateToDate);
      setView('view');
      setFeedback(null);
      setNavigateToDate(null);
    }
  };

  const toggleHints = () => {
    if (!showHints) {
      // Генерируем новые подсказки при открытии
      const newHints = generateContextualHints({
        hasEntry: !!currentEntry,
        currentState: currentEntry?.state_score,
        hasSymptoms: !!(currentEntry?.symptoms && currentEntry.symptoms.length > 0),
        hasMedications: !!(currentMeds && currentMeds.length > 0),
        recentEntries: dayEntries?.length || 0,
      });
      setHints(newHints);
    }
    setShowHints(!showHints);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Animated glow effect when recording - outside container */}
      {isRecording && (
        <div className="absolute bottom-0 left-0 right-0 h-[300px] pointer-events-none overflow-visible">
          <div className="recording-glow" />
        </div>
      )}
      
      {/* AI Response Bubble - Dark Theme */}
      {feedback && !isError && !showHints && (
        <div className="absolute bottom-28 left-0 right-0 px-6 z-50">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-3xl shadow-2xl p-4 animate-slideUp border border-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white text-[10px] font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-100 leading-relaxed whitespace-pre-line mb-2">
                    {feedback}
                  </div>
                  {navigateToDate && (
                    <button
                      onClick={handleNavigateToDate}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 underline"
                    >
                      Открыть запись →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Hints */}
      {showHints && hints.length > 0 && !feedback && (
        <div className="absolute bottom-28 left-0 right-0 px-6 z-50">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-600" />
                  <span className="text-xs font-semibold text-gray-600">Попробуйте спросить:</span>
                </div>
                <button
                  onClick={() => setShowHints(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {hints.map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => handleHintClick(hint)}
                    className="text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs text-gray-700 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative p-6 pb-8">
        <div className="max-w-3xl mx-auto relative z-10">
          <form onSubmit={handleSubmit} className={`flex items-center gap-2 rounded-full p-2 shadow-2xl transition-all ${
            isError ? 'bg-red-600' : 'bg-black'
          }`}>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading || !speechSupported}
              className={`p-3 rounded-full transition-all flex-shrink-0 ${
                isRecording
                  ? 'bg-orange-500 text-white'
                  : isError
                    ? 'bg-red-700 text-white hover:bg-red-800'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={!speechSupported ? 'Голосовой ввод не поддерживается' : ''}
            >
              {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button
              type="button"
              onClick={toggleHints}
              className="p-3 rounded-full transition-all flex-shrink-0 bg-gray-800 text-white hover:bg-gray-700"
              title="Подсказки"
            >
              <Sparkles size={22} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                feedback 
                  ? feedback 
                  : isRecording 
                    ? 'Слушаю...' 
                    : 'Напишите запрос...'
              }
              disabled={loading}
              className={`flex-1 px-2 py-3 bg-transparent border-none outline-none text-white text-base ${
                isError ? 'placeholder-red-200' : 'placeholder-gray-400'
              }`}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`p-3 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${
                isError 
                  ? 'bg-red-700 text-white hover:bg-red-800' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {loading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Send size={22} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
