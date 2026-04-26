-- ============================================================
-- MIGRATION V44: ADD MULTIMEDIA TO REVIEWS
-- ============================================================

-- 1. Add multimedia column to service_reviews if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reviews' AND column_name='multimedia') THEN
        ALTER TABLE public.service_reviews ADD COLUMN multimedia TEXT[] DEFAULT '{}';
    END IF;
END $$;
