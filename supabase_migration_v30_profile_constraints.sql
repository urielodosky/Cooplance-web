-- COOPLANCE V30: MIGRATION FOR ROLE HARDENING & UNIQUENESS CONSTRAINTS
-- Enforces mandatory fields and uniqueness for DNI, CUIT, Email, Phone, Username, and Company Name.

-- 1. Ensure Case-Insensitive Uniqueness for Username
DROP INDEX IF EXISTS profiles_username_lower_idx;
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (LOWER(username));

-- 2. Ensure Case-Insensitive Uniqueness for Company Name
DROP INDEX IF EXISTS profiles_company_name_lower_idx;
CREATE UNIQUE INDEX profiles_company_name_lower_idx ON public.profiles (LOWER(company_name));

-- 3. Ensure Strict Uniqueness for DNI, CUIT, Phone, and Email
-- Note: Email is managed by Auth, but we track it in profiles too.

-- We use DO blocks to add constraints safely if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_dni_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_dni_key UNIQUE (dni);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_cuil_cuit_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_cuil_cuit_key UNIQUE (cuil_cuit);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 4. Add NOT NULL constraints to mandatory fields where possible
-- Note: Profiles are created via trigger from metadata, so we must ensure the trigger provides these.
-- For now, we rely on application level validation + the constraints above.

COMMENT ON TABLE public.profiles IS 'User profiles with strict uniqueness constraints on DNI, CUIT, Phone, Email, Username, and Company Name.';
