-- Add is_hidden column to analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false NOT NULL;