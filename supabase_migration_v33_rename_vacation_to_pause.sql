-- Migration v33: Rename 'vacation' to 'pause_mode'
-- Refactoring for Legal Compliance (avoiding employment relationship terminology)

-- 1. Update existing JSONB data
UPDATE profiles 
SET gamification = (gamification - 'vacation') || jsonb_build_object('pause_mode', gamification->'vacation')
WHERE gamification ? 'vacation';

-- 2. No top-level column renaming is needed as 'vacation' was only used as a key in JSONB.
-- If you have any triggers that depend on the 'vacation' key, please audit them.
