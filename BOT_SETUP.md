# 🚀 Быстрый запуск Telegram бота

## Шаг 1: Создать бота (2 минуты)

1. Открой Telegram
2. Найди [@BotFather](https://t.me/BotFather)
3. Отправь `/newbot`
4. Придумай имя: `Pet Health Bot`
5. Придумай username: `your_pet_health_bot` (должен заканчиваться на `bot`)
6. Скопируй токен (выглядит как `123456:ABC-DEF...`)

## Шаг 2: Настроить базу данных (1 минута)

1. Открой Supabase Dashboard
2. Перейди в **SQL Editor**
3. Выполни SQL из файла `sql/create_telegram_tables.sql`

Или скопируй и выполни:

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

ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own link codes"
  ON telegram_link_codes FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert their own link codes"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);
```

## Шаг 3: Настроить бота (2 минуты)

1. Открой терминал
2. Перейди в папку бота:
```bash
cd bot
```

3. Установи зависимости:
```bash
npm install
```

4. Создай файл `.env`:
```bash
cp .env.example .env
```

5. Открой `.env` и заполни:
```env
BOT_TOKEN=твой_токен_от_BotFather
SUPABASE_URL=твой_supabase_url
SUPABASE_ANON_KEY=твой_supabase_anon_key
```

**Где взять Supabase данные:**
- Открой Supabase Dashboard
- Settings → API
- Скопируй **Project URL** → это `SUPABASE_URL`
- Скопируй **anon public** ключ → это `SUPABASE_ANON_KEY`

## Шаг 4: Запустить бота (1 минута)

```bash
npm run dev
```

Должно появиться:
```
🤖 Bot starting...
✅ Bot @your_pet_health_bot is running!
```

## Шаг 5: Добавить компонент в веб-приложение (2 минуты)

1. Открой `src/components/Settings.tsx`
2. Добавь импорт:
```typescript
import TelegramBot from './TelegramBot';
```

3. Добавь вкладку "Telegram Bot" в меню настроек
4. Добавь компонент `<TelegramBot />` в соответствующую секцию

Или создай отдельную страницу для бота.

## Шаг 6: Протестировать (2 минуты)

1. Открой веб-приложение
2. Перейди в **Настройки → Telegram Bot**
3. Нажми **"Сгенерировать код"**
4. Скопируй код
5. Открой бота в Telegram: `@your_pet_health_bot`
6. Отправь `/start`
7. Отправь `/link КОД`
8. Должно появиться: "✅ Аккаунт успешно привязан!"

## Готово! 🎉

Теперь можешь:
- Добавлять записи через бота
- Просматривать записи за сегодня
- Получать напоминания

## Команды бота

- `/start` - Главное меню
- `/today` - Записи за сегодня
- `/link <код>` - Привязать аккаунт
- `/help` - Справка

## Если что-то не работает

### Бот не отвечает
```bash
# Проверь что бот запущен
npm run dev

# Проверь токен в .env
cat .env
```

### Ошибка при привязке
- Проверь что таблицы созданы в Supabase
- Проверь что код не истёк (10 минут)
- Сгенерируй новый код

### Ошибка при добавлении записи
- Проверь что у пользователя есть питомцы
- Проверь RLS политики в Supabase

## Деплой на продакшен

### Vercel (бесплатно)
```bash
npm i -g vercel
cd bot
vercel
```

### VPS
```bash
npm run build
npm i -g pm2
pm2 start dist/index.js --name pet-health-bot
pm2 save
pm2 startup
```

## Полная документация

Смотри `bot/README.md` для подробной информации.
