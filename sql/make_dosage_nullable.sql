-- Убираем ограничение NOT NULL с поля dosage, так как теперь используем dosage_amount и dosage_unit
ALTER TABLE medication_entries 
ALTER COLUMN dosage DROP NOT NULL;