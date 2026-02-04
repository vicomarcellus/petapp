import { config } from 'dotenv';

config();

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
export const WEBHOOK_URL = process.env.WEBHOOK_URL;
export const PORT = parseInt(process.env.PORT || '3000');

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
}
