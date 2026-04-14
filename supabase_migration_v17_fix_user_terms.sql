-- ============================================================
-- COOPLANCE - MIGRATION V17: MANUAL DATA CORRECTION
-- ============================================================
-- Execute this in your Supabase SQL Editor to fix your profile.

UPDATE public.profiles
SET 
    terms_accepted = TRUE,
    is_partial = FALSE
WHERE email = 'unelodosky@gmail.com';

-- VERIFICACIÓN
SELECT id, username, terms_accepted, is_partial 
FROM public.profiles 
WHERE email = 'unelodosky@gmail.com';
