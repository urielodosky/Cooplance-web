-- ============================================================
-- MIGRATION: ADD ADMIN ROLE TO PROFILES
-- ============================================================

-- 1. Add is_admin column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Update RLS policies (Optional - ensuring admins can see all profiles for management)
-- By default, public.profiles select is true (Profiles are viewable by everyone).
-- If we wanted to lock down further, we could add:
-- DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
-- CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

COMMENT ON COLUMN public.profiles.is_admin IS 'Flag to identify system administrators with access to the finance panel.';

-- 3. HOW TO SET ADMIN (Run this manually in SQL Editor for your user):
-- UPDATE public.profiles SET is_admin = true WHERE email = 'tu-email@gmail.com';
