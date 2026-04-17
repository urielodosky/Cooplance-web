-- ============================================================
-- COOPLANCE - MASTER SYNC V29 (FULL SCHEMA & STORAGE)
-- Run this in the Supabase SQL Editor to fix all technical errors.
-- ============================================================

-- A. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Safe Drop & Create)
DO $$ 
BEGIN
    -- service-media
    DROP POLICY IF EXISTS "Anyone can view service media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload service media" ON storage.objects;
    
    -- avatars
    DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
END $$;

CREATE POLICY "Anyone can view service media" ON storage.objects FOR SELECT USING (bucket_id = 'service-media');
CREATE POLICY "Authenticated users can upload service media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users manage own service media" ON storage.objects FOR ALL USING (bucket_id = 'service-media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users manage own avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- B. PROFILES TABLE HARDENING
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS responsible_first_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_last_name TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT,
ADD COLUMN IF NOT EXISTS vacancies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_hours TEXT,
ADD COLUMN IF NOT EXISTS payment_methods JSONB,
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS cuil_cuit TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- C. SERVICES TABLE HARDENING
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS images TEXT[],
ADD COLUMN IF NOT EXISTS videos JSONB,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Remoto',
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Argentina',
ADD COLUMN IF NOT EXISTS province TEXT[],
ADD COLUMN IF NOT EXISTS city TEXT[],
ADD COLUMN IF NOT EXISTS payment_methods JSONB,
ADD COLUMN IF NOT EXISTS has_packages BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_session_based BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS professional_license TEXT,
ADD COLUMN IF NOT EXISTS professional_body TEXT,
ADD COLUMN IF NOT EXISTS media_type JSONB;


-- D. PROPOSALS TABLE (IF MISSING)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    cover_letter TEXT,
    amount NUMERIC,
    delivery_days INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public select proposals" ON public.proposals;
    DROP POLICY IF EXISTS "Auth insert proposals" ON public.proposals;
EXCEPTION WHEN undefined_object THEN null; END $$;
CREATE POLICY "Public select proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Auth insert proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = freelancer_id);


-- E. TRIGGER REFRESH (V28 Logic)
CREATE OR REPLACE FUNCTION public.handle_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.email_confirmed_at IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.profiles (
            id, username, email, role,
            first_name, last_name, avatar_url,
            location, country, dob, phone,
            gender, company_name, 
            responsible_first_name,
            responsible_last_name,
            bio,
            dni, vacancies, work_hours, payment_methods, cv_url, province, city,
            cuil_cuit, terms_accepted_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer'),
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'profileImage'), 
            NEW.raw_user_meta_data->>'location',
            NEW.raw_user_meta_data->>'country',
            (NEW.raw_user_meta_data->>'dob')::DATE,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'gender',
            NEW.raw_user_meta_data->>'company_name',
            NEW.raw_user_meta_data->>'responsible_first_name',
            NEW.raw_user_meta_data->>'responsible_last_name',
            COALESCE(NEW.raw_user_meta_data->>'bio', ''),
            NEW.raw_user_meta_data->>'dni',
            (COALESCE(NEW.raw_user_meta_data->>'vacancies', '0'))::INTEGER,
            NEW.raw_user_meta_data->>'work_hours',
            NEW.raw_user_meta_data->>'payment_methods',
            NEW.raw_user_meta_data->>'cv_url',
            NEW.raw_user_meta_data->>'province',
            NEW.raw_user_meta_data->>'city',
            NEW.raw_user_meta_data->>'cuil_cuit',
            CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN THEN NOW() ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
