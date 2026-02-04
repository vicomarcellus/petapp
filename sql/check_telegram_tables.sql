-- Проверка существования таблиц Telegram бота

-- Проверить таблицу telegram_users
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'telegram_users'
) as telegram_users_exists;

-- Проверить таблицу telegram_link_codes
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'telegram_link_codes'
) as telegram_link_codes_exists;

-- Проверить RLS политики для telegram_link_codes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'telegram_link_codes' 
  AND schemaname = 'public';

-- Если таблицы не существуют, выполни sql/create_telegram_tables.sql
