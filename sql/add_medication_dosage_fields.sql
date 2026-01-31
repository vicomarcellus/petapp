-- Добавляем новые поля для дозировки лекарств
ALTER TABLE medication_entries 
ADD COLUMN IF NOT EXISTS dosage_amount TEXT,
ADD COLUMN IF NOT EXISTS dosage_unit TEXT DEFAULT 'мл';

-- Мигрируем существующие данные из dosage в dosage_amount
-- Пытаемся извлечь число и единицу из старого поля dosage
UPDATE medication_entries 
SET 
  dosage_amount = REGEXP_REPLACE(dosage, '[^0-9.,]', '', 'g'),
  dosage_unit = CASE 
    WHEN dosage ILIKE '%мл%' THEN 'мл'
    WHEN dosage ILIKE '%мг%' THEN 'мг'
    WHEN dosage ILIKE '%г%' THEN 'г'
    WHEN dosage ILIKE '%таб%' THEN 'таб'
    WHEN dosage ILIKE '%капс%' THEN 'капс'
    ELSE 'мл'
  END
WHERE dosage IS NOT NULL AND dosage != '';

-- Обновляем medication_tags
ALTER TABLE medication_tags
ADD COLUMN IF NOT EXISTS default_dosage_amount TEXT,
ADD COLUMN IF NOT EXISTS default_dosage_unit TEXT DEFAULT 'мл';

-- Мигрируем default_dosage
UPDATE medication_tags 
SET 
  default_dosage_amount = REGEXP_REPLACE(default_dosage, '[^0-9.,]', '', 'g'),
  default_dosage_unit = CASE 
    WHEN default_dosage ILIKE '%мл%' THEN 'мл'
    WHEN default_dosage ILIKE '%мг%' THEN 'мг'
    WHEN default_dosage ILIKE '%г%' THEN 'г'
    WHEN default_dosage ILIKE '%таб%' THEN 'таб'
    WHEN default_dosage ILIKE '%капс%' THEN 'капс'
    ELSE 'мл'
  END
WHERE default_dosage IS NOT NULL AND default_dosage != '';
