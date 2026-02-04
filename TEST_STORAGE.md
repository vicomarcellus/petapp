# Тест Storage - Диагностика проблемы

## Текущая ошибка
`{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}`

## Что проверить

### 1. Проверь что bucket создан

Открой Supabase Dashboard → **Storage**

Должен быть bucket с именем `attachments`

Если его нет - создай:
1. Нажми **New bucket**
2. Name: `attachments`
3. **Public bucket**: ✅ ВКЛ
4. Create

### 2. Проверь что bucket публичный

1. Открой Storage → attachments
2. Нажми на шестерёнку (Settings)
3. Убедись что **Public bucket** включен
4. Если нет - включи и сохрани

### 3. Проверь RLS политики

Открой SQL Editor и выполни:

```sql
-- Проверить существующие политики для storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';
```

Должны быть политики:
- `Users can upload own attachments` (INSERT)
- `Users can view own attachments` (SELECT)
- `Users can update own attachments` (UPDATE)
- `Users can delete own attachments` (DELETE)

Если их нет, выполни SQL из файла `sql/create_storage_bucket.sql`

### 4. Проверь таблицу attachments

```sql
-- Проверить что таблица существует
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'attachments'
);
```

Должно вернуть `true`

Если `false`, выполни SQL из файла `sql/create_attachments_table.sql`

### 5. Тест загрузки через консоль браузера

Открой приложение, открой консоль (F12) и выполни:

```javascript
// Проверить что bucket существует
const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
console.log('Buckets:', buckets);
console.log('Error:', bucketsError);

// Должен быть bucket 'attachments' в списке
```

### 6. Тест загрузки файла

```javascript
// Создать тестовый файл
const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

// Попробовать загрузить
const { data, error } = await supabase.storage
  .from('attachments')
  .upload('test/test.txt', testFile);

console.log('Upload result:', data);
console.log('Upload error:', error);
```

## Частые проблемы

### Bucket not found
- Bucket не создан → создай в UI
- Неправильное имя → должно быть `attachments`

### Object not found
- Bucket не публичный → включи Public bucket
- RLS политики блокируют доступ → проверь политики
- Файл не загружен → проверь что загрузка прошла успешно

### Permission denied
- RLS политики неправильные → проверь что user_id совпадает
- Пользователь не авторизован → проверь auth.uid()

## Решение

После создания bucket и настройки политик всё должно работать.

Если проблема остаётся:
1. Скопируй ошибку из консоли браузера (F12)
2. Проверь Network tab - какой запрос падает
3. Проверь что в коде используется правильное имя bucket: `attachments`
