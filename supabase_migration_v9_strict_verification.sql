-- ============================================================
-- COOPLANCE - MIGRATION V9: SUPABASE NATIVE OTP VERIFICATION
-- ============================================================
-- With Supabase handling OTP natively:
-- 1. signUp() creates auth.users row with email_confirmed_at = NULL
-- 2. Supabase sends OTP email automatically
-- 3. verifyOtp() confirms the email → sets email_confirmed_at
-- 4. This UPDATE triggers our function → profile is created
-- ============================================================

-- 1. Drop ALL old triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_change ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

DROP FUNCTION IF EXISTS public.handle_auth_user_change();
DROP FUNCTION IF EXISTS public.handle_user_confirmation();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_verified_user();

-- 2. Create a single clean trigger function
-- Profile is ONLY created when email_confirmed_at transitions from NULL to a value
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile when email is confirmed (verified via Supabase OTP)
    -- Check: old value was NULL and new value is NOT NULL (just confirmed)
    -- OR: email_verified metadata flag is true (fallback)
    IF (
        (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
        OR
        (NEW.raw_user_meta_data->>'email_verified' = 'true' AND OLD.raw_user_meta_data->>'email_verified' IS DISTINCT FROM 'true')
    ) THEN
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
            xp,
            points
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer'),
            NEW.raw_user_meta_data->>'gender',
            NEW.raw_user_meta_data->>'company_name',
            NEW.raw_user_meta_data->>'responsible_name',
            NEW.raw_user_meta_data->>'location',
            NEW.raw_user_meta_data->>'country',
            NEW.raw_user_meta_data->>'work_hours',
            NEW.raw_user_meta_data->>'payment_methods',
            COALESCE((NEW.raw_user_meta_data->>'vacancies')::integer, 0),
            NEW.raw_user_meta_data->>'dni',
            CASE 
                WHEN NEW.raw_user_meta_data->>'dob' IS NOT NULL 
                     AND NEW.raw_user_meta_data->>'dob' != '' 
                THEN (NEW.raw_user_meta_data->>'dob')::date 
                ELSE NULL 
            END,
            NEW.raw_user_meta_data->>'phone',
            0,
            0
        )
        ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            gender = EXCLUDED.gender,
            company_name = EXCLUDED.company_name,
            responsible_name = EXCLUDED.responsible_name,
            location = EXCLUDED.location,
            country = EXCLUDED.country,
            work_hours = EXCLUDED.work_hours,
            payment_methods = EXCLUDED.payment_methods,
            vacancies = EXCLUDED.vacancies,
            dni = EXCLUDED.dni,
            dob = EXCLUDED.dob,
            phone = EXCLUDED.phone;
        
        RAISE LOG '[Cooplance] Profile created for verified user %', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[Cooplance] Error in handle_email_confirmed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger ONLY on UPDATE (verifyOtp updates the auth.users row)
CREATE TRIGGER on_auth_user_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_email_confirmed();


-- 4. RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;
CREATE POLICY "Users can delete their own profile." ON public.profiles
    FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
