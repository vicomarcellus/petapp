# Настройка Supabase Storage для загрузки файлов

## Шаг 1: Создать bucket в Supabase

1. Открой Supabase Dashboard: https://supabase.com/dashboard
2. Выбери свой проект
3. Перейди в **Storage** (левое меню)
4. Нажми **New bucket**
5. Настройки:
   - **Name**: `attachments`
   - **Public bucket**: ❌ (оставь выключенным для приватности)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/*,application/pdf`
6. Нажми **Create bucket**

## Шаг 2: Выполнить SQL миграции

Открой **SQL Editor** в Supabase и выполни по очереди:

### 1. Добавить поля для attachments
```sql
-- Выполни содержимое файла: sql/add_attachments_fields.sql
```

### 2. Настроить политики Storage
```sql
-- Выполни содержимое файла: sql/create_storage_bucket.sql
```

## Шаг 3: Проверка

После выполнения миграций проверь:

1. **Storage** → **attachments** bucket создан
2. **Storage** → **Policies** → должны быть 4 политики:
   - Users can upload own attachments
   - Users can view own attachments  
   - Users can update own attachments
   - Users can delete own attachments

## Структура путей в Storage

Файлы будут храниться по пути:
```
/{user_id}/{pet_id}/{category}/{item_id}/{timestamp}_{filename}
```

Например:
```
/abc123.../42/diagnosis/15/1704123456789_blood_test.pdf
/abc123.../42/entry/234/1704123456789_photo.jpg
```

## Лимиты Free Plan

- **Storage**: 1 GB
- **Bandwidth**: 2 GB/месяц
- **Max file size**: 50 MB (мы ограничили до 10 MB в коде)

## Готово!

Теперь можно загружать файлы в приложении.
