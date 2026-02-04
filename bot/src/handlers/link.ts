import { Context } from 'grammy';
import { linkTelegramUser } from '../db.js';
import { supabase } from '../supabase.js';
import { mainMenuKeyboard } from '../keyboards.js';

// Генерация кода привязки (вызывается из веб-приложения)
export async function generateLinkCode(userId: string): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

  await supabase
    .from('telegram_link_codes')
    .insert({
      code,
      supabase_user_id: userId,
      expires_at: expiresAt.toISOString()
    });

  return code;
}

// Обработка команды /link
export async function handleLink(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const code = ctx.match?.toString().trim();
  
  if (!code) {
    await ctx.reply(
      '❌ Неверный формат команды.\n\n' +
      'Используйте: /link <код>\n\n' +
      'Код можно получить в веб-приложении:\n' +
      'Настройки → Telegram Bot'
    );
    return;
  }

  // Проверяем код
  const { data, error } = await supabase
    .from('telegram_link_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    await ctx.reply('❌ Неверный код или код истёк.\n\nПолучите новый код в веб-приложении.');
    return;
  }

  // Проверяем срок действия
  if (new Date(data.expires_at) < new Date()) {
    await ctx.reply('❌ Код истёк.\n\nПолучите новый код в веб-приложении.');
    return;
  }

  // Проверяем, не использован ли код
  if (data.used) {
    await ctx.reply('❌ Этот код уже использован.');
    return;
  }

  try {
    // Привязываем аккаунт
    await linkTelegramUser(telegramId, data.supabase_user_id);

    // Помечаем код как использованный
    await supabase
      .from('telegram_link_codes')
      .update({ 
        used: true,
        telegram_id: telegramId,
        used_at: new Date().toISOString()
      })
      .eq('code', code);

    await ctx.reply(
      '✅ Аккаунт успешно привязан!\n\n' +
      'Теперь вы можете использовать бота для управления записями.',
      { reply_markup: mainMenuKeyboard() }
    );
  } catch (err) {
    console.error('Link error:', err);
    await ctx.reply('❌ Ошибка при привязке аккаунта. Попробуйте ещё раз.');
  }
}
