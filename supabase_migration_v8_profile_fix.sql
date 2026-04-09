-- ============================================================
-- COOPLANCE - MIGRATION V8: PROFILE CREATION & RLS FIX
-- ============================================================

-- 1. CONSOLIDATE AND HARDEN PROFILE TRIGGER
-- This handles user creation and metadata updates safely.
-- It ensures that if a user is "half-registered", they can still complete it.

CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if email_verified is true in metadata OR the email is already confirmed
    -- This allows the OTP verification flow to trigger the profile creation.
    IF (new.raw_user_meta_data->>'email_verified' = 'true' OR new.email_confirmed_at IS NOT NULL) THEN
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
            (COALESCE(new.raw_user_meta_data->>'vacancies', '0'))::integer,
            new.raw_user_meta_data->>'dni',
            (new.raw_user_meta_data->>'dob')::date,
            new.raw_user_meta_data->>'phone',
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
    END IF;
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Capture error mapping to help frontend
    RAISE LOG 'Error in handle_auth_user_change for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-link triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_change();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_change();


-- 2. RESTORE AND ENFORCE RLS ON PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view profiles (Public)
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

-- Policy 2: Users can update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Users can delete their own profiles (required for Account Deletion)
DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;
CREATE POLICY "Users can delete their own profile." ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Policy 4: Authenticated users can insert their own profile (Safety fallback for triggers)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
