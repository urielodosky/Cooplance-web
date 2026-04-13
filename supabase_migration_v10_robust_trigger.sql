-- ============================================================
-- COOPLANCE - MIGRATION V10: ROBUST PROFILE CREATION (Failsafe)
-- ============================================================
-- 1. Handles both snake_case and camelCase keys in metadata
-- 2. Improved error logging
-- 3. Ensures profile exists even if metadata is partially missing
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    m jsonb := NEW.raw_user_meta_data;
BEGIN
    -- Only create profile when email is confirmed (verified via Supabase OTP)
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
            LOWER(COALESCE(
                m->>'username', 
                split_part(NEW.email, '@', 1)
            )),
            COALESCE(m->>'first_name', m->>'firstName', ''),
            COALESCE(m->>'last_name', m->>'lastName', ''),
            NEW.email,
            COALESCE(m->>'role', 'freelancer'),
            COALESCE(m->>'gender', 'male'),
            COALESCE(m->>'company_name', m->>'companyName'),
            COALESCE(m->>'responsible_name', m->>'responsibleName'),
            COALESCE(m->>'location', ''),
            COALESCE(m->>'country', 'Argentina'),
            COALESCE(m->>'work_hours', m->>'workHours'),
            COALESCE(m->>'payment_methods', m->>'paymentMethods'),
            COALESCE((m->>'vacancies')::integer, 0),
            COALESCE(m->>'dni', ''),
            CASE 
                WHEN (m->>'dob' IS NOT NULL AND m->>'dob' != '') THEN (m->>'dob')::date 
                WHEN (m->>'birthDate' IS NOT NULL AND m->>'birthDate' != '') THEN (m->>'birthDate')::date 
                ELSE NULL 
            END,
            COALESCE(m->>'phone', ''),
            0,
            0
        )
        ON CONFLICT (id) DO UPDATE SET
            username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
            first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
            last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name),
            role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role),
            gender = COALESCE(NULLIF(EXCLUDED.gender, ''), public.profiles.gender),
            company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), public.profiles.company_name),
            responsible_name = COALESCE(NULLIF(EXCLUDED.responsible_name, ''), public.profiles.responsible_name),
            location = COALESCE(NULLIF(EXCLUDED.location, ''), public.profiles.location),
            country = COALESCE(NULLIF(EXCLUDED.country, ''), public.profiles.country),
            work_hours = COALESCE(NULLIF(EXCLUDED.work_hours, ''), public.profiles.work_hours),
            payment_methods = COALESCE(NULLIF(EXCLUDED.payment_methods, ''), public.profiles.payment_methods),
            vacancies = COALESCE(EXCLUDED.vacancies, public.profiles.vacancies),
            dni = COALESCE(NULLIF(EXCLUDED.dni, ''), public.profiles.dni),
            dob = COALESCE(EXCLUDED.dob, public.profiles.dob),
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone);
        
        RAISE LOG '[Cooplance V10] Profile UPSERT successful for user %', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[Cooplance V10] Error in handle_email_confirmed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
