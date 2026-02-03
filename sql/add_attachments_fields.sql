-- Add attachment fields to state_entries
ALTER TABLE state_entries 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to symptom_entries
ALTER TABLE symptom_entries 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to medication_entries
ALTER TABLE medication_entries 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to feeding_entries
ALTER TABLE feeding_entries 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to diagnoses
ALTER TABLE diagnoses 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to diagnosis_notes
ALTER TABLE diagnosis_notes 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add attachment fields to notes
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name TEXT;
