-- ============================================================
-- MIGRATION V43: FIX REVIEWS TABLE
-- ============================================================
-- This migration ensures the 'service_reviews' table exists
-- with the correct schema to support bidirectional reviews.

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if they are missing (in case table was partially created)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reviews' AND column_name='service_id') THEN
        ALTER TABLE public.service_reviews ADD COLUMN service_id UUID REFERENCES public.services(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reviews' AND column_name='target_id') THEN
        ALTER TABLE public.service_reviews ADD COLUMN target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Ensure a unique constraint on (job_id, reviewer_id)
-- This allows the upsert logic in ReviewService.js to work (one user can only review a job once)
ALTER TABLE public.service_reviews DROP CONSTRAINT IF EXISTS service_reviews_job_id_reviewer_id_key;
ALTER TABLE public.service_reviews ADD CONSTRAINT service_reviews_job_id_reviewer_id_key UNIQUE (job_id, reviewer_id);

-- 4. Enable RLS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Reviews are public." ON public.service_reviews;
CREATE POLICY "Reviews are public." ON public.service_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews for their jobs." ON public.service_reviews;
CREATE POLICY "Users can create reviews for their jobs." ON public.service_reviews 
FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.provider_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update their own reviews." ON public.service_reviews;
CREATE POLICY "Users can update their own reviews." ON public.service_reviews 
FOR UPDATE USING (auth.uid() = reviewer_id);
