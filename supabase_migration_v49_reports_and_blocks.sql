-- 1. Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id),
    reported_id UUID NOT NULL REFERENCES profiles(id),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('job', 'chat', 'profile', 'service', 'project')),
    reference_id UUID,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id),
    blocked_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Reports Policies
CREATE POLICY "Users can insert their own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can see their own reports"
    ON reports FOR SELECT
    USING (auth.uid() = reporter_id);

-- Blocks Policies
CREATE POLICY "Users can insert their own blocks"
    ON user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can see their own blocks"
    ON user_blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- 3. Trigger or logic for automatic blocking? 
-- The user asked to do it once the report is made. I can do it in the frontend or a trigger.
-- Frontend is easier to manage feedback for now.
