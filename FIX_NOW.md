# 🚨 ИСПРАВЬ ОШИБКУ ПРЯМО СЕЙЧАС

## Ошибка
```
406 (Not Acceptable)
GET .../telegram_users
```

## Причина
Таблица `telegram_users` не создана в Supabase.

## Решение за 2 минуты

### 1. Открой Supabase
https://supabase.com/dashboard

### 2. Выбери свой проект
Нажми на проект в списке

### 3. Открой SQL Editor
Левое меню → **SQL Editor**

### 4. Создай новый запрос
Нажми **New query**

### 5. Скопируй SQL
Открой файл `sql/create_telegram_tables_fixed.sql` и скопируй весь SQL

Или скопируй отсюда:

```sql
-- Таблица для связи Telegram ID с Supabase User ID
CREATE TABLE IF NOT EXISTS telegram_users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_supabase_id ON telegram_users(supabase_user_id);

ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own telegram link" ON telegram_users;
CREATE POLICY "Users can view their own telegram link"
  ON telegram_users FOR SELECT
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can insert their own telegram link" ON telegram_users;
CREATE POLICY "Users can insert their own telegram link"
  ON telegram_users FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can update their own telegram link" ON telegram_users;
CREATE POLICY "Users can update their own telegram link"
  ON telegram_users FOR UPDATE
  USING (auth.uid() = supabase_user_id);

-- Таблица для кодов привязки
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user ON telegram_link_codes(supabase_user_id);

ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own link codes" ON telegram_link_codes;
CREATE POLICY "Users can view their own link codes"
  ON telegram_link_codes FOR SELECT
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can insert their own link codes" ON telegram_link_codes;
CREATE POLICY "Users can insert their own link codes"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE OR REPLACE FUNCTION cleanup_expired_link_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

### 6. Вставь SQL в редактор
Ctrl+A → Ctrl+V

### 7. Выполни SQL
Нажми **RUN** (или Ctrl+Enter)

### 8. Проверь результат
Должно появиться:
```
Success. No rows returned
```

### 9. Обнови браузер
Перейди в веб-приложение и нажми F5

### 10. Попробуй снова
Настройки → Telegram Bot → Сгенерировать код

## Готово! ✅

Теперь должно работать!

## Проверка

После выполнения SQL проверь что таблицы созданы:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'telegram%';
```

Должно вернуть:
```
telegram_users
telegram_link_codes
```

## Если всё равно не работает

1. Проверь что SQL выполнился без ошибок
2. Проверь что таблицы созданы (запрос выше)
3. Обнови страницу (F5)
4. Очисти кэш браузера (Ctrl+Shift+R)
5. Попробуй в режиме инкогнито

---

**Выполни SQL прямо сейчас!** ⚡
