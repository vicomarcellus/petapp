-- Добавление полей для запланированных событий

-- Medication entries
ALTER TABLE medication_entries 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scheduled_time BIGINT;

-- Feeding entries  
ALTER TABLE feeding_entries
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scheduled_time BIGINT;

-- State entries
ALTER TABLE state_entries
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scheduled_time BIGINT;

-- Symptom entries
ALTER TABLE symptom_entries
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scheduled_time BIGINT;

-- Создаем индексы для быстрого поиска невыполненных событий
CREATE INDEX IF NOT EXISTS idx_medication_scheduled ON medication_entries(pet_id, completed, scheduled_time) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_feeding_scheduled ON feeding_entries(pet_id, completed, scheduled_time) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_state_scheduled ON state_entries(pet_id, completed, scheduled_time) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_symptom_scheduled ON symptom_entries(pet_id, completed, scheduled_time) WHERE completed = false;
