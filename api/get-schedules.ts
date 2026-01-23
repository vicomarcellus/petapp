import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const result = await sql`
      SELECT 
        id,
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
        created_at,
        (start_date + (days_count || ' days')::interval)::date as end_date,
        CASE 
          WHEN CURRENT_DATE > (start_date + (days_count || ' days')::interval)::date THEN false
          ELSE true
        END as is_current
      FROM medication_schedules
      WHERE user_id = ${userId as string}
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      success: true,
      schedules: result.rows,
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
