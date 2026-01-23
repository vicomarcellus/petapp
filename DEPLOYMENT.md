# Деплой на Vercel с Telegram уведомлениями

## Шаг 1: Создать Telegram бота

1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям (имя бота, username)
4. Скопируйте токен бота (выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Шаг 2: Подготовить проект

```bash
# Установить зависимости
npm install

# Установить Vercel CLI (если еще не установлен)
npm install -g vercel

# Установить @vercel/postgres
npm install @vercel/postgres
```

## Шаг 3: Создать проект на Vercel

```bash
# Залогиниться в Vercel
vercel login

# Деплой проекта
vercel
```

Следуйте инструкциям:
- Set up and deploy? **Yes**
- Which scope? Выберите ваш аккаунт
- Link to existing project? **No**
- Project name? Оставьте по умолчанию или введите свое
- In which directory? `./`
- Override settings? **No**

## Шаг 4: Добавить Vercel Postgres

1. Откройте ваш проект на [vercel.com](https://vercel.com)
2. Перейдите в **Storage** → **Create Database**
3. Выберите **Postgres**
4. Выберите регион (ближайший к вам)
5. Нажмите **Create**

База данных автоматически подключится к проекту.

## Шаг 5: Создать таблицы в базе данных

1. В Vercel перейдите в **Storage** → ваша база → **Query**
2. Скопируйте содержимое файла `sql/schema.sql`
3. Вставьте в Query Editor и нажмите **Run**

Или через CLI:

```bash
# Подключиться к базе
vercel env pull .env.local

# Выполнить SQL
psql $POSTGRES_URL < sql/schema.sql
```

## Шаг 6: Добавить переменные окружения

В Vercel Dashboard:

1. Перейдите в **Settings** → **Environment Variables**
2. Добавьте переменные:

```
TELEGRAM_BOT_TOKEN = ваш_токен_бота
CRON_SECRET = любая_случайная_строка (например: my-secret-key-12345)
```

3. Нажмите **Save**

Или через CLI:

```bash
vercel env add TELEGRAM_BOT_TOKEN
# Вставьте токен бота

vercel env add CRON_SECRET
# Вставьте случайную строку
```

## Шаг 7: Задеплоить с переменными

```bash
vercel --prod
```

## Шаг 8: Настроить Cron Job (внешний сервис)

Vercel Hobby план ограничивает cron до 1 раза в день. Используем бесплатный внешний сервис:

1. Зарегистрироваться на https://cron-job.org (бесплатно)
2. Создать новое задание:
   - **URL**: `https://your-app-name.vercel.app/api/check-reminders`
   - **Schedule**: Every hour (или Every minute)
   - **Method**: GET
   - **Headers**: 
     - Key: `Authorization`
     - Value: `Bearer your-cron-secret`
3. Сохранить

Подробная инструкция в файле `EXTERNAL_CRON_SETUP.md`

## Шаг 9: Получить Chat ID

1. Откройте @userinfobot в Telegram
2. Отправьте `/start`
3. Скопируйте ваш ID (например: `123456789`)

## Шаг 10: Настроить приложение

1. Откройте ваше приложение на Vercel
2. Перейдите в **Настройки**
3. В разделе **Telegram уведомления** вставьте ваш Chat ID
4. Нажмите **Сохранить**
5. Нажмите **Тест** чтобы проверить

## Шаг 11: Создать расписание

1. Перейдите в **Расписания**
2. Нажмите **Новое расписание**
3. Заполните форму:
   - Название лекарства
   - Дозировка
   - Время (когда отправлять напоминание)
   - Дата начала
   - Количество дней
4. Нажмите **Создать**

Готово! Теперь каждый день в указанное время вам будет приходить напоминание в Telegram.

## Проверка работы Cron

Cron запускается каждую минуту. Чтобы проверить:

1. Создайте расписание на текущее время (например, через 2 минуты)
2. Подождите
3. Проверьте Telegram

Или проверьте логи:

```bash
vercel logs --follow
```

## Troubleshooting

### Уведомления не приходят

1. Проверьте что Chat ID правильный
2. Проверьте что бот не заблокирован
3. Проверьте логи Vercel Functions
4. Проверьте что время в расписании правильное (UTC или ваш часовой пояс)

### Ошибка "Unauthorized" в cron

Проверьте что `CRON_SECRET` установлен в Environment Variables

### База данных не работает

1. Проверьте что Postgres подключен к проекту
2. Проверьте что таблицы созданы (запустите schema.sql)
3. Проверьте переменные окружения (должны быть POSTGRES_*)

## Локальная разработка

```bash
# Установить зависимости
npm install

# Скачать переменные окружения
vercel env pull .env.local

# Запустить dev сервер
npm run dev
```

API endpoints будут доступны на `http://localhost:5173/api/*`

## Обновление

```bash
# Внести изменения в код
git add .
git commit -m "Update"
git push

# Или задеплоить напрямую
vercel --prod
```

Vercel автоматически задеплоит изменения при push в main ветку (если настроена интеграция с Git).
