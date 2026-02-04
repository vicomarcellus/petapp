# 🔧 Быстрое исправление Storage

## Проблема
Ошибка при загрузке файлов: **"Bucket not found"**

## Решение за 3 шага

### ШАГ 1: Создать bucket (2 минуты)

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери свой проект
3. Левое меню → **Storage**
4. Нажми **New bucket**
5. Заполни форму:
   ```
   Name: attachments
   Public bucket: ✅ ВКЛ (ВАЖНО!)
   File size limit: 10 MB
   Allowed MIME types: оставь пустым (разрешить все)
   ```
6. Нажми **Create bucket**

### ШАГ 2: Настроить политики (1 минута)

1. Левое меню → **SQL Editor**
2. Нажми **New query**
3. Скопируй и вставь этот SQL:

```sql
-- Политики для storage.objects
CREATE POLICY IF NOT EXISTS "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can update own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

4. Нажми **Run** (или Ctrl+Enter)

**ВАЖНО**: Если увидишь ошибку "policy already exists" - это нормально, значит политики уже созданы.

### ШАГ 3: Создать таблицу attachments (1 минута)

В том же SQL Editor выполни:

```sql
-- Таблица для хранения информации о файлах
CREATE TABLE IF NOT EXISTS attachments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id BIGINT NOT NULL,
  parent_type TEXT NOT NULL,
  parent_id BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON attachments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_pet ON attachments(user_id, pet_id);

-- RLS политики для таблицы
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attachments" ON attachments;
CREATE POLICY "Users can view their own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attachments" ON attachments;
CREATE POLICY "Users can insert their own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON attachments;
CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);
```

Нажми **Run**

## Проверка

1. Открой приложение
2. Создай новую запись (состояние, симптом, лекарство или питание)
3. Нажми "Добавить файлы"
4. Выбери картинку
5. Нажми "Добавить"

Если всё работает:
- ✅ Запись сохранится
- ✅ В таймлайне появится иконка файла
- ✅ При клике на иконку файл откроется

## Если не работает

### Ошибка "Bucket not found"
→ Bucket не создан или называется не `attachments`
→ Повтори ШАГ 1

### Ошибка "Object not found"
→ Bucket не публичный
→ Открой Storage → attachments → Settings → включи "Public bucket"

### Ошибка "Permission denied"
→ RLS политики неправильные
→ Повтори ШАГ 2

### Ошибка в консоли браузера
→ Открой DevTools (F12) → Console
→ Скопируй ошибку и отправь мне

## Готово! 🎉

После выполнения всех 3 шагов вложения должны работать.

Теперь можешь:
- Загружать несколько файлов на одну запись
- Просматривать файлы по клику на иконку
- Удалять файлы при редактировании
- Загружать картинки (JPEG, PNG, GIF, WebP) и PDF
- Файлы автоматически сжимаются (макс 1920px)
