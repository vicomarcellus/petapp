# Миграция БД Supabase - Добавление запланированных событий

## Что делает эта миграция?

Добавляет поля для хранения запланированных событий:
- `completed` - флаг выполнения (true/false)
- `scheduled_time` - целевое время выполнения (timestamp)

## Как выполнить миграцию:

### Шаг 1: Открой Supabase Dashboard
1. Перейди на https://supabase.com
2. Войди в свой проект
3. В левом меню найди **SQL Editor** (иконка `</>`)

### Шаг 2: Создай новый запрос
1. Нажми **"New query"** или **"+"**
2. Скопируй весь SQL код ниже
3. Вставь в редактор

### Шаг 3: Выполни SQL

```sql
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
```

### Шаг 4: Запусти
1. Нажми кнопку **"Run"** (или Ctrl+Enter / Cmd+Enter)
2. Дождись сообщения об успешном выполнении

## Проверка

После выполнения миграции можешь проверить что поля добавились:

1. Перейди в **Table Editor**
2. Открой таблицу `medication_entries`
3. Должны появиться новые колонки: `completed` и `scheduled_time`

## Что дальше?

После выполнения миграции запланированные события будут:
- ✅ Сохраняться в БД
- ✅ Не пропадать при перезагрузке
- ✅ Работать на всех устройствах
- ✅ Показывать таймер в реальном времени

## Если что-то пошло не так

Если возникла ошибка:
1. Проверь что ты в правильном проекте Supabase
2. Убедись что таблицы существуют (medication_entries, feeding_entries и т.д.)
3. Попробуй выполнить команды по одной, а не все сразу
