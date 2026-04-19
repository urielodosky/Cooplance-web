-- ============================================================
-- COOPLANCE - MIGRATION V35: Project Storage Buckets
-- ============================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-videos', 'project-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Policies for 'project-images'
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view project images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own project images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own project images" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Anyone can view project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own project images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-images' AND owner = auth.uid());

CREATE POLICY "Users can delete their own project images"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-images' AND owner = auth.uid());

-- 3. Setup Policies for 'project-videos'
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view project videos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload project videos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own project videos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own project videos" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Anyone can view project videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-videos');

CREATE POLICY "Authenticated users can upload project videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own project videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-videos' AND owner = auth.uid());

CREATE POLICY "Users can delete their own project videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-videos' AND owner = auth.uid());
