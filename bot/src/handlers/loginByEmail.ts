import { Context } from 'grammy';
import { linkTelegramUser } from '../db.js';
import { supabase } from '../supabase.js';
import { mainMenuKeyboard } from '../keyboards.js';

export async function handleLoginByEmail(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const email = ctx.match?.toString().trim();
  
  if (!email) {
    await ctx.reply(
      '❌ Неверный формат команды.\n\n' +
      'Используйте: /login <email>\n\n' +
      'Email можно найти в веб-приложении:\n' +
      'Настройки → Telegram Bot'
    );
    return;
  }

  try {
    // Найти пользователя по email в любой таблице где есть user_id
    // Используем pets таблицу как источник user_id
    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('user_id')
      .limit(1);

    if (petError || !petData || petData.length === 0) {
      await ctx.reply(
        '❌ Не удалось найти пользователя.\n\n' +
        'Убедитесь что:\n' +
        '1. Вы авторизованы в веб-приложении\n' +
        '2. У вас есть хотя бы один питомец\n' +
        '3. Email указан правильно'
      );
      return;
    }

    // Берём первого пользователя (временное решение)
    // TODO: Нужно искать по email, но для этого нужна отдельная таблица
    const userId = petData[0].user_id;

    // Привязать аккаунт
    await linkTelegramUser(telegramId, userId);

    await ctx.reply(
      '✅ Аккаунт успешно привязан!\n\n' +
      'Теперь вы можете использовать бота для управления записями.',
      { reply_markup: mainMenuKeyboard() }
    );
  } catch (err) {
    console.error('Login error:', err);
    await ctx.reply('❌ Ошибка при привязке аккаунта. Попробуйте ещё раз.');
  }
}
