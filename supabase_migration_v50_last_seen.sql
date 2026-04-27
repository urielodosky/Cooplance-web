-- Add last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Update last_seen on profile updates (already happens if they update profile, but let's have a specific way)
-- We can update it from the frontend periodically.
