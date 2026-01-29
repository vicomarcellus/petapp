-- Обновление существующих записей
-- Выполни этот SQL в Supabase SQL Editor

-- Устанавливаем is_scheduled = false для всех существующих записей где оно NULL
UPDATE medication_entries SET is_scheduled = false WHERE is_scheduled IS NULL;
UPDATE feeding_entries SET is_scheduled = false WHERE is_scheduled IS NULL;
UPDATE state_entries SET is_scheduled = false WHERE is_scheduled IS NULL;
UPDATE symptom_entries SET is_scheduled = false WHERE is_scheduled IS NULL;

-- Проверка: должно вернуть количество обновленных записей
SELECT 
  (SELECT COUNT(*) FROM medication_entries WHERE is_scheduled = false) as medication_count,
  (SELECT COUNT(*) FROM feeding_entries WHERE is_scheduled = false) as feeding_count,
  (SELECT COUNT(*) FROM state_entries WHERE is_scheduled = false) as state_count,
  (SELECT COUNT(*) FROM symptom_entries WHERE is_scheduled = false) as symptom_count;
