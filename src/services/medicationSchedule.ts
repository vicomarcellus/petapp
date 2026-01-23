// Сервис для работы с расписаниями лекарств через Vercel API

export interface MedicationSchedule {
  id?: number;
  userId: string;
  chatId: string;
  petId: number;
  petName: string;
  medicationName: string;
  dosage: string;
  time: string; // HH:mm
  startDate: string; // YYYY-MM-DD
  daysCount: number;
  color?: string;
  note?: string;
  isActive?: boolean;
  createdAt?: string;
  endDate?: string;
  isCurrent?: boolean;
}

// Получить userId (генерируем один раз и сохраняем)
export const getUserId = (): string => {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

// Создать расписание
export const createSchedule = async (
  petId: number,
  petName: string,
  medicationName: string,
  dosage: string,
  time: string,
  startDate: string,
  daysCount: number,
  color?: string,
  note?: string
): Promise<{ success: boolean; scheduleId?: number; error?: string }> => {
  const userId = getUserId();
  const chatId = localStorage.getItem('telegram_chat_id');

  if (!chatId) {
    return { success: false, error: 'Telegram chat ID не настроен. Перейдите в Настройки.' };
  }

  try {
    const response = await fetch('/api/schedule-medication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        chatId,
        petId,
        petName,
        medicationName,
        dosage,
        time,
        startDate,
        daysCount,
        color,
        note,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Ошибка создания расписания' };
    }

    return { success: true, scheduleId: data.scheduleId };
  } catch (error) {
    console.error('Error creating schedule:', error);
    return { success: false, error: 'Ошибка сети' };
  }
};

// Получить все расписания пользователя
export const getSchedules = async (): Promise<{
  success: boolean;
  schedules?: MedicationSchedule[];
  error?: string;
}> => {
  const userId = getUserId();

  try {
    const response = await fetch(`/api/get-schedules?userId=${userId}`);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Ошибка загрузки расписаний' };
    }

    return { success: true, schedules: data.schedules };
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return { success: false, error: 'Ошибка сети' };
  }
};

// Удалить расписание
export const deleteSchedule = async (scheduleId: number): Promise<{
  success: boolean;
  error?: string;
}> => {
  const userId = getUserId();

  try {
    const response = await fetch('/api/delete-schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Ошибка удаления расписания' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return { success: false, error: 'Ошибка сети' };
  }
};

// Отправить тестовое уведомление
export const sendTestReminder = async (
  petName: string,
  medicationName: string,
  dosage: string,
  time: string
): Promise<{ success: boolean; error?: string }> => {
  const chatId = localStorage.getItem('telegram_chat_id');

  if (!chatId) {
    return { success: false, error: 'Telegram chat ID не настроен' };
  }

  try {
    const response = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        petName,
        medicationName,
        dosage,
        time,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Ошибка отправки' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending test reminder:', error);
    return { success: false, error: 'Ошибка сети' };
  }
};
