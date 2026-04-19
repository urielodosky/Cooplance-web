-- ============================================================
-- COOPLANCE - MIGRATION V38: SPENDING LIMITS FOR MINORS
-- ============================================================

-- 1. ADD SPENDING LIMIT COLUMNS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_spending_limit NUMERIC DEFAULT 50000,
ADD COLUMN IF NOT EXISTS is_limit_custom BOOLEAN DEFAULT false;

-- 2. ADD COMMENT FOR DOCUMENTATION
COMMENT ON COLUMN public.profiles.monthly_spending_limit IS 'Monthly spending limit for minors (16-17). Default 50k ARS.';
COMMENT ON COLUMN public.profiles.is_limit_custom IS 'True if the limit was manually set by a parent.';

-- 3. UPDATED SCHEMA CACHE REFRESH (Internal)
-- This is handled by Supabase automatically after running SQL.
