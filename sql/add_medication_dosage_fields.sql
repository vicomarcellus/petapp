-- Добавление полей default_dosage_amount и default_dosage_unit в medication_tags
ALTER TABLE medication_tags 
ADD COLUMN IF NOT EXISTS default_dosage_amount TEXT,
ADD COLUMN IF NOT EXISTS default_dosage_unit TEXT;
