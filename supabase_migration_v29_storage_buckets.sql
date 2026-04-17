-- ============================================================
-- COOPLANCE - MIGRATION V29: Storage Buckets Initialization
-- Run this in the Supabase SQL Editor to fix "Bucket not found"
-- ============================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Policies for 'service-media'
-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view service media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload service media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own service media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own service media" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Anyone can view service media"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-media');

CREATE POLICY "Authenticated users can upload service media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own service media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own service media"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-media' AND auth.role() = 'authenticated');

-- 3. Setup Policies for 'avatars'
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
