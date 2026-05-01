-- Migration: Synchronize Legal Version for New Users
-- This ensures that users who register from now on are already on the latest legal version (v2)
-- so they don't see the "Actualización Legal" modal immediately after signing up.

-- 1. Update the default value for future users
ALTER TABLE public.profiles ALTER COLUMN accepted_legal_version SET DEFAULT 2;

-- 2. Update existing users who have just registered (or have version 1) 
-- to version 2 to stop bothering them if the user explicitly requested it.
-- (Optional: only do this if they have terms_accepted_at set)
UPDATE public.profiles 
SET accepted_legal_version = 2 
WHERE accepted_legal_version < 2;

-- 3. Ensure the profile creation trigger (handle_user_confirmation) sets it to 2 if missing
-- (The default value on the column should handle this, but explicit is better)
-- This is already handled by the column default, so no trigger change needed.
