const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface DayEntry {
  date: string;
  state_score: number;
  symptoms?: string[];
  note?: string;
}

interface MedicationEntry {
  date: string;
  medication_name: string;
  dosage: string;
  time: string;
}

interface AnalysisResult {
  trend: 'improving' | 'declining' | 'stable';
  trendDescription: string;
  insights: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Анализирует тренды состояния кота за последние N дней
 */
export async function analyzeTrends(
  dayEntries: DayEntry[],
  medicationEntries: MedicationEntry[],
  days: number = 7
): Promise<AnalysisResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key не настроен');
  }

  // Берем последние N дней
  const recentEntries = dayEntries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);

  const recentMeds = medicationEntries
    .filter(med => {
      const dates = recentEntries.map(e => e.date);
      return dates.includes(med.date);
    });

  // Формируем данные для анализа
  const dataForAnalysis = recentEntries.map(entry => {
    const meds = recentMeds.filter(m => m.date === entry.date);
    return {
      date: entry.date,
      state: entry.state_score,
      symptoms: entry.symptoms || [],
      medications: meds.map(m => `${m.medication_name} ${m.dosage}`),
      note: entry.note || '',
    };
  });

  const systemPrompt = `Ты ветеринарный аналитик данных. Анализируй данные о здоровье кота и давай полезные инсайты.

ВАЖНО:
- Ты НЕ даешь медицинские рекомендации о лечении
- Ты анализируешь ТОЛЬКО данные и паттерны
- При серьезных проблемах - рекомендуй ветеринара
- Будь конкретным и полезным

ШКАЛА СОСТОЯНИЯ:
1 - Критично (очень плохо)
2 - Плохо
3 - Средне
4 - Нормально
5 - Отлично

Проанализируй данные и верни JSON:
{
  "trend": "improving" | "declining" | "stable",
  "trendDescription": "Краткое описание тренда (1-2 предложения)",
  "insights": ["Инсайт 1", "Инсайт 2", ...], // 2-4 наблюдения
  "warnings": ["Предупреждение 1", ...], // Если есть тревожные признаки
  "recommendations": ["Рекомендация 1", ...] // 2-3 практических совета (НЕ медицинских!)
}

ПРИМЕРЫ ИНСАЙТОВ:
- "Состояние улучшилось с 2 до 4 за последние 3 дня"
- "Симптом 'Рвота' появляется через 2-3 часа после приема Преднизолона"
- "В дни приема Но-шпы состояние стабильнее"
- "Симптомы усиливаются по вечерам"

ПРИМЕРЫ ПРЕДУПРЕЖДЕНИЙ:
- "Состояние ухудшается 3 дня подряд - рекомендуем консультацию ветеринара"
- "Критическое состояние (1/5) держится 2 дня"
- "Новый симптом 'Не ест' - требует внимания"

ПРИМЕРЫ РЕКОМЕНДАЦИЙ (только практические, НЕ медицинские):
- "Попробуйте записывать время приема пищи для выявления паттернов"
- "Добавьте заметки о поведении кота для более полной картины"
- "Обратите внимание на связь между временем приема лекарств и симптомами"

Верни ТОЛЬКО валидный JSON.`;

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
          { 
            role: 'user', 
            content: `Проанализируй данные за последние ${days} дней:\n\n${JSON.stringify(dataForAnalysis, null, 2)}` 
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return parsed;
  } catch (error) {
    console.error('Error analyzing trends:', error);
    throw error;
  }
}

/**
 * Генерирует контекстные подсказки что можно спросить у AI
 */
export function generateContextualHints(context: {
  hasEntry?: boolean;
  currentState?: number;
  hasSymptoms?: boolean;
  hasMedications?: boolean;
  recentEntries?: number;
}): string[] {
  const hints: string[] = [];

  if (!context.hasEntry) {
    hints.push('Добавь состояние кота');
    hints.push('Запиши симптомы');
    hints.push('Дали лекарство?');
  } else {
    if (context.currentState && context.currentState <= 2) {
      hints.push('Что делать при плохом состоянии?');
      hints.push('Нужен ли ветеринар?');
    }
    
    if (context.hasSymptoms) {
      hints.push('Удали симптом');
      hints.push('Какие симптомы сейчас?');
    }
    
    if (context.hasMedications) {
      hints.push('Что давали сегодня?');
      hints.push('Удали лекарство');
    }
  }

  if (context.recentEntries && context.recentEntries >= 3) {
    hints.push('Покажи тренд за неделю');
    hints.push('Как меняется состояние?');
  }

  // Общие подсказки
  hints.push('Что ты умеешь?');
  hints.push('Как дела у кота?');
  hints.push('Измени состояние на 4');
  hints.push('Добавь заметку');
  hints.push('Очисти все симптомы');

  // Перемешиваем массив и берем первые 4
  const shuffled = hints.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export type { AnalysisResult };
