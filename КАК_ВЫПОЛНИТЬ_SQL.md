# 📝 Как выполнить SQL схему в Supabase

## Шаг 1: Откройте Supabase

1. Перейдите на [https://supabase.com](https://supabase.com)
2. Войдите в свой аккаунт
3. Откройте ваш проект (pet-health-tracker или как вы его назвали)

## Шаг 2: Откройте SQL Editor

1. В левом меню найдите **SQL Editor** (иконка с символом `</>`)
2. Нажмите на него

## Шаг 3: Создайте новый запрос

1. Нажмите кнопку **New query** (зеленая кнопка вверху справа)
2. Откроется пустой редактор

## Шаг 4: Скопируйте SQL код

1. Откройте файл `supabase-schema.sql` в вашем проекте
2. Выделите **ВЕСЬ** код (Ctrl+A или Cmd+A)
3. Скопируйте (Ctrl+C или Cmd+C)

**ИЛИ** скопируйте код ниже:

```sql
-- Включаем Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Таблица питомцев
CREATE TABLE IF NOT EXISTS pets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false
);

-- Таблица записей дня
CREATE TABLE IF NOT EXISTS day_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  state_score INTEGER NOT NULL CHECK (state_score >= 1 AND state_score <= 5),
  note TEXT DEFAULT '',
  symptoms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pet_id, date)
);

-- Таблица записей состояния
CREATE TABLE IF NOT EXISTS state_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  state_score INTEGER NOT NULL CHECK (state_score >= 1 AND state_score <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица записей симптомов
CREATE TABLE IF NOT EXISTS symptom_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  symptom TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица записей лекарств
CREATE TABLE IF NOT EXISTS medication_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Таблица записей кормления
CREATE TABLE IF NOT EXISTS feeding_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  food_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  unit TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица справочника лекарств
CREATE TABLE IF NOT EXISTS medications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  default_dosage TEXT,
  UNIQUE(user_id, pet_id, name)
);

-- Таблица тегов симптомов
CREATE TABLE IF NOT EXISTS symptom_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  UNIQUE(user_id, pet_id, name)
);

-- Таблица тегов лекарств
CREATE TABLE IF NOT EXISTS medication_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  UNIQUE(user_id, pet_id, name)
);

-- Таблица тегов еды
CREATE TABLE IF NOT EXISTS food_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_amount TEXT,
  default_unit TEXT NOT NULL,
  UNIQUE(user_id, pet_id, name)
);

-- Таблица задач чеклиста
CREATE TABLE IF NOT EXISTS checklist_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  task_type TEXT NOT NULL,
  linked_item_id BIGINT,
  linked_item_name TEXT,
  linked_item_amount TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_day_entries_user_pet_date ON day_entries(user_id, pet_id, date);
CREATE INDEX IF NOT EXISTS idx_state_entries_user_pet_date ON state_entries(user_id, pet_id, date);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_user_pet_date ON symptom_entries(user_id, pet_id, date);
CREATE INDEX IF NOT EXISTS idx_medication_entries_user_pet_date ON medication_entries(user_id, pet_id, date);
CREATE INDEX IF NOT EXISTS idx_feeding_entries_user_pet_date ON feeding_entries(user_id, pet_id, date);
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_user_pet_date ON checklist_tasks(user_id, pet_id, date);

-- Row Level Security (RLS) политики
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;

-- Политики для pets
CREATE POLICY "Users can view own pets" ON pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pets" ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON pets FOR DELETE USING (auth.uid() = user_id);

-- Политики для day_entries
CREATE POLICY "Users can view own day_entries" ON day_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own day_entries" ON day_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own day_entries" ON day_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own day_entries" ON day_entries FOR DELETE USING (auth.uid() = user_id);

-- Политики для state_entries
CREATE POLICY "Users can view own state_entries" ON state_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own state_entries" ON state_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own state_entries" ON state_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own state_entries" ON state_entries FOR DELETE USING (auth.uid() = user_id);

-- Политики для symptom_entries
CREATE POLICY "Users can view own symptom_entries" ON symptom_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own symptom_entries" ON symptom_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own symptom_entries" ON symptom_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own symptom_entries" ON symptom_entries FOR DELETE USING (auth.uid() = user_id);

-- Политики для medication_entries
CREATE POLICY "Users can view own medication_entries" ON medication_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medication_entries" ON medication_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medication_entries" ON medication_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medication_entries" ON medication_entries FOR DELETE USING (auth.uid() = user_id);

-- Политики для feeding_entries
CREATE POLICY "Users can view own feeding_entries" ON feeding_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feeding_entries" ON feeding_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feeding_entries" ON feeding_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feeding_entries" ON feeding_entries FOR DELETE USING (auth.uid() = user_id);

-- Политики для medications
CREATE POLICY "Users can view own medications" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON medications FOR DELETE USING (auth.uid() = user_id);

-- Политики для symptom_tags
CREATE POLICY "Users can view own symptom_tags" ON symptom_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own symptom_tags" ON symptom_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own symptom_tags" ON symptom_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own symptom_tags" ON symptom_tags FOR DELETE USING (auth.uid() = user_id);

-- Политики для medication_tags
CREATE POLICY "Users can view own medication_tags" ON medication_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medication_tags" ON medication_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medication_tags" ON medication_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medication_tags" ON medication_tags FOR DELETE USING (auth.uid() = user_id);

-- Политики для food_tags
CREATE POLICY "Users can view own food_tags" ON food_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food_tags" ON food_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food_tags" ON food_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food_tags" ON food_tags FOR DELETE USING (auth.uid() = user_id);

-- Политики для checklist_tasks
CREATE POLICY "Users can view own checklist_tasks" ON checklist_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checklist_tasks" ON checklist_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklist_tasks" ON checklist_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checklist_tasks" ON checklist_tasks FOR DELETE USING (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Триггер для day_entries
CREATE TRIGGER update_day_entries_updated_at BEFORE UPDATE ON day_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Шаг 5: Вставьте код

1. Вставьте скопированный код в редактор SQL (Ctrl+V или Cmd+V)
2. Убедитесь что весь код вставлен (прокрутите вниз)

## Шаг 6: Выполните запрос

1. Нажмите кнопку **Run** (или нажмите Ctrl+Enter / Cmd+Enter)
2. Подождите 5-10 секунд
3. Внизу должно появиться сообщение **"Success. No rows returned"**

## Шаг 7: Проверьте таблицы

1. В левом меню выберите **Table Editor**
2. Вы должны увидеть список таблиц:
   - pets
   - day_entries
   - state_entries
   - symptom_entries
   - medication_entries
   - feeding_entries
   - medications
   - symptom_tags
   - medication_tags
   - food_tags
   - checklist_tasks

## ✅ Готово!

Теперь можно запустить приложение:

```bash
npm run dev
```

И зарегистрироваться с email и паролем!

---

## ❌ Если возникла ошибка

Если видите ошибку типа "permission denied" или "already exists":
1. Это нормально, некоторые команды могут не выполниться
2. Главное чтобы таблицы создались
3. Проверьте в Table Editor что таблицы есть
4. Если таблиц нет - напишите мне текст ошибки
