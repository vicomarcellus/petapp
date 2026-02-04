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

CREATE POLICY "Users can view their own telegram link"
  ON telegram_users FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert their own telegram link"
  ON telegram_users FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

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

CREATE POLICY "Users can view their own link codes"
  ON telegram_link_codes FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert their own link codes"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

-- Функция для очистки истёкших кодов (запускать раз в день)
CREATE OR REPLACE FUNCTION cleanup_expired_link_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
