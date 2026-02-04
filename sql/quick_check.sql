-- Быстрая проверка таблиц Telegram бота

-- 1. Проверить существование таблиц
SELECT 
  'telegram_users' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'telegram_users'
  ) as exists

UNION ALL

SELECT 
  'telegram_link_codes' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'telegram_link_codes'
  ) as exists;

-- Если обе таблицы существуют (true), проверь RLS политики:
-- SELECT * FROM pg_policies WHERE tablename IN ('telegram_users', 'telegram_link_codes');

-- Если хотя бы одна таблица не существует (false), выполни:
-- sql/create_telegram_tables_fixed.sql
