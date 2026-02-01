-- Добавляем колонку trend в таблицу state_entries
ALTER TABLE state_entries 
ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('up', 'same', 'down'));

-- Добавляем комментарий к колонке
COMMENT ON COLUMN state_entries.trend IS 'Динамика состояния по сравнению с предыдущим днем: up (лучше), same (так же), down (хуже)';
