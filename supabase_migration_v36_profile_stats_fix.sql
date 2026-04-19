-- ============================================================
-- COOPLANCE - MIGRATION V36: Profile stats and Industry fix
-- Adds missing rating, reviews, and industry columns to profiles.
-- ============================================================

-- 1. Add missing columns to 'profiles' table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS industry TEXT;

-- 2. Add helpful comments
COMMENT ON COLUMN public.profiles.rating IS 'Average rating of the user/company';
COMMENT ON COLUMN public.profiles.reviews_count IS 'Total number of reviews received';
COMMENT ON COLUMN public.profiles.industry IS 'Main industry of the company (if applicable)';
