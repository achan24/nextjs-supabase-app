-- Add sent_at column to reminders table
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE; 