import { Context } from 'grammy';
import { getSupabaseUserId, getActivePet, getTodayEntries } from '../db.js';
import { STATE_LABELS } from '../types.js';

export async function handleToday(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userId = await getSupabaseUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Аккаунт не привязан. Используйте /link');
    return;
  }

  const pet = await getActivePet(userId);
  if (!pet) {
    await ctx.reply('❌ У вас нет питомцев. Добавьте питомца в веб-приложении.');
    return;
  }

  const entries = await getTodayEntries(userId, pet.id!);

  let message = `📊 *Записи за сегодня*\n🐾 Питомец: ${pet.name}\n\n`;

  // Состояния
  if (entries.states.length > 0) {
    message += '*😊 Состояния:*\n';
    entries.states.forEach(state => {
      const label = STATE_LABELS[state.state_score];
      const note = state.note ? ` - ${state.note}` : '';
      message += `• ${state.time} - ${label}${note}\n`;
    });
    message += '\n';
  }

  // Симптомы
  if (entries.symptoms.length > 0) {
    message += '*🤒 Симптомы:*\n';
    entries.symptoms.forEach(symptom => {
      const note = symptom.note ? ` - ${symptom.note}` : '';
      message += `• ${symptom.time} - ${symptom.symptom}${note}\n`;
    });
    message += '\n';
  }

  // Лекарства
  if (entries.medications.length > 0) {
    message += '*💊 Лекарства:*\n';
    entries.medications.forEach(med => {
      const dosage = `${med.dosage_amount} ${med.dosage_unit}`;
      const note = med.note ? ` - ${med.note}` : '';
      message += `• ${med.time} - ${med.medication_name} (${dosage})${note}\n`;
    });
    message += '\n';
  }

  // Питание
  if (entries.feedings.length > 0) {
    message += '*🍽️ Питание:*\n';
    entries.feedings.forEach(feeding => {
      const amount = feeding.unit !== 'none' 
        ? `${feeding.amount} ${feeding.unit}` 
        : feeding.amount;
      const note = feeding.note ? ` - ${feeding.note}` : '';
      message += `• ${feeding.time} - ${feeding.food_name} (${amount})${note}\n`;
    });
    message += '\n';
  }

  if (entries.states.length === 0 && 
      entries.symptoms.length === 0 && 
      entries.medications.length === 0 && 
      entries.feedings.length === 0) {
    message += '_Записей пока нет_';
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
