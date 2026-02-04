-- Удаление таблиц Telegram бота

-- Удаляем таблицы
DROP TABLE IF EXISTS telegram_link_codes CASCADE;
DROP TABLE IF EXISTS telegram_users CASCADE;

-- Удаляем функцию очистки кодов (если была создана)
DROP FUNCTION IF EXISTS cleanup_expired_link_codes();
