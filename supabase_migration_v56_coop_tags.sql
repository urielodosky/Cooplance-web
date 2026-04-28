-- Migration: Add tags and category_3 to coops table
ALTER TABLE coops ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE coops ADD COLUMN IF NOT EXISTS category_3 TEXT;

-- Update RLS policies if needed (usually already covered by generic coops policies)
