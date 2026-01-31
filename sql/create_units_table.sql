-- Таблица единиц измерения
-- Позволяет динамически управлять списком доступных единиц

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,          -- Внутренний код (например: 'ml', 'g')
    name VARCHAR(50) NOT NULL,                 -- Отображаемое имя (например: 'мл', 'г')
    category VARCHAR(20) DEFAULT 'both',       -- Категория: 'medication', 'feeding', 'both'
    sort_order INT DEFAULT 0,                  -- Порядок сортировки
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включаем RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Политика: все пользователи могут читать единицы
CREATE POLICY "Units are viewable by everyone" ON units
    FOR SELECT USING (true);

-- Начальные данные
INSERT INTO units (code, name, category, sort_order) VALUES
    ('ml', 'мл', 'both', 1),
    ('g', 'г', 'both', 2)
ON CONFLICT (code) DO NOTHING;

-- Комментарий: чтобы добавить новую единицу, выполните:
-- INSERT INTO units (code, name, category, sort_order) VALUES ('mg', 'мг', 'medication', 3);
