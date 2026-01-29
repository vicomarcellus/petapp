import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { parseEntryFromText } from '../services/ai';
import { formatDate } from '../utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actionButton?: {
    text: string;
    date: string;
  };
}

export const QuickChat = () => {
  const { currentUser, currentPetId, selectedDate, setSelectedDate, setView } = useStore();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || loading || !currentUser || !currentPetId) return;
    
    const userMessage = message.trim();
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const today = formatDate(new Date());
      const dateToUse = selectedDate || today;

      // Получаем контекст для AI
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

      const context = {
        existingStates: stateEntries?.map(s => `${s.time}: ${s.state_score}/5`) || [],
        existingSymptoms: symptomEntries?.map(s => s.symptom) || [],
        existingMedications: medicationEntries?.map(m => `${m.medication_name} ${m.dosage}`) || [],
        hasEntry: (stateEntries && stateEntries.length > 0) || false,
        currentState: stateEntries && stateEntries.length > 0 
          ? Math.round(stateEntries.reduce((sum, s) => sum + s.state_score, 0) / stateEntries.length)
          : undefined,
        currentView: 'calendar',
        currentDate: dateToUse
      };

      // Парсим команду через AI
      const parsed = await parseEntryFromText(userMessage, context);

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
            await supabase.from('medication_entries').insert({
              user_id: currentUser.id,
              pet_id: currentPetId,
              date: dateToUse,
              time: med.time,
              timestamp,
              medication_name: med.name,
              dosage: med.dosage,
              color: '#8B5CF6'
            });
          }
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-black rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Sparkles className="text-white" size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[600px] border border-gray-200">
      <div className="bg-black p-4 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-white" size={20} />
            <h3 className="text-white font-bold">AI Помощник</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 rounded-full p-1 w-8 h-8 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F5F7] min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Привет! Я AI помощник.
            <br />
            Спросите меня о здоровье питомца!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.actionButton && (
                  <button
                    onClick={() => handleViewDay(msg.actionButton!.date)}
                    className="mt-2 w-full px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                  >
                    {msg.actionButton.text}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
