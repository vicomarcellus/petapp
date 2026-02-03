-- Таблица тегов для заметок
CREATE TABLE IF NOT EXISTS note_tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id BIGINT REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pet_id, name)
);

-- Таблица связи заметок и тегов (many-to-many)
CREATE TABLE IF NOT EXISTS note_tag_relations (
  id BIGSERIAL PRIMARY KEY,
  note_id BIGINT REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES note_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, tag_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_note_tags_user_pet ON note_tags(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_relations_note ON note_tag_relations(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_relations_tag ON note_tag_relations(tag_id);

-- Row Level Security
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tag_relations ENABLE ROW LEVEL SECURITY;

-- Политики для note_tags
CREATE POLICY "Users can view own note_tags" ON note_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own note_tags" ON note_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own note_tags" ON note_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own note_tags" ON note_tags FOR DELETE USING (auth.uid() = user_id);

-- Политики для note_tag_relations
CREATE POLICY "Users can view own note_tag_relations" ON note_tag_relations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM notes WHERE notes.id = note_tag_relations.note_id AND notes.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own note_tag_relations" ON note_tag_relations FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM notes WHERE notes.id = note_tag_relations.note_id AND notes.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own note_tag_relations" ON note_tag_relations FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM notes WHERE notes.id = note_tag_relations.note_id AND notes.user_id = auth.uid()
  ));
