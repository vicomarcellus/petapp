# 🔧 Исправление ошибки генерации кода

## Проблема
Ошибка при генерации кода в веб-приложении.

## Причина
Скорее всего таблицы не созданы или RLS политики блокируют вставку.

## Решение

### Шаг 1: Проверить таблицы

Открой Supabase Dashboard → SQL Editor и выполни:

```sql
-- Проверить существование таблиц
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'telegram_users'
) as telegram_users_exists;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'telegram_link_codes'
) as telegram_link_codes_exists;
```

Если хотя бы одна таблица не существует (false), переходи к Шагу 2.

### Шаг 2: Создать таблицы заново

Выполни SQL из файла **`sql/create_telegram_tables_fixed.sql`**:

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

-- RLS политики
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

-- RLS политики
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own link codes" ON telegram_link_codes;
CREATE POLICY "Users can view their own link codes"
  ON telegram_link_codes FOR SELECT
  USING (auth.uid() = supabase_user_id);

DROP POLICY IF EXISTS "Users can insert their own link codes" ON telegram_link_codes;
CREATE POLICY "Users can insert their own link codes"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- Функция для очистки истёкших кодов
CREATE OR REPLACE FUNCTION cleanup_expired_link_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

### Шаг 3: Проверить RLS политики

```sql
-- Проверить политики для telegram_link_codes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'telegram_link_codes' 
  AND schemaname = 'public';
```

Должны быть политики:
- `Users can view their own link codes` (SELECT)
- `Users can insert their own link codes` (INSERT)

### Шаг 4: Протестировать

1. Обнови страницу в браузере (F5)
2. Перейди в Настройки → Telegram Bot
3. Нажми "Сгенерировать код"
4. Должен появиться код

## Если всё равно не работает

### Проверь консоль браузера

1. Открой DevTools (F12)
2. Вкладка Console
3. Нажми "Сгенерировать код"
4. Посмотри ошибку

### Частые ошибки

**"relation telegram_link_codes does not exist"**
→ Таблица не создана, выполни Шаг 2

**"new row violates row-level security policy"**
→ RLS политики неправильные, выполни Шаг 2 (с DROP POLICY)

**"permission denied for table telegram_link_codes"**
→ RLS включен но политики не созданы, выполни Шаг 2

**"auth.uid() is null"**
→ Пользователь не авторизован, проверь что ты залогинен

### Временное решение (отключить RLS)

**ВНИМАНИЕ:** Это небезопасно, используй только для тестирования!

```sql
-- Отключить RLS (временно)
ALTER TABLE telegram_link_codes DISABLE ROW LEVEL SECURITY;
```

После тестирования обязательно включи обратно:

```sql
-- Включить RLS обратно
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
```

## Проверка что всё работает

1. Веб-приложение → Настройки → Telegram Bot
2. Нажми "Сгенерировать код"
3. Должен появиться код (например: ABC123XY)
4. Скопируй код
5. Telegram → @petappkent_bot → `/link ABC123XY`
6. Должно появиться: "✅ Аккаунт успешно привязан!"

## Готово! 🎉

После выполнения Шага 2 всё должно работать.

---

**Если проблема остаётся:**
1. Скопируй ошибку из консоли браузера (F12)
2. Проверь что пользователь авторизован
3. Проверь что таблицы созданы
4. Проверь RLS политики
