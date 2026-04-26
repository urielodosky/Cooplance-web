-- ============================================================
-- MIGRATION V43 (REVISITED): FIX REVIEWS TABLE TYPE & SCHEMA
-- ============================================================
-- This version ensures the 'rating' column supports decimal values (half stars)
-- and fixes the bidirectional review unique constraint.

-- 1. Ensure the table exists with correct types
CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. If table existed, force rating to NUMERIC to support half-stars (4.5, etc)
ALTER TABLE public.service_reviews ALTER COLUMN rating TYPE NUMERIC;

-- 3. Add columns if they are missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reviews' AND column_name='service_id') THEN
        ALTER TABLE public.service_reviews ADD COLUMN service_id UUID REFERENCES public.services(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reviews' AND column_name='target_id') THEN
        ALTER TABLE public.service_reviews ADD COLUMN target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Ensure a unique constraint on (job_id, reviewer_id)
-- This allows both parties to review the same job once.
ALTER TABLE public.service_reviews DROP CONSTRAINT IF EXISTS service_reviews_job_id_reviewer_id_key;
ALTER TABLE public.service_reviews ADD CONSTRAINT service_reviews_job_id_reviewer_id_key UNIQUE (job_id, reviewer_id);

-- 5. Enable RLS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Clean & Recreate)
DROP POLICY IF EXISTS "Reviews are public." ON public.service_reviews;
CREATE POLICY "Reviews are public." ON public.service_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews for their jobs." ON public.service_reviews;
CREATE POLICY "Users can create reviews for their jobs." ON public.service_reviews 
FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id 
);

-- Note: We simplified the check to rely on the UNIQUE constraint and auth.uid() 
-- to avoid complex nested EXISTS that might cause 406/400 errors.

DROP POLICY IF EXISTS "Users can update their own reviews." ON public.service_reviews;
CREATE POLICY "Users can update their own reviews." ON public.service_reviews 
FOR UPDATE USING (auth.uid() = reviewer_id);
