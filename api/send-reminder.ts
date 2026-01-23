import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId, petName, medicationName, dosage, time } = req.body;

  if (!chatId || !medicationName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const message = `
🔔 <b>Напоминание о лекарстве</b>

🐾 Питомец: ${petName}
💊 Лекарство: ${medicationName}
📏 Дозировка: ${dosage}
⏰ Время: ${time}

Не забудьте дать лекарство!
  `.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', data);
      return res.status(500).json({ error: 'Failed to send message', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
