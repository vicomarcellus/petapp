-- Проверить сохранённые коды привязки
SELECT 
  code,
  supabase_user_id,
  used,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at < NOW() THEN 'истёк'
    WHEN used = true THEN 'использован'
    ELSE 'активен'
  END as status
FROM telegram_link_codes
ORDER BY created_at DESC
LIMIT 10;

-- Если таблица пустая, значит коды не сохраняются
-- Проверь что RLS политики правильные
