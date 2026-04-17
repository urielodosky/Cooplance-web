-- ============================================================
-- COOPLANCE - MIGRATION V28: REGISTRATION HARDENING
-- Adds responsible first/last names and fixes avatar mapping.
-- ============================================================

-- 1. Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS responsible_first_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_last_name TEXT;

-- 2. Update the trigger function to support new fields and direct avatar mapping
CREATE OR REPLACE FUNCTION public.handle_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.email_confirmed_at IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.profiles (
            id, username, email, role,
            first_name, last_name, avatar_url,
            location, country, dob, phone,
            gender, company_name, 
            responsible_name, -- Deprecated but kept for compatibility
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
            -- Use 'avatar_url' from metadata if available (fixed mapping)
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'profileImage'), 
            NEW.raw_user_meta_data->>'location',
            NEW.raw_user_meta_data->>'country',
            (NEW.raw_user_meta_data->>'dob')::DATE,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'gender',
            NEW.raw_user_meta_data->>'company_name',
            -- Handle legacy vs new responsible name fields
            COALESCE(NEW.raw_user_meta_data->>'responsible_name', 
                     (COALESCE(NEW.raw_user_meta_data->>'responsible_first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'responsible_last_name', ''))),
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
