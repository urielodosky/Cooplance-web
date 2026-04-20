-- CLEANUP PROFILES DATA V1
-- 1. Sanitize Phone Number Column (Remove all non-numeric characters)
UPDATE profiles
SET phone = CASE 
    WHEN phone IS NULL THEN NULL 
    ELSE regexp_replace(phone, '\D', '', 'g')
END;

-- 2. Identify users with NULL DOB (Audit)
CREATE OR REPLACE VIEW audit_missing_dob AS
SELECT id, username, email, role, created_at
FROM profiles
WHERE (role = 'freelancer' OR role = 'buyer') AND dob IS NULL;

-- 3. Safety Check: If someone saved a pure email in the phone field, it will now be empty or only digits.
-- If it's empty, we should ideally set it to NULL for consistency.
UPDATE profiles
SET phone = NULL
WHERE phone = '';

COMMENT ON COLUMN profiles.phone IS 'Sanitized numeric phone string. Non-digits removed during migration.';
