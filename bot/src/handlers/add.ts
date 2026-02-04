import { Context, SessionFlavor } from 'grammy';
import { 
  getSupabaseUserId, 
  getActivePet, 
  addStateEntry, 
  addSymptomEntry,
  addMedicationEntry,
  addFeedingEntry
} from '../db.js';
import { 
  stateScoreKeyboard, 
  medicationUnitsKeyboard,
  feedingUnitsKeyboard,
  mainMenuKeyboard 
} from '../keyboards.js';

interface SessionData {
  state?: 'idle' | 'adding_state' | 'adding_symptom' | 'adding_medication' | 'adding_feeding';
  temp_data?: any;
}

export type BotContext = Context & SessionFlavor<SessionData>;

// Добавление состояния
export async function startAddState(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userId = await getSupabaseUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Аккаунт не привязан. Используйте /link');
    return;
  }

  const pet = await getActivePet(userId);
  if (!pet) {
    await ctx.reply('❌ У вас нет питомцев.');
    return;
  }

  ctx.session.state = 'adding_state';
  ctx.session.temp_data = { userId, petId: pet.id };

  await ctx.reply(
    '😊 *Добавление состояния*\n\n' +
    'Выберите оценку состояния питомца:',
    { 
      reply_markup: stateScoreKeyboard(),
      parse_mode: 'Markdown'
    }
  );
}

export async function handleStateScore(ctx: BotContext, score: number) {
  if (ctx.session.state !== 'adding_state') return;

  const { userId, petId } = ctx.session.temp_data;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);

  const entry = await addStateEntry({
    user_id: userId,
    pet_id: petId,
    date,
    time,
    timestamp: now.getTime(),
    state_score: score as 1 | 2 | 3 | 4 | 5
  });

  if (entry) {
    await ctx.editMessageText(
      `✅ Состояние добавлено!\n\n` +
      `Оценка: ${score}/5\n` +
      `Время: ${time}`
    );
  } else {
    await ctx.editMessageText('❌ Ошибка при сохранении');
  }

  ctx.session.state = 'idle';
  ctx.session.temp_data = {};
}

// Добавление симптома
export async function startAddSymptom(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userId = await getSupabaseUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Аккаунт не привязан. Используйте /link');
    return;
  }

  const pet = await getActivePet(userId);
  if (!pet) {
    await ctx.reply('❌ У вас нет питомцев.');
    return;
  }

  ctx.session.state = 'adding_symptom';
  ctx.session.temp_data = { userId, petId: pet.id };

  await ctx.reply(
    '🤒 *Добавление симптома*\n\n' +
    'Напишите название симптома:',
    { parse_mode: 'Markdown' }
  );
}

export async function handleSymptomText(ctx: BotContext) {
  if (ctx.session.state !== 'adding_symptom') return;

  const symptomName = ctx.message?.text?.trim();
  if (!symptomName) return;

  const { userId, petId } = ctx.session.temp_data;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);

  const entry = await addSymptomEntry({
    user_id: userId,
    pet_id: petId,
    date,
    time,
    timestamp: now.getTime(),
    symptom: symptomName
  });

  if (entry) {
    await ctx.reply(
      `✅ Симптом добавлен!\n\n` +
      `Симптом: ${symptomName}\n` +
      `Время: ${time}`,
      { reply_markup: mainMenuKeyboard() }
    );
  } else {
    await ctx.reply('❌ Ошибка при сохранении');
  }

  ctx.session.state = 'idle';
  ctx.session.temp_data = {};
}

// Добавление лекарства
export async function startAddMedication(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userId = await getSupabaseUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Аккаунт не привязан. Используйте /link');
    return;
  }

  const pet = await getActivePet(userId);
  if (!pet) {
    await ctx.reply('❌ У вас нет питомцев.');
    return;
  }

  ctx.session.state = 'adding_medication';
  ctx.session.temp_data = { userId, petId: pet.id, step: 'name' };

  await ctx.reply(
    '💊 *Добавление лекарства*\n\n' +
    'Напишите название лекарства:',
    { parse_mode: 'Markdown' }
  );
}

export async function handleMedicationText(ctx: BotContext) {
  if (ctx.session.state !== 'adding_medication') return;

  const text = ctx.message?.text?.trim();
  if (!text) return;

  const { step } = ctx.session.temp_data;

  if (step === 'name') {
    ctx.session.temp_data.name = text;
    ctx.session.temp_data.step = 'amount';
    await ctx.reply('Напишите дозировку (только число, например: 0.3):');
  } else if (step === 'amount') {
    ctx.session.temp_data.amount = text;
    ctx.session.temp_data.step = 'unit';
    await ctx.reply(
      'Выберите единицу измерения:',
      { reply_markup: medicationUnitsKeyboard() }
    );
  }
}

export async function handleMedicationUnit(ctx: BotContext, unit: string) {
  if (ctx.session.state !== 'adding_medication') return;

  const { userId, petId, name, amount } = ctx.session.temp_data;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);

  const entry = await addMedicationEntry({
    user_id: userId,
    pet_id: petId,
    date,
    time,
    timestamp: now.getTime(),
    medication_name: name,
    dosage_amount: amount,
    dosage_unit: unit
  });

  if (entry) {
    await ctx.editMessageText(
      `✅ Лекарство добавлено!\n\n` +
      `Название: ${name}\n` +
      `Дозировка: ${amount} ${unit}\n` +
      `Время: ${time}`
    );
  } else {
    await ctx.editMessageText('❌ Ошибка при сохранении');
  }

  ctx.session.state = 'idle';
  ctx.session.temp_data = {};
}

// Добавление питания
export async function startAddFeeding(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userId = await getSupabaseUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Аккаунт не привязан. Используйте /link');
    return;
  }

  const pet = await getActivePet(userId);
  if (!pet) {
    await ctx.reply('❌ У вас нет питомцев.');
    return;
  }

  ctx.session.state = 'adding_feeding';
  ctx.session.temp_data = { userId, petId: pet.id, step: 'name' };

  await ctx.reply(
    '🍽️ *Добавление питания*\n\n' +
    'Напишите название корма/воды:',
    { parse_mode: 'Markdown' }
  );
}

export async function handleFeedingText(ctx: BotContext) {
  if (ctx.session.state !== 'adding_feeding') return;

  const text = ctx.message?.text?.trim();
  if (!text) return;

  const { step } = ctx.session.temp_data;

  if (step === 'name') {
    ctx.session.temp_data.name = text;
    ctx.session.temp_data.step = 'amount';
    await ctx.reply('Напишите количество (например: 50):');
  } else if (step === 'amount') {
    ctx.session.temp_data.amount = text;
    ctx.session.temp_data.step = 'unit';
    await ctx.reply(
      'Выберите единицу измерения:',
      { reply_markup: feedingUnitsKeyboard() }
    );
  }
}

export async function handleFeedingUnit(ctx: BotContext, unit: 'g' | 'ml' | 'none') {
  if (ctx.session.state !== 'adding_feeding') return;

  const { userId, petId, name, amount } = ctx.session.temp_data;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);

  const entry = await addFeedingEntry({
    user_id: userId,
    pet_id: petId,
    date,
    time,
    timestamp: now.getTime(),
    food_name: name,
    amount,
    unit
  });

  if (entry) {
    const unitText = unit !== 'none' ? ` ${unit}` : '';
    await ctx.editMessageText(
      `✅ Питание добавлено!\n\n` +
      `Название: ${name}\n` +
      `Количество: ${amount}${unitText}\n` +
      `Время: ${time}`
    );
  } else {
    await ctx.editMessageText('❌ Ошибка при сохранении');
  }

  ctx.session.state = 'idle';
  ctx.session.temp_data = {};
}
