# Настройка Storage для вложений

## Проблема
Ошибка: `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}`

Это означает, что bucket `attachments` не создан в Supabase Storage.

## Решение

### Шаг 1: Создать bucket в Supabase

1. Открой Supabase Dashboard
2. Перейди в **Storage** (левое меню)
3. Нажми **New bucket**
4. Заполни:
   - **Name**: `attachments`
   - **Public bucket**: ✅ **Включи** (чтобы файлы были доступны по прямым ссылкам)
5. Нажми **Create bucket**

### Шаг 2: Настроить RLS политики для Storage

Открой **SQL Editor** в Supabase и выполни:

```sql
-- Политики для bucket attachments
-- Пользователи могут загружать свои файлы
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Пользователи могут просматривать свои файлы
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Пользователи могут обновлять свои файлы
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Пользователи могут удалять свои файлы
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**ВАЖНО**: Если политики уже существуют (ошибка "already exists"), пропусти этот шаг.

### Шаг 3: Создать таблицу attachments

Если ещё не создана, выполни в **SQL Editor**:

```sql
-- Создаем таблицу для хранения вложений
CREATE TABLE IF NOT EXISTS attachments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id BIGINT NOT NULL,
  
  -- Тип родительской записи и её ID
  parent_type TEXT NOT NULL,
  parent_id BIGINT NOT NULL,
  
  -- Данные файла
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_pet ON attachments(user_id, pet_id);

-- RLS политики
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);
```

### Шаг 4: Проверить настройки

1. Перейди в **Storage** → **attachments**
2. Убедись что bucket **Public** (должна быть галочка)
3. Если нет, нажми на bucket → **Settings** → включи **Public bucket**

### Шаг 5: Протестировать

1. Открой приложение
2. Создай новую запись (состояние, симптом, лекарство или питание)
3. Нажми "Добавить файлы"
4. Выбери картинку
5. Сохрани запись
6. Проверь что иконка файла появилась в таймлайне
7. Кликни на иконку - файл должен открыться

## Структура файлов в Storage

Файлы сохраняются по пути:
```
/{user_id}/{pet_id}/{category}/{item_id}/{timestamp}_{filename}
```

Например:
```
/abc123.../1/entry/42/1234567890_photo.jpg
```

## Если всё равно не работает

1. Проверь консоль браузера (F12) на ошибки
2. Проверь что bucket называется именно `attachments`
3. Проверь что bucket публичный
4. Проверь что RLS политики созданы
5. Проверь что таблица `attachments` создана

## Готово! 🎉

После выполнения всех шагов вложения должны работать.
