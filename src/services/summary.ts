import { DayEntry, MedicationEntry } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function generateDaySummary(
  dayEntry: DayEntry | undefined,
  medications: MedicationEntry[]
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return 'AI summary недоступен';
  }

  const medsText = medications.map(m => `${m.medication_name} ${m.dosage} в ${m.time}`).join(', ');
  const symptomsText = dayEntry?.symptoms?.join(', ') || '';

  const prompt = `Создай краткое резюме дня для кота (1-2 предложения):
Состояние: ${dayEntry ? dayEntry.state_score : 'не указано'}/5
Симптомы: ${symptomsText || 'нет'}
Лекарства: ${medsText || 'не давали'}
Заметка: ${dayEntry?.note || 'нет'}

Ответь кратко, по-русски, без лишних слов.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error('API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Не удалось создать резюме';
  }
}
