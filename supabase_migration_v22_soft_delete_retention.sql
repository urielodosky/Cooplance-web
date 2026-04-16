-- ============================================================
-- COOPLANCE - MIGRATION V22: SOFT DELETE & RETENTION
-- ============================================================
-- 1. Implements Soft Delete for Profiles
-- 2. Hardens RLS to hide content from deleted users
-- 3. Provides a cleanup function for 30-day retention
-- ============================================================

-- 1. PREPARE PROFILES TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE (deleted_at IS NULL);

-- 2. HARDEN RLS POLICIES (Visibility Shield)

-- PROFILES: Stop showing deleted profiles to the public
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone." 
    ON public.profiles FOR SELECT 
    USING (deleted_at IS NULL);

-- SERVICES: Stop showing services from deleted owners
DROP POLICY IF EXISTS "Services are viewable by everyone." ON public.services;
CREATE POLICY "Services are viewable by everyone." 
    ON public.services FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = services.owner_id 
            AND profiles.deleted_at IS NULL
        )
    );

-- PROPOSALS (Postulaciones): Stop showing proposals from deleted freelancers
-- First ensure RLS is enabled on proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Proposals viewable by project owner and freelancer" ON public.proposals;
CREATE POLICY "Proposals viewable by project owner and freelancer" 
    ON public.proposals FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = proposals.freelancer_id 
            AND profiles.deleted_at IS NULL
        )
    );

-- 3. REMOVE PREVIOUS HARD-DELETE TRIGGER (V21)
-- We no longer want immediate hard-delete. We want to wait 30 days.
DROP TRIGGER IF EXISTS on_profile_deleted_cleanup ON public.profiles;

-- 4. CLEANUP PROCEDURE (Permanent deletion)
-- Run this function manually or via pg_cron to wipe accounts older than 30 days.
CREATE OR REPLACE FUNCTION public.permanently_delete_old_accounts()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete from auth.users (This will cascade everything because of FKs refreshed in V21)
    WITH deleted_users AS (
        DELETE FROM auth.users 
        WHERE id IN (
            SELECT id FROM public.profiles 
            WHERE deleted_at < NOW() - INTERVAL '30 days'
        )
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted_users;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration V22: SOFT DELETE & RETENTION deployed successfully.
