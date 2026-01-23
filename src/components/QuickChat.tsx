import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, TrendingUp, Sparkles, X } from 'lucide-react';
import { parseEntryFromText } from '../services/ai';
import { analyzeTrends, generateContextualHints } from '../services/aiAnalytics';
import { db } from '../db';
import { formatDate } from '../utils';
import { DayEntry, MEDICATION_COLORS, SYMPTOM_COLORS } from '../types';
import { useStore } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';

export const QuickChat = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [navigateToDate, setNavigateToDate] = useState<string | null>(null); // Дата для кнопки перехода
  const recognitionRef = useRef<any>(null);
  const { selectedDate, view, setSelectedDate, setView, currentPetId } = useStore();
  const currentYear = useStore(state => state.currentYear);
  const currentMonth = useStore(state => state.currentMonth);

  // Получаем данные для контекстных подсказок
  const dayEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.dayEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );
  const medicationEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.medicationEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
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
    
    console.log('Speech Recognition supported:', hasSupport);

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
        console.log('Speech recognition started');
        setIsRecording(true);
        setFeedback('Слушаю...');
      };

      recognitionRef.current.onresult = (event: any) => {
        console.log('Speech recognition result:', event);
        let transcript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        console.log('Transcript:', transcript);
        setInput(transcript);
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
        console.log('Speech recognition ended');
        setIsRecording(false);
        if (feedback === '🎤 Слушаю...') {
          setFeedback(null);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
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
      console.log('Stopping recognition');
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        console.log('Starting recognition');
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
    if (!input.trim() || loading || !currentPetId) return;

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
      
      // Формируем контекст для AI с реальными данными
      const context = {
        hasEntry: !!existingEntry,
        currentState: existingEntry?.state_score,
        hasNote: !!(existingEntry?.note && existingEntry.note.length > 0),
        existingSymptoms: existingEntry?.symptoms || [],
        existingMedications: existingMeds.map(m => `${m.medication_name} ${m.dosage} в ${m.time}`), // Передаем с временем
        currentView: view,
        currentDate: targetDate,
        currentMonth: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`, // YYYY-MM
      };
      
      const parsed = await parseEntryFromText(input, context);
      
      let message = '';
      const action = parsed.action || 'add';

      // ОБРАБОТКА ОШИБОК
      if (action === 'error') {
        setInput('');
        setFeedback(parsed.message || 'Не могу выполнить команду');
        setIsError(true);
        setTimeout(() => {
          setFeedback(null);
          setIsError(false);
        }, 5000);
        setLoading(false);
        return;
      }

      // РЕЖИМ ЧАТА - AI отвечает на вопросы
      if (action === 'chat') {
        setInput('');
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
        
        setLoading(false);
        return;
      }

      // КОМАНДЫ УДАЛЕНИЯ
      if (action === 'remove') {
        if (parsed.target === 'symptom' && parsed.itemName && existingEntry) {
          // Гибкий поиск симптома (игнорируем регистр, дефисы, пробелы)
          const normalizeText = (text: string) => 
            text.toLowerCase().replace(/[-\s]/g, '').trim();
          
          const searchTerm = normalizeText(parsed.itemName);
          const foundSymptom = (existingEntry.symptoms || []).find(s => 
            normalizeText(s).includes(searchTerm) || searchTerm.includes(normalizeText(s))
          );
          
          if (foundSymptom) {
            const updatedSymptoms = (existingEntry.symptoms || []).filter(s => s !== foundSymptom);
            await db.dayEntries.update(existingEntry.id!, {
              symptoms: updatedSymptoms,
              updated_at: Date.now(),
            });
            message = `Симптом "${foundSymptom}" удален`;
          } else {
            message = `Симптом "${parsed.itemName}" не найден`;
          }
        } else if (parsed.target === 'medication' && parsed.itemName) {
          // Гибкий поиск лекарства
          const normalizeText = (text: string) => 
            text.toLowerCase().replace(/[-\s]/g, '').trim();
          
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
            message = `Лекарство "${meds[0].medication_name}" удалено`;
          } else {
            message = `Лекарство "${parsed.itemName}" не найдено`;
          }
        } else if (parsed.target === 'entry') {
          // Удаляем запись (возможно за другую дату)
          const dateToDelete = parsed.date || targetDate;
          const entryToDelete = await db.dayEntries.where('date').equals(dateToDelete).filter(e => e.petId === currentPetId).first();
          
          if (entryToDelete) {
            // Удаляем все лекарства за этот день для текущего питомца
            const meds = await db.medicationEntries.where('date').equals(dateToDelete).filter(m => m.petId === currentPetId).toArray();
            for (const med of meds) {
              if (med.id) await db.medicationEntries.delete(med.id);
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
        if (parsed.target === 'symptom' && existingEntry) {
          await db.dayEntries.update(existingEntry.id!, {
            symptoms: [],
            updated_at: Date.now(),
          });
          message = 'Все симптомы удалены';
        } else if (parsed.target === 'medication') {
          const meds = await db.medicationEntries.where('date').equals(targetDate).filter(m => m.petId === currentPetId).toArray();
          for (const med of meds) {
            if (med.id) await db.medicationEntries.delete(med.id);
          }
          message = 'Все лекарства удалены';
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
        
        // Обрабатываем лекарства
        if (parsed.medications && parsed.medications.length > 0) {
          for (const med of parsed.medications) {
            // Нормализуем название для поиска
            const normalizedMedName = normalizeText(med.name);
            
            // Получаем или создаем тег лекарства (гибкий поиск)
            const allMedTags = await db.medicationTags.where('petId').equals(currentPetId).toArray();
            let medTag = allMedTags.find(tag => 
              normalizeText(tag.name) === normalizedMedName
            );
            
            if (!medTag) {
              const colorIndex = allMedTags.length % MEDICATION_COLORS.length;
              const tagId = await db.medicationTags.add({
                name: med.name,
                petId: currentPetId,
                color: MEDICATION_COLORS[colorIndex],
              });
              medTag = await db.medicationTags.get(tagId);
            }

            const medColor = medTag?.color || MEDICATION_COLORS[0];

            // Добавляем лекарство
            await db.medicationEntries.add({
              date: targetDate,
              petId: currentPetId,
              medication_name: medTag?.name || med.name, // Используем имя из тега для консистентности
              dosage: med.dosage,
              time: med.time,
              timestamp: Date.now(),
              color: medColor,
            });

            // Сохраняем в справочник (гибкий поиск)
            const allMeds = await db.medications.where('petId').equals(currentPetId).toArray();
            const existing = allMeds.find(m => 
              normalizeText(m.name) === normalizedMedName
            );
            
            if (!existing) {
              await db.medications.add({
                name: medTag?.name || med.name,
                petId: currentPetId,
                color: medColor,
                default_dosage: med.dosage,
              });
            }
          }
        }
        
        // Если запись существует, обновляем только те поля, которые были распознаны
        if (existingEntry) {
          const updatedEntry: DayEntry = {
            ...existingEntry,
            ...(parsed.state_score !== undefined && { state_score: parsed.state_score }),
            ...(parsed.note !== undefined && { 
              note: parsed.note.length > 20 
                ? parsed.note
                : existingEntry.note 
                  ? `${existingEntry.note}. ${parsed.note}`
                  : parsed.note 
            }),
            ...(parsed.symptoms !== undefined && { 
              symptoms: await (async () => {
                // Гибкое добавление симптомов (избегаем дубликатов)
                const currentSymptoms = existingEntry.symptoms || [];
                const newSymptoms = parsed.symptoms || [];
                const combined = [...currentSymptoms];
                
                for (const newSymptom of newSymptoms) {
                  const normalizedNew = normalizeText(newSymptom);
                  const isDuplicate = currentSymptoms.some(existing => 
                    normalizeText(existing) === normalizedNew
                  );
                  if (!isDuplicate) {
                    combined.push(newSymptom);
                    
                    // Создаем тег симптома если его еще нет (гибкий поиск)
                    const allSymptomTags = await db.symptomTags.where('petId').equals(currentPetId).toArray();
                    const existingTag = allSymptomTags.find(tag => 
                      normalizeText(tag.name) === normalizedNew
                    );
                    
                    if (!existingTag) {
                      const colorIndex = allSymptomTags.length % SYMPTOM_COLORS.length;
                      await db.symptomTags.add({
                        name: newSymptom,
                        petId: currentPetId,
                        color: SYMPTOM_COLORS[colorIndex],
                      });
                    }
                  }
                }
                
                return combined;
              })()
            }),
            updated_at: Date.now(),
          };
          
          await db.dayEntries.update(existingEntry.id!, updatedEntry);
        } else if (parsed.state_score || parsed.note || (parsed.symptoms && parsed.symptoms.length > 0)) {
          // Создаем новую запись только если есть что-то кроме лекарств
          
          // Создаем теги для новых симптомов
          if (parsed.symptoms && parsed.symptoms.length > 0) {
            for (const symptom of parsed.symptoms) {
              const allSymptomTags = await db.symptomTags.where('petId').equals(currentPetId).toArray();
              const normalizedSymptom = normalizeText(symptom);
              const existingTag = allSymptomTags.find(tag => 
                normalizeText(tag.name) === normalizedSymptom
              );
              
              if (!existingTag) {
                const colorIndex = allSymptomTags.length % SYMPTOM_COLORS.length;
                await db.symptomTags.add({
                  name: symptom,
                  petId: currentPetId,
                  color: SYMPTOM_COLORS[colorIndex],
                });
              }
            }
          }
          
          const entry: DayEntry = {
            date: parsed.date || targetDate,
            petId: currentPetId,
            state_score: parsed.state_score ?? 3,
            note: parsed.note ?? '',
            symptoms: parsed.symptoms ?? [],
            created_at: Date.now(),
            updated_at: Date.now(),
          };
          
          await db.dayEntries.add(entry);
        }

        // Формируем детальное сообщение для добавления
        if (parsed.state_score) {
          message += `Состояние: ${parsed.state_score}/5. `;
        }
        if (parsed.symptoms && parsed.symptoms.length > 0) {
          const symptomsList = parsed.symptoms.map(s => `"${s}"`).join(', ');
          message += `${parsed.symptoms.length === 1 ? 'Симптом' : 'Симптомы'}: ${symptomsList}. `;
        }
        if (parsed.medications && parsed.medications.length > 0) {
          const medsList = parsed.medications.map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ');
          message += `${parsed.medications.length === 1 ? 'Лекарство' : 'Лекарства'}: ${medsList}. `;
        }
        if (parsed.note && parsed.note.length <= 20) {
          message += `Заметка добавлена.`;
        }
      }
      
      setInput('');
      setFeedback(message || 'Готово');
      setIsError(false);
      
      setTimeout(() => setFeedback(null), 5000);
      
      // НЕ перезагружаем страницу - данные обновятся автоматически через useLiveQuery
    } catch (err) {
      setFeedback('Ошибка: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
      setIsError(true);
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 3000);
    } finally {
      setLoading(false);
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

    setAnalyzingTrends(true);
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
      setFeedback('Ошибка анализа: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      setIsError(true);
      setTimeout(() => {
        setFeedback(null);
        setIsError(false);
      }, 5000);
    } finally {
      setAnalyzingTrends(false);
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
      
      {/* AI Response Bubble */}
      {feedback && !isError && !showHints && (
        <div className="absolute bottom-28 left-0 right-0 px-6 z-50">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-4 animate-slideUp border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white text-[10px] font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-line mb-2">
                    {feedback}
                  </div>
                  {navigateToDate && (
                    <button
                      onClick={handleNavigateToDate}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
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
