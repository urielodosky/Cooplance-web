-- ============================================================
-- MIGRATION V46: FIX REVIEWS WITH MISSING TARGET_ID
-- ============================================================
-- Previous bug: Dashboard.jsx used 'clientId' (undefined) instead 
-- of 'buyerId' when creating reviews, causing target_id to be NULL.
-- This migration fixes existing reviews by inferring target_id from
-- the associated job.

-- Fix reviews where the freelancer reviewed (target should be client)
UPDATE public.service_reviews r
SET target_id = j.client_id
FROM public.jobs j
WHERE r.job_id = j.id 
  AND r.target_id IS NULL 
  AND r.reviewer_id = j.provider_id;

-- Fix reviews where the client reviewed (target should be freelancer)
UPDATE public.service_reviews r
SET target_id = j.provider_id
FROM public.jobs j
WHERE r.job_id = j.id 
  AND r.target_id IS NULL 
  AND r.reviewer_id = j.client_id;
