-- ============================================================
-- COOPLANCE - MIGRATION V32: Fix Project Deletion Policy
-- Adds the missing DELETE policy for the projects table.
-- ============================================================

-- 1. Add DELETE policy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' AND policyname = 'Clients can delete their own projects'
    ) THEN
        CREATE POLICY "Clients can delete their own projects" 
        ON public.projects 
        FOR DELETE 
        USING (auth.uid() = client_id);
    END IF;
END $$;

-- 2. Verify and ensure RLS is enabled (should already be, but safety first)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
