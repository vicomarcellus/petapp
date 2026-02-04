# ⚡ ВЫПОЛНИ ЭТОТ SQL ПРЯМО СЕЙЧАС

## Проблема
```
406 (Not Acceptable)
GET .../telegram_users?select=...
```

Это означает что таблица `telegram_users` не существует.

## Решение

### Открой Supabase Dashboard → SQL Editor

### Скопируй и выполни этот SQL:

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

### Нажми RUN (или Ctrl+Enter)

### Должно появиться: "Success. No rows returned"

### Обнови страницу в браузере (F5)

### Попробуй сгенерировать код снова

## Готово! 🎉

После выполнения SQL всё должно работать.
