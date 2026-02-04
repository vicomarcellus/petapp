-- Создаем таблицу для хранения вложений
CREATE TABLE IF NOT EXISTS attachments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id BIGINT NOT NULL,
  
  -- Тип родительской записи и её ID
  parent_type TEXT NOT NULL, -- 'state', 'symptom', 'medication', 'feeding', 'note', 'diagnosis', 'diagnosis_note', 'scheduled_medication', 'scheduled_feeding'
  parent_id BIGINT NOT NULL,
  
  -- Данные файла
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image' или 'pdf'
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_pet ON attachments(user_id, pet_id);

-- RLS политики
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);
