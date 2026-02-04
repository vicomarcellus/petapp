-- Исправление RLS политик для работы Telegram бота

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can insert their own telegram link" ON telegram_users;
DROP POLICY IF EXISTS "Users can update their own telegram link" ON telegram_users;

-- Создаём новые политики, которые позволяют боту работать
-- Политика для вставки: разрешаем вставку если либо текущий пользователь совпадает,
-- либо если запрос идёт от service role (бот)
CREATE POLICY "Allow insert telegram link"
  ON telegram_users FOR INSERT
  WITH CHECK (
    auth.uid() = supabase_user_id 
    OR 
    auth.jwt()->>'role' = 'service_role'
  );

-- Политика для обновления: разрешаем обновление если либо текущий пользователь совпадает,
-- либо если запрос идёт от service role (бот)
CREATE POLICY "Allow update telegram link"
  ON telegram_users FOR UPDATE
  USING (
    auth.uid() = supabase_user_id 
    OR 
    auth.jwt()->>'role' = 'service_role'
  );

-- Проверяем политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'telegram_users';
