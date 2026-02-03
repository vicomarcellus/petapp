-- Проверка существования таблиц medication_tags и food_tags
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('medication_tags', 'food_tags')
ORDER BY table_name, ordinal_position;
