-- Делаем поле color в medication_tags необязательным
ALTER TABLE medication_tags 
ALTER COLUMN color DROP NOT NULL;
