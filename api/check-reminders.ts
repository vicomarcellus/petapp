import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Проверяем что это cron запрос от Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    console.log(`Checking reminders for ${currentDate} ${currentTime}`);

    // Находим все активные расписания на текущее время
    const result = await sql`
      SELECT 
        id,
        chat_id,
        pet_name,
        medication_name,
        dosage,
        time
      FROM medication_schedules
      WHERE is_active = true
      AND time = ${currentTime}
      AND start_date <= ${currentDate}::date
      AND (start_date + (days_count || ' days')::interval)::date >= ${currentDate}::date
    `;

    console.log(`Found ${result.rows.length} reminders to send`);

    const sentReminders = [];
    const failedReminders = [];

    // Отправляем напоминания
    for (const schedule of result.rows) {
      try {
        const message = `
🔔 <b>Напоминание о лекарстве</b>

🐾 Питомец: ${schedule.pet_name}
💊 Лекарство: ${schedule.medication_name}
📏 Дозировка: ${schedule.dosage}
⏰ Время: ${schedule.time}

Не забудьте дать лекарство!
        `.trim();

        const response = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: schedule.chat_id,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );

        if (response.ok) {
          sentReminders.push(schedule.id);
          console.log(`Sent reminder for schedule ${schedule.id}`);
        } else {
          const error = await response.json();
          failedReminders.push({ id: schedule.id, error });
          console.error(`Failed to send reminder for schedule ${schedule.id}:`, error);
        }
      } catch (error) {
        failedReminders.push({ id: schedule.id, error: String(error) });
        console.error(`Error sending reminder for schedule ${schedule.id}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      checked: result.rows.length,
      sent: sentReminders.length,
      failed: failedReminders.length,
      time: currentTime,
      date: currentDate,
      sentReminders,
      failedReminders,
    });
  } catch (error) {
    console.error('Error in check-reminders:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
