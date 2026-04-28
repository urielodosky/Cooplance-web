-- Migration: Delete old teams table and finalize coops structure
-- 1. Remove the old table
DROP TABLE IF EXISTS teams CASCADE;

-- 2. Add missing columns to coops to match functional requirements
ALTER TABLE coops ADD COLUMN IF NOT EXISTS founder_id UUID REFERENCES profiles(id);
ALTER TABLE coops ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE coops ADD COLUMN IF NOT EXISTS distribution_config JSONB DEFAULT '{"method": "equal"}'::jsonb;

-- 3. Ensure other control columns are present (idempotent)
ALTER TABLE coops ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS config_changes_left INTEGER DEFAULT 2;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS internal_rules TEXT DEFAULT 'No hay reglas definidas.';
ALTER TABLE coops ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE coops ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
