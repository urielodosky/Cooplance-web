-- ============================================================
-- COOPLANCE - MIGRATION V20: THE FINAL SHIELD (Failsafe Auth)
-- UPDATED: Includes Bio, Avatar, and CV support
-- ============================================================

-- 1. DROP ALL OLD TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_change ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP TRIGGER IF EXISTS ensure_data_persistence ON public.profiles;

-- 2. CREATE THE FINAL SYNC FUNCTION
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    m jsonb := NEW.raw_user_meta_data;
    base_username text;
    final_username text;
    is_confirmed boolean;
BEGIN
    -- Determine confirmation status
    is_confirmed := (NEW.email_confirmed_at IS NOT NULL) OR (m->>'email_verified' = 'true');

    -- 1. Generate Base Username
    base_username := LOWER(COALESCE(
        NULLIF(m->>'username', ''), 
        split_part(NEW.email, '@', 1)
    ));
    final_username := base_username;

    -- 2. Resolve Username Conflict (Safety Shield)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != NEW.id) THEN
        final_username := base_username || '_' || substr(NEW.id::text, 1, 4);
    END IF;

    -- 3. UPSERT INTO PROFILES
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
        bio,
        avatar_url,
        cv_url,
        terms_accepted,
        is_partial,
        xp,
        points,
        created_at
    )
    VALUES (
        NEW.id,
        final_username,
        COALESCE(NULLIF(m->>'first_name', ''), NULLIF(m->>'firstName', ''), ''),
        COALESCE(NULLIF(m->>'last_name', ''), NULLIF(m->>'lastName', ''), ''),
        lower(NEW.email),
        COALESCE(NULLIF(m->>'role', ''), 'freelancer'),
        COALESCE(NULLIF(m->>'gender', ''), 'male'),
        COALESCE(NULLIF(m->>'company_name', ''), NULLIF(m->>'companyName', '')),
        COALESCE(NULLIF(m->>'responsible_name', ''), NULLIF(m->>'responsibleName', '')),
        COALESCE(NULLIF(m->>'location', ''), ''),
        COALESCE(NULLIF(m->>'country', ''), 'Argentina'),
        COALESCE(NULLIF(m->>'work_hours', ''), NULLIF(m->>'workHours', '')),
        COALESCE(NULLIF(m->>'payment_methods', ''), NULLIF(m->>'paymentMethods', '')),
        COALESCE(NULLIF(m->>'vacancies', '')::integer, 0),
        COALESCE(NULLIF(m->>'dni', ''), ''),
        CASE 
            WHEN (NULLIF(m->>'dob', '') IS NOT NULL) THEN (m->>'dob')::date 
            WHEN (NULLIF(m->>'birthDate', '') IS NOT NULL) THEN (m->>'birthDate')::date 
            ELSE NULL 
        END,
        COALESCE(NULLIF(m->>'phone', ''), ''),
        COALESCE(NULLIF(m->>'bio', ''), ''),
        COALESCE(NULLIF(m->>'avatar_url', ''), NULLIF(m->>'profileImage', ''), NULLIF(m->>'avatar', '')),
        COALESCE(NULLIF(m->>'cv_url', ''), NULLIF(m->>'cvFile', '')),
        COALESCE(NULLIF(m->>'terms_accepted', '')::boolean, NULLIF(m->>'termsAccepted', '')::boolean, FALSE),
        NOT is_confirmed,
        0,
        0,
        COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
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
        phone = EXCLUDED.phone,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        cv_url = EXCLUDED.cv_url,
        terms_accepted = EXCLUDED.terms_accepted,
        is_partial = EXCLUDED.is_partial;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[Cooplance THE SHIELD] Error syncing user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-ATTACH TRIGGERS
CREATE TRIGGER on_auth_user_sync_insert
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_sync();

CREATE TRIGGER on_auth_user_sync_update
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_sync();

-- 4. CLEANUP OLD FUNCTIONS
DROP FUNCTION IF EXISTS public.handle_email_confirmed();
DROP FUNCTION IF EXISTS public.handle_auth_user_change();
DROP FUNCTION IF EXISTS public.handle_user_confirmation();
DROP FUNCTION IF EXISTS public.shield_profile_data();

-- Migration V20: THE FINAL SHIELD deployed successfully.
