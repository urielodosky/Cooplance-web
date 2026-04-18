-- ============================================================
-- COOPLANCE - MIGRATION V31: Projects Schema Fix
-- Adds missing multimedia and project-specific columns.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Add missing columns to 'projects' table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS vacancies INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';

-- 2. Notify Supabase to refresh schema cache (Implicit by DDL)
-- You may still need to click 'Reload Schema' in the Supabase Dashboard API settings.
