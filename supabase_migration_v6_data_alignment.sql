-- ============================================================
-- COOPLANCE - MIGRATION V6: DATA ALIGNMENT
-- ============================================================

-- 1. ENHANCE PROFILES WITH IDENTITY FIELDS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT now();

-- 2. ENHANCE PROJECTS WITH DETAILED CONTRACT FIELDS
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS payment_frequency TEXT; -- 'daily', 'weekly', 'biweekly', 'monthly', 'commission'
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_duration TEXT; -- 'short', 'long', 'permanent'
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS commission_percent NUMERIC DEFAULT 0;

-- 3. ENHANCE MESSAGES FOR GROUP CHATS
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
-- Allow receiver_id to be NULL if team_id is present (group chat)
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 4. UPDATE AUTH TRIGGER TO CAPTURE NEW METADATA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        username, 
        first_name, 
        last_name, 
        email, 
        role,
        gender,
        company_name,
        responsible_name,
        location,
        country,
        work_hours,
        payment_methods,
        vacancies,
        dni,
        dob,
        phone,
        terms_accepted_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        new.raw_user_meta_data->>'gender',
        new.raw_user_meta_data->>'company_name',
        new.raw_user_meta_data->>'responsible_name',
        new.raw_user_meta_data->>'location',
        new.raw_user_meta_data->>'country',
        new.raw_user_meta_data->>'work_hours',
        new.raw_user_meta_data->>'payment_methods',
        (new.raw_user_meta_data->>'vacancies')::integer,
        new.raw_user_meta_data->>'dni',
        (new.raw_user_meta_data->>'dob')::date,
        new.raw_user_meta_data->>'phone',
        CASE WHEN new.raw_user_meta_data->>'terms_accepted' = 'true' THEN now() ELSE null END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
