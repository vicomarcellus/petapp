import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scheduleId, userId } = req.body;

  if (!scheduleId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Удаляем только если принадлежит пользователю
    const result = await sql`
      DELETE FROM medication_schedules
      WHERE id = ${scheduleId}
      AND user_id = ${userId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
