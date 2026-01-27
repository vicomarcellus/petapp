const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface ParsedMedication {
  name: string;
  dosage: string;
  time: string;
}

interface ParsedState {
  score: 1 | 2 | 3 | 4 | 5;
  time: string;
  note?: string;
}

interface ParsedSymptom {
  name: string;
  time: string;
  note?: string;
}

interface ParsedEntry {
  // Новая структура - множественные записи
  states?: ParsedState[]; // Массив записей состояния
  symptoms?: ParsedSymptom[]; // Массив записей симптомов
  medications?: ParsedMedication[]; // Массив лекарств
  
  // Старые поля для совместимости
  state_score?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  
  // Управление
  date?: string;
  action?: 'add' | 'remove' | 'clear' | 'update' | 'error' | 'chat';
  target?: 'symptom' | 'medication' | 'note' | 'state' | 'entry';
  itemName?: string;
  time?: string; // Для удаления конкретной записи по времени
  message?: string;
  navigateToDate?: string;
  showDetails?: boolean;
}

export async function parseEntryFromText(text: string, context?: {
  existingSymptoms?: string[];
  existingMedications?: string[];
  existingStates?: string[];
  hasEntry?: boolean;
  currentState?: number;
  hasNote?: boolean;
  currentView?: string; // 'calendar' | 'view' | 'edit' | 'add' | 'settings' | 'activity'
  currentDate?: string; // YYYY-MM-DD
  currentMonth?: string; // YYYY-MM для календаря
}): Promise<ParsedEntry> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key не настроен');
  }

  // Получаем текущее время для контекста
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentDate = now.toISOString().split('T')[0];

  // Формируем контекст системы
  let systemContext = '';
  if (context) {
    systemContext = `\n\nТЕКУЩАЯ СТРАНИЦА: ${context.currentView === 'calendar' ? 'Календарь (главная)' : context.currentView === 'view' || context.currentView === 'edit' || context.currentView === 'add' ? `Просмотр записи за ${context.currentDate || 'сегодня'}` : context.currentView === 'settings' ? 'Настройки' : context.currentView === 'activity' ? 'История активности' : 'Неизвестно'}`;
    
    if (context.currentMonth) {
      systemContext += `\nТЕКУЩИЙ МЕСЯЦ В КАЛЕНДАРЕ: ${context.currentMonth}`;
    }
    
    systemContext += `\n\nТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ:`;
    if (context.hasEntry) {
      systemContext += `\n- Запись за эту дату существует`;
      if (context.currentState) {
        systemContext += `\n- Среднее состояние за день: ${context.currentState}/5`;
      }
      if (context.hasNote) {
        systemContext += `\n- Заметка: есть`;
      }
    } else {
      systemContext += `\n- Записи за эту дату нет`;
    }
    
    if (context.existingStates && context.existingStates.length > 0) {
      systemContext += `\n- Записи состояния: ${context.existingStates.join(', ')}`;
    } else {
      systemContext += `\n- Записей состояния нет`;
    }
    
    if (context.existingSymptoms && context.existingSymptoms.length > 0) {
      systemContext += `\n- Симптомы: ${context.existingSymptoms.join(', ')}`;
    } else {
      systemContext += `\n- Симптомов нет`;
    }
    
    if (context.existingMedications && context.existingMedications.length > 0) {
      systemContext += `\n- Лекарства: ${context.existingMedications.join(', ')}`;
    } else {
      systemContext += `\n- Лекарств нет`;
    }
  }

  const systemPrompt = `Ты умный помощник для трекера здоровья кота. Ты можешь управлять данными, отвечать на вопросы и вести диалог с пользователем.

ТЕКУЩЕЕ ВРЕМЯ: ${currentTime}
ТЕКУЩАЯ ДАТА: ${currentDate}${systemContext}

ВАЖНО: НОВАЯ СТРУКТУРА ДАННЫХ!
Теперь можно добавлять НЕСКОЛЬКО записей состояния и симптомов в течение дня с указанием времени.

СТРУКТУРА ЗАПИСЕЙ:
1. СОСТОЯНИЕ (StateEntry) - можно добавлять несколько раз в день
   - score: 1-5 (оценка состояния)
   - time: "HH:mm" (время записи)
   - note: опциональная заметка к этой записи состояния

2. СИМПТОМЫ (SymptomEntry) - можно добавлять несколько раз в день
   - name: название симптома
   - time: "HH:mm" (когда заметили)
   - note: опциональная заметка

3. ЛЕКАРСТВА (MedicationEntry) - как и раньше
   - name: название
   - dosage: дозировка
   - time: "HH:mm" (когда дали)

ПРИМЕРЫ ДОБАВЛЕНИЯ С НОВОЙ СТРУКТУРОЙ:

"состояние 3 в 9 утра" -> {
  "action": "add",
  "states": [{"score": 3, "time": "09:00"}]
}

"сейчас состояние 4, стало лучше" -> {
  "action": "add",
  "states": [{"score": 4, "time": "${currentTime}", "note": "стало лучше"}]
}

"дрожь в 10:30" -> {
  "action": "add",
  "symptoms": [{"name": "Дрожь", "time": "10:30"}]
}

"рвота только что" -> {
  "action": "add",
  "symptoms": [{"name": "Рвота", "time": "${currentTime}"}]
}

"дали преднизолон 0,3 в 17:00" -> {
  "action": "add",
  "medications": [{"name": "Преднизолон", "dosage": "0,3 мл", "time": "17:00"}]
}

МНОЖЕСТВЕННЫЕ ЗАПИСИ В ОДНОЙ КОМАНДЕ:

"утром было 2, сейчас 4" -> {
  "action": "add",
  "states": [
    {"score": 2, "time": "09:00"},
    {"score": 4, "time": "${currentTime}"}
  ]
}

"дрожь и рвота" -> {
  "action": "add",
  "symptoms": [
    {"name": "Дрожь", "time": "${currentTime}"},
    {"name": "Рвота", "time": "${currentTime}"}
  ]
}

ОБРАБОТКА ВРЕМЕНИ:
- "только что", "сейчас", "щас" -> ${currentTime}
- "утром" -> 09:00
- "днем" -> 14:00
- "вечером" -> 19:00
- "в 17:00", "в 17" -> 17:00
- "час назад" -> вычти 1 час от ${currentTime}
- "2 часа назад" -> вычти 2 часа

ГИБКОЕ ПОНИМАНИЕ (как и раньше):
- Порядок слов не важен
- Регистр не важен
- Дефисы и пробелы игнорируются
- Склонения учитываются
- Синонимы действий

ИНФОРМАЦИОННЫЕ ЗАПРОСЫ:
При вопросах о состоянии/данных - используй showDetails: true и navigateToDate

"как дела?" -> {
  "action": "chat",
  "message": "Сегодня было 3 записи состояния: утром 2/5 в 09:00, днем 3/5 в 14:00, сейчас 4/5 в ${currentTime}. Среднее: 3/5. Симптомы: Дрожь в 10:30. Лекарства: Преднизолон 0,3 мл в 17:00.",
  "showDetails": true,
  "navigateToDate": "${currentDate}"
}

"что было вчера?" -> {
  "action": "chat",
  "message": "Вчера среднее состояние было 3/5 (2 записи). Симптомы: Рвота. Лекарства: Преднизолон 0,3 мл.",
  "showDetails": true,
  "navigateToDate": "YYYY-MM-DD вчерашней даты"
}

УДАЛЕНИЕ:
Удаление работает по-прежнему, но теперь удаляет ВСЕ записи этого типа за день:

"удали дрожь" -> {"action": "remove", "target": "symptom", "itemName": "Дрожь"}
(удалит все записи симптома "Дрожь" за этот день из SymptomEntry)

"удали состояние в 10 утра" -> {"action": "remove", "target": "state", "time": "10:00"}
(удалит конкретную запись состояния в указанное время из StateEntry)

"удали все состояния" -> {"action": "clear", "target": "state"}
(удалит все записи состояния за день из StateEntry)

"удали лекарство" -> {"action": "remove", "target": "medication", "itemName": "название"}
(удалит все записи этого лекарства за день)

ВАЖНЫЕ ОГРАНИЧЕНИЯ (как и раньше):
- Ты НЕ ветеринар и НЕ можешь давать медицинские рекомендации
- При вопросах о здоровье/лечении - рекомендуй обратиться к ветеринару

Верни ТОЛЬКО валидный JSON без дополнительного текста.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return parsed;
  } catch (error) {
    throw error;
  }
}

export type { ParsedEntry, ParsedMedication };
