-- Migration: Add missing control columns to coops
ALTER TABLE coops ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS config_changes_left INTEGER DEFAULT 2;
