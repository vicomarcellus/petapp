-- Миграция: удаление поля color из таблицы notes (если оно есть)
-- Выполни этот скрипт, если таблица notes уже существует

-- Удаляем колонку color, если она существует
ALTER TABLE notes DROP COLUMN IF EXISTS color;
