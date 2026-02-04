import { InlineKeyboard, Keyboard } from 'grammy';

// Главное меню
export function mainMenuKeyboard() {
  return new Keyboard()
    .text('📊 Сегодня').text('➕ Добавить').row()
    .text('🔔 Напоминания').text('🐾 Питомцы').row()
    .text('⚙️ Настройки')
    .resized()
    .persistent();
}

// Меню добавления
export function addMenuKeyboard() {
  return new Keyboard()
    .text('😊 Состояние').text('🤒 Симптом').row()
    .text('💊 Лекарство').text('🍽️ Питание').row()
    .text('◀️ Назад')
    .resized()
    .oneTime();
}

// Выбор оценки состояния
export function stateScoreKeyboard() {
  return new InlineKeyboard()
    .text('😰 Критично (1)', 'state_1')
    .text('😟 Плохо (2)', 'state_2').row()
    .text('😐 Средне (3)', 'state_3')
    .text('🙂 Нормально (4)', 'state_4').row()
    .text('😊 Отлично (5)', 'state_5').row()
    .text('❌ Отмена', 'cancel');
}

// Подтверждение
export function confirmKeyboard(action: string) {
  return new InlineKeyboard()
    .text('✅ Да', `confirm_${action}`)
    .text('❌ Нет', 'cancel');
}

// Выбор питомца
export function petsKeyboard(pets: Array<{ id: number; name: string; is_active?: boolean }>) {
  const keyboard = new InlineKeyboard();
  
  pets.forEach((pet, index) => {
    const prefix = pet.is_active ? '✅ ' : '';
    keyboard.text(`${prefix}${pet.name}`, `pet_${pet.id}`);
    if ((index + 1) % 2 === 0) keyboard.row();
  });
  
  keyboard.row().text('◀️ Назад', 'back_main');
  
  return keyboard;
}

// Единицы измерения для лекарств
export function medicationUnitsKeyboard() {
  return new InlineKeyboard()
    .text('мл', 'unit_мл').text('мг', 'unit_мг').row()
    .text('г', 'unit_г').text('таб', 'unit_таб').row()
    .text('капс', 'unit_капс').text('капли', 'unit_капли').row()
    .text('❌ Отмена', 'cancel');
}

// Единицы измерения для питания
export function feedingUnitsKeyboard() {
  return new InlineKeyboard()
    .text('г', 'funit_g')
    .text('мл', 'funit_ml')
    .text('без единиц', 'funit_none').row()
    .text('❌ Отмена', 'cancel');
}
