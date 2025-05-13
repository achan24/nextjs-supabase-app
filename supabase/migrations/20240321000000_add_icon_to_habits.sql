-- Add icon column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT;

-- Update existing habits to have a default icon
UPDATE habits SET icon = '💧' WHERE icon IS NULL; 