-- Phase 3: Operations and Project Assignment for Coops
-- This script adds the necessary infrastructure to handle Coop postulations and project leads.

-- 1. Update proposals table to allow Coop-based postulations
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS coop_id UUID REFERENCES coops(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS assignment_snapshot JSONB;

-- 2. Update jobs table to track Coop projects and designated leads
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS coop_id UUID REFERENCES coops(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS project_lead_id UUID REFERENCES profiles(id);

-- 3. Create job_participants table to track which members are working on a specific job
CREATE TABLE IF NOT EXISTS job_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(job_id, user_id)
);

-- 4. RLS and Security
ALTER TABLE job_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Members of a Coop can see participants of jobs their Coop is handling
CREATE POLICY "Coop members can see job participants" ON job_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN coop_members cm ON j.coop_id = cm.coop_id
            WHERE j.id = job_participants.job_id
            AND cm.user_id = auth.uid()
        )
    );

-- Policy: Clients can see participants of jobs they hired
CREATE POLICY "Clients can see job participants" ON job_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            WHERE j.id = job_participants.job_id
            AND j.client_id = auth.uid()
        )
    );

-- 5. Helper Function to assign multiple members to a job
CREATE OR REPLACE FUNCTION assign_job_participants(p_job_id UUID, p_user_ids UUID[])
RETURNS VOID AS $$
BEGIN
    -- Remove existing participants
    DELETE FROM job_participants WHERE job_id = p_job_id;
    
    -- Insert new participants
    INSERT INTO job_participants (job_id, user_id)
    SELECT p_job_id, unnest(p_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
