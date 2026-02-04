import { Bot, webhookCallback } from 'grammy';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { BotContext } from '../src/handlers/add';

const BOT_TOKEN = process.env.BOT_TOKEN!;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

// Создаём бота
const bot = new Bot<BotContext>(BOT_TOKEN);

// Импортируем обработчики
import('../src/handlers/start').then(({ handleStart, handleHelp }) => {
  bot.command('start', handleStart);
  bot.command('help', handleHelp);
});

import('../src/handlers/today').then(({ handleToday }) => {
  bot.command('today', handleToday);
  bot.hears('📊 Сегодня', handleToday);
});

import('../src/handlers/link').then(({ handleLink }) => {
  bot.command('link', handleLink);
});

import('../src/handlers/loginByEmail').then(({ handleLoginByEmail }) => {
  bot.command('login', handleLoginByEmail);
});

import('../src/handlers/add').then(({
  startAddState,
  startAddSymptom,
  startAddMedication,
  startAddFeeding,
  handleStateScore,
  handleSymptomText,
  handleMedicationText,
  handleMedicationUnit,
  handleFeedingText,
  handleFeedingUnit
}) => {
  // Главное меню
  bot.hears('➕ Добавить', async (ctx) => {
    const { addMenuKeyboard } = await import('../src/keyboards');
    await ctx.reply('Выберите тип записи:', { reply_markup: addMenuKeyboard() });
  });

  // Меню добавления
  bot.hears('😊 Состояние', startAddState);
  bot.hears('🤒 Симптом', startAddSymptom);
  bot.hears('💊 Лекарство', startAddMedication);
  bot.hears('🍽️ Питание', startAddFeeding);
  bot.hears('◀️ Назад', async (ctx) => {
    const { mainMenuKeyboard } = await import('../src/keyboards');
    await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard() });
  });

  // Callback queries
  bot.callbackQuery(/^state_(\d)$/, async (ctx) => {
    const score = parseInt(ctx.match[1]);
    await handleStateScore(ctx, score);
  });

  bot.callbackQuery(/^unit_(.+)$/, async (ctx) => {
    const unit = ctx.match[1];
    await handleMedicationUnit(ctx, unit);
  });

  bot.callbackQuery(/^funit_(.+)$/, async (ctx) => {
    const unit = ctx.match[1] as 'g' | 'ml' | 'none';
    await handleFeedingUnit(ctx, unit);
  });

  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.editMessageText('❌ Отменено');
    ctx.session.state = 'idle';
    ctx.session.temp_data = {};
  });

  // Обработка текстовых сообщений
  bot.on('message:text', async (ctx) => {
    const state = ctx.session?.state;

    if (state === 'adding_symptom') {
      await handleSymptomText(ctx);
    } else if (state === 'adding_medication') {
      await handleMedicationText(ctx);
    } else if (state === 'adding_feeding') {
      await handleFeedingText(ctx);
    }
  });
});

// Обработка ошибок
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Экспортируем webhook handler для Vercel
export default webhookCallback(bot, 'std/http');

// Для установки webhook (вызывается один раз)
export async function setupWebhook(url: string) {
  await bot.api.setWebhook(url);
  console.log(`Webhook set to ${url}`);
}
