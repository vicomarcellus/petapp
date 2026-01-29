-- Добавление колонки is_scheduled во все таблицы
-- Выполни этот SQL в Supabase SQL Editor

-- Medication entries
ALTER TABLE medication_entries 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Feeding entries  
ALTER TABLE feeding_entries
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- State entries
ALTER TABLE state_entries
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Symptom entries
ALTER TABLE symptom_entries
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Проверка: должно показать структуру таблиц с новой колонкой
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'medication_entries' 
AND column_name IN ('is_scheduled', 'completed', 'scheduled_time');
