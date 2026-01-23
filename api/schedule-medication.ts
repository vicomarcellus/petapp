import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
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
  } = req.body;

  if (!userId || !chatId || !petId || !medicationName || !time || !startDate || !daysCount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Создаем расписание
    const result = await sql`
      INSERT INTO medication_schedules (
        user_id,
        chat_id,
        pet_id,
        pet_name,
        medication_name,
        dosage,
        time,
        start_date,
        days_count,
        color,
        note,
        is_active,
        created_at
      ) VALUES (
        ${userId},
        ${chatId},
        ${petId},
        ${petName},
        ${medicationName},
        ${dosage},
        ${time},
        ${startDate},
        ${daysCount},
        ${color || null},
        ${note || null},
        true,
        NOW()
      )
      RETURNING id
    `;

    return res.status(200).json({
      success: true,
      scheduleId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
