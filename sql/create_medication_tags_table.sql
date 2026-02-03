-- Создание таблицы medication_tags
CREATE TABLE IF NOT EXISTS medication_tags (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_dosage_amount TEXT,
  default_dosage_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_medication_tags_user_id ON medication_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_tags_pet_id ON medication_tags(pet_id);

-- RLS политики
ALTER TABLE medication_tags ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои теги
CREATE POLICY "Users can view own medication_tags" ON medication_tags
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать свои теги
CREATE POLICY "Users can create own medication_tags" ON medication_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять свои теги
CREATE POLICY "Users can update own medication_tags" ON medication_tags
  FOR UPDATE USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять свои теги
CREATE POLICY "Users can delete own medication_tags" ON medication_tags
  FOR DELETE USING (auth.uid() = user_id);
