import { Bot, session } from 'grammy';
import { BOT_TOKEN } from './config.js';
import { mainMenuKeyboard, addMenuKeyboard } from './keyboards.js';
import { handleStart, handleHelp } from './handlers/start.js';
import { handleLink } from './handlers/link.js';
import { handleLoginByEmail } from './handlers/loginByEmail.js';
import { handleToday } from './handlers/today.js';
import {
  startAddState,
  startAddSymptom,
  startAddMedication,
  startAddFeeding,
  handleStateScore,
  handleSymptomText,
  handleMedicationText,
  handleMedicationUnit,
  handleFeedingText,
  handleFeedingUnit,
  type BotContext
} from './handlers/add.js';

// Создаём бота
const bot = new Bot<BotContext>(BOT_TOKEN!);

// Подключаем сессии
bot.use(session({
  initial: () => ({ state: 'idle' as const, temp_data: {} })
}));

// Команды
bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('today', handleToday);
bot.command('link', handleLink);
bot.command('login', handleLoginByEmail);

// Главное меню
bot.hears('📊 Сегодня', handleToday);
bot.hears('➕ Добавить', async (ctx) => {
  await ctx.reply(
    'Выберите тип записи:',
    { reply_markup: addMenuKeyboard() }
  );
});

// Меню добавления
bot.hears('😊 Состояние', startAddState);
bot.hears('🤒 Симптом', startAddSymptom);
bot.hears('💊 Лекарство', startAddMedication);
bot.hears('🍽️ Питание', startAddFeeding);
bot.hears('◀️ Назад', async (ctx) => {
  await ctx.reply(
    'Главное меню:',
    { reply_markup: mainMenuKeyboard() }
  );
});

// Callback queries для состояния
bot.callbackQuery(/^state_(\d)$/, async (ctx) => {
  const score = parseInt(ctx.match[1]);
  await handleStateScore(ctx, score);
});

// Callback queries для единиц лекарств
bot.callbackQuery(/^unit_(.+)$/, async (ctx) => {
  const unit = ctx.match[1];
  await handleMedicationUnit(ctx, unit);
});

// Callback queries для единиц питания
bot.callbackQuery(/^funit_(.+)$/, async (ctx) => {
  const unit = ctx.match[1] as 'g' | 'ml' | 'none';
  await handleFeedingUnit(ctx, unit);
});

// Отмена
bot.callbackQuery('cancel', async (ctx) => {
  await ctx.editMessageText('❌ Отменено');
  ctx.session.state = 'idle';
  ctx.session.temp_data = {};
});

// Обработка текстовых сообщений
bot.on('message:text', async (ctx) => {
  const state = ctx.session.state;

  if (state === 'adding_symptom') {
    await handleSymptomText(ctx);
  } else if (state === 'adding_medication') {
    await handleMedicationText(ctx);
  } else if (state === 'adding_feeding') {
    await handleFeedingText(ctx);
  }
});

// Обработка ошибок
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Запуск бота
console.log('🤖 Bot starting...');
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} is running!`);
  }
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Bot stopping...');
  bot.stop();
});
process.once('SIGTERM', () => {
  console.log('\n🛑 Bot stopping...');
  bot.stop();
});
