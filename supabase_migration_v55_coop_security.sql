-- Phase 6: Security, Moderation and Rule Control
-- This script handles rule versioning, expulsion logs and reporting infrastructure.

-- 1. Expulsion Logs Table
CREATE TABLE IF NOT EXISTS coop_expulsion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id UUID REFERENCES coops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    expelled_by UUID REFERENCES profiles(id),
    reason TEXT CHECK (reason IN ('inactivity', 'rule_breaking', 'toxicity')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.1 RLS for expulsion logs
ALTER TABLE coop_expulsion_logs ENABLE ROW LEVEL SECURITY;

-- Only members of the coop can see the logs (transparency)
DROP POLICY IF EXISTS "Coop members can see expulsion logs" ON coop_expulsion_logs;
CREATE POLICY "Coop members can see expulsion logs" ON coop_expulsion_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_expulsion_logs.coop_id 
            AND user_id = auth.uid()
        )
    );

-- 2. Trigger for Rule Versioning (Re-acceptance)
CREATE OR REPLACE FUNCTION reset_member_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if internal_rules changed
    IF (OLD.internal_rules IS DISTINCT FROM NEW.internal_rules) THEN
        UPDATE coop_members 
        SET accepted_rules_at = NULL 
        WHERE coop_id = NEW.id 
        AND role != 'owner'; -- Owner doesn't need to re-accept their own rules
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_coop_rules_updated
    AFTER UPDATE ON coops
    FOR EACH ROW
    EXECUTE FUNCTION reset_member_acceptance();

-- 3. Expulsion Logic with Active Project Check
CREATE OR REPLACE FUNCTION expel_coop_member(
    p_coop_id UUID,
    p_target_user_id UUID,
    p_actor_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- 1. Check if member is assigned to any active project in this Coop
    IF EXISTS (
        SELECT 1 FROM job_participants jp
        JOIN jobs j ON jp.job_id = j.id
        WHERE jp.user_id = p_target_user_id
        AND j.coop_id = p_coop_id
        AND j.status = 'active'
    ) THEN
        RAISE EXCEPTION 'No se puede expulsar a un miembro que tiene trabajos activos en curso.';
    END IF;

    -- 2. Log the expulsion
    INSERT INTO coop_expulsion_logs (coop_id, user_id, expelled_by, reason)
    VALUES (p_coop_id, p_target_user_id, p_actor_id, p_reason);

    -- 3. Delete the member
    DELETE FROM coop_members 
    WHERE coop_id = p_coop_id 
    AND user_id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Adapt Reports for Coops (Optional: Add a check if needed)
-- We'll assume the 'reports' table already exists and handles reference_type.
-- If not, we ensure it exists.
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id),
    target_id UUID, -- Can be profile_id or coop_id
    reference_type TEXT, -- 'profile' or 'coop'
    reason TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4.1 RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can see their own reports" ON reports;
CREATE POLICY "Users can see their own reports" ON reports
    FOR SELECT
    USING (auth.uid() = reporter_id);
