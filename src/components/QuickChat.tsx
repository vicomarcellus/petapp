import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Loader2, Lightbulb } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { parseEntryFromText, AIContext } from '../services/ai';
import { chatWithAI } from '../services/aiChat';
import { formatDate } from '../utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actionButton?: {
    text: string;
    date: string;
  };
}

// Быстрые подсказки
const QUICK_SUGGESTIONS = [
  "Что думаешь по логу?",
  "Есть ли улучшения?",
  "Запланируй воду каждые 2 часа",
  "Дал преднизолон 0,3 мл",
  "Что запланировано?",
  "Как дела за неделю?"
];

export const QuickChat = () => {
  const { currentUser, currentPetId, selectedDate, setSelectedDate, setView, view } = useStore();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  // Сохраняем историю в localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai-chat-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Сохраняем историю при изменении
  useEffect(() => {
    localStorage.setItem('ai-chat-history', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const userMessage = (messageText || message).trim();
    if (!userMessage || loading || !currentUser || !currentPetId) return;

    setMessage('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const today = formatDate(new Date());
      const dateToUse = selectedDate || today;

      // Собираем ПОЛНЫЙ контекст для AI
      
      // 0. Данные о питомце
      const { data: petData } = await supabase
        .from('pets')
        .select('*')
        .eq('id', currentPetId)
        .single();
      
      // 1. Данные за текущий день
      const { data: stateEntries } = await supabase
        .from('state_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('date', dateToUse);

      const { data: symptomEntries } = await supabase
        .from('symptom_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('date', dateToUse);

      const { data: medicationEntries } = await supabase
        .from('medication_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('date', dateToUse);

      const { data: feedingEntries } = await supabase
        .from('feeding_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('date', dateToUse);

      // Загружаем запланированные события на сегодня и будущее
      const { data: scheduledMedications } = await supabase
        .from('medication_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('is_scheduled', true)
        .eq('completed', false)
        .gte('scheduled_time', Date.now());

      const { data: scheduledFeedings } = await supabase
        .from('feeding_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .eq('is_scheduled', true)
        .eq('completed', false)
        .gte('scheduled_time', Date.now());

      // 2. Диагнозы питомца
      const { data: diagnoses } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('pet_id', currentPetId)
        .order('date', { ascending: false });

      // 3. История за последние 7 дней
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return formatDate(d);
      });

      const { data: recentStates } = await supabase
        .from('state_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .in('date', last7Days);

      const { data: recentSymptoms } = await supabase
        .from('symptom_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .in('date', last7Days);

      const { data: recentMedications } = await supabase
        .from('medication_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .in('date', last7Days);

      // Формируем историю по дням
      const recentHistory = last7Days.slice(1).map(date => {
        const dayStates = recentStates?.filter(s => s.date === date) || [];
        const daySymptoms = recentSymptoms?.filter(s => s.date === date) || [];
        const dayMeds = recentMedications?.filter(m => m.date === date) || [];
        
        const avgState = dayStates.length > 0
          ? Math.round(dayStates.reduce((sum, s) => sum + s.state_score, 0) / dayStates.length)
          : undefined;

        return {
          date,
          avgState,
          symptoms: [...new Set(daySymptoms.map(s => s.symptom))],
          medications: [...new Set(dayMeds.map(m => m.medication_name))]
        };
      });

      // 4. Статистика
      const avgStateLastWeek = recentStates && recentStates.length > 0
        ? Math.round(recentStates.reduce((sum, s) => sum + s.state_score, 0) / recentStates.length * 10) / 10
        : undefined;

      const symptomCounts = new Map<string, number>();
      recentSymptoms?.forEach(s => {
        symptomCounts.set(s.symptom, (symptomCounts.get(s.symptom) || 0) + 1);
      });
      const commonSymptoms = Array.from(symptomCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([symptom]) => symptom);

      const medCounts = new Map<string, number>();
      recentMedications?.forEach(m => {
        medCounts.set(m.medication_name, (medCounts.get(m.medication_name) || 0) + 1);
      });
      const regularMedications = Array.from(medCounts.entries())
        .filter(([, count]) => count >= 3)
        .map(([med]) => med);

      // Формируем контекст
      const context: AIContext = {
        petName: petData?.name,
        petType: petData?.type,
        currentView: view,
        currentDate: dateToUse,
        existingStates: stateEntries?.map(s => `${s.time}: ${s.state_score}/5`) || [],
        existingSymptoms: symptomEntries?.map(s => s.symptom) || [],
        existingMedications: medicationEntries?.map(m => {
          const dosage = m.dosage_amount && m.dosage_unit 
            ? `${m.dosage_amount} ${m.dosage_unit}` 
            : m.dosage || '';
          return `${m.medication_name} ${dosage}`;
        }) || [],
        existingFeedings: feedingEntries?.map(f => {
          const unit = f.unit === 'g' ? 'г' : f.unit === 'ml' ? 'мл' : '';
          return `${f.food_name} ${f.amount}${unit}`;
        }) || [],
        scheduledMedications: scheduledMedications?.map(m => {
          const dosage = m.dosage_amount && m.dosage_unit 
            ? `${m.dosage_amount} ${m.dosage_unit}` 
            : m.dosage || '';
          const scheduledDate = new Date(m.scheduled_time!);
          const timeStr = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;
          return `${m.medication_name} ${dosage} запланировано на ${timeStr}`;
        }) || [],
        scheduledFeedings: scheduledFeedings?.map(f => {
          const unit = f.unit === 'g' ? 'г' : f.unit === 'ml' ? 'мл' : '';
          const scheduledDate = new Date(f.scheduled_time!);
          const timeStr = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;
          return `${f.food_name} ${f.amount}${unit} запланировано на ${timeStr}`;
        }) || [],
        hasEntry: (stateEntries && stateEntries.length > 0) || false,
        currentState: stateEntries && stateEntries.length > 0
          ? Math.round(stateEntries.reduce((sum, s) => sum + s.state_score, 0) / stateEntries.length)
          : undefined,
        diagnoses: diagnoses?.map(d => ({
          date: d.date,
          diagnosis: d.diagnosis,
          notes: d.notes || undefined
        })),
        recentHistory,
        stats: {
          avgStateLastWeek,
          commonSymptoms,
          regularMedications
        }
      };

      // Определяем тип запроса - команда или вопрос
      // "составь график" - это вопрос (анализ), а не команда
      // "запланируй" - это команда (создание задач)
      const isCommand = /^(дал|дали|дать|добавь|добавить|покормил|покормить|состояние|удали|удалить|очисти|очистить|запланируй|запланировать|напомни|напоминание)/i.test(userMessage);
      
      // Также проверяем, не содержит ли сообщение просьбу о планировании где-то в середине
      const wantsToSchedule = /запланируй|запланировать|напомни|напоминание|добавь.*задач.*планировщик|создай.*задач/i.test(userMessage);

      if (isCommand || wantsToSchedule) {
        // Это команда - используем старый парсер
        const parsed = await parseEntryFromText(userMessage, context);
        
        console.log('Parsed result:', parsed); // Для отладки

      // Выполняем действие
      if (parsed.action === 'add') {
        // Добавляем записи состояния
        if (parsed.states && parsed.states.length > 0) {
          for (const state of parsed.states) {
            const timestamp = new Date(`${dateToUse}T${state.time}`).getTime();
            await supabase.from('state_entries').insert({
              user_id: currentUser.id,
              pet_id: currentPetId,
              date: dateToUse,
              time: state.time,
              timestamp,
              state_score: state.score,
              note: state.note || null
            });
          }
        }

        // Добавляем симптомы
        if (parsed.symptoms && parsed.symptoms.length > 0) {
          for (const symptom of parsed.symptoms) {
            const timestamp = new Date(`${dateToUse}T${symptom.time}`).getTime();
            await supabase.from('symptom_entries').insert({
              user_id: currentUser.id,
              pet_id: currentPetId,
              date: dateToUse,
              time: symptom.time,
              timestamp,
              symptom: symptom.name,
              note: symptom.note || null
            });
          }
        }

        // Добавляем лекарства
        if (parsed.medications && parsed.medications.length > 0) {
          for (const med of parsed.medications) {
            const timestamp = new Date(`${dateToUse}T${med.time}`).getTime();
            // Парсим дозировку на количество и единицу
            const dosageMatch = med.dosage.match(/^([0-9.,]+)\s*(мл|мг|г|таб|капс)?$/);
            const dosageAmount = dosageMatch ? dosageMatch[1] : med.dosage;
            const dosageUnit = dosageMatch ? dosageMatch[2] || 'мл' : 'мл';
            
            await supabase.from('medication_entries').insert({
              user_id: currentUser.id,
              pet_id: currentPetId,
              date: dateToUse,
              time: med.time,
              timestamp,
              medication_name: med.name,
              dosage: med.dosage, // Для обратной совместимости
              dosage_amount: dosageAmount,
              dosage_unit: dosageUnit,
              color: '#8B5CF6'
            });
          }
        }

        // Добавляем питание
        if (parsed.feedings && parsed.feedings.length > 0) {
          for (const feeding of parsed.feedings) {
            const timestamp = new Date(`${dateToUse}T${feeding.time}`).getTime();
            await supabase.from('feeding_entries').insert({
              user_id: currentUser.id,
              pet_id: currentPetId,
              date: dateToUse,
              time: feeding.time,
              timestamp,
              food_name: feeding.name,
              amount: feeding.amount,
              unit: feeding.unit,
              note: feeding.note || null
            });
          }
        }

        // Добавляем запланированные лекарства
        if (parsed.scheduledMedications && parsed.scheduledMedications.length > 0) {
          console.log('=== CREATING SCHEDULED MEDICATIONS ===');
          console.log('Scheduled medications:', parsed.scheduledMedications);
          
          let createdCount = 0;
          
          for (const med of parsed.scheduledMedications) {
            if (med.recurring) {
              // Повторяющееся событие
              const intervals: Record<string, number> = {
                'every_1h': 1,
                'every_2h': 2,
                'every_3h': 3,
                'every_4h': 4,
                'daily': 24
              };
              
              const intervalHours = intervals[med.recurring];
              const startTime = med.time;
              const [startHour, startMinute] = startTime.split(':').map(Number);
              
              // Создаем события на сегодня
              for (let hour = startHour; hour < 24; hour += intervalHours) {
                const eventTime = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                const timestamp = new Date(`${dateToUse}T${eventTime}`).getTime();
                
                const { data, error } = await supabase.from('medication_entries').insert({
                  user_id: currentUser.id,
                  pet_id: currentPetId,
                  date: dateToUse,
                  time: eventTime,
                  timestamp,
                  medication_name: med.name,
                  dosage_amount: med.amount,
                  dosage_unit: med.unit,
                  dosage: `${med.amount} ${med.unit}`,
                  is_scheduled: true,
                  scheduled_time: timestamp,
                  completed: false,
                  color: '#8B5CF6'
                }).select();
                
                if (error) {
                  console.error('❌ Error inserting scheduled medication:', error);
                } else {
                  console.log('✅ Scheduled medication inserted:', data);
                  createdCount++;
                }
              }
            } else {
              // Одноразовое событие
              const timestamp = new Date(`${dateToUse}T${med.time}`).getTime();
              
              const { data, error } = await supabase.from('medication_entries').insert({
                user_id: currentUser.id,
                pet_id: currentPetId,
                date: dateToUse,
                time: med.time,
                timestamp,
                medication_name: med.name,
                dosage_amount: med.amount,
                dosage_unit: med.unit,
                dosage: `${med.amount} ${med.unit}`,
                is_scheduled: true,
                scheduled_time: timestamp,
                completed: false,
                color: '#8B5CF6'
              }).select();
              
              if (error) {
                console.error('❌ Error inserting scheduled medication:', error);
              } else {
                console.log('✅ Scheduled medication inserted:', data);
                createdCount++;
              }
            }
          }
          
          if (createdCount > 0) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Запланировал ${createdCount} ${createdCount === 1 ? 'лекарство' : createdCount < 5 ? 'лекарства' : 'лекарств'}!`
            }]);
            return;
          }
        }

        // Добавляем запланированное питание
        if (parsed.scheduledFeedings && parsed.scheduledFeedings.length > 0) {
          console.log('=== CREATING SCHEDULED FEEDINGS ===');
          console.log('Scheduled feedings:', parsed.scheduledFeedings);
          
          let createdCount = 0;
          
          for (const feeding of parsed.scheduledFeedings) {
            if (feeding.recurring) {
              // Повторяющееся событие
              const intervals: Record<string, number> = {
                'every_1h': 1,
                'every_2h': 2,
                'every_3h': 3,
                'every_4h': 4,
                'daily': 24
              };
              
              const intervalHours = intervals[feeding.recurring];
              const startTime = feeding.time;
              const [startHour, startMinute] = startTime.split(':').map(Number);
              
              // Создаем события на сегодня
              for (let hour = startHour; hour < 24; hour += intervalHours) {
                const eventTime = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                const timestamp = new Date(`${dateToUse}T${eventTime}`).getTime();
                
                const { data, error } = await supabase.from('feeding_entries').insert({
                  user_id: currentUser.id,
                  pet_id: currentPetId,
                  date: dateToUse,
                  time: eventTime,
                  timestamp,
                  food_name: feeding.name,
                  amount: feeding.amount,
                  unit: feeding.unit,
                  is_scheduled: true,
                  scheduled_time: timestamp,
                  completed: false
                }).select();
                
                if (error) {
                  console.error('❌ Error inserting scheduled feeding:', error);
                } else {
                  console.log('✅ Scheduled feeding inserted:', data);
                  createdCount++;
                }
              }
            } else {
              // Одноразовое событие
              const timestamp = new Date(`${dateToUse}T${feeding.time}`).getTime();
              
              const { data, error } = await supabase.from('feeding_entries').insert({
                user_id: currentUser.id,
                pet_id: currentPetId,
                date: dateToUse,
                time: feeding.time,
                timestamp,
                food_name: feeding.name,
                amount: feeding.amount,
                unit: feeding.unit,
                is_scheduled: true,
                scheduled_time: timestamp,
                completed: false
              }).select();
              
              if (error) {
                console.error('❌ Error inserting scheduled feeding:', error);
              } else {
                console.log('✅ Scheduled feeding inserted:', data);
                createdCount++;
              }
            }
          }
          
          if (createdCount > 0) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Запланировал ${createdCount} ${createdCount === 1 ? 'кормление' : createdCount < 5 ? 'кормления' : 'кормлений'}!`
            }]);
            return;
          }
        }

        // Добавляем задачи в планировщик
        if (parsed.tasks && parsed.tasks.length > 0) {
          console.log('=== CREATING TASKS ===');
          console.log('Tasks to create:', parsed.tasks);
          console.log('Date:', dateToUse);
          console.log('User ID:', currentUser.id);
          console.log('Pet ID:', currentPetId);
          
          let createdCount = 0;
          
          for (const task of parsed.tasks) {
            if (task.recurring) {
              // Повторяющаяся задача - создаем несколько
              const intervals: Record<string, number> = {
                'every_1h': 1,
                'every_2h': 2,
                'every_3h': 3,
                'every_4h': 4,
                'daily': 24
              };
              
              const intervalHours = intervals[task.recurring];
              const startTime = task.time;
              const [startHour, startMinute] = startTime.split(':').map(Number);
              
              console.log(`Creating recurring task: "${task.task}" every ${intervalHours}h starting at ${startTime}`);
              
              // Создаем задачи на сегодня
              for (let hour = startHour; hour < 24; hour += intervalHours) {
                const taskTime = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                const timestamp = new Date(`${dateToUse}T${taskTime}`).getTime();
                
                const taskData = {
                  user_id: currentUser.id,
                  pet_id: currentPetId,
                  date: dateToUse,
                  time: taskTime,
                  timestamp,
                  task: task.task,
                  completed: false,
                  task_type: 'other'
                };
                
                console.log('Inserting recurring task:', taskData);
                
                const { data, error } = await supabase.from('checklist_tasks').insert(taskData).select();
                
                if (error) {
                  console.error('❌ Error inserting task:', error);
                } else {
                  console.log('✅ Task inserted successfully:', data);
                  createdCount++;
                }
              }
            } else {
              // Одноразовая задача
              const timestamp = new Date(`${dateToUse}T${task.time}`).getTime();
              
              const taskData = {
                user_id: currentUser.id,
                pet_id: currentPetId,
                date: dateToUse,
                time: task.time,
                timestamp,
                task: task.task,
                completed: false,
                task_type: 'other'
              };
              
              console.log('Inserting single task:', taskData);
              
              const { data, error } = await supabase.from('checklist_tasks').insert(taskData).select();
              
              if (error) {
                console.error('❌ Error inserting task:', error);
              } else {
                console.log('✅ Task inserted successfully:', data);
                createdCount++;
              }
            }
          }
          
          console.log(`=== TOTAL CREATED: ${createdCount} tasks ===`);
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: createdCount > 0 
              ? `✅ Создал ${createdCount} ${createdCount === 1 ? 'задачу' : createdCount < 5 ? 'задачи' : 'задач'} в планировщике!`
              : '❌ Не удалось создать задачи. Проверь консоль браузера (F12) для деталей.'
          }]);
          
          // Не показываем "Записано!" если были только задачи
          return;
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ Записано!'
        }]);

        // Обновляем вид если нужно
        if (parsed.navigateToDate) {
          setSelectedDate(parsed.navigateToDate);
          setView('view');
        }
      } else if (parsed.action === 'remove') {
        // Удаление
        if (parsed.target === 'symptom' && parsed.itemName) {
          await supabase
            .from('symptom_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse)
            .eq('symptom', parsed.itemName);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Удалил симптом "${parsed.itemName}"`
          }]);
        } else if (parsed.target === 'medication' && parsed.itemName) {
          await supabase
            .from('medication_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse)
            .eq('medication_name', parsed.itemName);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Удалил лекарство "${parsed.itemName}"`
          }]);
        } else if (parsed.target === 'state' && parsed.time) {
          await supabase
            .from('state_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse)
            .eq('time', parsed.time);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Удалил запись состояния в ${parsed.time}`
          }]);
        } else if (parsed.target === 'feeding' && parsed.itemName) {
          await supabase
            .from('feeding_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse)
            .eq('food_name', parsed.itemName);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Удалил питание "${parsed.itemName}"`
          }]);
        }
      } else if (parsed.action === 'clear') {
        // Очистка всех записей типа
        if (parsed.target === 'symptom') {
          await supabase
            .from('symptom_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Удалил все симптомы'
          }]);
        } else if (parsed.target === 'state') {
          await supabase
            .from('state_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Удалил все записи состояния'
          }]);
        } else if (parsed.target === 'medication') {
          await supabase
            .from('medication_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Удалил все лекарства'
          }]);
        } else if (parsed.target === 'feeding') {
          await supabase
            .from('feeding_entries')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('pet_id', currentPetId)
            .eq('date', dateToUse);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Удалил все записи питания'
          }]);
        }
      } else if (parsed.action === 'chat') {
        // Просто ответ от AI с возможной кнопкой перехода
        const messageData: Message = {
          role: 'assistant',
          content: parsed.message || 'Нет ответа'
        };

        // Если есть дата для перехода, добавляем кнопку вместо автоматического перехода
        if (parsed.navigateToDate && parsed.showDetails) {
          messageData.actionButton = {
            text: 'Посмотреть подробнее',
            date: parsed.navigateToDate
          };
        }

        setMessages(prev => [...prev, messageData]);
      } else {
        // Неизвестная команда
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Не понял команду. Попробуй: "состояние 4", "дрожь", "дали преднизолон 0,3"'
        }]);
      }
      } else {
        // Обычный вопрос - используем естественный чат
        const aiResponse = await chatWithAI(userMessage, context);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse
        }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ошибка. Попробуй ещё раз или проверь OpenAI ключ.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDay = (date: string) => {
    setSelectedDate(date);
    setView('view');
    setIsOpen(false); // Закрываем чат при переходе
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 z-50 group"
      >
        <Sparkles className="text-white transition-transform duration-300 group-hover:rotate-12" size={24} />
      </button>
    );
  }

  return (
    <div
      className={`fixed inset-0 bg-black flex items-end justify-center z-50 p-4 transition-all duration-300 ${isAnimating ? 'bg-opacity-50 backdrop-blur-sm' : 'bg-opacity-0'
        }`}
      onClick={() => setIsOpen(false)}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col transition-all duration-300 ${isAnimating
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-8 opacity-0 scale-95'
          }`}
        style={{
          transitionTimingFunction: isAnimating
            ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black p-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-white" size={20} />
              <h3 className="text-white font-bold">AI Помощник</h3>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    setShowSuggestions(true);
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1 w-8 h-8 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 text-xs"
                  title="Очистить историю"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 w-8 h-8 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F5F7] min-h-0">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center text-gray-400 text-sm py-4 animate-fadeIn">
                Привет! Я AI помощник.
                <br />
                Спросите меня о здоровье питомца!
              </div>
              
              {showSuggestions && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
                    <Lightbulb size={14} />
                    <span>Быстрые команды:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        className="px-3 py-2 bg-white text-gray-700 rounded-xl text-xs hover:bg-gray-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left border border-gray-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.actionButton && (
                    <button
                      onClick={() => handleViewDay(msg.actionButton!.date)}
                      className="mt-2 w-full px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {msg.actionButton.text}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white px-4 py-2 rounded-2xl border border-gray-200">
                <Loader2 className="animate-spin text-black" size={20} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex-shrink-0 bg-white rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder="Спросите что-нибудь..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black text-sm transition-all duration-200"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !message.trim()}
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
