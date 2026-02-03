-- Create diagnosis_notes table for multiple notes per diagnosis
CREATE TABLE IF NOT EXISTS diagnosis_notes (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_id BIGINT NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_diagnosis_notes_diagnosis_id ON diagnosis_notes(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_notes_user_pet ON diagnosis_notes(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_notes_date ON diagnosis_notes(date);

-- Enable RLS
ALTER TABLE diagnosis_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own diagnosis notes" ON diagnosis_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnosis notes" ON diagnosis_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnosis notes" ON diagnosis_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnosis notes" ON diagnosis_notes
  FOR DELETE USING (auth.uid() = user_id);
