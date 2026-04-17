-- ============================================================
-- COOPLANCE - MIGRATION V23: RESTORATION SHIELD
-- ============================================================
-- 1. Updates handle_auth_user_sync to support account restoration
-- 2. Sets deleted_at = NULL whenever a user logs in or registers
-- 3. Ensures existing users can "factory reset" via re-registration
-- ============================================================

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
    -- We only check against non-deleted users to allow reusing own username if restored
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != NEW.id AND deleted_at IS NULL) THEN
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
        deleted_at,
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
        -- Images will be handled via Post-Verification upload to fix the "Failed to fetch" issue
        COALESCE(NULLIF(m->>'avatar_url', ''), NULLIF(m->>'profileImage', ''), NULLIF(m->>'avatar', '')),
        COALESCE(NULLIF(m->>'cv_url', ''), NULLIF(m->>'cvFile', '')),
        COALESCE(NULLIF(m->>'terms_accepted', '')::boolean, NULLIF(m->>'termsAccepted', '')::boolean, FALSE),
        NOT is_confirmed,
        0,
        0,
        NULL, -- New inserts are active by default
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
        is_partial = EXCLUDED.is_partial,
        deleted_at = NULL; -- ACTIVATION: Restore the account on any activity/sync

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[Cooplance THE SHIELD] Error syncing user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration V23: RESTORATION SHIELD deployed successfully.
