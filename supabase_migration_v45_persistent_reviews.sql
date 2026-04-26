-- ============================================================
-- MIGRATION V45: PERSISTENT REVIEWS & SNAPSHOTS
-- ============================================================

-- 1. Add snapshot columns to service_reviews for persistence
ALTER TABLE public.service_reviews 
ADD COLUMN IF NOT EXISTS project_title_snapshot TEXT,
ADD COLUMN IF NOT EXISTS service_title_snapshot TEXT;

-- 2. Update existing reviews with titles from jobs if possible
UPDATE public.service_reviews r
SET project_title_snapshot = j.service_title
FROM public.jobs j
WHERE r.job_id = j.id AND r.project_title_snapshot IS NULL;

-- 3. Function to automatically fill snapshots on insert
CREATE OR REPLACE FUNCTION public.fn_fill_review_snapshots()
RETURNS TRIGGER AS $$
DECLARE
    v_job_title TEXT;
    v_service_title TEXT;
BEGIN
    -- Get job title
    SELECT service_title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;
    NEW.project_title_snapshot := v_job_title;

    -- Get service title if service_id is provided
    IF NEW.service_id IS NOT NULL THEN
        SELECT title INTO v_service_title FROM public.services WHERE id = NEW.service_id;
        NEW.service_title_snapshot := v_service_title;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for snapshots
DROP TRIGGER IF EXISTS tr_fill_review_snapshots ON public.service_reviews;
CREATE TRIGGER tr_fill_review_snapshots
BEFORE INSERT ON public.service_reviews
FOR EACH ROW
EXECUTE FUNCTION public.fn_fill_review_snapshots();
