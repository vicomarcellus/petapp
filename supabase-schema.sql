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

-- Таблица диагнозов
CREATE TABLE IF NOT EXISTS diagnoses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnosis TEXT NOT NULL,
  notes TEXT,
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
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_pet_date ON diagnoses(user_id, pet_id, date);

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
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

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

-- Политики для diagnoses
CREATE POLICY "Users can view own diagnoses" ON diagnoses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnoses" ON diagnoses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diagnoses" ON diagnoses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diagnoses" ON diagnoses FOR DELETE USING (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для day_entries
CREATE TRIGGER update_day_entries_updated_at BEFORE UPDATE ON day_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
