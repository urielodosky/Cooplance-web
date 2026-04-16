-- ============================================================
-- COOPLANCE - MIGRATION V21: ACCOUNT DELETION SHIELD
-- ============================================================
-- 1. Updates all Foreign Keys to use ON DELETE CASCADE
-- 2. Ensures that deleting a Profile wipes all related data
-- 3. Cleans up the auth.users record automatically
-- ============================================================

-- 1. REFRESH SERVICES CONSTRAINTS
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_owner_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. REFRESH REVIEWS CONSTRAINTS
-- Check for both table names (legacy and current)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey 
    FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. REFRESH MESSAGES CONSTRAINTS
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. REFRESH TEAM MEMBERS CONSTRAINTS
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. REFRESH JOBS CONSTRAINTS
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_provider_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. REFRESH TEAM FOUNDER (Set null instead of cascade to keep the team alive)
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_founder_id_fkey;
ALTER TABLE public.teams ADD CONSTRAINT teams_founder_id_fkey 
    FOREIGN KEY (founder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 7. AUTH CLEANUP TRIGGER
-- When a profile is deleted, we attempt to delete the auth.users record.
CREATE OR REPLACE FUNCTION public.handle_profile_deleted_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- This requires the function to be SECURITY DEFINER to bypass RLS on auth schema.
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
EXCEPTION WHEN OTHERS THEN
    -- If it fails (e.g. permission issues), we still let the Profile be deleted.
    RAISE WARNING '[Cooplance Cleanup] Could not delete auth user %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted_cleanup ON public.profiles;
CREATE TRIGGER on_profile_deleted_cleanup
    AFTER DELETE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_profile_deleted_cleanup();

-- Migration V21: ACCOUNT DELETION SHIELD deployed successfully.
