-- Phase 4: Coop Internal Communication (Internal 'Slack')
-- This script creates the infrastructure for internal team channels and messaging.

-- 1. Coop Channels Table
CREATE TABLE IF NOT EXISTS coop_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID REFERENCES coops(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('general', 'project', 'direct')),
    reference_id UUID, -- job_id for projects
    name TEXT,
    member_ids UUID[], -- For 'direct' type: [user1_id, user2_id]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Coop Messages Table
CREATE TABLE IF NOT EXISTS coop_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES coop_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    content TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- [{url, type, name}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. RLS and Security
ALTER TABLE coop_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_messages ENABLE ROW LEVEL SECURITY;

-- Policies for coop_channels
CREATE POLICY "Coop members can see general and their direct channels" ON coop_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_channels.coop_id 
            AND user_id = auth.uid()
        ) AND (
            type = 'general' OR 
            (type = 'direct' AND auth.uid() = ANY(member_ids))
        )
    );

CREATE POLICY "Coop members can see project channels they are assigned to" ON coop_channels
    FOR SELECT
    USING (
        type = 'project' AND (
            -- Assigned members
            EXISTS (
                SELECT 1 FROM job_participants 
                WHERE job_id = coop_channels.reference_id 
                AND user_id = auth.uid()
            ) OR
            -- Owners and Admins (Audit Mode)
            EXISTS (
                SELECT 1 FROM coop_members 
                WHERE coop_id = coop_channels.coop_id 
                AND user_id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- Policies for coop_messages
CREATE POLICY "Users can see messages in channels they have access to" ON coop_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_channels 
            WHERE id = coop_messages.channel_id
        ) -- The channel policy already restricts access
    );

CREATE POLICY "Users can send messages to channels they have access to" ON coop_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coop_channels 
            WHERE id = coop_messages.channel_id
        ) AND sender_id = auth.uid()
    );

-- 4. Triggers and Automation

-- Create # General channel automatically when a Coop is created
CREATE OR REPLACE FUNCTION create_default_coop_channels()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO coop_channels (coop_id, type, name)
    VALUES (NEW.id, 'general', 'General');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_coop_created
    AFTER INSERT ON coops
    FOR EACH ROW EXECUTE FUNCTION create_default_coop_channels();

-- Create project channel automatically when a job is accepted (status becomes 'active' and has coop_id)
CREATE OR REPLACE FUNCTION create_project_coop_channel()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.coop_id IS NOT NULL AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active')) THEN
        INSERT INTO coop_channels (coop_id, type, reference_id, name)
        VALUES (NEW.coop_id, 'project', NEW.id, 'Proyecto: ' || COALESCE(NEW.service_title, 'Sin Título'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_job_activated_for_coop
    AFTER UPDATE ON jobs
    FOR EACH ROW
    WHEN (NEW.coop_id IS NOT NULL AND NEW.status = 'active')
    EXECUTE FUNCTION create_project_coop_channel();

-- 5. Helper for existing coops: Create General channel for all existing coops that don't have one
-- (Optional: Run manually if needed)
-- INSERT INTO coop_channels (coop_id, type, name)
-- SELECT id, 'general', 'General' FROM coops c
-- WHERE NOT EXISTS (SELECT 1 FROM coop_channels WHERE coop_id = c.id AND type = 'general');
