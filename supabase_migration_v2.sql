-- ============================================================
-- COOPLANCE - MIGRATION V2: Services, Jobs, Proposals to Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. ADD MISSING COLUMNS TO SERVICES TABLE
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS videos jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS province text[];
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS city text[];
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_methods jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS has_packages boolean DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_session_based boolean DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS professional_license text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS professional_body text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS media_type jsonb;

-- 2. ADD MISSING COLUMNS TO JOBS TABLE
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service_title text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS duration integer;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS delivery_result text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS buyer_name text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS buyer_role text;

-- Jobs: allow participants to update
CREATE POLICY "Users can update their own jobs." ON public.jobs FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- 3. CREATE PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id bigint NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_name text,
    user_role text,
    cover_letter text,
    amount numeric,
    delivery_days integer,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposals are viewable by everyone" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Users can create proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own proposals" ON public.proposals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own proposals" ON public.proposals FOR DELETE USING (auth.uid() = user_id);

-- 4. CREATE STORAGE BUCKET FOR SERVICE MEDIA
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view service media"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-media');

CREATE POLICY "Authenticated users can upload service media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own service media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own service media"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-media' AND auth.role() = 'authenticated');
