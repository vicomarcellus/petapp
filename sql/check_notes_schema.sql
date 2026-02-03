-- Проверка схемы заметок
-- Выполни этот запрос, чтобы увидеть структуру таблиц

-- Проверяем структуру таблицы notes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;

-- Проверяем структуру таблицы note_tags
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'note_tags'
ORDER BY ordinal_position;

-- Проверяем структуру таблицы note_tag_relations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'note_tag_relations'
ORDER BY ordinal_position;
